import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './modules/auth/auth.routes.js';
import productRoutes from './modules/products/products.routes.js';
import customerRoutes from './modules/customers/customers.routes.js';
import vendorRoutes from './modules/vendors/vendors.routes.js';
import workCenterRoutes from './modules/workcenters/workcenters.routes.js';
import bomRoutes from './modules/bom/bom.routes.js';

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ───────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Mini ERP API',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/workcenters', workCenterRoutes);
app.use('/api/bom', bomRoutes);

// Placeholder for future modules — will be wired in subsequent phases
// app.use('/api/sales', salesRoutes);
// app.use('/api/purchase', purchaseRoutes);
// app.use('/api/manufacturing', manufacturingRoutes);
// app.use('/api/inventory', inventoryRoutes);
// app.use('/api/audit', auditRoutes);
// app.use('/api/dashboard', dashboardRoutes);

// ─── 404 HANDLER ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────────────────────
// Must be last middleware — catches all errors forwarded via next(err)

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;
