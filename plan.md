# Mini ERP — Hackathon Master Execution Plan
> **Tech Stack:** React + Vite · Node.js + Express · PostgreSQL · Prisma ORM  
> **Problem:** Odoo — Mini ERP: From Demand to Delivery  
> **Modules:** Products · Sales · Purchase · Manufacturing · BoM · Inventory · Procurement Automation  

---

## Tech Stack Decisions

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | Fast HMR, small bundle, familiar |
| Routing | React Router v6 | Nested layouts, protected routes |
| Server state | TanStack Query (React Query) | Cache, loading states, auto-refetch |
| Client state | Zustand | Lightweight auth store |
| Backend | Node.js + Express | Fast to build, REST-friendly |
| ORM | **Prisma** | Type-safe, auto-migrations, clean schema |
| Database | PostgreSQL | Relational, strong for ERP joins |
| Auth | JWT + bcryptjs | Stateless, standard |
| HTTP Client | Axios | Interceptors for token injection |

---

## Complete Prisma Schema

> Save this as `backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ────────────────────────────────────────────────────────────────────

enum UserRole {
  ADMIN
  SALES_USER
  PURCHASE_USER
  MANUFACTURING_USER
  INVENTORY_MANAGER
  BUSINESS_OWNER
}

enum ProcurementType {
  PURCHASE
  MANUFACTURING
}

enum SalesOrderStatus {
  DRAFT
  CONFIRMED
  PARTIALLY_DELIVERED
  FULLY_DELIVERED
  CANCELLED
}

enum PurchaseOrderStatus {
  DRAFT
  CONFIRMED
  PARTIALLY_RECEIVED
  FULLY_RECEIVED
  CANCELLED
}

enum ManufacturingOrderStatus {
  DRAFT
  CONFIRMED
  IN_PROGRESS
  DONE
  CANCELLED
}

enum WorkOrderStatus {
  PENDING
  IN_PROGRESS
  DONE
}

enum StockMovementType {
  SALE_DELIVERY
  PURCHASE_RECEIPT
  MO_CONSUMPTION
  MO_PRODUCTION
  MANUAL_ADJUSTMENT
}

// ─── USERS ────────────────────────────────────────────────────────────────────

model User {
  id           Int      @id @default(autoincrement())
  uid          String   @unique @default(cuid())   // client-side safe key
  name         String
  email        String   @unique
  passwordHash String
  role         UserRole @default(SALES_USER)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  salesOrders         SalesOrder[]
  purchaseOrders      PurchaseOrder[]
  manufacturingOrders ManufacturingOrder[]
  auditLogs           AuditLog[]
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

model Product {
  id          Int     @id @default(autoincrement())
  uid         String  @unique @default(cuid())
  name        String
  sku         String  @unique
  description String?
  salesPrice  Decimal @db.Decimal(12, 2)
  costPrice   Decimal @db.Decimal(12, 2)

  // Stock (managed only via stockEngine — never updated directly)
  onHandQty   Decimal @default(0) @db.Decimal(12, 3)
  reservedQty Decimal @default(0) @db.Decimal(12, 3)
  // freeToUseQty = onHandQty - reservedQty (computed on read)

  // Procurement
  procureOnDemand Boolean         @default(false)
  procurementType ProcurementType @default(PURCHASE)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  salesOrderLines     SalesOrderLine[]
  purchaseOrderLines  PurchaseOrderLine[]
  boms                BoM[]
  bomComponents       BoMComponent[]       @relation("ComponentProduct")
  manufacturingOrders ManufacturingOrder[]
  stockMovements      StockMovement[]
  vendors             ProductVendor[]
}

// ─── CUSTOMERS & VENDORS ──────────────────────────────────────────────────────

model Customer {
  id        Int      @id @default(autoincrement())
  uid       String   @unique @default(cuid())
  name      String
  email     String?
  phone     String?
  address   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  salesOrders SalesOrder[]
}

model Vendor {
  id        Int      @id @default(autoincrement())
  uid       String   @unique @default(cuid())
  name      String
  email     String?
  phone     String?
  address   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  purchaseOrders PurchaseOrder[]
  products       ProductVendor[]
}

model ProductVendor {
  id        Int     @id @default(autoincrement())
  productId Int
  vendorId  Int
  unitPrice Decimal @db.Decimal(12, 2)

  product Product @relation(fields: [productId], references: [id])
  vendor  Vendor  @relation(fields: [vendorId], references: [id])

  @@unique([productId, vendorId])
}

// ─── SALES ────────────────────────────────────────────────────────────────────

model SalesOrder {
  id         Int              @id @default(autoincrement())
  uid        String           @unique @default(cuid())
  orderRef   String           @unique           // e.g. SO-0001
  customerId Int
  userId     Int
  status     SalesOrderStatus @default(DRAFT)
  orderDate  DateTime         @default(now())
  notes      String?
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  customer  Customer         @relation(fields: [customerId], references: [id])
  user      User             @relation(fields: [userId], references: [id])
  lines     SalesOrderLine[]
  auditLogs AuditLog[]       @relation("SaleAudit")
}

model SalesOrderLine {
  id           Int        @id @default(autoincrement())
  salesOrderId Int
  productId    Int
  qty          Decimal    @db.Decimal(12, 3)
  deliveredQty Decimal    @default(0) @db.Decimal(12, 3)
  unitPrice    Decimal    @db.Decimal(12, 2)

  salesOrder SalesOrder @relation(fields: [salesOrderId], references: [id], onDelete: Cascade)
  product    Product    @relation(fields: [productId], references: [id])
}

// ─── PURCHASE ─────────────────────────────────────────────────────────────────

model PurchaseOrder {
  id        Int                 @id @default(autoincrement())
  uid       String              @unique @default(cuid())
  orderRef  String              @unique           // e.g. PO-0001
  vendorId  Int
  userId    Int
  status    PurchaseOrderStatus @default(DRAFT)
  orderDate DateTime            @default(now())
  notes     String?
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt

  vendor    Vendor              @relation(fields: [vendorId], references: [id])
  user      User                @relation(fields: [userId], references: [id])
  lines     PurchaseOrderLine[]
  auditLogs AuditLog[]          @relation("PurchaseAudit")
}

model PurchaseOrderLine {
  id              Int           @id @default(autoincrement())
  purchaseOrderId Int
  productId       Int
  qty             Decimal       @db.Decimal(12, 3)
  receivedQty     Decimal       @default(0) @db.Decimal(12, 3)
  unitCost        Decimal       @db.Decimal(12, 2)

  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  product       Product       @relation(fields: [productId], references: [id])
}

// ─── BILL OF MATERIALS ────────────────────────────────────────────────────────

model BoM {
  id        Int      @id @default(autoincrement())
  uid       String   @unique @default(cuid())
  productId Int
  version   String   @default("1.0")
  isActive  Boolean  @default(true)
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  product             Product              @relation(fields: [productId], references: [id])
  components          BoMComponent[]
  operations          BoMOperation[]
  manufacturingOrders ManufacturingOrder[]
}

model BoMComponent {
  id        Int     @id @default(autoincrement())
  bomId     Int
  productId Int     // raw material / component
  qty       Decimal @db.Decimal(12, 3)

  bom     BoM     @relation(fields: [bomId], references: [id], onDelete: Cascade)
  product Product @relation("ComponentProduct", fields: [productId], references: [id])
}

// ─── WORK CENTERS ─────────────────────────────────────────────────────────────

model WorkCenter {
  id          Int      @id @default(autoincrement())
  name        String   @unique    // "Assembly Line", "Paint Floor", "Packaging Unit"
  description String?
  createdAt   DateTime @default(now())

  bomOperations BoMOperation[]
  workOrders    WorkOrder[]
}

model BoMOperation {
  id           Int        @id @default(autoincrement())
  bomId        Int
  workCenterId Int
  name         String     // "Assembly", "Painting", "Packing"
  durationMins Int
  sequence     Int        // execution order

  bom        BoM        @relation(fields: [bomId], references: [id], onDelete: Cascade)
  workCenter WorkCenter @relation(fields: [workCenterId], references: [id])
}

// ─── MANUFACTURING ────────────────────────────────────────────────────────────

model ManufacturingOrder {
  id            Int                      @id @default(autoincrement())
  uid           String                   @unique @default(cuid())
  moRef         String                   @unique     // e.g. MO-0001
  productId     Int
  bomId         Int
  qty           Decimal                  @db.Decimal(12, 3)
  userId        Int
  status        ManufacturingOrderStatus @default(DRAFT)
  scheduledDate DateTime?
  completedAt   DateTime?
  notes         String?
  createdAt     DateTime                 @default(now())
  updatedAt     DateTime                 @updatedAt

  product    Product    @relation(fields: [productId], references: [id])
  bom        BoM        @relation(fields: [bomId], references: [id])
  user       User       @relation(fields: [userId], references: [id])
  workOrders WorkOrder[]
  auditLogs  AuditLog[] @relation("MoAudit")
}

model WorkOrder {
  id                   Int             @id @default(autoincrement())
  manufacturingOrderId Int
  workCenterId         Int
  operationName        String
  durationMins         Int
  sequence             Int
  status               WorkOrderStatus @default(PENDING)
  startedAt            DateTime?
  completedAt          DateTime?

  manufacturingOrder ManufacturingOrder @relation(fields: [manufacturingOrderId], references: [id], onDelete: Cascade)
  workCenter         WorkCenter         @relation(fields: [workCenterId], references: [id])
}

// ─── STOCK LEDGER ─────────────────────────────────────────────────────────────

model StockMovement {
  id            Int               @id @default(autoincrement())
  productId     Int
  movementType  StockMovementType
  qty           Decimal           @db.Decimal(12, 3)  // positive = IN, negative = OUT
  referenceType String            // "SALE" | "PURCHASE" | "MO"
  referenceId   Int
  notes         String?
  createdAt     DateTime          @default(now())

  product Product @relation(fields: [productId], references: [id])
}

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────

model AuditLog {
  id                   Int      @id @default(autoincrement())
  userId               Int?
  action               String   // "SALES_ORDER_CONFIRMED", "MO_COMPLETED"
  entityType           String   // "SalesOrder" | "Product" | "ManufacturingOrder"
  entityId             Int
  description          String
  metadata             Json?    // any extra context as JSON
  salesOrderId         Int?
  purchaseOrderId      Int?
  manufacturingOrderId Int?
  createdAt            DateTime @default(now())

  user               User?               @relation(fields: [userId], references: [id])
  salesOrder         SalesOrder?         @relation("SaleAudit", fields: [salesOrderId], references: [id])
  purchaseOrder      PurchaseOrder?      @relation("PurchaseAudit", fields: [purchaseOrderId], references: [id])
  manufacturingOrder ManufacturingOrder? @relation("MoAudit", fields: [manufacturingOrderId], references: [id])
}
```

