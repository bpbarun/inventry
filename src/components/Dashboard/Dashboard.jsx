import { GitBranch, Package, AlertTriangle, TrendingUp, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";

function StatCard({ label, value, sub, icon, color }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-body">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value">{value}</p>
          {sub && <p className="stat-sub">{sub}</p>}
        </div>
        <div className={`stat-icon stat-icon-${color}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { branches, categories, products, stockIns, stockOuts, lowStockProducts, totalInventoryValue } = useApp();

  const lowItems  = lowStockProducts();
  const recentIn  = [...stockIns].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)).slice(0, 5);
  const recentOut = [...stockOuts].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)).slice(0, 5);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview across all branches</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <StatCard label="Branches"        value={branches.length}   sub="Active locations"    icon={<GitBranch size={22}/>}      color="blue"   />
        <StatCard label="Categories"      value={categories.length} sub="Across all branches" icon={<Package size={22}/>}        color="purple" />
        <StatCard label="Products"        value={products.length}   sub="Total SKUs"           icon={<Package size={22}/>}        color="green"  />
        <StatCard label="Low Stock"       value={lowItems.length}   sub="Need reordering"      icon={<AlertTriangle size={22}/>}  color={lowItems.length > 0 ? "orange" : "green"} />
        <StatCard label="Inventory Value" value={`₹${totalInventoryValue().toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} sub="At cost price" icon={<TrendingUp size={22}/>} color="teal" />
      </div>

      {/* Branch Cards */}
      <h2 className="section-heading">Branch Overview</h2>
      <div className="branch-overview-grid">
        {branches.map(b => {
          const bProds = products.filter(p => p.branchId === b.id);
          const bValue = bProds.reduce((s, p) => s + Number(p.stock) * Number(p.costPrice), 0);
          const bLow   = bProds.filter(p => Number(p.stock) <= Number(p.minStock)).length;
          const bCats  = new Set(bProds.map(p => p.categoryId)).size;
          return (
            <div key={b.id} className="branch-ov-card card">
              <div className="branch-ov-top">
                <div className="branch-ov-avatar">{b.name[0]}</div>
                <div>
                  <p className="branch-ov-name">{b.name}</p>
                  {b.manager && <p className="branch-ov-manager">Manager: {b.manager}</p>}
                </div>
                <span className={`badge ${(b.status || "Active") === "Active" ? "badge-success" : "badge-neutral"}`}>{b.status || "Active"}</span>
              </div>
              <div className="branch-ov-stats">
                <div><span className="bos-val">{bCats}</span><span className="bos-lbl">Categories</span></div>
                <div><span className="bos-val">{bProds.length}</span><span className="bos-lbl">Products</span></div>
                <div><span className="bos-val">₹{bValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span><span className="bos-lbl">Value</span></div>
                {bLow > 0 && <div><span className="bos-val" style={{ color: "var(--warning)" }}>{bLow}</span><span className="bos-lbl">Low Stock</span></div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="dash-bottom">
        {/* Low Stock Alert */}
        {lowItems.length > 0 && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 14 }}><AlertTriangle size={16} style={{ color: "var(--warning)" }}/> Low Stock Alerts</h3>
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Product</th><th>Branch</th><th>Stock</th><th>Min</th></tr></thead>
                <tbody>
                  {lowItems.map(p => (
                    <tr key={p.id}>
                      <td><p className="td-name">{p.name}</p><p className="td-meta">{p.sku}</p></td>
                      <td className="td-meta">{p.branchName || branches.find(b => b.id === p.branchId)?.name || "—"}</td>
                      <td><span className={`badge ${Number(p.stock) === 0 ? "badge-danger" : "badge-warning"}`}>{p.stock}</span></td>
                      <td className="td-meta">{p.minStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Stock In */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 14 }}><ArrowDownCircle size={16} style={{ color: "var(--success)" }}/> Recent Stock In</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Product</th><th>Branch</th><th>Qty</th><th>Date</th><th>Supplier</th></tr></thead>
              <tbody>
                {recentIn.map(si => (
                  <tr key={si.id}>
                    <td className="td-name">{si.productName || products.find(p => p.id === si.productId)?.name || "—"}</td>
                    <td className="td-meta">{si.branchName || "—"}</td>
                    <td><span className="mv-in">+{si.qty}</span></td>
                    <td className="td-meta">{si.date}</td>
                    <td className="td-meta">{si.supplier || "—"}</td>
                  </tr>
                ))}
                {recentIn.length === 0 && <tr><td colSpan={5} className="td-meta" style={{ textAlign: "center" }}>No stock in records yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Stock Out */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 14 }}><ArrowUpCircle size={16} style={{ color: "var(--warning)" }}/> Recent Stock Out</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Product</th><th>Branch</th><th>Qty</th><th>Date</th><th>Reason</th></tr></thead>
              <tbody>
                {recentOut.map(so => (
                  <tr key={so.id}>
                    <td className="td-name">{so.productName || products.find(p => p.id === so.productId)?.name || "—"}</td>
                    <td className="td-meta">{so.branchName || "—"}</td>
                    <td><span className="mv-out">-{so.qty}</span></td>
                    <td className="td-meta">{so.date}</td>
                    <td className="td-meta td-truncate">{so.reason || "—"}</td>
                  </tr>
                ))}
                {recentOut.length === 0 && <tr><td colSpan={5} className="td-meta" style={{ textAlign: "center" }}>No stock out records yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
