#!/usr/bin/env python3
"""Public-safe standalone release gate: no credentials, no raw LINE records."""
import json
import re
from pathlib import Path
from html.parser import HTMLParser
import unittest

ROOT=Path(__file__).resolve().parent
class Markup(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag in ("script","iframe","img") and a.get("src","").startswith(("http:","https:")):
            raise AssertionError("External executable or media dependency not allowed")
        if tag=="a":
            self.links.append(a.get("href",""))

class Snapshot(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=json.loads((ROOT/"snapshot.json").read_text(encoding="utf-8-sig"))
        cls.html=(ROOT/"index.html").read_text(encoding="utf-8-sig")
    def test_schema_and_time(self):
        self.assertEqual(self.data["schema_version"],"rea_public_aggregate_v1")
        self.assertEqual(self.data["refresh"],"manual_verified_snapshot_not_live")
        self.assertTrue(self.data["snapshot_at_utc"].endswith("Z"))
    def test_event_counts_reconcile(self):
        x=self.data
        self.assertEqual(sum(day["count"] for day in x["daily_utc"]),x["counts"]["events"])
        self.assertEqual(sum(value for key,value in x["counts"].items() if key not in ("events","sink_sent")),x["counts"]["events"])
        self.assertLessEqual(x["counts"]["sink_sent"],x["counts"]["events"])
        self.assertTrue(x["daily_utc"][-1]["partial"])
    def test_historical_room_classifications_balance(self):
        r=self.data["rooms"]
        self.assertEqual(r["observed"]+r["silent_verified"]+r["silent_http_404"]+r["silent_not_looked_up"],r["historical"])
        self.assertGreater(r["historical"]-r["observed"],0)
    def test_case_links_not_falsely_verified(self):
        s=self.data["case_shadow"]
        self.assertGreater(s["text_scanned"],s["text_with_explicit_reference"])
        self.assertEqual(s["verified_erp_case_matches"],0)
        self.assertEqual(s["verified_handoffs"],0)
    def test_no_identifiable_or_secret_data(self):
        raw=(ROOT/"snapshot.json").read_text(encoding="utf-8-sig")
        combined=raw+self.html
        for forbidden in ["replyToken","channel access token","Authorization: Bearer",
            "channel_secret","channel_access_token","actor_id","room_key",
            "userId","source_location","event_text","raw_payload_ref",
            "api.line.me/v2/bot/message"]:
            self.assertNotIn(forbidden.lower(),combined.lower(),forbidden)
        self.assertNotRegex(raw,r"\b[CU][a-f0-9]{32}\b")
        self.assertNotRegex(raw,r"\b(?:CAR|CXD|SO|SN|PO)-\d{3,}\b")
    def test_no_external_or_network_sink(self):
        parser=Markup()
        parser.feed(self.html)
        self.assertIn("snapshot.json",parser.links)
        self.assertIn("../",parser.links)
        self.assertNotIn("fetch('http",self.html)
    def test_stage_and_gates_explicit(self):
        self.assertEqual(len(self.data["workflow"]),6)
        self.assertGreaterEqual(len(self.data["quality_gates"]),5)
        statuses={g["status"] for g in self.data["quality_gates"]}
        self.assertIn("partial",statuses)
        self.assertIn("pending",statuses)

if __name__=="__main__":
    unittest.main()