---

## Schema Relationship Map

```
User ──────────────────────────────────────┐
  │ creates                                │
  ├─► SalesOrder ──────────► SalesOrderLine ──► Product ◄─────────┐
  │       │                                         │              │
  │       └─► AuditLog                              │              │
  │                                                 │              │
  ├─► PurchaseOrder ──────► PurchaseOrderLine ──────┘              │
  │       │                                                        │
  │       └─► AuditLog                                            BoM
  │                                                                │
  └─► ManufacturingOrder ──► WorkOrder ──► WorkCenter             │
            │                                                      │
            ├── uses ──────────────────────────────────────────► BoM
            │                                              BoMComponent ──► Product
            │                                              BoMOperation ──► WorkCenter
            └─► AuditLog

Product ──► StockMovement (one per every IN/OUT event)
Product ──► ProductVendor ──► Vendor
Customer ──► SalesOrder
```

---

## Computed Fields (never stored, always calculated)

```js
// In every product read response:
product.freeToUseQty = product.onHandQty - product.reservedQty

// In every sales order read:
order.totalAmount = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0)

// In every purchase order read:
order.totalCost = lines.reduce((sum, l) => sum + l.qty * l.unitCost, 0)
```

---

## Folder Structure (Phase 0 deliverable)

```
erp/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          ← full schema above
│   │   └── seed.js                ← seed admin user + demo data
│   ├── src/
│   │   ├── config/
│   │   │   └── prisma.js          ← PrismaClient singleton
│   │   ├── middleware/
│   │   │   ├── auth.js            ← verifyJWT middleware
│   │   │   └── roles.js           ← requireRole(...roles) middleware
│   │   ├── utils/
│   │   │   ├── stockEngine.js     ← all stock mutations (reserve, release, move)
│   │   │   ├── procurementEngine.js ← MTO auto-trigger logic
│   │   │   ├── refGen.js          ← SO-0001, PO-0001, MO-0001 generators
│   │   │   └── auditLogger.js     ← createAuditLog(action, entity, user)
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.js
│   │   │   │   ├── auth.controller.js
│   │   │   │   └── auth.service.js
│   │   │   ├── products/
│   │   │   │   ├── products.routes.js
│   │   │   │   ├── products.controller.js
│   │   │   │   └── products.service.js
│   │   │   ├── customers/
│   │   │   ├── vendors/
│   │   │   ├── sales/
│   │   │   │   ├── sales.routes.js
│   │   │   │   ├── sales.controller.js
│   │   │   │   └── sales.service.js
│   │   │   ├── purchase/
│   │   │   ├── bom/
│   │   │   ├── manufacturing/
│   │   │   ├── inventory/         ← stock ledger + stock movements
│   │   │   ├── workcenters/
│   │   │   └── audit/
│   │   └── app.js
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── axios.js           ← base instance with JWT interceptor
│   │   │   ├── auth.api.js
│   │   │   ├── products.api.js
│   │   │   ├── sales.api.js
│   │   │   ├── purchase.api.js
│   │   │   ├── manufacturing.api.js
│   │   │   ├── bom.api.js
│   │   │   └── inventory.api.js
│   │   ├── components/
│   │   │   ├── ui/                ← Button, Input, Badge, Modal, Table, StatusChip
│   │   │   └── layout/
│   │   │       ├── Sidebar.jsx    ← role-aware navigation
│   │   │       ├── Topbar.jsx
│   │   │       └── AppLayout.jsx
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   └── RegisterPage.jsx
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardPage.jsx
│   │   │   ├── products/
│   │   │   │   ├── ProductListPage.jsx
│   │   │   │   └── ProductFormPage.jsx
│   │   │   ├── customers/
│   │   │   ├── vendors/
│   │   │   ├── sales/
│   │   │   │   ├── SalesListPage.jsx
│   │   │   │   ├── SalesFormPage.jsx
│   │   │   │   └── SalesDetailPage.jsx
│   │   │   ├── purchase/
│   │   │   ├── bom/
│   │   │   │   ├── BomListPage.jsx
│   │   │   │   └── BomBuilderPage.jsx
│   │   │   ├── manufacturing/
│   │   │   │   ├── MoListPage.jsx
│   │   │   │   ├── MoFormPage.jsx
│   │   │   │   └── MoDetailPage.jsx
│   │   │   └── audit/
│   │   │       └── AuditLogPage.jsx
│   │   ├── store/
│   │   │   └── authStore.js       ← Zustand: user, token, role
│   │   ├── hooks/
│   │   │   └── useRole.js         ← hook to check current user's role
│   │   ├── routes/
│   │   │   ├── AppRoutes.jsx      ← all routes defined here
│   │   │   └── ProtectedRoute.jsx ← redirect if not logged in
│   │   └── App.jsx
│   ├── .env
│   └── package.json
│
└── README.md
```

