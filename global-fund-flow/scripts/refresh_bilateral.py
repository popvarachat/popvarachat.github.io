#!/usr/bin/env python3
"""Reproduce audited bilateral data snapshots. Manual only: no scheduled tasks."""
import argparse
import collections
import csv
import datetime
import io
import json
import math
import os
from pathlib import Path
import re
import tempfile
import xml.etree.ElementTree as ET

import requests

ROOT = Path(__file__).resolve().parents[1]
GEO_URL = "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json"
BIS_PREFIX = "https://stats.bis.org/api/v2/data/dataflow/BIS/WS_LBS_D_PUB/1.0/"
IMF_PREFIX = "https://api.imf.org/external/sdmx/2.1/data/IMF.STA,PIP/"
ASEAN = {"BN", "KH", "ID", "LA", "MY", "MM", "PH", "SG", "TH", "TL", "VN"}

def fetch(url):
    response = requests.get(url, timeout=180, headers={"User-Agent": "GlobalCapitalIntelligence/6.0 academic-research"})
    response.raise_for_status()
    if not response.content:
        raise RuntimeError("Empty response from " + url)
    print("HTTP", response.status_code, "bytes", len(response.content), url)
    return response

def geo_codes():
    rows = fetch(GEO_URL).json()
    iso2 = {r["alpha-2"]: {"n": r["name"], "r": r.get("region") or "Other",
                           "s": r.get("sub-region") or "",
                           "a": int(r["alpha-2"] in ASEAN)}
            for r in rows if r.get("alpha-2") and r.get("alpha-3")}
    iso2.update({"TW": {"n": "Taiwan", "r": "Asia", "s": "Eastern Asia", "a": 0},
                 "XK": {"n": "Kosovo", "r": "Europe", "s": "Southern Europe", "a": 0}})
    iso3 = {r["alpha-3"]: {"n": r["name"], "r": r.get("region") or "Other", "c": r["alpha-2"]}
            for r in rows if r.get("alpha-2") and r.get("alpha-3")}
    iso3.update({"TWN": {"n": "Taiwan", "r": "Asia", "c": "TW"},
                 "XKX": {"n": "Kosovo", "r": "Europe", "c": "XK"}})
    return iso2, iso3

def bis(quarter, iso):
    url = BIS_PREFIX + "?format=csv&startPeriod=" + quarter + "&endPeriod=" + quarter
    requested = dict(FREQ="Q", L_POSITION="C", L_INSTR="A", L_DENOM="TO1", L_CURR_TYPE="A",
                     L_PARENT_CTY="5J", L_REP_BANK_TYPE="A", L_CP_SECTOR="A",
                     L_POS_TYPE="N", UNIT_MEASURE="USD", UNIT_MULT="6", TIME_PERIOD=quarter)
    pairs = {}
    for r in csv.DictReader(io.StringIO(fetch(url).text)):
        if any(r.get(k) != v for k, v in requested.items()):
            continue
        measure = r.get("L_MEASURE")
        if measure not in ("F", "S"):
            continue
        source, target = r.get("L_REP_CTY"), r.get("L_CP_COUNTRY")
        if source not in iso or target not in iso or source == target:
            continue
        try:
            value = float(r.get("OBS_VALUE", "nan"))
        except ValueError:
            continue
        if not math.isfinite(value):
            continue
        key = (source, target)
        pair = pairs.setdefault(key, {})
        if measure in pair:
            raise RuntimeError("Duplicate BIS key " + str(key) + " " + measure)
        pair[measure] = round(value, 3)
    edges = [[src, dst, v["F"], v.get("S")] for (src, dst), v in pairs.items() if "F" in v]
    edges.sort(key=lambda row: abs(row[2]), reverse=True)
    if len(edges) < 1000:
        raise RuntimeError("BIS anomalous coverage: only " + str(len(edges)))
    codes = {z for row in edges for z in row[:2]}
    return {"metadata": {
        "dataset": "BIS WS_LBS_D_PUB", "time_period": quarter, "period_type": "quarterly",
        "units": "USD millions", "source_url": url, "publication_asof": datetime.date.today().isoformat(),
        "definition": "FX- and break-adjusted changes in cross-border claims; FLOW PROXY, not security trades",
        "stock": "S = amounts outstanding, not added to F",
        "residency": "Reporting banking-office residence, not banking group nationality",
        "sign": "Negative is contraction of claims; not a proven reverse cash transfer",
        "filters": requested, "missing_data": "Missing reporter or counterpart disclosure is not zero"
    }, "countries": {c: iso[c] for c in codes}, "edges": edges}

