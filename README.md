# Rapid Enterprise — Multi-Tenant ERP Platform

> A full-stack Enterprise Resource Planning (ERP) platform for managing core business operations including Products, Customers, Vendors, Bill of Materials (BoM), Work Centers, Sales, Purchasing, and Inventory.

---

## App Flow & Supply Chain Engine

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

---

## Tech Stack & Premium Design

| Layer | Technology | Key Highlights |
|---|---|---|
| **Frontend** | React, Vite, Tailwind CSS, Vanilla CSS Variables | Modern typography (`Bricolage Grotesque`, `Inter`, `DM Sans`), Orange/Slate accent color scheme, responsive layouts, glassmorphism, micro-animations, and smooth scrolls (using `Lenis`). |
| **Backend** | Node.js, Express.js | Structured MVC/Modular architecture, clean error boundary handlers, schema validation, and secure route middlewares. |
| **Database** | PostgreSQL via Prisma ORM | Scalable relational design, multi-tenant tables, database constraints, indexing, and strict transaction blocks for inventory tracking. |

---

## Completed Implementations (Phases 0–5)

### Phase 0: Base Multi-Tenancy Engine
- **Logical Data Isolation**: Every data model (Users, Products, Sales, Purchases, Inventory, Audit Logs) contains a `tenantId` key to separate concurrent companies.
- **Cross-Tenant Guard**: Global validation middleware prevents cross-tenant access.

### Phase 1: Authentication & RBAC (Role-Based Access Control)
- **Tenant Registry**: Secure self-serve registration creating a new Tenant and its default Owner/Admin.
- **Secure Password Policies**: BcryptJS password hashing.
- **Invites & User Administration**: Admin-level secure invite system for role assignment. Available Roles: `ADMIN`, `SALES_USER`, `PURCHASE_USER`, `MANUFACTURING_USER`, `INVENTORY_MANAGER`, `BUSINESS_OWNER`.
- *Detailed Specifications:* See [docs/phase1-auth.md](docs/phase1-auth.md)

### Phase 2: Product Catalog & Procurement Configurations
- **Product Management**: SKU-uniqueness, product names, categories, costs, and pricing per tenant.
- **Procurement Mapping**: Configure individual products as `procureOnDemand = true/false` and bind them to a standard procurement method (`PURCHASE` or `MANUFACTURING`).
- **Product Vendor Matrices**: Map multiple suppliers to a single product with vendor-specific unit pricing.
- *Detailed Specifications:* See [docs/phase2-products.md](docs/phase2-products.md)

### Phase 3: Work Centers & Bill of Materials (BoM)
- **Work Centers Registry**: Multi-tenant operational stations (e.g., Assembly, Painting, Quality Assurance).
- **Bill of Materials (BoM)**: Link finished goods with multiple component items, raw materials, quantities, and sequence-based Work Center operations (durations in minutes).
- *Detailed Specifications:* See [docs/phase3-bom.md](docs/phase3-bom.md)

### Phase 4: Sales Management & Stock Reservation Engine
- **Order Lifecycle**: Tracks Sales Orders from `DRAFT` ➔ `CONFIRMED` ➔ `PARTIALLY_DELIVERED`/`FULLY_DELIVERED` or `CANCELLED`.
- **Stock Reservation Engine**: Upon order confirmation, the system allocates physical warehouse stock ($onHandQty - reservedQty$) to the line items. Logs negative virtual `SALE_RESERVE` movements.
- **Auto MTO (Make-to-Order) Replenishment**: Shortages of configured products (`procureOnDemand = true`) instantly spawn draft Purchase Orders (to the lowest-cost vendor) or Manufacturing Orders (using the active BoM).
- **Order Lock Guards**: Locked state transitions prevent updates to confirmed or cancelled orders.
- *Detailed Specifications:* See [docs/phase4-sales.md](docs/phase4-sales.md)

