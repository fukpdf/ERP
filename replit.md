# Northstar ERP

## Chunk 1: ERP foundation

This project now has a small runnable ERP foundation built with Node.js and the built-in HTTP server. It intentionally keeps the imported repository's existing documentation and tests untouched while providing a clean app surface for incremental delivery.

### Included

- Overview dashboard with revenue, order, customer, and low-stock metrics
- Product catalog with inventory counts, reorder alerts, search, category filtering, CSV export, add, and delete
- Customer directory with contact details, search, CSV export, add, and safe delete
- Sales orders with customer selection, multiple line items, stock validation, and inventory deduction
- Sales-order search, status filtering, and CSV export
- JSON-backed persistence in `data/db.json`; API requests are serialized to protect stock and writes in the single-process server
- API routes under `/api` for the first four modules

This is the first development chunk, not a production-ready ERP. It has no sign-in or role enforcement, and JSON-file storage is intended for a single-process prototype. Do not enter real customer or financial information until authentication, a production database, access controls, backups, and deployment security are implemented.

### Run locally

```bash
npm start
```

The Replit workflow runs the same command on port 5000.

### Planned chunks

1. ERP foundation (current)
2. Authentication, roles, tenant settings, and audit log
3. Purchasing, vendors, purchase orders, and receiving
4. Accounting, invoices, payments, and tax configuration
5. People/HR and payroll foundations
6. Reporting, exports, database migration, and production hardening