---

## Phase 0 — Project Setup & Integration

**Goal:** Running skeleton — backend talks to DB, frontend talks to backend, both start with one command.

### Deliverables

- [ ] `backend/` initialized: `npm init`, install `express prisma @prisma/client bcryptjs jsonwebtoken cors dotenv`
- [ ] `frontend/` initialized: `npm create vite@latest` → React, install `axios react-router-dom @tanstack/react-query zustand tailwindcss`
- [ ] `backend/prisma/schema.prisma` — full schema from above saved
- [ ] `npx prisma migrate dev --name init` runs cleanly → all tables created in Postgres
- [ ] `backend/src/app.js` — Express app with CORS allowing `http://localhost:5173`
- [ ] `GET /api/health` → returns `{ status: "ok" }` — confirmed working
- [ ] `frontend/src/api/axios.js` — Axios instance pointing to `http://localhost:3000/api`
- [ ] Frontend proxy configured in `vite.config.js` (optional, avoids CORS in dev)
- [ ] `.env` files set up: `DATABASE_URL`, `JWT_SECRET`, `PORT`
- [ ] `prisma/seed.js` — seeds 1 admin user (`admin@erp.com / Admin@123`)

### Key Files

**`backend/src/config/prisma.js`**
```js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export default prisma;
```

