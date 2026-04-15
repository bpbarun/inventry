import { NavLink } from "react-router-dom";
import { LayoutDashboard, GitBranch, Tag, Package, ShoppingCart, ArrowDownCircle, ArrowUpCircle, Upload, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { ROLE_ACCESS } from "../../config/roles";

export default function Sidebar({ open, onClose }) {
  const { lowStockProducts, purchases } = useApp();
  const { user } = useAuth();
  const lowCount   = lowStockProducts().length;
  const pendingPOs = purchases.filter((p) => p.status === "Draft" || p.status === "Ordered").length;

  const allowed = ROLE_ACCESS[user?.role] ?? [];

  const nav = [
    { to: "/",           icon: LayoutDashboard, label: "Dashboard",       badge: null },
    { to: "/branches",   icon: GitBranch,       label: "Branches",        badge: null },
    { to: "/categories", icon: Tag,             label: "Categories",      badge: null },
    { to: "/products",   icon: Package,         label: "Products",        badge: lowCount > 0 ? lowCount : null },
    { to: "/purchases",  icon: ShoppingCart,    label: "Purchase Orders", badge: pendingPOs > 0 ? pendingPOs : null, badgeColor: "blue" },
    { to: "/stock-in",   icon: ArrowDownCircle, label: "Stock In",        badge: null },
    { to: "/stock-out",  icon: ArrowUpCircle,   label: "Stock Out",       badge: null },
    { to: "/import",     icon: Upload,          label: "Import Data",     badge: null },
  ].filter(item => allowed.includes(item.to));

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar${open ? " sidebar-open" : ""}`}>
        <div className="sidebar-logo">
          <span className="logo-icon">🪟</span>
          <div className="logo-text">
            <span className="logo-title">Inventry</span>
            <span className="logo-sub">Inventory Pro</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <nav className="sidebar-nav">
          {nav.map(({ to, icon: Icon, label, badge, badgeColor }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => `sidebar-link${isActive ? " sidebar-link-active" : ""}`}
              onClick={onClose}
            >
              <Icon size={17} />
              <span>{label}</span>
              {badge != null && (
                <span className={`nav-badge${badgeColor ? ` nav-badge-${badgeColor}` : ""}`}>
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>Inventry Managment.</p>
          <p style={{ fontSize: 10, marginTop: 2, color: "#475569" }}>v2.0.0</p>
        </div>
      </aside>
    </>
  );
}
