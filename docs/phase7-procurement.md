# Phase 7: Procurement Automation (MTO Engine) Specifications

This document outlines the Make-to-Order (MTO) replenishment engine, supplier routing, BoM resolution, nested operations generation, error handling, and traceability linking implemented in Phase 7.

---

## Make-to-Order (MTO) Workflow

The MTO engine (`backend/src/utils/procurementEngine.js`) automates replenishment to prevent stockouts of ordered finished products and sub-assemblies.

```
       Sales Order Confirmed
                 │
      Check Available Free Stock
        (OnHand - Reserved)
                 │
       Shortage Detected? (Qty > Free)
                 │
         ┌───────┴───────┐
        Yes              No
         │               │
  procureOnDemand?    No Action
     (MTO Active)
         │
   Check Source Type
         ├───────────────────────────────┐
     PURCHASE                      MANUFACTURING
         │                               │
 Cheapest Vendor?                   Active BoM?
         │                               │
  Auto-Create PO                   Auto-Create MO
  (Status: DRAFT)                  (Status: DRAFT)
```

---

## Procurement Routes

When a shortage is identified and the product has `procureOnDemand = true`, the engine triggers one of two routes:

### 1. Purchase Route (`procurementType = 'PURCHASE'`)
If the product is sourced from external suppliers:
1. **Cheapest Supplier Mapping**: The system queries the `ProductVendor` table for all suppliers linked to the product.
2. **Sorting Logic**: The list is sorted by unit price, selecting the vendor with the lowest price (`unitPrice`).
3. **Draft Purchase Order Creation**: The system generates a new PO in `DRAFT` status containing:
   * A unique auto-incremented reference number (e.g., `PO-XXXX`).
   * A single PO line item for the shortage quantity at the vendor's price.
   * Direct foreign key linkage (`salesOrderId`) pointing back to the initiating Sales Order.
   * Notes indicating the order was automatically generated.
4. **Audit Logging**: Creates an audit log entry tagged with `PURCHASE_ORDER_AUTO_CREATED`.

### 2. Manufacturing Route (`procurementType = 'MANUFACTURING'`)
If the product is produced internally on the production floor:
1. **Active recipe lookup**: The system searches for the active `BoM` configuration linked to the product.
2. **Draft Manufacturing Order Creation**: The system generates a new MO in `DRAFT` status containing:
   * A unique reference number (e.g., `MO-XXXX`).
   * Nested `WorkOrder` records auto-copied from the BoM's operation steps.
   * Nested raw component requirements ($qtyRequired = BoMComponent.qty \times shortageQty$).
   * Direct foreign key linkage (`salesOrderId`).
3. **Audit Logging**: Creates an audit log entry tagged with `MANUFACTURING_ORDER_AUTO_CREATED`.

---

## Validation Guards & Error Handling

To protect procurement integrity, the engine enforces strict transactional guards. If a guard fails, the transaction is rolled back, and the Sales Order confirmation is blocked with a descriptive error message:

1. **Missing Vendor Guard**:
   * *Trigger*: Product is configured for MTO `PURCHASE` replenishment, but no vendor is linked in `ProductVendor`.
   * *Error*: *`MTO Purchase replenishment failed: No suppliers are linked to product "[name]" ([sku]). Please link a vendor before confirming.`*
2. **Missing BoM Guard**:
   * *Trigger*: Product is configured for MTO `MANUFACTURING` replenishment, but no active BoM is defined.
   * *Error*: *`MTO Manufacturing replenishment failed: No active Bill of Materials (BoM) defined for product "[name]" ([sku]). Please create an active BoM before confirming.`*

---

## Direct Traceability & Clickable Linking

1. **Foreign Key Mapping**: The generated PO and MO tables include a `salesOrderId` foreign key.
2. **UX Linking**: The frontend detail views parse this field. If a PO or MO contains a `salesOrderId`, the UI renders a clickable navigation link back to the originating Sales Order (`SO-XXXX`).
3. **Audit Context**: Audit logs for auto-created documents link both `salesOrderId` and `purchaseOrderId`/`manufacturingOrderId`, providing a comprehensive timeline trail of demand-to-delivery generation.
