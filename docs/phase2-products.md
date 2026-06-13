# Phase 2: Products & Procurement Specifications

This document outlines the Product catalog structure, procurement configuration settings, stock calculation rules, and partner records (Customers, Vendors, Work Centers) implemented in Phase 2.

---

## Product Specifications & Stock Calculations

The product module is the center of the inventory ledger.
- **SKU**: A unique string code identifying the item (e.g. `OAK-DESK-01`). Once set, it cannot be modified to protect ledger integrity.
- **Stock Math**:
  - `onHandQty`: Total physical stock in the warehouse.
  - `reservedQty`: Stock allocated to confirmed sales orders that have not yet been delivered.
  - **Computed Field (`freeToUseQty`)**: Always dynamically computed as:
    $$\text{freeToUseQty} = \text{onHandQty} - \text{reservedQty}$$
    This computed value is returned in all read endpoints.

---

## Procurement Configuration

Products support custom procurement rules to allow automation:
1. **Procure on Demand (MTO)**: If active (`procureOnDemand = true`), any sales order confirmation that causes a stock shortage will immediately trigger replenishment. If inactive (`false`), it is Make to Stock (MTS), relying on reordering points.
2. **Procurement Source**:
   - `PURCHASE`: replenishment triggers a Purchase Order (PO).
   - `MANUFACTURING`: replenishment triggers a Manufacturing Order (MO).

---

## Supplier/Vendor Relations

- **ProductVendor Map**: Connects Products to Vendors with a supplier-specific `unitPrice` (purchase cost).
- **Default Procurement Option**: The first supplier listed in the product's vendor list is chosen as the default partner for auto-generating purchase orders.

---

## Partner Models

To support procurement and production, Phase 2 added:
1. **Customers**: Commercial sales partners (Name, Email, Phone, Address).
2. **Vendors**: Suppliers of raw materials and parts.
3. **Work Centers**: Physical production lines and workstations (e.g. "Assembly Line A", "Varnish Station") that host manufacturing operations.
