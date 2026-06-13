import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import AppLayout from "../components/layout/AppLayout";

// Pages
import LoginPage from "../pages/auth/LoginPage";
import SignupPage from "../pages/auth/SignupPage";
import RegisterPage from "../pages/auth/RegisterPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import HomePage from "../pages/home/HomePage";
import ProductListPage from "../pages/products/ProductListPage";
import ProductFormPage from "../pages/products/ProductFormPage";
import BomListPage from "../pages/bom/BomListPage";
import BomFormPage from "../pages/bom/BomFormPage";
import CustomerFormPage from "../pages/customers/CustomerFormPage";
import VendorFormPage from "../pages/vendors/VendorFormPage";
import WorkCenterFormPage from "../pages/workcenters/WorkCenterFormPage";
import SalesListPage from "../pages/sales/SalesListPage";
import SalesFormPage from "../pages/sales/SalesFormPage";
import SalesDetailPage from "../pages/sales/SalesDetailPage";
import PurchaseListPage from "../pages/purchase/PurchaseListPage";
import PurchaseFormPage from "../pages/purchase/PurchaseFormPage";
import PurchaseDetailPage from "../pages/purchase/PurchaseDetailPage";
import ChangePasswordPage from "../pages/auth/ChangePasswordPage";
import UsersPage from "../pages/settings/UsersPage";
import ManufacturingListPage from "../pages/manufacturing/ManufacturingListPage";
import ManufacturingDetailPage from "../pages/manufacturing/ManufacturingDetailPage";
import InventoryHubPage from "../pages/inventory/InventoryHubPage";
import InventoryProductDetailPage from "../pages/inventory/InventoryProductDetailPage";
import InventoryLedgerPage from "../pages/inventory/InventoryLedgerPage";
import AnalyticsDashboardPage from "../pages/analytics/AnalyticsDashboardPage";
import SalesAnalyticsPage from "../pages/analytics/SalesAnalyticsPage";
import PurchaseAnalyticsPage from "../pages/analytics/PurchaseAnalyticsPage";
import InventoryAnalyticsPage from "../pages/analytics/InventoryAnalyticsPage";
import ManufacturingAnalyticsPage from "../pages/analytics/ManufacturingAnalyticsPage";
import ReportsPage from "../pages/reports/ReportsPage";
import AuditLogPage from "../pages/audit/AuditLogPage";
import { Ban, Hammer } from "lucide-react";


// Role redirect helper
import { useAuthStore } from "../store/authStore";

const ROLE_HOME = {
  ADMIN: "/dashboard",
  BUSINESS_OWNER: "/dashboard",
  INVENTORY_MANAGER: "/dashboard",
  SALES_USER: "/sales",
  PURCHASE_USER: "/purchase",
  MANUFACTURING_USER: "/manufacturing",
};

const RoleRedirect = () => {
  const user = useAuthStore((s) => s.user);
  const home = ROLE_HOME[user?.role] || "/dashboard";
  return <Navigate to={home} replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Unauthorized page */}
      <Route
        path="/unauthorized"
        element={
          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
            }}
          >
            <Ban size={64} style={{ color: "var(--danger)", marginBottom: 16 }} />
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
              Access Denied
            </h1>
            <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
              You don't have permission to view this page.
            </p>
            <a
              href="/"
              style={{ color: "#FF540E", textDecoration: "none", fontSize: 14 }}
            >
              ← Go back home
            </a>
          </div>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* ADMIN-only: register new users */}
      <Route
        path="/register"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AppLayout>
              <RegisterPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Set a new password on first login */}
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />

      {/* ADMIN-only: manage users */}
      <Route
        path="/settings/users"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AppLayout>
              <UsersPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Phase 2: Products Module Routes */}
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProductListPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/products/new"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "BUSINESS_OWNER"]}>
            <AppLayout>
              <ProductFormPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/products/edit/:id"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "BUSINESS_OWNER"]}>
            <AppLayout>
              <ProductFormPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers/new"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "SALES_USER"]}>
            <AppLayout>
              <CustomerFormPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendors/new"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE_USER"]}>
            <AppLayout>
              <VendorFormPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workcenters/new"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AppLayout>
              <WorkCenterFormPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Phase 4: Sales Module Routes */}
      <Route
        path="/sales"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SalesListPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/new"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "SALES_USER"]}>
            <AppLayout>
              <SalesFormPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SalesDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Phase 5: Purchase Module Routes */}
      <Route
        path="/purchase"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PurchaseListPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase/new"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE_USER"]}>
            <AppLayout>
              <PurchaseFormPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PurchaseDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manufacturing"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ManufacturingListPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manufacturing/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ManufacturingDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Phase 3: Bill of Materials Module Routes */}
      <Route
        path="/bom"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BomListPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bom/new"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "MANUFACTURING_USER"]}>
            <AppLayout>
              <BomFormPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bom/edit/:id"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "MANUFACTURING_USER"]}>
            <AppLayout>
              <BomFormPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <AppLayout>
              <InventoryHubPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/product/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <InventoryProductDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/ledger"
        element={
          <ProtectedRoute>
            <AppLayout>
              <InventoryLedgerPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AnalyticsDashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics/sales"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "BUSINESS_OWNER", "SALES_USER"]}>
            <AppLayout>
              <SalesAnalyticsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics/purchase"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "BUSINESS_OWNER", "PURCHASE_USER"]}>
            <AppLayout>
              <PurchaseAnalyticsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics/inventory"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "BUSINESS_OWNER", "INVENTORY_MANAGER"]}>
            <AppLayout>
              <InventoryAnalyticsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics/manufacturing"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "BUSINESS_OWNER", "MANUFACTURING_USER"]}>
            <AppLayout>
              <ManufacturingAnalyticsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ReportsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "BUSINESS_OWNER", "INVENTORY_MANAGER"]}>
            <AppLayout>
              <AuditLogPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Temporary placeholder for phases 2–8
const ComingSoon = ({ title }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      gap: 12,
    }}
  >
    <div
      style={{
        width: 64,
        height: 64,
        background: "var(--accent-light)",
        borderRadius: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
      }}
    >
      <Hammer size={28} style={{ color: "var(--accent)" }} />
    </div>
    <h2 style={{ fontSize: 20, fontWeight: 700 }}>{title} Module</h2>
    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
      Coming in the next phase — stay tuned!
    </p>
  </div>
);

export default AppRoutes;
