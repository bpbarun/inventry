import { useState, useRef, useEffect } from "react";
import { Menu, Bell, LogOut, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/api";

export default function Navbar({ onMenu }) {
  const { lowStockProducts, products } = useApp();
  const { user, logout } = useAuth();

  const alerts    = lowStockProducts();
  const lowCount  = alerts.length;

  const [showNotif, setShowNotif] = useState(false);
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!showNotif) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotif]);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("inv_refresh_token");
    try { await authApi.logout({ refreshToken }); } catch (_) {}
    logout();
  };

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="icon-btn" onClick={onMenu}><Menu size={22} /></button>
        <div className="navbar-brand">
          <span className="navbar-brand-title">Inventory</span>
        </div>
      </div>

      <div className="navbar-right">
        {/* ── Bell + dropdown ── */}
        <div style={{ position: "relative" }} ref={panelRef}>
          <button
            className="icon-btn"
            onClick={() => setShowNotif(v => !v)}
            title="Stock alerts"
            style={{ color: showNotif ? "var(--primary)" : undefined }}
          >
            <Bell size={20} />
          </button>
          {lowCount > 0 && <span className="notif-dot">{lowCount}</span>}

          {showNotif && (
            <div className="notif-panel">
              <div className="notif-panel-header">
                <span>Stock Alerts</span>
                {lowCount > 0
                  ? <span className="badge badge-danger">{lowCount} item{lowCount !== 1 ? "s" : ""}</span>
                  : <span className="badge badge-success">All OK</span>
                }
              </div>

              <div className="notif-panel-body">
                {alerts.length === 0 ? (
                  <div className="notif-empty">
                    <CheckCircle2 size={28} style={{ margin: "0 auto 8px", display: "block", color: "var(--success)", opacity: .7 }} />
                    All products are sufficiently stocked.
                  </div>
                ) : (
                  alerts.map(p => {
                    const isOut = Number(p.stock) === 0;
                    return (
                      <div key={p.id} className="notif-item">
                        <div className="notif-item-icon">
                          <AlertTriangle size={18} style={{ color: isOut ? "var(--danger)" : "var(--warning)" }} />
                        </div>
                        <div className="notif-item-body">
                          <p className="notif-item-name">{p.name}</p>
                          <p className="notif-item-meta">
                            {p.branchName || "—"} &nbsp;·&nbsp; Min: {p.minStock} {p.unit}
                          </p>
                        </div>
                        <div className="notif-item-badge">
                          <span className={`badge badge-${isOut ? "danger" : "warning"}`}>
                            {isOut ? "Out" : `${p.stock} ${p.unit}`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="avatar">{initials}</div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600 }}>{user?.name || "User"}</p>
          <p style={{ fontSize: 11, color: "var(--text-meta)", textTransform: "capitalize" }}>{user?.role || ""}</p>
        </div>
        <button className="icon-btn" onClick={handleLogout} title="Sign out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
