# Mini-ERP

Mini-ERP is a full-stack Enterprise Resource Planning (ERP) application. It is designed to handle core business operations including Sales, Purchasing, Manufacturing, and Inventory Management, all supported by a robust Role-Based Access Control (RBAC) system.

## Features

- **Role-Based Access Control (RBAC):** Distinct roles for Admin, Sales, Purchase, Manufacturing, Inventory Management, and Business Owners.
- **Product & Inventory Management:** Track stock levels, reserve components, and auto-trigger procurement based on demand.
- **Sales Flow:** Create Sales Orders, check stock availability, and automatically trigger procurement (Purchase or Manufacturing) if stock is insufficient.
- **Purchase Flow:** Manage vendors, create Purchase Orders, and receive materials into inventory.
- **Manufacturing Flow:** Manage Bill of Materials (BoM), Work Centers, Work Orders, and Manufacturing Orders. Tracks raw material consumption and finished goods production.
- **Stock Ledger & Audit Logs:** A comprehensive stock ledger for tracking all inventory movements, combined with detailed audit logs for actions taken across modules.
- **Dashboard & KPIs:** Centralized dashboard to view pending deliveries, low stock alerts, sales orders, purchase orders, and inventory status.

## Architecture & Flow

The following diagram illustrates the overall system flow and interactions between different modules:

```mermaid
flowchart TD

    U[User Login]
    RBAC[Role Based Access Control]

    U --> RBAC

    RBAC --> P[Product Module]
    RBAC --> S[Sales Module]
    RBAC --> PU[Purchase Module]
    RBAC --> M[Manufacturing Module]
    RBAC --> I[Inventory Module]
    RBAC --> D[Dashboard]

    %% PRODUCT
    P --> INV[(Inventory)]

    %% SALES FLOW
    S --> SO[Create Sales Order]
    SO --> CHECK{Stock Available?}

    CHECK -->|Yes| RESERVE[Reserve Stock]
    CHECK -->|No| PROCURE[Trigger Procurement]

    RESERVE --> DELIVER[Deliver Product]
    DELIVER --> STOCKOUT[Reduce Inventory]

    %% PROCUREMENT
    PROCURE --> TYPE{Procurement Type}

    TYPE -->|Purchase| AUTOPO[Auto Purchase Order]
    TYPE -->|Manufacturing| AUTOMO[Auto Manufacturing Order]

    %% PURCHASE FLOW
    PU --> PO[Create Purchase Order]
    AUTOPO --> PO

    PO --> RECEIVE[Receive Materials]
    RECEIVE --> STOCKIN[Increase Inventory]

    %% MANUFACTURING FLOW
    M --> MO[Manufacturing Order]
    AUTOMO --> MO

    MO --> BOM[Fetch BoM]

    BOM --> COMPONENTS[Reserve Components]
    COMPONENTS --> WO[Generate Work Orders]

    WO --> WC1[Assembly]
    WC1 --> WC2[Painting]
    WC2 --> WC3[Packing]

    WC3 --> FG[Finished Goods Produced]

    FG --> STOCKFG[Increase Finished Goods Stock]
    FG --> RAWMAT[Consume Raw Materials]

    %% INVENTORY
    INV --> LEDGER[Stock Ledger]

    STOCKOUT --> LEDGER
    STOCKIN --> LEDGER
    STOCKFG --> LEDGER
    RAWMAT --> LEDGER

    %% AUDIT
    LEDGER --> AUDIT[Audit Logs]

    SO --> AUDIT
    PO --> AUDIT
    MO --> AUDIT

    %% DASHBOARD
    AUDIT --> D

    D --> KPI1[Sales Orders]
    D --> KPI2[Pending Deliveries]
    D --> KPI3[Purchase Orders]
    D --> KPI4[Manufacturing Orders]
    D --> KPI5[Low Stock Alerts]
    D --> KPI6[Inventory Status]
```

## Tech Stack

- **Backend:** Node.js with [Prisma ORM](https://www.prisma.io/) (PostgreSQL)
- **Frontend:** Modern JavaScript/TypeScript framework (details in the frontend directory)
- **Database:** PostgreSQL

## Getting Started

1. Navigate to the `backend` directory.
2. Install dependencies.
3. Configure your `.env` file with `DATABASE_URL`.
4. Run Prisma migrations: `npx prisma migrate dev`.
5. Start the backend server.
6. Navigate to the `frontend` directory, install dependencies, and start the client.