**`backend/src/app.js`**
```js
import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
// more routes added per phase

export default app;
```

**`frontend/src/api/axios.js`**
```js
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3000/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

---

## Phase 1 — Authentication & RBAC

**Goal:** Secure login/register with 6 roles. Every route guarded. Role-aware UI.

### Backend Deliverables

| Endpoint | Role Required | What it does |
|---|---|---|
| `POST /api/auth/register` | None (ADMIN only in prod) | Hash password, create user |
| `POST /api/auth/login` | None | Return JWT + user |
| `GET /api/auth/me` | Any logged in | Return current user |

**`middleware/auth.js`**
```js
import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
```

**`middleware/roles.js`**
```js
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

// Usage: router.get('/', verifyToken, requireRole('ADMIN', 'BUSINESS_OWNER'), handler)
```

**`utils/auditLogger.js`**
```js
import prisma from '../config/prisma.js';

export const logAudit = async ({ userId, action, entityType, entityId, description, metadata }) => {
  return prisma.auditLog.create({
    data: { userId, action, entityType, entityId, description, metadata }
  });
};
```

### Role → Module Access Map

| Role | Dashboard | Products | Sales | Purchase | Manufacturing | BoM | Audit |
|---|---|---|---|---|---|---|---|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| BUSINESS_OWNER | ✅ | ✅ | Read | Read | Read | Read | ✅ |
| SALES_USER | — | Read | ✅ | — | — | — | — |
| PURCHASE_USER | — | Read | — | ✅ | — | — | — |
| MANUFACTURING_USER | — | Read | — | — | ✅ | Read | — |
| INVENTORY_MANAGER | ✅ | ✅ | Read | Read | Read | Read | Read |

### Frontend Deliverables

- [ ] `LoginPage.jsx` — email + password form → store token in Zustand + localStorage
- [ ] `RegisterPage.jsx` — for admin to create team users
- [ ] `ProtectedRoute.jsx` — redirect to `/login` if no token
- [ ] `authStore.js` — Zustand store: `{ user, token, setAuth, logout }`
- [ ] `Sidebar.jsx` — renders only links the user's role can access
- [ ] Role-based redirect after login (SALES_USER → `/sales`, etc.)

---

## Phase 2 — Products Module

**Goal:** Central product catalog with full stock visibility. Customers, Vendors, Work Centers setup.

### Backend Deliverables

| Endpoint | Role | Description |
|---|---|---|
| `GET /api/products` | All | List with `freeToUseQty` computed |
| `POST /api/products` | ADMIN, BUSINESS_OWNER | Create product |
| `PUT /api/products/:id` | ADMIN, BUSINESS_OWNER | Update product |
| `DELETE /api/products/:id` | ADMIN | Soft or hard delete |
| `GET /api/customers` | All | List customers |
| `POST /api/customers` | ADMIN, SALES_USER | Create customer |
| `GET /api/vendors` | All | List vendors |
| `POST /api/vendors` | ADMIN, PURCHASE_USER | Create vendor |
| `GET /api/workcenters` | All | List work centers |
| `POST /api/workcenters` | ADMIN | Create work center |

**Critical — always return `freeToUseQty`:**
```js
// In products.service.js
const products = await prisma.product.findMany();
return products.map(p => ({
  ...p,
  freeToUseQty: Number(p.onHandQty) - Number(p.reservedQty)
}));
```

### Frontend Deliverables

- [ ] `ProductListPage.jsx` — table: Name, SKU, Sales Price, On Hand, Reserved, Free-to-Use, Procurement Type
- [ ] `ProductFormPage.jsx` — create/edit form with procurement toggle (MTS/MTO, Purchase/Manufacturing)
- [ ] Stock badge: Red if freeToUseQty < 10, Green if > 50
- [ ] Customers list + create form
- [ ] Vendors list + create form
- [ ] Work Centers list + create form

---

## Phase 3 — Bill of Materials (BoM)

**Goal:** Define recipes for manufactured products. This is the blueprint Manufacturing will read.

### Backend Deliverables

| Endpoint | Role | Description |
|---|---|---|
| `GET /api/bom` | All | List all BoMs |
| `GET /api/bom/:id` | All | BoM detail with components + operations |
| `POST /api/bom` | ADMIN, MANUFACTURING_USER | Create BoM |
| `PUT /api/bom/:id` | ADMIN, MANUFACTURING_USER | Update BoM |

**BoM Create payload:**
```json
{
  "productId": 3,
  "version": "1.0",
  "components": [
    { "productId": 1, "qty": 4 },
    { "productId": 2, "qty": 1 },
    { "productId": 5, "qty": 12 }
  ],
  "operations": [
    { "workCenterId": 1, "name": "Assembly", "durationMins": 60, "sequence": 1 },
    { "workCenterId": 2, "name": "Painting", "durationMins": 30, "sequence": 2 },
    { "workCenterId": 3, "name": "Packing",  "durationMins": 20, "sequence": 3 }
  ]
}
```

**`bom.service.js` — create with nested writes:**
```js
const bom = await prisma.boM.create({
  data: {
    productId: data.productId,
    version: data.version,
    components: { create: data.components },
    operations: { create: data.operations }
  },
  include: { components: true, operations: true }
});
```

### Frontend Deliverables

- [ ] `BomListPage.jsx` — list with product name, component count, operations count
- [ ] `BomBuilderPage.jsx` — dynamic form:
  - Select finished product
  - "Add Component" rows: product picker + qty input
  - "Add Operation" rows: work center + name + duration + sequence
  - Save creates BoM atomically

---

## Phase 4 — Sales Module

**Goal:** Full sales order lifecycle. Confirm → reserve stock. Deliver → reduce stock. Trigger MTO if needed.

### Backend Deliverables

| Endpoint | Role | Description |
|---|---|---|
| `GET /api/sales` | SALES_USER, ADMIN, BUSINESS_OWNER, INVENTORY_MANAGER | List all SOs |
| `POST /api/sales` | SALES_USER, ADMIN | Create draft SO |
| `GET /api/sales/:id` | Same | SO detail with lines |
| `POST /api/sales/:id/confirm` | SALES_USER, ADMIN | Confirm SO (reserve stock) |
| `POST /api/sales/:id/deliver` | SALES_USER, ADMIN | Record delivery (body: lineDeliveries) |
| `POST /api/sales/:id/cancel` | SALES_USER, ADMIN | Cancel + release reserved stock |

**`stockEngine.js` — the heart of everything:**
```js
import prisma from '../config/prisma.js';

