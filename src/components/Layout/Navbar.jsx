import { Menu, Bell, LogOut } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/api";

export default function Navbar({ onMenu }) {
  const { lowStockProducts } = useApp();
  const { user, logout } = useAuth();
  const lowCount = lowStockProducts().length;

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
          <span className="navbar-brand-title">GlassTech Inventory</span>
        </div>
      </div>
      <div className="navbar-right">
        <div style={{ position: "relative" }}>
          <button className="icon-btn"><Bell size={20} /></button>
          {lowCount > 0 && <span className="notif-dot">{lowCount}</span>}
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
