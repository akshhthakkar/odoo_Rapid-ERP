# Phase 3: Bill of Materials (BoM) Specifications

This document describes the endpoints, validation layers, security rules, lifecycle patterns, and transactional constraints implemented for the Bill of Materials (BoM) module.

---

## Endpoints

All endpoints are prefixed with `/api/bom` and require an authenticated user session (verified via JWT).

| Method | Route | Access Role | Description |
|---|---|---|---|
| `GET` | `/api/bom` | Any Authenticated | Lists all Bills of Materials. Filters out inactive BoMs by default unless query parameter `?includeInactive=true` is provided. |
| `GET` | `/api/bom/:id` | Any Authenticated | Retrieves structural details of a specific BoM, including its component materials and operation stages. |
| `GET` | `/api/bom/product/:productId` | Any Authenticated | Fetches the active BoM configuration for a product. Returns `404 Not Found` if no active BoM exists. |
| `POST` | `/api/bom` | `ADMIN`, `MANUFACTURING_USER` | Atomically creates a new BoM recipe. |
| `PUT` | `/api/bom/:id` | `ADMIN`, `MANUFACTURING_USER` | Atomically updates components/operations. Overwrites old lines. |
| `DELETE` | `/api/bom/:id` | `ADMIN`, `MANUFACTURING_USER` | Performs a soft-delete by deactivating the BoM (`isActive = false`). |

---

## Validation Rules

Before writing to the database, the validation engine (`backend/src/modules/bom/bom.validation.js`) checks:
1. **Payload Structure**: The payload must define `productId`, `version`, a non-empty `components` array, and a non-empty `operations` array.
2. **Existences**:
   - The finished product `productId` must exist.
   - All component `productId`s must exist.
   - All work center `workCenterId`s must exist.
3. **Numeric Bounds**:
   - Component quantities must be positive numbers (`qty > 0`).
   - Operation durations must be positive integers (`durationMins > 0`).
   - Operation sequences must be positive integers (`sequence > 0`).
4. **Sequence Uniqueness**: Operation sequence numbers within a single BoM must be unique (e.g. no two operations can share sequence `1`).
5. **Circular Dependency Guards**:
   - **Self-Reference Guard**: A finished product cannot be a component of its own BoM recipe.
   - **Recursive Circular Guard**: The engine recursively traverses the active component tree. If Product A contains Product B as a component, B cannot have an active BoM containing A. This guards against infinite loops during manufacturing assembly calculations.

---

## RBAC Rules

- **Read Access**: Any logged-in user with a valid JWT session can query BoMs.
- **Write Access**: Restricted to `ADMIN` and `MANUFACTURING_USER` roles only. Any request to create, update, or deactivate a BoM from other roles will receive a `403 Forbidden` response.

---

## BoM Lifecycle

1. **Creation**: Written to the database as either active or inactive. Audit log `BOM_CREATED` is logged.
2. **Active State**: In active state, the BoM is eligible to be referenced by new Manufacturing Orders.
3. **Deactivation (Soft Delete)**: The BoM is never hard deleted if it has records. A `DELETE` request sets `isActive = false` and registers `BOM_DEACTIVATED`. This maintains database referential integrity for historic reports and archiving.

---

## Active BoM Logic

To maintain predictability in automated manufacturing, **a product can have at most one active BoM at a time**.
- During creation (`POST`) or modification (`PUT`), if the BoM is set to active (`isActive: true`), a database transaction is triggered.
- It updates all other existing BoMs for that specific product to `isActive: false` before writing or updating the target BoM.

---

## Manufacturing Lock Logic

Modifying or deactivating a recipe that is actively running on the production floor would corrupt pending inventory updates and stock projections.
- Before executing a `PUT` (update) or `DELETE` (deactivation), the service queries the database for pending or confirmed manufacturing orders using that BoM:
  ```js
  const activeMoCount = await prisma.manufacturingOrder.count({
    where: { bomId, status: { in: ['CONFIRMED', 'IN_PROGRESS'] } }
  });
  ```
- If `activeMoCount > 0`, the operation is aborted, throwing a `400 Bad Request` block with the message: *`Cannot edit or delete this Bill of Materials because it is currently referenced by active/confirmed Manufacturing Orders.`*
