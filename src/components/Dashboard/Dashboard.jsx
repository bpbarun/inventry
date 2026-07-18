import { useState, useMemo, useEffect } from "react";
import { GitBranch, Package, AlertTriangle, TrendingUp, ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
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

const PAGE_SIZE = 5;

function usePager(items) {
  const [page, setPage] = useState(1);
  // reset to page 1 whenever the filtered list changes
  useEffect(() => { setPage(1); }, [items.length]);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  return { page: safePage, setPage, totalPages, paged, total: items.length };
}

function Pager({ page, totalPages, setPage, total }) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to   = Math.min(page * PAGE_SIZE, total);
  return (
    <div className="dash-pager">
      <span className="dash-pager-count">{from}–{to} of {total}</span>
      <button className="dt-pg" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
        <ChevronLeft size={13} />
      </button>
      <span className="dash-pager-pages">{page} / {totalPages}</span>
      <button className="dt-pg" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

// Small search + branch filter bar used by all three tables
function TableFilters({ search, onSearch, branch, onBranch, branches, placeholder }) {
  return (
    <div className="dash-filters">
      <div className="dash-search-box">
        <Search size={12} className="dash-search-icon" />
        <input
          className="dash-search-input"
          placeholder={placeholder || "Search…"}
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
        {search && (
          <button className="dash-search-clear" onClick={() => onSearch("")}><X size={11} /></button>
        )}
      </div>
      <select className="form-input select-sm" style={{ minWidth: 130 }} value={branch} onChange={e => onBranch(e.target.value)}>
        <option value="">All Branches</option>
        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
    </div>
  );
}

export default function Dashboard() {
  const { branches, categories, products, stockIns, stockOuts, lowStockProducts, totalInventoryValue } = useApp();

  const lowItems  = lowStockProducts();
  const sortedIn  = useMemo(() => [...stockIns].sort((a, b)  => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)), [stockIns]);
  const sortedOut = useMemo(() => [...stockOuts].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)), [stockOuts]);

  // ── Low Stock filters ─────────────────────────────────────────
  const [lowSearch, setLowSearch]   = useState("");
  const [lowBranch, setLowBranch]   = useState("");

  // ── Stock In filters ──────────────────────────────────────────
  const [inSearch,  setInSearch]    = useState("");
  const [inBranch,  setInBranch]    = useState("");

  // ── Stock Out filters ─────────────────────────────────────────
  const [outSearch, setOutSearch]   = useState("");
  const [outBranch, setOutBranch]   = useState("");

  const filteredLow = useMemo(() => {
    const q = lowSearch.trim().toLowerCase();
    return lowItems.filter(p => {
      const matchB = !lowBranch || String(p.branchId) === lowBranch;
      const matchQ = !q || p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q);
      return matchB && matchQ;
    });
  }, [lowItems, lowSearch, lowBranch]);

  const filteredIn = useMemo(() => {
    const q = inSearch.trim().toLowerCase();
    return sortedIn.filter(si => {
      const name = (si.productName || products.find(p => p.id === si.productId)?.name || "").toLowerCase();
      const matchB = !inBranch || String(si.branchId) === inBranch;
      const matchQ = !q || name.includes(q) || (si.supplier || "").toLowerCase().includes(q) || (si.reference || "").toLowerCase().includes(q);
      return matchB && matchQ;
    });
  }, [sortedIn, inSearch, inBranch, products]);

  const filteredOut = useMemo(() => {
    const q = outSearch.trim().toLowerCase();
    return sortedOut.filter(so => {
      const name = (so.productName || products.find(p => p.id === so.productId)?.name || "").toLowerCase();
      const matchB = !outBranch || String(so.branchId) === outBranch;
      const matchQ = !q || name.includes(q) || (so.reason || "").toLowerCase().includes(q) || (so.workOrder || "").toLowerCase().includes(q);
      return matchB && matchQ;
    });
  }, [sortedOut, outSearch, outBranch, products]);

  const lowPager  = usePager(filteredLow);
  const inPager   = usePager(filteredIn);
  const outPager  = usePager(filteredOut);

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

        {/* Low Stock Alerts */}
        {lowItems.length > 0 && (
          <div className="card">
            <div className="dash-section-header">
              <h3 className="card-title"><AlertTriangle size={16} style={{ color: "var(--warning)" }}/> Low Stock Alerts</h3>
              <span className="badge badge-warning">{lowItems.length} item{lowItems.length !== 1 ? "s" : ""}</span>
            </div>
            <TableFilters
              search={lowSearch} onSearch={setLowSearch}
              branch={lowBranch} onBranch={setLowBranch}
              branches={branches} placeholder="Search product or SKU…"
            />
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Product</th><th>Branch</th><th>Stock</th><th>Min</th></tr></thead>
                <tbody>
                  {lowPager.paged.length === 0 ? (
                    <tr><td colSpan={4} className="td-meta" style={{ textAlign: "center" }}>No matching items</td></tr>
                  ) : lowPager.paged.map(p => (
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
            <Pager {...lowPager} />
          </div>
        )}

        {/* Recent Stock In */}
        <div className="card">
          <div className="dash-section-header">
            <h3 className="card-title"><ArrowDownCircle size={16} style={{ color: "var(--success)" }}/> Recent Stock In</h3>
            {sortedIn.length > 0 && <span className="badge badge-success">{sortedIn.length} record{sortedIn.length !== 1 ? "s" : ""}</span>}
          </div>
          <TableFilters
            search={inSearch} onSearch={setInSearch}
            branch={inBranch} onBranch={setInBranch}
            branches={branches} placeholder="Search product or supplier…"
          />
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Product</th><th>Branch</th><th>Qty</th><th>Date</th><th>Supplier</th></tr></thead>
              <tbody>
                {filteredIn.length === 0 ? (
                  <tr><td colSpan={5} className="td-meta" style={{ textAlign: "center" }}>{sortedIn.length === 0 ? "No stock in records yet" : "No matching records"}</td></tr>
                ) : inPager.paged.map(si => (
                  <tr key={si.id}>
                    <td className="td-name">{si.productName || products.find(p => p.id === si.productId)?.name || "—"}</td>
                    <td className="td-meta">{si.branchName || "—"}</td>
                    <td><span className="mv-in">+{si.qty}</span></td>
                    <td className="td-meta">{si.date}</td>
                    <td className="td-meta">{si.supplier || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager {...inPager} />
        </div>

        {/* Recent Stock Out */}
        <div className="card">
          <div className="dash-section-header">
            <h3 className="card-title"><ArrowUpCircle size={16} style={{ color: "var(--warning)" }}/> Recent Stock Out</h3>
            {sortedOut.length > 0 && <span className="badge badge-warning">{sortedOut.length} record{sortedOut.length !== 1 ? "s" : ""}</span>}
          </div>
          <TableFilters
            search={outSearch} onSearch={setOutSearch}
            branch={outBranch} onBranch={setOutBranch}
            branches={branches} placeholder="Search product, reason or WO…"
          />
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Product</th><th>Branch</th><th>Qty</th><th>Date</th><th>Reason</th></tr></thead>
              <tbody>
                {filteredOut.length === 0 ? (
                  <tr><td colSpan={5} className="td-meta" style={{ textAlign: "center" }}>{sortedOut.length === 0 ? "No stock out records yet" : "No matching records"}</td></tr>
                ) : outPager.paged.map(so => (
                  <tr key={so.id}>
                    <td className="td-name">{so.productName || products.find(p => p.id === so.productId)?.name || "—"}</td>
                    <td className="td-meta">{so.branchName || "—"}</td>
                    <td><span className="mv-out">-{so.qty}</span></td>
                    <td className="td-meta">{so.date}</td>
                    <td className="td-meta td-truncate">{so.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager {...outPager} />
        </div>

      </div>
    </div>
  );
}
