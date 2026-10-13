#!/usr/bin/env python3
"""Create and restore-verify a Git backup. Requires an already authenticated git environment."""
import argparse, hashlib, json, os, pathlib, subprocess, datetime
def run(args, cwd=None):
    p=subprocess.run(args,cwd=cwd,text=True,capture_output=True,env={**os.environ,"GIT_TERMINAL_PROMPT":"0"})
    if p.returncode: raise RuntimeError("Command failed: "+args[0]+" "+args[1]+"\n"+p.stderr)
    return p.stdout
def refs(repo):
    return sorted(run(["git","for-each-ref","--format=%(refname) %(objectname)"],repo).splitlines())
def objects(repo):
    return sorted(line.split()[0] for line in run(["git","rev-list","--objects","--all"],repo).splitlines())
def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source",default="https://github.com/Jassar1441/Wifqa.git")
    p.add_argument("--output",required=True,help="New empty directory; existing paths are refused")
    a=p.parse_args(); root=pathlib.Path(a.output).resolve(); root.mkdir(parents=True,exist_ok=False)
    mirror=root/"mirror.git"; restore=root/"restore.git"; bundle=root/"Wifqa-all.bundle"
    run(["git","clone","--mirror",a.source,str(mirror)])
    before=refs(mirror)
    fsck=run(["git","fsck","--full","--strict"],mirror)
    # LFS payloads are outside Git. Refuse to claim a full backup when LFS pointers exist.
    for oid in objects(mirror):
        if run(["git","cat-file","-t",oid],mirror).strip()=="blob":
            size=int(run(["git","cat-file","-s",oid],mirror))
            if size<2048 and run(["git","cat-file","blob",oid],mirror).startswith("version https://git-lfs.github.com/spec/v1"):
                raise RuntimeError("LFS payloads detected: export them before claiming a complete backup")
    run(["git","bundle","create",str(bundle),"--all"],mirror)
    verification=run(["git","bundle","verify",str(bundle)],mirror)
    run(["git","clone","--mirror",str(bundle),str(restore)])
    restored_fsck=run(["git","fsck","--full","--strict"],restore)
    if before!=refs(restore): raise RuntimeError("Restored refs mismatch")
    if objects(mirror)!=objects(restore): raise RuntimeError("Restored reachable objects mismatch")
    digest=hashlib.sha256(bundle.read_bytes()).hexdigest()
    (root/"Wifqa-all.bundle.sha256").write_text(digest+"  Wifqa-all.bundle\n")
    report={"createdAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"git":run(["git","--version"]).strip(),"refs":before,"reachableObjects":len(objects(mirror)),"sha256":digest,"bytes":bundle.stat().st_size,"restoreVerified":True,"fsck":fsck,"restoreFsck":restored_fsck,"bundleVerify":verification,"driveUploaded":False,"limitations":["Git objects and refs only; excludes issues, PR reviews, Actions artifacts and repository settings","Submodule repositories need their own backups","Drive completion requires upload, redownload and SHA-256 comparison"]}
    (root/"backup-verification.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=="__main__": main()
