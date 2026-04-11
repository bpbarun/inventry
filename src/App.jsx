import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppProvider, useApp } from "./context/AppContext";
import Layout from "./components/Layout/Layout";
import Login from "./components/Auth/Login";
import { ROLE_ACCESS, ROLE_HOME } from "./config/roles";
import "./App.css";

// Redirects to the user's home page if they try to access an unauthorised route
function RoleRoute({ path, children }) {
  const { user } = useAuth();
  const allowed = ROLE_ACCESS[user?.role] ?? [];
  if (!allowed.includes(path)) {
    return <Navigate to={ROLE_HOME[user?.role] ?? "/login"} replace />;
  }
  return children;
}

// Route-level code splitting — each page loads only when first visited
const Dashboard  = lazy(() => import("./components/Dashboard/Dashboard"));
const Branches   = lazy(() => import("./components/Branch/Branches"));
const Categories = lazy(() => import("./components/Category/Categories"));
const Products   = lazy(() => import("./components/Product/Products"));
const Purchases  = lazy(() => import("./components/Purchase/Purchases"));
const StockIn    = lazy(() => import("./components/StockIn/StockIn"));
const StockOut   = lazy(() => import("./components/StockOut/StockOut"));

function AppRoutes() {
  const { loading, error, loadAll } = useApp();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
        <p>Loading inventory data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <h2>Could not connect to API</h2>
        <p>{error}</p>
        <p className="app-error-hint">
          Make sure the CodeIgniter API is running at:<br />
          <code>{import.meta.env.VITE_API_URL || "http://localhost/inventry-api/public/api"}</code>
        </p>
        <button className="btn btn-primary" onClick={loadAll}>Retry</button>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="app-loading"><div className="app-loading-spinner" /></div>}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index             element={<RoleRoute path="/"><Dashboard /></RoleRoute>} />
          <Route path="branches"   element={<RoleRoute path="/branches"><Branches /></RoleRoute>} />
          <Route path="categories" element={<RoleRoute path="/categories"><Categories /></RoleRoute>} />
          <Route path="products"   element={<RoleRoute path="/products"><Products /></RoleRoute>} />
          <Route path="purchases"  element={<RoleRoute path="/purchases"><Purchases /></RoleRoute>} />
          <Route path="stock-in"   element={<RoleRoute path="/stock-in"><StockIn /></RoleRoute>} />
          <Route path="stock-out"  element={<RoleRoute path="/stock-out"><StockOut /></RoleRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function ProtectedApp() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
        <p>Restoring session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*"      element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ProtectedApp />
      </BrowserRouter>
    </AuthProvider>
  );
}
