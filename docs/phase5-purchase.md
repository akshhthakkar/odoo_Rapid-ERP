# Phase 5: Purchase Management & Goods Receipt Specifications

This document outlines the endpoints, validation layers, multi-receipt logging tables, inventory cost tracking, and lock guards implemented for the Purchase Order (PO) module and Goods Receipt Engine.

---

## Endpoints

All endpoints are prefixed with `/api/purchase` and require an authenticated user session (verified via JWT).

| Method | Route | Access Role | Description |
|---|---|---|---|
| `GET` | `/api/purchase` | `ADMIN`, `PURCHASE_USER`, `BUSINESS_OWNER`, `INVENTORY_MANAGER` | Lists all Purchase Orders scoped to the tenant. Supports filtering by status, vendor, and auto-generated flag. |
| `GET` | `/api/purchase/:id` | `ADMIN`, `PURCHASE_USER`, `BUSINESS_OWNER`, `INVENTORY_MANAGER` | Retrieves detailed fields of a specific Purchase Order, including line items (ordered, received, remaining), receipt history events, audit trail, and linked Sales Order details. |
| `POST` | `/api/purchase` | `ADMIN`, `PURCHASE_USER` | Creates a new Purchase Order draft. |
| `POST` | `/api/purchase/:id/confirm` | `ADMIN`, `PURCHASE_USER` | Confirms the Purchase Order (transitions status `DRAFT` ➔ `SENT`). |
| `POST` | `/api/purchase/:id/receive` | `ADMIN`, `PURCHASE_USER`, `INVENTORY_MANAGER` | Registers goods arrival (partial or full). Transactionally updates stock on-hand, updates purchase costs, and logs detailed receipt records. |
| `POST` | `/api/purchase/:id/cancel` | `ADMIN`, `PURCHASE_USER` | Cancels the Purchase Order (transitions status `DRAFT` / `SENT` ➔ `CANCELLED`). |

---

## Purchase Order Lifecycle

The status of a Purchase Order transitions strictly along the following state machine:

```
    DRAFT ──(Confirm)──► SENT ──(Receive Partial)──► PARTIALLY_RECEIVED
      │                    │                              │
      │                    ├──(Receive All)               ├──(Receive Rest)
      ▼                    ▼                              ▼
  CANCELLED            CANCELLED                       RECEIVED
```

1. **DRAFT**: The initial state. Line items, costs, and dates can be freely edited. No physical stock is updated.
2. **SENT**: The purchase order is confirmed and shared with the supplier. The order is locked for editing. Goods receipts can now be accepted.
3. **PARTIALLY_RECEIVED**: Goods receipt registered, but some lines or quantities remain outstanding.
4. **RECEIVED**: All ordered quantities have been successfully received and added to warehouse inventory.
5. **CANCELLED**: The purchase order is terminated. Only allowed if zero goods have been received.

---

## Transactional Goods Receipt & Multi-Receipt Engine

Unlike simple systems that overwrite counts, the engine records the full chronological history of incoming shipments via two relational models:

### 1. PurchaseReceipt
A header record representing a single goods arrival event:
- `id`: Autoincrementing key.
- `tenantId`: Tenant context.
- `purchaseOrderId`: Associated PO.
- `receivedById`: The warehouse user who checked in the goods.
- `receivedAt`: Timestamp of arrival.
- `notes`: Optional remarks (e.g. "Arrived on Truck A").

### 2. PurchaseReceiptLine
Line items representing individual product quantities within a receipt event:
- `purchaseReceiptId`: Parent link.
- `purchaseOrderLineId`: Target PO line.
- `productId`: Received item.
- `qty`: Quantity delivered.

---

## Inventory Cost Tracking & Stock Updates

Upon registering a receipt, the system triggers a secure transaction that completes three actions:

1. **Increment On-Hand Inventory**:
   Increments the product's physical `onHandQty` in the database.
2. **Update Cost Price**:
   Sets the product's `lastPurchaseCost` to match the `unitCost` of the incoming PO line item. This ensures immediate reflection of actual unit pricing in stock valuations.
3. **Log Stock Ledger**:
   Records a physical `PURCHASE_RECEIPT` stock movement (positive quantity) in the stock ledger for audit tracking.

---

## Safety Guards & Edit Locks

To maintain absolute financial and inventory accuracy, the engine enforces several constraints:

1. **The PO Edit Lock**:
   Before updating or deleting any Purchase Order, the service verifies its status and receipt counts. If status is `PARTIALLY_RECEIVED` or `RECEIVED` (or if `receipts.length > 0`), any edit or cancellation is aborted (`400 Bad Request` with the message: *`Cannot modify a Purchase Order that has already received inventory`*).
2. **Over-Receipt Block**:
   When registering a delivery, the user-submitted quantity is checked against the line's remaining quantity ($qty - receivedQty$). If the input exceeds the remaining balance, the transaction is rejected with an error.
3. **Cancellation Lock**:
   A purchase order cannot be cancelled if any partial deliveries have already been registered.
4. **Tenant Isolation**:
   Purchase orders, lines, receipts, and products are strictly isolated by `tenantId`. A user from Tenant A attempting to fetch or modify a PO from Tenant B will receive a `404 Not Found` response.
5. **MTO Clickable Traceability**:
   For auto-generated POs triggered by Sales shortages, the `salesOrderId` is stored in the database, allowing the frontend to present a clickable, contextual link back to the originating Sales Order (`SO-XXXX`).
