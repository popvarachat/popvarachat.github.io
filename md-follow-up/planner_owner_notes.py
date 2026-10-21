"""Enrich privately held Pivot from read-only Planner Notes evidence."""
import os,json,re,pathlib
DIR=pathlib.Path(os.environ["LOCALAPPDATA"])/"UAIOS"/"MD-FollowUp-Private"
def audit(rows,assignments,users,source_people,unknown,joint_suffix):
    try:
        j=json.loads((DIR/"planner-note-audit.json").read_text(encoding="utf8"))
        notes={str(t["task_id"]):t for t in j.get("tasks",[]) if t.get("task_id")}
    except (OSError,ValueError):
        notes={}
    inspected=0;explicit=0
    for row in rows:
        if row.get("source")!="planner":continue
        taskid=str(row["row_id"])
        task=notes.get(taskid)
        person_ids=assignments.get(taskid,[])
        assigned=[users[x] for x in person_ids if x in users]
        label=(task or {}).get("owner_label","").strip()
        row["owner_assignee_person"]=" / ".join(assigned)
        row["owner_note_raw"]=label
        row["owner_notes_audited"]=bool(task)
        if task:inspected+=1
        if label:explicit+=1
        found=re.findall(r"(?:พี่|คุณ|น้อง)[ก-๙]+",label)
        for candidate in source_people(label):
            if not any(candidate in s or s in candidate for s in found):found.append(candidate)
        found=list(dict.fromkeys(found))
        if found:
            row["owner_person"]=" / ".join(found)+(joint_suffix if len(found)>1 else "")
            row["owner_kind"]="joint" if len(found)>1 else "named"
            row["owner_role"]="notes_explicit_person"
            row["owner_evidence"]="Planner Notes: เจ้าภาพ; Assignment is a separate role"
            row["owner_raw"]=label
        elif label:
            row["owner_person"]=unknown
            row["owner_kind"]="team_only"
            row["owner_team"]=label
            row["owner_role"]="notes_team_only"
            row["owner_evidence"]="Planner Notes name team/department but no individual"
            row["owner_raw"]=label
        elif assigned:
            row["owner_role"]="assignment_only"
            row["owner_evidence"]="Planner assignee (not certified project owner)"
        elif task:
            row["owner_role"]="notes_checked_no_owner"
            row["owner_evidence"]="Notes inspected; no explicit owner line or Planner assignment"
        else:
            row["owner_kind"]="not_audited"
            row["owner_role"]="notes_not_checked"
            row["owner_evidence"]="Planner has no assignment; Notes have not been audited"
    return {"notes_inspected":inspected,"notes_with_owner_label":explicit}