### Phase 5: Purchase Operations & Goods Receipt Engine
- **Order Lifecycle**: Tracks Purchase Orders from `DRAFT` ➔ `SENT` ➔ `PARTIALLY_RECEIVED`/`RECEIVED` or `CANCELLED`.
- **Goods Receipt & Multi-Receipt Engine**: Transactional ledger recording arrivals of incoming materials (supports partial shipments). Maintains full traceability through `PurchaseReceipt` and `PurchaseReceiptLine` tables.
- **Inventory Cost Update**: Incoming receipts dynamically update on-hand quantities, log positive `PURCHASE_RECEIPT` movements in the stock ledger, and automatically update the product's `lastPurchaseCost` field to reflect real-world unit values.
- **Financial & Integrity Locks**: Prevents editing or cancelling a Purchase Order once goods have begun arriving.
- *Detailed Specifications:* See [docs/phase5-purchase.md](docs/phase5-purchase.md)

---

## Database Schema Highlights

- **Stock Ledger Engine**: Physical stocks (`onHandQty` and `reservedQty`) are updated *only* via isolated stock movement transaction logs (`StockMovementType`: `SALE_RESERVE`, `SALE_RELEASE`, `SALE_DELIVERY`, `PURCHASE_RECEIPT`, `MANUFACTURING_CONSUME`, `MANUFACTURING_PRODUCE`). Direct quantities override are strictly disabled.
- **Cascading Deletes**: Implemented on-delete cascade rules on sub-items (e.g., Sales Order Lines and Purchase Order Lines) to preserve relational integrity.
- **Audit Logging**: Comprehensive, tenant-scoped audit records linked to the originating users, entities (SO, PO, Product, BoM), and operational types.

---

## Project Structure

```
odoo_Mini-ERP/
├── docs/                   # Phase specifications and designs
├── frontend/               # React + Vite client application
│   ├── src/
│   │   ├── api/            # API queries & Axios client setups
│   │   ├── components/     # UI components (Layout, Cards, Badges)
│   │   ├── hooks/          # Custom hooks (e.g. useAuth)
│   │   ├── pages/          # Pages (Dashboard, Products, Sales, Purchase, Users)
│   │   ├── routes/         # AppRoute components & routers
│   │   ├── store/          # Zustand global states (authStore)
│   │   └── index.css       # Core design systems & typography variables
│   └── index.html          # Web entrypoint (loads Google Fonts)
│
└── backend/                # Node.js + Express API server
    ├── prisma/
    │   ├── schema.prisma   # PostgreSQL Schema Definition
    │   └── seed.js         # Core database seed script (Neon-ready)
    └── src/
        ├── app.js          # Express app configurations & routes registry
        ├── server.js       # Start script (Default Port: 3000)
        ├── config/         # Environment configurations
        ├── middleware/     # JWT parsing & RBAC role guards
        ├── modules/        # Domain-driven features (each contains controller, routes, service)
        └── utils/          # Helpers & Stock Engine transactions
```

---

## API Overview

All API endpoints return standard JSON response envelopes:
```json
{ "success": true, "message": "Success message", "data": { ... } }
{ "success": false, "message": "Error description", "errors": [ ... ] }
```

### 1. Authentication & Tenant — `/api/auth` & `/api/company`
- `POST /api/company/register` — Registers a new tenant and Admin user.
- `POST /api/auth/login` — Login user, yields JWT token.
- `GET /api/auth/me` — Retrieves current user profile (Requires JWT).
- `POST /api/auth/register` — *Deprecated (410 Gone)*.

### 2. User Administration — `/api/users` (Requires JWT)
- `POST /api/users/invite` — Invites a new user to the company (Admin only).
- `GET /api/users/` — Lists all tenant users (Admin only).
- `POST /api/users/change-password` — Update password for the logged-in user.

### 3. Product Catalog — `/api/products` (Requires JWT)
- `GET /api/products/` — Lists all products.
- `GET /api/products/:id` — Details of a specific product.
- `POST /api/products/` — Creates a product (Admin/Business Owner).
- `PUT /api/products/:id` — Edits a product (Admin/Business Owner).
- `DELETE /api/products/:id` — Deletes a product (Admin only).

### 4. Customers & Vendors — `/api/customers` & `/api/vendors` (Requires JWT)
- `GET /api/customers/` — Lists all customers.
- `POST /api/customers/` — Create a new customer (Admin/Sales).
- `GET /api/vendors/` — Lists all vendors.
- `POST /api/vendors/` — Create a new vendor (Admin/Purchase).

