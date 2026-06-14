# Transaction Flow Report — Rapid ERP

This report maps out every interactive transaction block (`prisma.$transaction`) across the codebase, identifying the exact database queries, helper invocations, and async operations occurring within them.

---

## 1. Purchase Service (`purchase.service.js`)

### A. `createPurchaseOrder`
* **Transaction Start**: `prisma.$transaction(async (tx) => {` (Interactive)
* **Queries Executed**:
  1. `tx.purchaseOrder.count` (inside `generateRef`)
  2. `tx.purchaseOrder.create`
  3. `tx.auditLog.create` (inside `logAudit`)
* **Helpers Called**:
  - `generateRef("PO", tenantId, tx)`
  - `logAudit(..., tx)`
* **Async Calls**: None external. All database statements `await`ed sequentially.
* **Promise.all / Parallelism**: None.
* **Transaction End**: Returns created PO.

### B. `confirmPurchaseOrder`
* **Transaction Start**: `prisma.$transaction(async (tx) => {` (Interactive)
* **Queries Executed**:
  1. `tx.purchaseOrder.update`
  2. `tx.auditLog.create` (inside `logAudit`)
* **Helpers Called**:
  - `logAudit(..., tx)`
* **Async Calls**: None.
* **Promise.all**: None.
* **Transaction End**: Returns updated PO.

### C. `receiveGoods`
* **Transaction Start**: `prisma.$transaction(async (tx) => {` (Interactive)
* **Queries Executed**:
  1. `tx.purchaseReceipt.create`
  2. Sequential Loop (for each receipt line):
     - `tx.purchaseOrderLine.update`
     - `tx.warehouse.findFirst` (inside `updateInventoryBalance` inside `receiveStock`)
     - `tx.inventoryBalance.findUnique` (inside `updateInventoryBalance`)
     - `tx.inventoryBalance.create` or `tx.inventoryBalance.update` (inside `updateInventoryBalance`)
     - `tx.product.update` (inside `receiveStock`)
     - `tx.purchaseOrder.findFirst` (inside `receiveStock`)
     - `tx.stockMovement.create` (inside `receiveStock`)
  3. `tx.purchaseOrderLine.findMany` (fresh status check)
  4. `tx.purchaseOrder.update` (PO status transition)
  5. `tx.auditLog.create` (inside `logAudit`)
* **Helpers Called**:
  - `receiveStock(productId, receivedQty, unitCost, poId, tenantId, null, tx)`
  - `logAudit(..., tx)`
* **Async Calls**: None.
* **Promise.all**: None.
* **Transaction End**: Returns updated PO.

### D. `cancelPurchaseOrder`
* **Transaction Start**: `prisma.$transaction(async (tx) => {` (Interactive)
* **Queries Executed**:
  1. `tx.purchaseOrder.update`
  2. `tx.auditLog.create` (inside `logAudit`)
* **Helpers Called**:
  - `logAudit(..., tx)`
* **Async Calls**: None.
* **Promise.all**: None.
* **Transaction End**: Returns cancelled PO.

---

## 2. Manufacturing Service (`manufacturing.service.js`)

### A. `createManufacturingOrder`
* **Transaction Start**: `prisma.$transaction(async (tx) => {` (Interactive)
* **Queries Executed**:
  1. `tx.manufacturingOrder.count` (inside `generateRef`)
  2. `tx.manufacturingOrder.create`
  3. `tx.auditLog.create` (inside `logAudit`)
* **Helpers Called**:
  - `generateRef("MO", tenantId, tx)`
  - `logAudit(..., tx)`
* **Transaction End**: Returns created MO.

### B. `confirmManufacturingOrder`
* **Transaction Start**: `prisma.$transaction(async (tx) => {` (Interactive)
* **Queries Executed**:
  1. `tx.manufacturingOrder.update`
  2. `tx.auditLog.create` (inside `logAudit`)
* **Helpers Called**:
  - `logAudit(..., tx)`
* **Transaction End**: Returns updated MO.

### C. `startManufacturingOrder`
* **Transaction Start**: `prisma.$transaction(async (tx) => {` (Interactive)
* **Queries Executed**:
  1. Sequential Loop (for each component):
     - `tx.warehouse.findFirst` (inside `updateInventoryBalance` inside `consumeStock`)
     - `tx.inventoryBalance.findUnique` (inside `updateInventoryBalance`)
     - `tx.inventoryBalance.create` or `tx.inventoryBalance.update` (inside `updateInventoryBalance`)
     - `tx.product.update` (inside `consumeStock`)
     - `tx.manufacturingOrder.findFirst` (inside `consumeStock` to fetch ref)
     - `tx.stockMovement.create` (inside `consumeStock`)
     - `tx.manufacturingComponent.update` (outside `consumeStock`)
  2. `tx.workOrder.update` (start first work order)
  3. `tx.auditLog.create` (WORK_ORDER_STARTED audit)
  4. `tx.manufacturingOrder.update` (status -> IN_PROGRESS)
  5. `tx.auditLog.create` (MO_STARTED audit)
  6. `tx.auditLog.create` (MANUFACTURING_CONSUME audit)
