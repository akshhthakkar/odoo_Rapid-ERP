# Phase 8: Inventory & Stock Ledger Specifications

This document outlines the stock tracking schema, physical movement types, running balance calculations, metrics aggregation, filters, and multi-tenant isolation boundaries implemented in Phase 8 for the Inventory Stock Ledger.

---

## Endpoints

All endpoints are prefixed with `/api/inventory/ledger` and require a valid authenticated session.

| Method | Route | Access Role | Description |
|---|---|---|---|
| `GET` | `/api/inventory/ledger` | `ADMIN`, `INVENTORY_MANAGER`, `BUSINESS_OWNER` | Computes the opening/closing balance, running balance rows, and metrics for a specific product and optional warehouse. |
| `GET` | `/api/inventory/ledger/export` | `ADMIN`, `INVENTORY_MANAGER`, `BUSINESS_OWNER` | Generates a downloadable CSV, XLSX, or PDF report of the filterable stock ledger. Scoped to `tenantId`. |

---

## Stock Movement Schema & Physical Types

The Stock Ledger tracks physical inventory changes using the `StockMovement` table. Every inventory-affecting operation must register an entry. The engine filters on the following physical movement types:

1. `PURCHASE_RECEIPT` (+): Increments physical stock upon receiving items from vendors.
2. `SALE_DELIVERY` (-): Decrements physical stock upon shipping orders to customers.
3. `MANUFACTURING_CONSUME` (-): Decrements physical stock of raw material components when starting production.
4. `MANUFACTURING_PRODUCE` (+): Increments physical stock of the finished product upon completing a manufacturing order.
5. `STOCK_ADJUSTMENT` (+/-): Represents manual stock adjustments (increases or decreases) made by inventory managers.
6. `WAREHOUSE_TRANSFER_OUT` (-): Decrements stock at the source warehouse during internal transfers.
7. `WAREHOUSE_TRANSFER_IN` (+): Increments stock at the destination warehouse during internal transfers.

*Note: Stock reservation triggers (`SALE_RESERVE` / `SALE_RELEASE`) are virtual allocations and are excluded from the physical stock ledger calculations to avoid corrupting on-hand reconciliation.*

---

## Ledger Math & Running Balance Calculations

When the `/api/inventory/ledger` endpoint is hit with a target `productId`, the engine executes the following computational routine:

### 1. Opening Balance Calculation
Calculates the starting stock before the requested `startDate` (default is beginning of time):
$$\text{Opening Stock} = \sum \text{qty} \text{ of all physical movements where } \text{createdAt} < \text{startDate}$$

### 2. Chronological Movement Query
Queries all physical movements between `startDate` and `endDate` (default is now), sorted ascending by creation timestamp:
$$\text{Movements} = \text{Query } \text{StockMovement} \text{ where } \text{createdAt} \in [\text{startDate}, \text{endDate}] \text{ order by } \text{createdAt} \text{ asc}$$

### 3. Running Balance Building
Loops through the query results in chronological order. For each movement row, the system calculates the balance:
$$\text{Running Balance}_i = \text{Running Balance}_{i-1} + \text{qty}_i \quad (\text{with } \text{Running Balance}_0 = \text{Opening Stock})$$
This running balance is saved directly on each row item returned to the client.

### 4. Closing Balance & Net Change
The final running balance at the end of the loop becomes the closing balance:
$$\text{Closing Stock} = \text{Opening Stock} + \sum_{i=1}^N \text{qty}_i$$
$$\text{Net Change} = \text{Closing Stock} - \text{Opening Stock}$$

---

## Metrics Aggregation

In addition to individual row items, the ledger endpoint aggregates total inflow and outflow counts within the selected date range:
* **Purchases**: Total sum of incoming quantities from `PURCHASE_RECEIPT` movements.
* **Sales**: Total sum of outgoing quantities from `SALE_DELIVERY` movements.
* **Manufacturing Produced**: Total sum of finished quantities from `MANUFACTURING_PRODUCE` movements.
* **Manufacturing Consumed**: Total sum of raw quantities from `MANUFACTURING_CONSUME` movements.
* **Adjustments**: Net sum of physical quantities from `STOCK_ADJUSTMENT` movements.
* **Transfers**: Net sum of internal quantities from `WAREHOUSE_TRANSFER_OUT` and `WAREHOUSE_TRANSFER_IN` movements.

---

## Reconciliation Guard

To prevent ledger mismatches, the database product table's `onHandQty` is routinely reconciled. The closing balance calculated by the ledger engine for a product across all warehouses at the current timestamp must match the `onHandQty` stored in the product catalog database:
$$\text{Closing Balance (Global, Now)} \equiv \text{Product.onHandQty}$$

---

## Filters & Scopes

The endpoint supports three primary filters:
1. **`productId` (Required)**: Scopes calculations to a single product.
2. **`warehouseId` (Optional)**: Filters calculations to a specific warehouse location. If omitted, global numbers across all warehouses are returned.
3. **`startDate` / `endDate` (Optional)**: Restricts movement rows to a specific date range.

---

## Multi-Tenant Isolation

1. **Tenant Scope**: The query filters `StockMovement` records by `tenantId` match.
2. **Security Block**: If User A requests the ledger for a `productId` belonging to Tenant B, the service rejects the request with a `404 Not Found` response.