def imf(half, iso):
    year = half[:4]
    url = IMF_PREFIX + "*.A.P_TOTINV_P_USD.S1.S1.*.S?startPeriod=" + year + "&endPeriod=" + year
    root = ET.fromstring(fetch(url).content)
    pairs = {}
    for elem in root.iter():
        if not elem.tag.endswith("Series"):
            continue
        a = elem.attrib
        if not (a.get("ACCOUNTING_ENTRY") == "A" and a.get("INDICATOR") == "P_TOTINV_P_USD"
                and a.get("SECTOR") == "S1" and a.get("COUNTERPART_SECTOR") == "S1"
                and a.get("FREQUENCY") == "S"):
            continue
        src, dst = a.get("COUNTRY"), a.get("COUNTERPART_COUNTRY")
        if src not in iso or dst not in iso or src == dst:
            continue
        for o in elem:
            if not o.tag.endswith("Obs") or o.attrib.get("TIME_PERIOD") != half:
                continue
            try:
                raw_value = float(o.attrib.get("OBS_VALUE", "nan"))
            except ValueError:
                continue
            if not math.isfinite(raw_value) or raw_value < 0:
                continue
            key = (src, dst)
            if key in pairs:
                raise RuntimeError("Duplicate IMF key " + str(key))
            pairs[key] = round(raw_value / 1_000_000, 3)
    edges = [[a, b, v] for (a, b), v in pairs.items()]
    edges.sort(key=lambda row: row[2], reverse=True)
    if len(edges) < 3000:
        raise RuntimeError("IMF anomalous coverage: only " + str(len(edges)))
    codes = {z for row in edges for z in row[:2]}
    return {"metadata": {
        "dataset": "IMF.STA:PIP", "time_period": half, "publication_asof": datetime.date.today().isoformat(),
        "indicator": "P_TOTINV_P_USD", "accounting": "A", "sector": "S1", "counterpart_sector": "S1",
        "units": "USD millions (raw USD / 1,000,000)", "source_url": url,
        "source_page": "https://data.imf.org/datasets/IMF.STA%3APIP",
        "definition": "PORTFOLIO POSITIONS / STOCKS by holder residence and issuer residence; NOT a transaction flow",
        "limits": "Only reporting economies and disclosed counterpart bilateral holdings. Custodians are not beneficial owners."
    }, "countries": {c: iso[c] for c in codes}, "edges": edges}

def atomic_dump(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False, suffix=".tmp") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        temp = f.name
    os.replace(temp, path)

def main():
    parser = argparse.ArgumentParser(description="Manually refresh audited BIS & IMF global network snapshots")
    parser.add_argument("--bis-quarter", required=True, help="YYYY-QN, e.g. 2026-Q1")
    parser.add_argument("--imf-half", required=True, help="YYYY-SN, e.g. 2025-S2")
    args = parser.parse_args()
    if not re.fullmatch(r"20\d\d-Q[1-4]", args.bis_quarter) or not re.fullmatch(r"20\d\d-S[12]", args.imf_half):
        parser.error("Invalid quarter or half-year")
    if (args.bis_quarter, args.imf_half) != ('2026-Q1', '2025-S2'):
        parser.error('V6 display labels and snapshot filenames are pinned to 2026-Q1 / 2025-S2; update dashboard dates and paths before new-period refresh')
    iso2, iso3 = geo_codes()
    a = bis(args.bis_quarter, iso2)
    b = imf(args.imf_half, iso3)
    # All validations passed before files are replaced.
    atomic_dump(ROOT / "data/bis-global-2026q1.json", a)
    atomic_dump(ROOT / "data/imf-pip-2025s2.json", b)
    print("DONE", len(a["edges"]), "BIS edges;", len(b["edges"]), "IMF positions")
    print("REVIEW PERIODS AND INPUT FILTERS BEFORE MANUAL GITHUB PAGES PUBLISH")

if __name__ == "__main__":
    main()
