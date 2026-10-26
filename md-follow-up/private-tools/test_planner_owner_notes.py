"""Synthetic regression: an explicit department owner is not an individual Assignment."""
import json,os,pathlib,tempfile,unittest,importlib.util
SOURCE=pathlib.Path(__file__).with_name("planner_owner_notes.py")
os.environ.setdefault("LOCALAPPDATA",tempfile.gettempdir())
spec=importlib.util.spec_from_file_location("owner_parser",SOURCE)
p=importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)
class OwnerNotesTests(unittest.TestCase):
 def test_explicit_department_from_planner_description(self):
  with tempfile.TemporaryDirectory() as tmp:
   p.DIR=pathlib.Path(tmp)
   (p.DIR/"planner-export.json").write_text(json.dumps({"tasks":[{"id":"synthetic-test-id","description":"เจ้าภาพ HR\\n\\nติดตามทุกเดือน"}]}),encoding="utf8")
   row={"source":"planner","row_id":"synthetic-test-id","owner":"ไม่มี Assignment ใน Planner","owner_person":"ยังไม่ระบุเจ้าภาพรายบุคคล","owner_kind":"missing","department":"ยังไม่ยืนยันฝ่าย"}
   audit=p.audit([row],{"synthetic-test-id":[]}, {},lambda t:[],"ยังไม่ระบุเจ้าภาพรายบุคคล"," (ร่วม)")
   self.assertEqual(row["owner_team"],"HR")
   self.assertEqual(row["department"],"HR")
   self.assertEqual(row["owner_kind"],"team_only")
   self.assertEqual(row["owner_person"],"ยังไม่ระบุเจ้าภาพรายบุคคล")
   self.assertEqual(row["owner_role"],"notes_team_only")
   self.assertEqual(audit["owner_labels_from_planner_export"],1)
 def test_narrative_not_owner(self):
  self.assertEqual(p.explicit_owner("งานนี้ไม่มีการระบุเจ้าภาพ\\nรายงานผลทุกเดือน"),"")
  self.assertEqual(p.explicit_owner("เจ้าภาพ HR\\nรายละเอียดอื่น"),"HR")
if __name__=="__main__":unittest.main()
