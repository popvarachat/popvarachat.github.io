# Chair Import Cost Intelligence · GitHub Pages Gateway

This folder is a public GitHub Pages front door for the secure Chair Import Cost Dashboard.

## Security boundary

- No confidential cost database is stored in GitHub.
- No Google Apps Script secrets or database IDs are required by this page.
- The production calculation engine, RBAC, Access Control, Pending Access Requests, exports, audit logging and the three secure databases remain in Google Apps Script.
- The live operational app is launched from the secure Apps Script production URL.

## Architecture

GitHub Pages → Apps Script Web App → RBAC / Calculation / Audit → Engine DB + Identity Vault + Cost Vault

This page intentionally mirrors the visual structure of the live application while keeping protected values out of public source.