// Reserve stock when SO is confirmed
export const reserveStock = async (productId, qty, tx = prisma) => {
  const product = await tx.product.findUnique({ where: { id: productId } });
  const free = Number(product.onHandQty) - Number(product.reservedQty);
  const toReserve = Math.min(qty, free); // reserve only what's available
  await tx.product.update({
    where: { id: productId },
    data: { reservedQty: { increment: toReserve } }
  });
  return { toReserve, shortage: qty - toReserve };
};

// Decrease stock on delivery
export const deliverStock = async (productId, qty, tx = prisma) => {
  await tx.product.update({
    where: { id: productId },
    data: {
      onHandQty: { decrement: qty },
      reservedQty: { decrement: qty }
    }
  });
  await tx.stockMovement.create({
    data: { productId, movementType: 'SALE_DELIVERY', qty: -qty, referenceType: 'SALE', referenceId: ... }
  });
};

// Release reserved stock on cancel
export const releaseStock = async (productId, qty, tx = prisma) => {
  await tx.product.update({
    where: { id: productId },
    data: { reservedQty: { decrement: qty } }
  });
};
```

**Sales Confirm flow (`sales.service.js`):**
```js
export const confirmSalesOrder = async (orderId, userId) => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUnique({
      where: { id: orderId },
      include: { lines: { include: { product: true } } }
    });

    for (const line of order.lines) {
      const { toReserve, shortage } = await reserveStock(line.productId, Number(line.qty), tx);

      // MTO: auto-trigger procurement if shortage
      if (shortage > 0 && line.product.procureOnDemand) {
        await procurementEngine.trigger(line.product, shortage, orderId, userId, tx);
      }
    }

    await tx.salesOrder.update({ where: { id: orderId }, data: { status: 'CONFIRMED' } });
    await logAudit({ userId, action: 'SALES_ORDER_CONFIRMED', entityType: 'SalesOrder', entityId: orderId, description: `SO confirmed` });
  });
};
```

### Frontend Deliverables

- [ ] `SalesListPage.jsx` — table with status badges (Draft/Confirmed/Delivered)
- [ ] `SalesFormPage.jsx` — select customer, add product lines with qty + auto-fill price
- [ ] `SalesDetailPage.jsx`:
  - Order info + line items
  - **Confirm Order** button → calls confirm endpoint
  - **Record Delivery** button → qty input per line
  - Status timeline: Draft → Confirmed → Partially Delivered → Fully Delivered
  - If MTO triggered: shows alert "Auto-created PO/MO for X units of Product Y"
- [ ] Stock availability indicator on product selection (shows freeToUseQty)

---

## Phase 5 — Purchase Module

**Goal:** Manage vendor orders. Receive goods → increase stock automatically.

### Backend Deliverables

| Endpoint | Role | Description |
|---|---|---|
| `GET /api/purchase` | PURCHASE_USER, ADMIN, INVENTORY_MANAGER | List all POs |
| `POST /api/purchase` | PURCHASE_USER, ADMIN | Create draft PO |
| `GET /api/purchase/:id` | Same | PO detail |
| `POST /api/purchase/:id/confirm` | PURCHASE_USER, ADMIN | Confirm PO |
| `POST /api/purchase/:id/receive` | PURCHASE_USER, ADMIN | Receive goods (partial ok) |
| `POST /api/purchase/:id/cancel` | PURCHASE_USER, ADMIN | Cancel PO |

**Receive goods flow:**
```js
export const receiveGoods = async (orderId, lineReceipts, userId) => {
  return prisma.$transaction(async (tx) => {
    for (const { lineId, receivedQty } of lineReceipts) {
      const line = await tx.purchaseOrderLine.update({
        where: { id: lineId },
        data: { receivedQty: { increment: receivedQty } },
        include: { product: true }
      });

      // Increase stock
      await tx.product.update({
        where: { id: line.productId },
        data: { onHandQty: { increment: receivedQty } }
      });

      await tx.stockMovement.create({
        data: { productId: line.productId, movementType: 'PURCHASE_RECEIPT', qty: receivedQty, referenceType: 'PURCHASE', referenceId: orderId }
      });
    }

    // Update PO status
    const po = await tx.purchaseOrder.findUnique({ where: { id: orderId }, include: { lines: true } });
    const allReceived = po.lines.every(l => Number(l.receivedQty) >= Number(l.qty));
    const anyReceived = po.lines.some(l => Number(l.receivedQty) > 0);
    const newStatus = allReceived ? 'FULLY_RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : 'CONFIRMED';
    await tx.purchaseOrder.update({ where: { id: orderId }, data: { status: newStatus } });
  });
};
```

### Frontend Deliverables

- [ ] `PurchaseListPage.jsx` — with status + vendor name
- [ ] `PurchaseFormPage.jsx` — select vendor, add product lines
- [ ] `PurchaseDetailPage.jsx`:
  - Confirm + Receive Goods buttons
  - Receive form: qty received per line (partial receipts supported)
  - Status timeline

---

## Phase 6 — Manufacturing Module

**Goal:** Convert raw materials into finished goods. Work Order execution step-by-step.

### Backend Deliverables

| Endpoint | Role | Description |
|---|---|---|
| `GET /api/manufacturing` | MFG_USER, ADMIN, INVENTORY_MANAGER | List all MOs |
| `POST /api/manufacturing` | MFG_USER, ADMIN | Create MO (picks BoM auto) |
| `GET /api/manufacturing/:id` | Same | MO detail with work orders |
| `POST /api/manufacturing/:id/confirm` | MFG_USER, ADMIN | Confirm → reserve components |
| `POST /api/manufacturing/:id/workorders/:woId/start` | MFG_USER | Start a work order |
| `POST /api/manufacturing/:id/workorders/:woId/complete` | MFG_USER | Complete a work order |
| `POST /api/manufacturing/:id/close` | MFG_USER, ADMIN | Close MO → consume + produce |

**Create MO flow — auto-builds Work Orders from BoM:**
```js
export const createManufacturingOrder = async (data, userId) => {
  const bom = await prisma.boM.findUnique({
    where: { id: data.bomId },
    include: { operations: { include: { workCenter: true } } }
  });

  const workOrders = bom.operations.map(op => ({
    workCenterId: op.workCenterId,
    operationName: op.name,
    durationMins: op.durationMins,
    sequence: op.sequence,
    status: 'PENDING'
  }));

  return prisma.manufacturingOrder.create({
    data: {
      moRef: await generateRef('MO'),
      productId: data.productId,
      bomId: data.bomId,
      qty: data.qty,
      userId,
      workOrders: { create: workOrders }
    },
    include: { workOrders: true }
  });
};
```

**Close MO — consume components, produce finished goods:**
```js
export const closeManufacturingOrder = async (moId, userId) => {
  return prisma.$transaction(async (tx) => {
    const mo = await tx.manufacturingOrder.findUnique({
      where: { id: moId },
      include: { bom: { include: { components: true } } }
    });

    // Consume raw materials
    for (const comp of mo.bom.components) {
      const totalConsumed = Number(comp.qty) * Number(mo.qty);
      await tx.product.update({
        where: { id: comp.productId },
        data: {
          onHandQty:   { decrement: totalConsumed },
          reservedQty: { decrement: totalConsumed }
        }
      });
      await tx.stockMovement.create({
        data: { productId: comp.productId, movementType: 'MO_CONSUMPTION', qty: -totalConsumed, referenceType: 'MO', referenceId: moId }
      });
    }

    // Produce finished goods
    await tx.product.update({
      where: { id: mo.productId },
      data: { onHandQty: { increment: Number(mo.qty) } }
    });
    await tx.stockMovement.create({
      data: { productId: mo.productId, movementType: 'MO_PRODUCTION', qty: Number(mo.qty), referenceType: 'MO', referenceId: moId }
    });

    await tx.manufacturingOrder.update({
      where: { id: moId },
      data: { status: 'DONE', completedAt: new Date() }
    });
  });
};
```

### Frontend Deliverables

- [ ] `MoListPage.jsx` — list with product, qty, status, progress indicator
- [ ] `MoFormPage.jsx` — select product → auto-load BoMs → fill qty → preview components needed
- [ ] `MoDetailPage.jsx`:
  - Work Order cards in sequence (pending → in progress → done)
  - **Start / Complete** button on each work order
  - **Close MO** button (only when all work orders done)
  - Component consumption preview: "Will consume 40 Legs, 10 Tops, 120 Screws"
  - After close: shows "+10 Tables added to stock"

---

## Phase 7 — Procurement Automation (MTO Engine)

**Goal:** When a Sales Order is confirmed and stock is short, automatically create PO or MO.

### Backend — `utils/procurementEngine.js`

```js
import prisma from '../config/prisma.js';
import { generateRef } from './refGen.js';
import { logAudit } from './auditLogger.js';