### 5. Bill of Materials (BoM) & Work Centers (Requires JWT)
- `GET /api/workcenters/` — Lists all work centers.
- `POST /api/workcenters/` — Create a work center (Admin).
- `GET /api/bom/` — Lists all BoM entries.
- `GET /api/bom/product/:productId` — Get active BoM for a product.
- `GET /api/bom/:id` — Details of a specific BoM.
- `POST /api/bom/` — Create a BoM (Admin/Manufacturing).
- `PUT /api/bom/:id` — Update a BoM (Admin/Manufacturing).
- `DELETE /api/bom/:id` — Delete a BoM (Admin/Manufacturing).

### 6. Sales Management — `/api/sales` (Requires JWT)
- `GET /api/sales/` — Lists Sales Orders.
- `GET /api/sales/:id` — Detailed Sales Order with line allocation levels.
- `POST /api/sales/` — Create draft Sales Order (Admin/Sales).
- `POST /api/sales/:id/confirm` — Confirm order, reserve stock, trigger MTO.
- `POST /api/sales/:id/deliver` — Register physical delivery.
- `POST /api/sales/:id/cancel` — Cancel order and release reservations.

### 7. Purchase Operations — `/api/purchase` (Requires JWT)
- `GET /api/purchase/` — Lists Purchase Orders.
- `GET /api/purchase/:id` — Detailed Purchase Order & multi-receipt timeline.
- `POST /api/purchase/` — Create draft Purchase Order (Admin/Purchase).
- `POST /api/purchase/:id/confirm` — Confirm Purchase Order (transitions status to `SENT`).
- `POST /api/purchase/:id/receive` — Register goods receipt, increase inventory, update cost pricing.
- `POST /api/purchase/:id/cancel` — Cancel Purchase Order (if zero goods received).

---

## Development Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database (Neon or local instance)

### 1. Environment Configurations

#### Backend Configuration
In the `backend/` folder, create a `.env` file containing:
```env
# PostgreSQL connection url (Neon-compatible)
DATABASE_URL="postgresql://username:password@host:port/dbname?sslmode=require"

# JWT configuration
JWT_SECRET="generate-a-long-random-hex-string"
JWT_EXPIRES_IN="30m"

# Server Port
PORT=3000

# CORS frontend URL
FRONTEND_URL="http://localhost:5173"

# Brevo SMTP configuration
BREVO_API_KEY="your-brevo-api-key"
BREVO_SMTP_USER="your-brevo-smtp-username"
EMAIL_FROM="your-verified-sender-email@domain.com"
```

#### Frontend Configuration
In the `frontend/` folder, create a `.env` file containing:
```env
# Deployed API endpoint (defaults to proxying to localhost in dev)
VITE_API_URL="http://localhost:3000/api"
```

### 2. Run Database Setup & Seeding
Navigate into the backend, install dependencies, run schema migrations, and load the 12-month demo dataset:
```bash
cd backend
npm install

# Run schema migrations to database
npx prisma migrate dev

# Seed a complete multi-tenant demo environment (3 tenants, 12 months, 1,500+ records)
node demo/seedDemoData.js

# Seed active stock movements for "today" (so the morning brief is populated)
node demo/seedTodayMovements.js
```

### 3. Launch Development Servers

#### Launch Backend Server
In the `backend` folder:
```bash
npm run dev
# Server runs on http://localhost:3000
```

#### Launch Frontend Client
In a new terminal window, navigate to the `frontend` folder:
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```
*Note: In development, Vite automatically proxies all relative `/api` requests to `http://localhost:3000`.*

---

## Deployment & Routing Setup

### 📦 Vercel (Frontend)
The frontend uses React Router for client-side routing. To prevent `404 Not Found` errors when hard-refreshing pages (e.g. `/dashboard` or `/login`), a `vercel.json` rewrite file is included in the project root:
```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

### ⚙️ Render (Backend & Frontend Blueprint)
A `render.yaml` infrastructure-as-code file is included in the root directory. It automatically configures the Node.js backend Web Service and provides the necessary rewrite rules for a static frontend site if you choose to host both on Render.

---

## License

This project is licensed under the MIT License.
