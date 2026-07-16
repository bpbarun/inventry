import { useState, useMemo } from "react";
import { Plus, Trash2, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronRight, ClipboardList } from "lucide-react";
import { useApp } from "../../context/AppContext";

let _key = 0;
const newRow = () => ({ _key: ++_key, productId: "", qty: "" });

let _woKey = 0;
const newWO = (name) => ({ _id: ++_woKey, name, rows: [newRow()], open: true });

const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Frontend FIFO: mirrors the PHP logic — replay only known-cost stock-outs
function calcFifoCost(stockIns, stockOuts, productId, qty) {
  const lots = stockIns
    .filter(si => si.productId === productId && Number(si.unitCost) > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id))
    .map(si => ({ qty: Number(si.qty), unitCost: Number(si.unitCost) }));

  if (lots.length === 0) return null;

  const queue = lots.map(l => ({ ...l }));

  const knownSOs = stockOuts
    .filter(so => so.productId === productId && so.totalCost != null)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id - b.id));

  for (const so of knownSOs) {
    let rem = Number(so.qty);
    for (let i = 0; i < queue.length && rem > 0; i++) {
      const take = Math.min(rem, queue[i].qty);
      queue[i].qty -= take;
      rem -= take;
    }
  }

  let totalCost = 0, hasRate = false, toConsume = qty;
  for (const lot of queue.filter(l => l.qty > 0)) {
    if (toConsume <= 0) break;
    const take = Math.min(toConsume, lot.qty);
    totalCost += take * lot.unitCost;
    hasRate = true;
    toConsume -= take;
  }
  return hasRate ? totalCost : null;
}

