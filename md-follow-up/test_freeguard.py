"""Offline regression: unchanged Planner stats must not issue GitHub PUT."""
import base64,importlib.util,json,pathlib,tempfile,types
root=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("scan_planner_graph",root/"scan_planner_graph.py")
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
with tempfile.TemporaryDirectory() as tmp:
    mod.ROOT=pathlib.Path(tmp)
    (mod.ROOT/"source-health.json").write_text('{"sources":{}}',encoding="utf8")
    calls=[]
    def gh_stub(argv,**kwargs):
        calls.append(tuple(argv))
        if argv[:2] != ["gh","api"] or "--method" in argv:
            raise AssertionError("Unexpected GitHub mutation on unchanged scan")
        health=json.loads((mod.ROOT/"source-health.json").read_text(encoding="utf8"))
        payload=base64.b64encode(json.dumps(health).encode()).decode()
        return types.SimpleNamespace(returncode=0,stdout=json.dumps({"content":payload,"sha":"test"}))
    mod.subprocess.run=gh_stub
    data={"retrieved_at":mod.stamp(),"tasks":[{"percent":0,"due":"","owner_ids":[]}],
          "details_checked":1,"details_unavailable":0}
    result=mod.publish_metadata(data)
    assert result is False and len(calls)==1,(result,calls)
print("FREE_GUARD_TEST_PASS: unchanged Planner metadata -> no GitHub PUT")
