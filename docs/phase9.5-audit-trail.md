# Phase 9.5: Enterprise Audit Trail & Report Export Specifications

This document outlines the context tracking engine, changed-fields diffing algorithm, sensitive field filter, reporting engine exports (CSV, Excel, PDF), and security scopes implemented in Phase 9.5.

---

## Architecture of Audit Trail

The Enterprise Audit Trail system provides accountability and traceability for every mutation in the ERP database.

```
       Express Request (API Endpoint)
                    │
      [Middleware: Request Context Store]
      Extracts IP, User-Agent, JWT Payload
      Stores context in AsyncLocalStorage
                    │
       Service Layer Execution (Prisma)
                    │
       [Helper: Diffing Generator]
       Compares Old Object vs New Object
       Strips sensitive fields (passwords)
       Builds 'oldValues' and 'newValues'
                    │
        Save AuditLog Entry to DB
        (Attached to Tenant, User, Context)
```

---

## Context Tracking via AsyncLocalStorage

To avoid polluting service parameters with request metadata (like IP address and user-agent strings), the system uses Node's native `AsyncLocalStorage`:
1. **Middleware (`backend/src/middleware/requestStore.js`)**: Runs on every incoming API request. It extracts:
   * **Client IP Address**: Checked via `X-Forwarded-For` header (supporting reverse proxies) falling back to `req.socket.remoteAddress`.
   * **User Agent**: Extracted from `User-Agent` header.
   * **Session context**: User ID, role, and tenant ID.
2. **Storage**: Binds this metadata to a localized thread-safe request store.
3. **Automatic Log Capture**: When a mutation calls the `logAudit()` utility, the engine retrieves the IP and User-Agent context from the storage box automatically, saving it to `ipAddress` and `userAgent` columns in the database.

---

## Changed-Fields Diffing Algorithm

Rather than blindly saving complete database objects, the audit log engine performs deep value comparison to identify only the fields that were modified:
1. **Value Diffing**: Compares keys of `oldState` and `newState` objects.
2. **Exclude Unchanged**: If a field's value has not changed (e.g. `costPrice` remained `60`), it is completely excluded from the log.
3. **Structural JSON Output**: Returns two clean JSON objects:
   * `oldValues`: Contains prior values of modified fields only.
   * `newValues`: Contains new values of modified fields only.
   
*Example output for a Product update:*
```json
{
  "oldValues": { "salesPrice": "100.00", "reorderLevel": 5 },
  "newValues": { "salesPrice": "120.00", "reorderLevel": 10 }
}
```

---

## Sensitive Fields Filter (Security Guard)

To prevent the leakage of credentials and database security hashes into audit trails, the diffing engine runs a blacklist filter. The following fields are stripped and never recorded in `oldValues` or `newValues`:
* `password`
* `passwordHash`
* `tempPassword`
* `token`
* `secret`

---

## Report Export Engine (CSV, XLSX, PDF)

The reporting module (`backend/src/utils/reportExporter.js`) allows administrators to download filterable audit trail logs in three formats:

1. **CSV Export (`format = 'csv'`)**:
   * Generates a lightweight, comma-separated spreadsheet.
   * Includes headers: Date, User, Action, Entity, Details, IP Address, User Agent.
2. **Excel XLSX Export (`format = 'xlsx'`)**:
   * Uses binary sheet streams to create an Excel-compatible workbook.
   * Features structured column widths, cell type mappings, and formatted data tables.
3. **PDF Export (`format = 'pdf'`)**:
   * Compiles the audit timeline into a professional print document.
   * Includes a headers table, page numbering, zebra striping, and text-wrapping cells.

---

## Security & Access Control

1. **RBAC Guard**: Scoped strictly to `ADMIN` and `BUSINESS_OWNER` roles. Any attempt by other roles to query audit logs or download exports will return `403 Forbidden`.
2. **Multi-Tenant Boundary**: Every audit query filters logs by `tenantId`. A Tenant B administrator cannot fetch, search, or export Tenant A logs.
3. **Traceability Links**: The `AuditLog` table stores references to `salesOrderId`, `purchaseOrderId`, and `manufacturingOrderId`, allowing detailed sub-timelines to render directly inside those transaction views.
