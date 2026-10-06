# ERP Preview

This artifact runs a snapshot of the public source from
[fukpdf/ERP](https://github.com/fukpdf/ERP) (upstream `main`, commit `e7401d7`).
The imported repository is kept in `imported/`; its Node HTTP server serves both
the browser app and API. This is a snapshot, so later GitHub commits do not
automatically sync into this project.

## Start and preview

The Replit web workflow runs `pnpm --filter @workspace/erp-preview run dev`.
The imported server reads the workflow-provided `PORT` and binds to `0.0.0.0`.
Open the Preview pane at `/`.

The first run creates `imported/data/db.json` with demo records. The preview
uses `/erp-api` for its requests to avoid colliding with this workspace's
separate `/api` service. The app writes changes to the JSON file, so
product/customer/order edits persist in this project's workspace data file.

This setup is for preview and evaluation. It is not production-hardened.

## Current ERP stage

The source project's `replit.md` identifies the product as **Chunk 1: ERP
foundation**. The current app has:

- Overview dashboard and summary metrics
- Product catalog with inventory, reorder alerts, search/filter, CSV export,
  add, and delete
- Customer directory with search, CSV export, add, and safe delete
- Sales orders with multiple line items, stock checks, and inventory deduction

Planned later chunks are authentication/roles/audit, purchasing and vendors,
accounting, people/HR, and reporting/database migration/production hardening.
The app currently has no sign-in or role enforcement and stores data in a local
JSON file. Use only the included fictional demo data; do not enter real
customer, employee, or financial records.

## Important status distinction

The upstream repository also contains security documentation labeled with
stages such as 50–70. Those documents describe planned or gated security and
infrastructure work; they do not mean this ERP application has reached those
production stages. In particular, some documented controls still require real
identity, database, cloud, backup, and test infrastructure before runtime
readiness can be claimed.
