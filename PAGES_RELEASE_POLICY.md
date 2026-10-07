# GitHub Pages Release Policy

This repository uses a dedicated `pages` branch for production publishing.

## Working branch
- Develop and commit on `main`.
- Multiple commits on `main` do **not** publish the website.
- Do not point GitHub Pages back to `main`.

## Production release
Publish only after validation / Human Gate by moving the `pages` branch to the approved `main` commit.

Example with GitHub CLI:

```powershell
$sha = gh api repos/popvarachat/popvarachat.github.io/git/ref/heads/main --jq '.object.sha'
gh api -X PATCH repos/popvarachat/popvarachat.github.io/git/refs/heads/pages -f sha=$sha -F force=true
```

One release = one Pages deployment. Batch related changes before moving `pages`.
