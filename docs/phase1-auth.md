# Phase 1: Authentication & Role-Based Access Control (RBAC)

This document outlines the authentication system, role mappings, and audit logging utilities implemented in Phase 1 of the ERP system.

---

## Authentication Mechanism

Authentication is implemented using stateless JSON Web Tokens (JWT) signed with a secret key.
- **Library**: `jsonwebtoken` for signing and verification.
- **Passwords**: Hashed using `bcryptjs` with a work factor of 10.
- **Middleware (`backend/src/middleware/auth.js`)**:
  - `verifyToken`: Extracts the token from the HTTP header (`Authorization: Bearer <JWT>`), validates it against the `JWT_SECRET`, and attaches the parsed payload (`userId`, `role`, etc.) to the `req.user` context.

---

## Role-Based Access Control (RBAC)

The system supports 6 distinct roles defined under the `UserRole` enum:
1. `ADMIN`
2. `BUSINESS_OWNER`
3. `INVENTORY_MANAGER`
4. `SALES_USER`
5. `PURCHASE_USER`
6. `MANUFACTURING_USER`

### Middleware Guard (`backend/src/middleware/roles.js`)
- `requireRole(...roles)`: Verifies if the role of the authenticated user (`req.user.role`) matches one of the allowed roles. If not, it blocks execution and returns `403 Forbidden`.

### Role Access Matrix
Below is the logical access mapping for different system modules:

| Role | Dashboard | Products | Sales | Purchase | Manufacturing | BoM | Audit Logs |
|---|---|---|---|---|---|---|---|
| ADMIN | ✅ Write | ✅ Write | ✅ Write | ✅ Write | ✅ Write | ✅ Write | ✅ Read |
| BUSINESS_OWNER | ✅ Read | ✅ Write | ⚠️ Read-only | ⚠️ Read-only | ⚠️ Read-only | ⚠️ Read-only | ✅ Read |
| SALES_USER | ❌ Blocked | ⚠️ Read-only | ✅ Write | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| PURCHASE_USER | ❌ Blocked | ⚠️ Read-only | ❌ Blocked | ✅ Write | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| MANUFACTURING_USER | ❌ Blocked | ⚠️ Read-only | ❌ Blocked | ❌ Blocked | ✅ Write | ⚠️ Read-only | ❌ Blocked |
| INVENTORY_MANAGER | ✅ Read | ✅ Write | ⚠️ Read-only | ⚠️ Read-only | ⚠️ Read-only | ⚠️ Read-only | ⚠️ Read-only |

---

## Audit Logging

Every critical mutation (such as creating users, changing product details, or confirming orders) triggers an audit entry.
- **Utility**: `backend/src/utils/auditLogger.js` (`logAudit`).
- **Database Model**: `AuditLog`.
- **Fields recorded**:
  - `userId`: Reference to user performing the action.
  - `action`: Specific tag (e.g. `USER_LOGIN`, `PRODUCT_CREATED`).
  - `entityType`: Relational category (e.g., `Product`, `BoM`).
  - `entityId`: Specific record ID.
  - `description`: Human-readable summary.
  - `metadata`: JSON payload for structural details.