* **Helpers Called**:
  - `consumeStock(comp.productId, comp.qtyRequired, mo.id, tenantId, null, tx)`
  - `logAudit(..., tx)`
* **Transaction End**: Returns updated MO.

### D. `completeManufacturingOrder`
* **Transaction Start**: `prisma.$transaction(async (tx) => {` (Interactive)
* **Queries Executed**:
  1. `tx.warehouse.findFirst` (inside `updateInventoryBalance` inside `produceStock`)
  2. `tx.inventoryBalance.findUnique` (inside `updateInventoryBalance`)
  3. `tx.inventoryBalance.create` or `update` (inside `updateInventoryBalance`)
  4. `tx.product.update` (inside `produceStock`)
  5. `tx.manufacturingOrder.findFirst` (inside `produceStock`)
  6. `tx.stockMovement.create` (inside `produceStock`)
  7. If Sales Order MTO link exists:
     - `tx.salesOrderLine.findFirst`
     - `tx.product.findFirst` (inside `reserveStock`)
     - `tx.product.update` (inside `reserveStock`)
     - `tx.salesOrder.findFirst` (inside `reserveStock`)
     - `tx.stockMovement.create` (inside `reserveStock`)
     - `tx.salesOrderLine.update` (inside complete MO execution)
  8. `tx.manufacturingOrder.update` (status -> DONE)
  9. `tx.auditLog.create` (FINISHED_GOODS_PRODUCED audit)
  10. `tx.auditLog.create` (MANUFACTURING_COMPLETED audit)
* **Helpers Called**:
  - `produceStock(mo.productId, mo.qty, mo.id, tenantId, null, tx)`
  - `reserveStock(mo.productId, mo.qty, mo.salesOrderId, tenantId, tx)`
  - `logAudit(..., tx)`
* **Transaction End**: Returns completed MO.

### E. `cancelManufacturingOrder`
* **Transaction Start**: `prisma.$transaction(async (tx) => {` (Interactive)
* **Queries Executed**:
  1. `tx.manufacturingOrder.update`
  2. `tx.auditLog.create` (inside `logAudit`)
* **Helpers Called**:
  - `logAudit(..., tx)`
* **Transaction End**: Returns cancelled MO.

---

## 3. Inventory Service (`inventory.service.js`)

### A. `createStockTransfer`
* **Transaction Start**: `prisma.$transaction(async (tx) => {` (Interactive)
* **Queries Executed**:
  1. `tx.stockTransfer.count` (inside `generateRef`)
  2. `tx.stockTransfer.create`
  3. Sequential Loop (for each line item):
     - `tx.warehouse.findFirst` (inside `updateInventoryBalance` inside source warehouse decrement)
     - `tx.inventoryBalance.findUnique`
     - `tx.inventoryBalance.create` or `update`
     - `tx.warehouse.findFirst` (inside `updateInventoryBalance` inside dest warehouse increment)
     - `tx.inventoryBalance.findUnique`
     - `tx.inventoryBalance.create` or `update`
     - `tx.stockTransfer.findFirst` (inside `transferStock`)
     - `tx.stockMovement.create` (WAREHOUSE_TRANSFER_OUT)
     - `tx.stockMovement.create` (WAREHOUSE_TRANSFER_IN)
  4. `tx.auditLog.create` (inside `logAudit`)
* **Helpers Called**:
  - `generateRef("TRA", tenantId, tx)`
  - `transferStock(productId, qty, sourceId, destId, transferId, tenantId, tx)`
  - `logAudit(..., tx)`
* **Transaction End**: Returns completed stock transfer.

### B. `createInventoryAdjustment`
* **Transaction Start**: `prisma.$transaction(async (tx) => {` (Interactive)
* **Queries Executed**:
  1. `tx.inventoryAdjustment.count` (inside `generateRef`)
  2. `tx.inventoryAdjustment.create`
  3. Sequential Loop (for each line item):
     - `tx.warehouse.findFirst` (inside `updateInventoryBalance` inside `adjustStock`)
     - `tx.inventoryBalance.findUnique`
     - `tx.inventoryBalance.create` or `update`
     - `tx.product.update` (inside `adjustStock`)
     - `tx.stockMovement.create` (inside `adjustStock`)
  4. `tx.auditLog.create` (inside `logAudit`)
* **Helpers Called**:
  - `generateRef("ADJ", tenantId, tx)`
  - `adjustStock(productId, qty, tenantId, warehouseId, reason, adjustmentId, tx)`
  - `logAudit(..., tx)`
* **Transaction End**: Returns completed adjustment.
