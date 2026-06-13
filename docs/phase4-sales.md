# Phase 4: Sales Module & Stock Engine Specifications

This document outlines the endpoints, validation layers, stock reservation mechanisms, MTO auto-replenishment triggers, and lifecycle states implemented for the Sales Order (SO) module and Stock Engine.

---

## Endpoints

All endpoints are prefixed with `/api/sales` and require an authenticated user session (verified via JWT).

| Method | Route | Access Role | Description |
|---|---|---|---|
| `GET` | `/api/sales` | All Authenticated | Lists all Sales Orders scoped to the tenant. Supports filtering by status and customer. |
| `GET` | `/api/sales/:id` | All Authenticated | Retrieves detailed fields of a specific Sales Order, including line items (ordered, reserved, shortage, delivered), linked procurement documents (POs, MOs), and audit history. |
| `POST` | `/api/sales` | `ADMIN`, `SALES_USER` | Creates a new Sales Order draft. |
| `POST` | `/api/sales/:id/confirm` | `ADMIN`, `SALES_USER` | Confirms the Sales Order: locks the order, reserves available warehouse stock, calculates shortages, and triggers procurement replenishment (MTO) if applicable. |
| `POST` | `/api/sales/:id/deliver` | `ADMIN`, `SALES_USER` | Records physical warehouse dispatch. Supports partial and full deliveries. Updates product quantities and logs stock movements. |
| `POST` | `/api/sales/:id/cancel` | `ADMIN`, `SALES_USER` | Cancels the Sales Order and releases all associated stock reservations back to the free pool. |

---

## Sales Order Lifecycle

The status of a Sales Order transitions strictly along the following state machine:

```
    DRAFT ──(Confirm)──► CONFIRMED ──(Deliver Partial)──► PARTIALLY_DELIVERED
      │                      │                                   │
      │                      ├──(Deliver All)                    ├──(Deliver Rest)
      ▼                      ▼                                   ▼
  CANCELLED              CANCELLED                       FULLY_DELIVERED
```

1. **DRAFT**: The initial state. Line items, pricing, and dates can be freely edited. No inventory is reserved.
2. **CONFIRMED**: The order is locked for editing. Warehouse inventory is allocated (reserved) based on availability.
3. **PARTIALLY_DELIVERED**: A warehouse delivery was registered for a subset of the order's items or quantities.
4. **FULLY_DELIVERED**: All ordered items and quantities have been successfully shipped out.
5. **CANCELLED**: The order is aborted. Any reserved stock is released.

---

## Stock Engine Integration

Sales Order confirmations, deliveries, and cancellations trigger core transactional routines in `backend/src/utils/stockEngine.js`:

### 1. Stock Reservation on Confirmation
Upon confirming an order, the system allocates physical stock from the free pool:
- Available Free Stock: $onHandQty - reservedQty$.
- **`reserveStock(productId, qty, orderId, tenantId, tx)`**:
  - Sets $toReserve = \min(qty, freeStock)$.
  - Increments product's `reservedQty` by $toReserve$.
  - Saves snapshots of `reservedQty` and `shortageQty` ($qty - toReserve$) directly on the `SalesOrderLine` record.
  - Logs a `SALE_RESERVE` stock movement (negative quantity showing reduction in free-to-use virtual stock).

### 2. Stock Reduction on Delivery
When shipping out components via **`deliverStock(productId, qty, orderId, tenantId, tx)`**:
- Decrements the product's physical `onHandQty` by $qty$.
- Decrements the product's virtual `reservedQty` by $qty$.
- Logs a physical `SALE_DELIVERY` stock movement (negative quantity).
- Logs a virtual `SALE_RELEASE` stock movement (positive quantity to show reservation release).

### 3. Stock Release on Cancellation
Cancelling a confirmed sales order releases reservations via **`releaseStock(productId, qty, orderId, tenantId, tx)`**:
- Decrements the product's virtual `reservedQty` by $qty$.
- Logs a virtual `SALE_RELEASE` stock movement (positive quantity returning to the free pool).

---

## MTO Replenishment Trigger

If confirming a Sales Order results in a shortage (`shortageQty > 0`) on any line item, the system checks the product's configuration to see if it should trigger Make-to-Order (MTO) replenishment:

If **`procureOnDemand = true`**:
1. The line item's `replenishmentStatus` transitions from `NOT_STARTED` to `TRIGGERED`.
2. **If Procurement Type is `PURCHASE`**:
   - Locates the cheapest linked supplier in the `ProductVendor` mapping table.
   - Automatically generates a draft **Purchase Order** (`PO-XXXX`) linked to this supplier.
   - Logs an audit log event `PURCHASE_ORDER_AUTO_CREATED` with the originating Sales Order ID.
3. **If Procurement Type is `MANUFACTURING`**:
   - Locates the active `BoM` for the finished product.
   - Automatically generates a draft **Manufacturing Order** (`MO-XXXX`) containing nested work orders generated from the BoM's operation steps.
   - Logs an audit log event `MANUFACTURING_ORDER_AUTO_CREATED` with the originating Sales Order ID.
4. Direct foreign key relationships (`salesOrderId` links) are established on the PO/MO, enabling the frontend to render clickable traceability links.

---

## Validation Rules

1. **Isolation Guard**: Customers and products added to sales lines must belong exclusively to the request user's `tenantId`.
2. **Numeric Validation**: Line quantities and unit prices must be positive numbers ($qty > 0$, $unitPrice \geq 0$).
3. **Duplicate Prevention**: A single product cannot be added as multiple lines within the same Sales Order.
4. **Edit Lock**: Once confirmed, partially delivered, or fully delivered, any attempt to edit, delete, or re-confirm the order will result in a `400 Bad Request` blocker.
5. **Delivery Quantities**: When registering a delivery, the user cannot input delivery quantities that exceed the remaining undelivered quantities ($qty - deliveredQty$).
