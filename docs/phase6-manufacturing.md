# Phase 6: Manufacturing Module Specifications

This document describes the Manufacturing Order (MO) lifecycle, Bill of Materials (BoM) resolution, Work Order sequential execution, stock consumption and production mechanics, and transactional safeguards implemented in Phase 6.

---

## Endpoints

All endpoints are prefixed with `/api/manufacturing` and require an authenticated session (verified via JWT).

| Method | Route | Access Role | Description |
|---|---|---|---|
| `GET` | `/api/manufacturing` | All Authenticated | Lists all Manufacturing Orders scoped to the tenant. Supports status and product filtering. |
| `GET` | `/api/manufacturing/:id` | All Authenticated | Retrieves detailed fields of a specific MO, including components, work orders sorted by sequence, progress percentage, and chronological audit trail. |
| `POST` | `/api/manufacturing` | `ADMIN`, `MANUFACTURING_USER` | Creates a new Manufacturing Order draft. Auto-generates reference numbers (`MO-XXXX`). |
| `POST` | `/api/manufacturing/:id/confirm` | `ADMIN`, `MANUFACTURING_USER` | Confirms the Manufacturing Order, locking the bill of materials, expected component quantities, and work order operations. |
| `POST` | `/api/manufacturing/:id/start` | `ADMIN`, `MANUFACTURING_USER` | Verifies material stock levels, transactionally consumes raw materials, updates stock records, and kicks off the production line by starting the first Work Order. |
| `POST` | `/api/manufacturing/:id/work-orders/:woId/start` | `ADMIN`, `MANUFACTURING_USER` | Starts a specific Work Order operation. |
| `POST` | `/api/manufacturing/:id/work-orders/:woId/complete` | `ADMIN`, `MANUFACTURING_USER` | Marks a Work Order operation as completed. Automatically triggers the next Work Order in sequence if applicable. |
| `POST` | `/api/manufacturing/:id/complete` | `ADMIN`, `MANUFACTURING_USER` | Completes the MO. Transactionally increments finished goods on-hand inventory, updates cost records, and logs the final production movements. |
| `POST` | `/api/manufacturing/:id/cancel` | `ADMIN`, `MANUFACTURING_USER` | Cancels the MO. Only allowed in Draft or Confirmed states. |

---

## Manufacturing Order States

The lifecycle transitions strictly along the following state machine:

```
    DRAFT ──(Confirm)──► CONFIRMED ──(Start / Consume)──► IN_PROGRESS ──(Complete All)──► DONE
      │                      │                                                          
      ▼                      ▼                                                          
  CANCELLED              CANCELLED                                                      
```

1. **DRAFT**: Initial draft phase. Edit finished product, quantities, scheduling, and notes. No stock is reserved or consumed.
2. **CONFIRMED**: Component requirements and work order operations are frozen based on the active BoM.
3. **IN_PROGRESS**: Raw material components have been physically consumed from inventory. Work centers are executing operations in sequence.
4. **DONE**: Finished goods are added to on-hand inventory. All work orders are complete. The order is locked.
5. **CANCELLED**: The order is aborted.

---

## Work Order Sequential Execution

Work Orders represent assembly steps performed at specific Work Centers. The engine enforces strict sequencing rules:
1. **Creation**: When an MO is created, its operations are copied from the active BoM. Each operation maps to a `WorkOrder` with sequence values (e.g., `10`, `20`, `30`).
2. **First Operation**: Starting the MO (`/api/manufacturing/:id/start`) transitions the first Work Order in the sequence from `PENDING` to `IN_PROGRESS` and logs `startedAt`.
3. **Sequence Enforcer**: A Work Order cannot be started (`/api/manufacturing/:id/work-orders/:woId/start`) if any prior Work Order in the sequence is not in `DONE` status. The API will abort with a `400 Bad Request` block.
4. **Completion Flow**: Completing a Work Order transitions its status to `DONE` and logs `completedAt`. The system then checks if there is a next pending Work Order in the sequence and starts it automatically.
5. **MO Completion Guard**: The top-level MO cannot transition to `DONE` until all associated Work Orders have successfully completed execution.

---

## Stock Actions: Consumption & Production

The Manufacturing Module coordinates with the Stock Engine (`backend/src/utils/stockEngine.js`) to complete two atomic actions during production:

### 1. Raw Materials Consumption (On Start)
When transitioning from `CONFIRMED` to `IN_PROGRESS`:
* The system checks if the on-hand stock of each component is sufficient to cover the required quantities ($qtyRequired = BoMComponent.qty \times MO.qty$).
* If any shortage is detected, the transaction is rejected with a list of missing items.
* Upon validation, the engine decrements the raw materials' physical `onHandQty` and registers a `MO_CONSUMPTION` stock movement (negative quantity).
* The component line's `qtyConsumed` is updated to match `qtyRequired`.

### 2. Finished Goods Production (On Complete)
When all operations are finished and the MO is completed:
* The system increments the finished product's physical `onHandQty` by the manufactured quantity.
* A `MO_PRODUCTION` stock movement (positive quantity) is logged in the ledger.
* The system updates the product's `lastCostPrice` to align with the estimated BoM cost if required.
* The MO transitions to `DONE` and `completedAt` timestamp is recorded.

---

## Validation Guards & Multi-Tenancy

1. **Active Recipe Check**: An MO can only be created if the finished product has a defined, active `BoM` recipe.
2. **Tenant Isolation**: Every database write (MO, Work Orders, Components, Stock Movements) is tagged with a `tenantId`. Users can only query or execute MOs belonging to their tenant.
3. **Cancel Lock**: Once manufacturing has started and raw materials are consumed (`IN_PROGRESS`), the MO cannot be cancelled. Cancelling is only supported in `DRAFT` or `CONFIRMED` states.