export default function StockPreview() {
  const { products, branches, categories, stockIns, stockOuts } = useApp();

  const [branchId,    setBranchId]    = useState("");
  const [parentCatId, setParentCatId] = useState("");
  const [subCatId,    setSubCatId]    = useState("");
  const [newWoName,   setNewWoName]   = useState("");
  const [workOrders,  setWorkOrders]  = useState([]);

  const branchProds = branchId
    ? products.filter(p => parseInt(p.branchId) === parseInt(branchId))
    : products;

  // Root categories that have products in the selected branch
  const rootCats = categories.filter(c =>
    !c.parentId && branchProds.some(p => {
      const cat = categories.find(x => x.id === p.categoryId);
      return p.categoryId === c.id || (cat && cat.parentId === c.id);
    })
  );

  // Subcategories of the selected parent
  const subCats = parentCatId
    ? categories.filter(c => c.parentId === parseInt(parentCatId))
    : [];

  // IDs to filter products by (parent + all its subs, or just the selected sub)
  const catFilterIds = subCatId
    ? [parseInt(subCatId)]
    : parentCatId
      ? [parseInt(parentCatId), ...categories.filter(c => c.parentId === parseInt(parentCatId)).map(c => c.id)]
      : null;

  const filteredProds = catFilterIds
    ? branchProds.filter(p => catFilterIds.includes(p.categoryId))
    : branchProds;

  // Clear all product selections across WOs
  const clearProductSelections = () =>
    setWorkOrders(p => p.map(wo => ({ ...wo, rows: wo.rows.map(r => ({ ...r, productId: "" })) })));

  // ── Work order actions ────────────────────────────────────────────────────
  const addWorkOrder = () => {
    const name = newWoName.trim();
    if (!name) return;
    setWorkOrders(p => [...p, newWO(name)]);
    setNewWoName("");
  };

  const removeWorkOrder = (id) => setWorkOrders(p => p.filter(wo => wo._id !== id));

  const toggleWO = (id) =>
    setWorkOrders(p => p.map(wo => wo._id === id ? { ...wo, open: !wo.open } : wo));

  // ── Row actions inside a WO ───────────────────────────────────────────────
  const setRowField = (woId, key, field, val) =>
    setWorkOrders(p => p.map(wo => wo._id !== woId ? wo : {
      ...wo,
      rows: wo.rows.map(r => r._key === key ? { ...r, [field]: val } : r),
    }));

  const addRow = (woId) =>
    setWorkOrders(p => p.map(wo => wo._id !== woId ? wo : { ...wo, rows: [...wo.rows, newRow()] }));

  const removeRow = (woId, key) =>
    setWorkOrders(p => p.map(wo => wo._id !== woId ? wo : { ...wo, rows: wo.rows.filter(r => r._key !== key) }));

  // ── Compute results for each WO ───────────────────────────────────────────
  const woResults = useMemo(() => {
    return workOrders.map(wo => {
      const valid = wo.rows.filter(r => r.productId && parseInt(r.qty) > 0);
      if (valid.length === 0) return { woId: wo._id, results: [] };

      const totals = {};
      valid.forEach(r => {
        const pid = parseInt(r.productId);
        totals[pid] = (totals[pid] || 0) + parseInt(r.qty);
      });

      const results = Object.entries(totals).map(([pid, requested]) => {
        const prod = products.find(p => p.id === parseInt(pid));
        if (!prod) return null;
        const cat       = categories.find(c => c.id === prod.categoryId);
        const branch    = branches.find(b => b.id === prod.branchId);
        const current   = Number(prod.stock);
        const remaining = current - requested;
        const fifoAmount = calcFifoCost(stockIns, stockOuts, prod.id, requested);
        const unitRate   = fifoAmount != null && requested > 0 ? fifoAmount / requested : null;
        return { prod, cat, branch, current, requested, remaining, fifoAmount, unitRate };
      }).filter(Boolean);

      return { woId: wo._id, results };
    });
  }, [workOrders, products, categories, branches, stockIns, stockOuts]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Preview</h1>
          <p className="page-subtitle">Simulate stock-outs per work order — no data is saved. Clears on refresh.</p>
        </div>
      </div>

      {/* ── Top controls ── */}
      <div className="card" style={{ padding: "14px 20px" }}>
        {/* Filter row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sub)", flexShrink: 0, minWidth: 60 }}>Branch:</span>
          <select
            className="form-input select-sm"
            style={{ minWidth: 170 }}
            value={branchId}
            onChange={e => { setBranchId(e.target.value); setParentCatId(""); setSubCatId(""); clearProductSelections(); }}
          >
            <option value="">— All Branches —</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sub)", flexShrink: 0 }}>Category:</span>
          <select
            className="form-input select-sm"
            style={{ minWidth: 170 }}
            value={parentCatId}
            onChange={e => { setParentCatId(e.target.value); setSubCatId(""); clearProductSelections(); }}
          >
            <option value="">— All Categories —</option>
            {rootCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>

          {subCats.length > 0 && (
            <>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sub)", flexShrink: 0 }}>Sub:</span>
              <select
                className="form-input select-sm"
                style={{ minWidth: 160 }}
                value={subCatId}
                onChange={e => { setSubCatId(e.target.value); clearProductSelections(); }}
              >
                <option value="">— All Subcategories —</option>
                {subCats.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
            </>
          )}
        </div>

        {/* Add WO row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sub)", flexShrink: 0, minWidth: 60 }}>Work Order:</span>
          <input
            className="form-input form-input-sm"
            style={{ flex: 1, minWidth: 200, maxWidth: 300 }}
            placeholder="e.g. WO-2024-001"
            value={newWoName}
            onChange={e => setNewWoName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addWorkOrder()}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={addWorkOrder}
            disabled={!newWoName.trim()}
          >
            <Plus size={13} /> Add Work Order
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {workOrders.length === 0 && (
        <div className="card prev-empty" style={{ marginTop: 16 }}>
          <ClipboardList size={36} className="prev-empty-icon" />
          <p>Add a work order above to start simulating stock consumption.</p>
          <p style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 4 }}>Data is stored in page state only — refreshing the page clears everything.</p>
        </div>
      )}

      {/* ── Work Order Accordions ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {workOrders.map((wo) => {
          const { results } = woResults.find(r => r.woId === wo._id) || { results: [] };
          const shortageCount  = results.filter(r => r.remaining < 0).length;
          const lowCount       = results.filter(r => r.remaining >= 0 && r.remaining <= Number(r.prod.minStock)).length;
          const okCount        = results.filter(r => r.remaining > Number(r.prod.minStock)).length;
          const totalUnits     = results.reduce((s, r) => s + r.requested, 0);
          const totalCost      = results.reduce((s, r) => s + (r.fifoAmount ?? 0), 0);
          const hasCost        = results.some(r => r.fifoAmount != null);

          return (
            <div key={wo._id} className={`wo-card ${wo.open ? "wo-card-open" : ""}`}>

              {/* ── Accordion header ── */}
              <div className="wo-card-header" style={{ cursor: "pointer" }} onClick={() => toggleWO(wo._id)}>
                <div className="wo-card-left">
                  {wo.open
                    ? <ChevronDown size={16} style={{ color: "#6366f1", flexShrink: 0 }} />
                    : <ChevronRight size={16} style={{ color: "var(--text-sub)", flexShrink: 0 }} />
                  }
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{wo.name}</span>

                  {results.length > 0 && (
                    <>
                      <span className="wo-badge wo-badge-solo" style={{ fontSize: 11 }}>
                        {results.length} product{results.length !== 1 ? "s" : ""}
                      </span>
                      <span className="wo-badge wo-badge-solo" style={{ fontSize: 11 }}>
                        {totalUnits} units
                      </span>
                      {hasCost && (
                        <span className="wo-badge" style={{ fontSize: 11 }}>{fmt(totalCost)}</span>
                      )}
                      {shortageCount > 0 && (
                        <span className="badge badge-danger" style={{ fontSize: 11 }}>{shortageCount} Short</span>
                      )}
                      {lowCount > 0 && (
                        <span className="badge badge-warning" style={{ fontSize: 11 }}>{lowCount} Low</span>
                      )}
                      {shortageCount === 0 && lowCount === 0 && okCount > 0 && (
                        <span className="badge badge-success" style={{ fontSize: 11 }}>All OK</span>
                      )}
                    </>
                  )}
                </div>
                <div className="wo-card-right">
                  <button
                    className="icon-btn icon-btn-red"
                    title="Remove work order"
                    onClick={e => { e.stopPropagation(); removeWorkOrder(wo._id); }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* ── Accordion body ── */}
              {wo.open && (
                <div className="wo-card-body" style={{ paddingTop: 16 }}>

                  {/* Product input rows */}
                  <table className="prev-input-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ width: 160 }}>Qty to Consume</th>
                        <th style={{ width: 44 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {wo.rows.map(r => {
                        const prod = products.find(p => p.id === parseInt(r.productId));
                        return (
                          <tr key={r._key}>
                            <td>
                              <select
                                className="form-input form-input-sm"
                                value={r.productId}
                                onChange={e => setRowField(wo._id, r._key, "productId", e.target.value)}
                              >
                                <option value="">— Select product —</option>
                                {filteredProds.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.sku}) — {p.stock} {p.unit} in stock
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input
                                  type="number" min="1"
                                  className="form-input form-input-sm"
                                  style={{ width: 80 }}
                                  placeholder="0"
                                  value={r.qty}
                                  onChange={e => setRowField(wo._id, r._key, "qty", e.target.value)}
                                />
                                {prod && (
                                  <span
                                    className={`badge badge-${Number(prod.stock) === 0 ? "danger" : Number(prod.stock) <= Number(prod.minStock) ? "warning" : "success"}`}
                                    style={{ fontSize: 11 }}
                                  >
                                    {prod.stock}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              {wo.rows.length > 1 && (
                                <button className="icon-btn icon-btn-red" onClick={() => removeRow(wo._id, r._key)}>
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div style={{ marginTop: 10 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => addRow(wo._id)}>
                      <Plus size={13} /> Add Product
                    </button>
                  </div>

                  {/* ── Results preview ── */}
                  {results.length > 0 && (
                    <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                      {/* Mini summary bar */}
                      <div className="prev-summary" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
                        <div className="prev-stat">
                          <span className="prev-stat-label">Products</span>
                          <span className="prev-stat-value" style={{ fontSize: 15 }}>{results.length}</span>
                        </div>
                        <div className="prev-stat">
                          <span className="prev-stat-label">Total Units</span>
                          <span className="prev-stat-value" style={{ fontSize: 15 }}>{totalUnits}</span>
                        </div>
                        {hasCost && (
                          <div className="prev-stat">
                            <span className="prev-stat-label">Est. Cost</span>
                            <span className="prev-stat-value" style={{ fontSize: 15 }}>{fmt(totalCost)}</span>
                          </div>
                        )}
                        <div className="prev-stat prev-stat-ok"><CheckCircle2 size={13} /><span>{okCount} OK</span></div>
                        <div className="prev-stat prev-stat-low"><AlertTriangle size={13} /><span>{lowCount} Low</span></div>
                        <div className="prev-stat prev-stat-short"><XCircle size={13} /><span>{shortageCount} Short</span></div>
                      </div>

                      {/* Result rows */}
                      <table className="prev-result-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th className="text-right">Current</th>
                            <th className="text-right">Requested</th>
                            <th className="text-right">Remaining</th>
                            <th className="text-right">Rate (₹)</th>
                            <th className="text-right">Amount (₹)</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map(({ prod, cat, current, requested, remaining, fifoAmount, unitRate }) => {
                            const shortage = remaining < 0;
                            const low      = !shortage && remaining <= Number(prod.minStock);
                            return (
                              <tr key={prod.id} className={shortage ? "prev-row-shortage" : low ? "prev-row-low" : "prev-row-ok"}>
                                <td><p className="td-name">{prod.name}</p></td>
                                <td><span className="td-meta">{prod.sku}</span></td>
                                <td>{cat && <span className="cat-chip">{cat.icon} {cat.name}</span>}</td>
                                <td className="text-right">{current} {prod.unit}</td>
                                <td className="text-right" style={{ color: "var(--text-sub)" }}>−{requested} {prod.unit}</td>
                                <td className="text-right prev-remaining" style={{ color: shortage ? "var(--danger)" : low ? "var(--warning)" : "var(--success)" }}>
                                  {remaining} {prod.unit}
                                </td>
                                <td className="text-right">
                                  <span className="td-meta">{unitRate != null ? fmt(unitRate) : "—"}</span>
                                </td>
                                <td className="text-right" style={{ fontWeight: fifoAmount != null ? 600 : 400 }}>
                                  {fifoAmount != null ? fmt(fifoAmount) : "—"}
                                </td>
                                <td>
                                  {shortage ? (
                                    <span className="badge badge-danger">Short {Math.abs(remaining)} {prod.unit}</span>
                                  ) : low ? (
                                    <span className="badge badge-warning">Low Stock</span>
                                  ) : (
                                    <span className="badge badge-success">OK</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
