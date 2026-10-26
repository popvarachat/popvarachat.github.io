"""Read explicit owner/team roles from authoritative Planner task Notes.

Assignment is a person assignee; Notes may independently define a department owner.
Only extract explicit "เจ้าภาพ ..." and "ผู้รับผิดชอบ ..." heading lines.
All data stays on the private NB; no external API call here.
"""
import os,json,re,pathlib
DIR=pathlib.Path(os.environ["LOCALAPPDATA"])/"UAIOS"/"MD-FollowUp-Private"
OWNER_LINE=re.compile(r"^\s*(?:[-*]\s*)?(?:เจ้าภาพ|ผู้รับผิดชอบ)(?:\s*[:：-]\s*|\s+)([^\r\n]{1,120})",re.I)
def explicit_owner(description):
    for line in str(description or "").splitlines():
        match=OWNER_LINE.match(line)
        if match:
            label=match.group(1).strip(" :：-\t")
            if label and label.casefold() not in ("ไม่มี","ยังไม่ระบุ","-","n/a"):
                return label
    return ""
def team_from_label(label):
    norm=str(label or "").casefold()
    if re.search(r"(?<![a-z])h\s*\.?r\s*\.?(?![a-z])",norm) or "ทรัพยากรบุคคล" in norm:
        return "HR"
    return ""

def audit(rows,assignments,users,source_people,unknown,joint_suffix):
    try:
        j=json.loads((DIR/"planner-note-audit.json").read_text(encoding="utf8"))
        notes={str(t["task_id"]):t for t in j.get("tasks",[]) if t.get("task_id")}
    except (OSError,ValueError):
        notes={}
    try:
        exported=json.loads((DIR/"planner-export.json").read_text(encoding="utf8"))
        live_desc={str(t["id"]):str(t.get("description") or "") for t in exported.get("tasks",[]) if t.get("id")}
    except (OSError,ValueError):
        live_desc={}
    inspected=0;explicit=0;from_export=0
    for row in rows:
        if row.get("source")!="planner":continue
        taskid=str(row["row_id"])
        task=notes.get(taskid)
        description=live_desc.get(taskid,"")
        extracted=explicit_owner(description)
        label=extracted or str((task or {}).get("owner_label","")).strip()
        person_ids=assignments.get(taskid,[])
        assigned=[users[x] for x in person_ids if x in users]
        row["owner_assignee_person"]=" / ".join(assigned)
        row["owner_note_raw"]=label
        row["owner_notes_audited"]=bool(task) or taskid in live_desc
        if row["owner_notes_audited"]:inspected+=1
        if label:explicit+=1
        if extracted:from_export+=1
        found=re.findall(r"(?:พี่|คุณ|น้อง)[ก-๙]+",label)
        for candidate in source_people(label):
            if not any(candidate in s or s in candidate for s in found):
                found.append(candidate)
        found=list(dict.fromkeys(found))
        if found:
            row["owner_person"]=" / ".join(found)+(joint_suffix if len(found)>1 else "")
            row["owner_kind"]="joint" if len(found)>1 else "named"
            row["owner_role"]="notes_explicit_person"
            row["owner_evidence"]="Planner task description: explicit owner; Assignment kept separate" if extracted else "Planner Notes audit: explicit person"
            row["owner_raw"]=label
        elif label:
            row["owner_person"]=unknown
            row["owner_kind"]="team_only"
            row["owner_team"]=team_from_label(label) or label
            row["owner_role"]="notes_team_only"
            row["owner_evidence"]="Planner task description: explicit department owner" if extracted else "Planner Notes audit: department/team label"
            row["owner_raw"]=label
            if team_from_label(label):
                row["department"]=team_from_label(label)
        elif assigned:
            row["owner_role"]="assignment_only"
            row["owner_evidence"]="Planner assignee (not certified project owner)"
        elif row["owner_notes_audited"]:
            row["owner_role"]="notes_checked_no_owner"
            row["owner_evidence"]="Planner Notes inspected; no explicit owner heading or Assignment"
        else:
            row["owner_kind"]="not_audited"
            row["owner_role"]="notes_not_checked"
            row["owner_evidence"]="Planner Notes unavailable and no Assignment"
    return {"notes_inspected":inspected,"notes_with_owner_label":explicit,"owner_labels_from_planner_export":from_export}