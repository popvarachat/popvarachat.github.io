# popvarachat.github.io

Public portal for GitHub Pages dashboards and web apps.

## Portal publish policy

To reduce unnecessary GitHub Pages deployments, publish Portal changes in batches:

1. Make all related edits locally.
2. Validate locally.
3. Commit and push once through:

```powershell
powershell.exe -ExecutionPolicy Bypass -File scripts\Publish-Portal.ps1 -Message "feat: describe batch"
```

The publisher:
- skips when there are no changes;
- validates JavaScript and JSON;
- validates the Portal entry page;
- enforces a default 10-minute publish cooldown;
- creates one commit and one push for the batch;
- writes the last successful publish timestamp under `.git`.

Direct `git push` is blocked on the configured RDC workstation by the local pre-push hook. For a justified urgent publish, the batch command may use `-Force`.

This policy is intended to reduce Pages build churn, not to delay meaningful releases.