export const trigger = async (product, shortageQty, salesOrderId, userId, tx) => {
  if (!product.procureOnDemand) return;

  if (product.procurementType === 'PURCHASE') {
    // Find default vendor
    const pv = await tx.productVendor.findFirst({ where: { productId: product.id } });
    if (!pv) return; // no vendor configured

    const po = await tx.purchaseOrder.create({
      data: {
        orderRef: await generateRef('PO', tx),
        vendorId: pv.vendorId,
        userId,
        status: 'DRAFT',
        notes: `Auto-created for Sales Order #${salesOrderId}`,
        lines: {
          create: [{
            productId: product.id,
            qty: shortageQty,
            receivedQty: 0,
            unitCost: pv.unitPrice
          }]
        }
      }
    });

    await logAudit({ userId, action: 'AUTO_PO_CREATED', entityType: 'PurchaseOrder', entityId: po.id,
      description: `Auto-created PO for ${shortageQty} × ${product.name} (shortage from SO #${salesOrderId})`
    });

  } else if (product.procurementType === 'MANUFACTURING') {
    const bom = await tx.boM.findFirst({ where: { productId: product.id, isActive: true } });
    if (!bom) return;

    const mo = await tx.manufacturingOrder.create({
      data: {
        moRef: await generateRef('MO', tx),
        productId: product.id,
        bomId: bom.id,
        qty: shortageQty,
        userId,
        status: 'DRAFT',
        notes: `Auto-created for Sales Order #${salesOrderId}`
      }
    });

    await logAudit({ userId, action: 'AUTO_MO_CREATED', entityType: 'ManufacturingOrder', entityId: mo.id,
      description: `Auto-created MO for ${shortageQty} × ${product.name} (shortage from SO #${salesOrderId})`
    });
  }
};
```

### Frontend Deliverables

- [ ] After confirming a Sales Order, if auto-PO/MO was created: show a toast notification and inline alert in the order detail
- [ ] Auto-created POs/MOs have `notes` field showing "Auto-created for Sales Order #X"
- [ ] Filter in PO/MO list: "Auto-Generated" badge on these records

---

## Phase 8 — Inventory & Stock Ledger

**Goal:** Full traceability. Every IN/OUT movement visible. Audit log as a searchable timeline.

### Backend Deliverables

| Endpoint | Description |
|---|---|
| `GET /api/inventory/movements` | All stock movements, filter by productId/type/date |
| `GET /api/inventory/movements/product/:id` | All movements for one product |
| `GET /api/audit` | Full audit log, filter by entityType/action/date |
| `GET /api/audit/:entityType/:entityId` | Audit history for one specific record |

### Frontend Deliverables

- [ ] `StockLedgerPage.jsx` — filterable table: Product | Date | Type | Qty (+/-) | Reference
  - Color code: green rows for IN movements, red for OUT
- [ ] Stock movements tab inside each Product detail page
- [ ] `AuditLogPage.jsx` — timeline view: icon + action label + description + timestamp + user name
  - Filter by: All / Sales / Purchase / Manufacturing
- [ ] Audit trail tab inside each SO, PO, and MO detail page

---

## Phase 9 — Dashboard

**Goal:** Owner-level visibility. All critical KPIs at a glance.

### Backend — `GET /api/dashboard`

```js
export const getDashboardStats = async () => {
  const [
    totalSales, pendingDeliveries, totalPurchase, partialReceipts,
    totalMOs, delayedOrders, lowStockProducts
  ] = await Promise.all([
    prisma.salesOrder.count(),
    prisma.salesOrder.count({ where: { status: { in: ['CONFIRMED', 'PARTIALLY_DELIVERED'] } } }),
    prisma.purchaseOrder.count(),
    prisma.purchaseOrder.count({ where: { status: 'PARTIALLY_RECEIVED' } }),
    prisma.manufacturingOrder.count(),
    prisma.manufacturingOrder.count({ where: { status: { in: ['DRAFT', 'CONFIRMED', 'IN_PROGRESS'] }, scheduledDate: { lt: new Date() } } }),
    prisma.product.findMany({ where: { onHandQty: { lt: 10 } }, take: 5 })
  ]);

  return { totalSales, pendingDeliveries, totalPurchase, partialReceipts, totalMOs, delayedOrders, lowStockProducts };
};
```

### Frontend Deliverables

- [ ] `DashboardPage.jsx` — 6 KPI cards:
  - Total Sales Orders
  - Pending Deliveries
  - Total Purchase Orders
  - Partial Receipts
  - Manufacturing Orders
  - Delayed Orders
- [ ] Low Stock Alert section: products with `onHandQty < 10`
- [ ] Recent Activity feed: last 10 audit log entries

---

## Execution Order Summary

```
Phase 0 → Folder structure + DB + health check          [~1 hour]
Phase 1 → Auth + JWT + RBAC + login UI                  [~2 hours]
Phase 2 → Products + Customers + Vendors + Work Centers [~2 hours]
Phase 3 → BoM builder                                   [~2 hours]
Phase 4 → Sales (MOST COMPLEX — do this carefully)      [~3 hours]
Phase 5 → Purchase                                      [~2 hours]
Phase 6 → Manufacturing                                 [~3 hours]
Phase 7 → Procurement automation (MTO engine)           [~1 hour]
Phase 8 → Stock ledger + Audit log UI                   [~1.5 hours]
Phase 9 → Dashboard                                     [~1 hour]
```

**Total estimate: ~18–19 hours**

---

## Critical Rules to Follow Throughout

1. **Never update `onHandQty` or `reservedQty` directly** from a form — always go through `stockEngine.js`
2. **All multi-table operations use `prisma.$transaction()`** — stock + movements + status must be atomic
3. **Every status change writes an AuditLog** — call `logAudit()` inside every service method
4. **Reference numbers** (SO-0001, PO-0001, MO-0001) generated by `refGen.js` using a count query, not random
5. **`freeToUseQty` is never stored** — always computed as `onHandQty - reservedQty` on read
6. **Role middleware on every route** — `verifyToken` + `requireRole(...)` — no unguarded endpoints
7. **Integer primary keys for all tables** — separate `uid` (cuid) for client-side references

---

## Odoo Judge Checklist

- [ ] MTO auto-trigger actually creates PO/MO and shows it in the UI
- [ ] Stock movements are visible as a ledger (not just numbers changing)
- [ ] Audit logs visible in the UI — this is Odoo's signature feature
- [ ] Role-based access actually blocks routes on the backend
- [ ] All workflows have proper state machines (no jumping from DRAFT to DELIVERED)
- [ ] Procurement type and `procureOnDemand` are configurable per product
- [ ] Partial deliveries and partial receipts work correctly
- [ ] Dashboard shows live data from the DB (not hardcoded)
- [ ] Demo flow: Create Product → Configure MTO → Create Sales Order → Confirm → Watch auto-MO/PO appear

---

*This plan covers 100% of the hackathon problem statement. Build in phase order — each phase is independently demable.*