param(
  [Parameter(Mandatory=$false)]
  [string]$Message = "chore: publish portal batch",
  [int]$MinMinutes = 10,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

function Fail([string]$MessageText) {
  Write-Host "[BLOCKED] $MessageText" -ForegroundColor Red
  exit 1
}

function Run([string]$Exe, [string[]]$ArgumentList) {
  & $Exe @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    Fail "$Exe $($ArgumentList -join ' ') failed with exit code $LASTEXITCODE"
  }
}

Write-Host "=== Portal Batch Publish ===" -ForegroundColor Cyan
Write-Host "Repo: $repo"

$branch = (git branch --show-current).Trim()
if ($branch -ne "main") { Fail "Publish is allowed only from main. Current: $branch" }

# Update first while preserving local edits.
Run "git" @("pull","--rebase","--autostash","origin","main")

$changes = git status --porcelain
if (-not $changes) {
  Write-Host "[SKIP] No file changes. No commit, no push, no Pages deploy." -ForegroundColor Yellow
  exit 0
}

# Cooldown is local and only applies to actual publish operations.
$stampFile = Join-Path $repo ".git\last-portal-push.txt"
if ((Test-Path $stampFile) -and (-not $Force)) {
  $raw = (Get-Content $stampFile -Raw).Trim()
  $last = [datetime]::Parse($raw).ToUniversalTime()
  $age = [datetime]::UtcNow - $last
  if ($age.TotalMinutes -lt $MinMinutes) {
    $remain = [math]::Ceiling($MinMinutes - $age.TotalMinutes)
    Fail "Last Portal push was $([math]::Round($age.TotalMinutes,1)) min ago. Batch more changes and retry in ~$remain min, or use -Force for a justified urgent publish."
  }
}

Write-Host "--- Validation ---" -ForegroundColor Cyan

# Check JavaScript syntax where Node is available.
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $jsFiles = Get-ChildItem $repo -Recurse -File -Filter *.js |
    Where-Object { $_.FullName -notlike "*\.git\*" }
  foreach ($f in $jsFiles) {
    & node --check $f.FullName
    if ($LASTEXITCODE -ne 0) { Fail "JavaScript syntax failed: $($f.FullName)" }
  }
  Write-Host "[PASS] JavaScript syntax: $($jsFiles.Count) file(s)"
}

# Check JSON syntax.
$python = Get-Command python -ErrorAction SilentlyContinue
if ($python) {
  $jsonFiles = Get-ChildItem $repo -Recurse -File -Filter *.json |
    Where-Object { $_.FullName -notlike "*\.git\*" }
  foreach ($f in $jsonFiles) {
    & python -m json.tool $f.FullName *> $null
    if ($LASTEXITCODE -ne 0) { Fail "JSON syntax failed: $($f.FullName)" }
  }
  Write-Host "[PASS] JSON syntax: $($jsonFiles.Count) file(s)"
}

# Basic portal smoke validation.
$index = Join-Path $repo "index.html"
if (-not (Test-Path $index)) { Fail "Portal index.html is missing" }
if ((Get-Item $index).Length -lt 500) { Fail "Portal index.html looks unexpectedly small" }
Write-Host "[PASS] Portal index.html present"

Write-Host "--- Batch ---" -ForegroundColor Cyan
git status --short
Run "git" @("add","-A")

# If staging produces no changes, do not publish.
$staged = git diff --cached --name-only
if (-not $staged) {
  Write-Host "[SKIP] Nothing staged after validation. No deploy." -ForegroundColor Yellow
  exit 0
}

Write-Host "Files in this batch:"
$staged | ForEach-Object { Write-Host " - $_" }

Run "git" @("commit","-m",$Message)

# pre-push hook only permits the guarded route.
$env:PORTAL_BATCH_PUBLISH = "1"
try {
  Run "git" @("push","origin","main")
}
finally {
  Remove-Item Env:PORTAL_BATCH_PUBLISH -ErrorAction SilentlyContinue
}

[datetime]::UtcNow.ToString("o") | Set-Content -Path $stampFile -Encoding ASCII
Write-Host "[DONE] One batch commit -> one push -> one GitHub Pages deployment." -ForegroundColor Green
