import { useState, useMemo, useRef } from "react";
import {
  Plus, Trash2, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, ClipboardList, Pencil, Check, X, Save,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import ConfirmDialog from "../common/ConfirmDialog";

let _key = 0;
const newRow = () => ({ _key: ++_key, productId: "", qty: "" });

let _woKey = 0;
const newWO = (name) => ({ _id: ++_woKey, name, rows: [newRow()], open: true });

const fmt = (n) =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Frontend FIFO: mirrors the PHP logic
function calcFifoCost(stockIns, stockOuts, productId, qty) {
  const lots = stockIns
    .filter((si) => si.productId === productId && Number(si.unitCost) > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id))
    .map((si) => ({ qty: Number(si.qty), unitCost: Number(si.unitCost) }));

  if (lots.length === 0) return null;

  const queue = lots.map((l) => ({ ...l }));

  const knownSOs = stockOuts
    .filter((so) => so.productId === productId && so.totalCost != null)
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
  for (const lot of queue.filter((l) => l.qty > 0)) {
    if (toConsume <= 0) break;
    const take = Math.min(toConsume, lot.qty);
    totalCost += take * lot.unitCost;
    hasRate = true;
    toConsume -= take;
  }
  return hasRate ? totalCost : null;
}

function computeResults(rows, products, categories, stockIns, stockOuts) {
  const valid = rows.filter((r) => r.productId && parseInt(r.qty) > 0);
  if (valid.length === 0) return [];

  const totals = {};
  valid.forEach((r) => {
    const pid = parseInt(r.productId);
    totals[pid] = (totals[pid] || 0) + parseInt(r.qty);
  });

  return Object.entries(totals)
    .map(([pid, requested]) => {
      const prod = products.find((p) => p.id === parseInt(pid));
      if (!prod) return null;
      const cat        = categories.find((c) => c.id === prod.categoryId);
      const current    = Number(prod.stock);
      const remaining  = current - requested;
      const fifoAmount = calcFifoCost(stockIns, stockOuts, prod.id, requested);
      const unitRate   = fifoAmount != null && requested > 0 ? fifoAmount / requested : null;
      return { prod, cat, current, requested, remaining, fifoAmount, unitRate };
    })
    .filter(Boolean);
}

function ResultsSummary({ results }) {
  const shortageCount = results.filter((r) => r.remaining < 0).length;
  const lowCount      = results.filter((r) => r.remaining >= 0 && r.remaining <= Number(r.prod.minStock)).length;
  const okCount       = results.filter((r) => r.remaining > Number(r.prod.minStock)).length;
  const totalUnits    = results.reduce((s, r) => s + r.requested, 0);
  const totalCost     = results.reduce((s, r) => s + (r.fifoAmount ?? 0), 0);
  const hasCost       = results.some((r) => r.fifoAmount != null);

  return (
    <div className="prev-summary" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
      <div className="prev-stat"><span className="prev-stat-label">Products</span><span className="prev-stat-value" style={{ fontSize: 15 }}>{results.length}</span></div>
      <div className="prev-stat"><span className="prev-stat-label">Total Units</span><span className="prev-stat-value" style={{ fontSize: 15 }}>{totalUnits}</span></div>
      {hasCost && <div className="prev-stat"><span className="prev-stat-label">Est. Cost</span><span className="prev-stat-value" style={{ fontSize: 15 }}>{fmt(totalCost)}</span></div>}
      <div className="prev-stat prev-stat-ok"><CheckCircle2 size={13} /><span>{okCount} OK</span></div>
      <div className="prev-stat prev-stat-low"><AlertTriangle size={13} /><span>{lowCount} Low</span></div>
      <div className="prev-stat prev-stat-short"><XCircle size={13} /><span>{shortageCount} Short</span></div>
    </div>
  );
}

function ResultsTable({ results }) {
  return (
    <table className="prev-result-table">
      <thead>
        <tr>
          <th>Product</th><th>SKU</th><th>Category</th>
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
              <td className="text-right"><span className="td-meta">{unitRate != null ? fmt(unitRate) : "—"}</span></td>
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
  );
}

// Badge row shown in accordion header for results summary
function HeaderBadges({ results, savingOrLoading }) {
  if (savingOrLoading || results.length === 0) return null;
  const shortageCount = results.filter((r) => r.remaining < 0).length;
  const lowCount      = results.filter((r) => r.remaining >= 0 && r.remaining <= Number(r.prod.minStock)).length;
  const okCount       = results.filter((r) => r.remaining > Number(r.prod.minStock)).length;
  const totalUnits    = results.reduce((s, r) => s + r.requested, 0);
  const totalCost     = results.reduce((s, r) => s + (r.fifoAmount ?? 0), 0);
  const hasCost       = results.some((r) => r.fifoAmount != null);
  return (
    <>
      <span className="wo-badge wo-badge-solo" style={{ fontSize: 11 }}>{results.length} product{results.length !== 1 ? "s" : ""}</span>
      <span className="wo-badge wo-badge-solo" style={{ fontSize: 11 }}>{totalUnits} units</span>
      {hasCost && <span className="wo-badge" style={{ fontSize: 11 }}>{fmt(totalCost)}</span>}
      {shortageCount > 0 && <span className="badge badge-danger" style={{ fontSize: 11 }}>{shortageCount} Short</span>}
      {lowCount > 0 && <span className="badge badge-warning" style={{ fontSize: 11 }}>{lowCount} Low</span>}
      {shortageCount === 0 && lowCount === 0 && okCount > 0 && <span className="badge badge-success" style={{ fontSize: 11 }}>All OK</span>}
    </>
  );
}

export default function StockPreview() {
  const {
    products, branches, categories, stockIns, stockOuts,
    previewOrders, addPreviewOrder, updatePreviewOrder, deletePreviewOrder,
  } = useApp();

  // ── Global filters ────────────────────────────────────────────────────────
  const [branchId,    setBranchId]    = useState("");
  const [parentCatId, setParentCatId] = useState("");
  const [subCatId,    setSubCatId]    = useState("");
  const [newWoName,   setNewWoName]   = useState("");

  // ── Session (unsaved) WOs ─────────────────────────────────────────────────
  const [workOrders,  setWorkOrders]  = useState([]);
  const [savingWoId,  setSavingWoId]  = useState(null);

  // Rename for session WOs
  const [renamingId,  setRenamingId]  = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef(null);

  // ── Saved records state ───────────────────────────────────────────────────
  const [openSavedIds,    setOpenSavedIds]    = useState(new Set());
  const [editingId,       setEditingId]       = useState(null);
  const [editName,        setEditName]        = useState("");
  const [editRows,        setEditRows]        = useState([]);
  const [editSaving,      setEditSaving]      = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting,        setDeleting]        = useState(false);

  // ── Filter helpers ────────────────────────────────────────────────────────
  const branchProds = branchId
    ? products.filter((p) => parseInt(p.branchId) === parseInt(branchId))
    : products;

  const rootCats = categories.filter(
    (c) => !c.parentId && branchProds.some((p) => {
      const cat = categories.find((x) => x.id === p.categoryId);
      return p.categoryId === c.id || (cat && cat.parentId === c.id);
    })
  );

  const subCats = parentCatId
    ? categories.filter((c) => c.parentId === parseInt(parentCatId))
    : [];

  const catFilterIds = subCatId
    ? [parseInt(subCatId)]
    : parentCatId
      ? [parseInt(parentCatId), ...categories.filter((c) => c.parentId === parseInt(parentCatId)).map((c) => c.id)]
      : null;

  const filteredProds = catFilterIds
    ? branchProds.filter((p) => catFilterIds.includes(p.categoryId))
    : branchProds;

  const clearProductSelections = () =>
    setWorkOrders((p) => p.map((wo) => ({ ...wo, rows: wo.rows.map((r) => ({ ...r, productId: "" })) })));

  // ── Session WO actions ────────────────────────────────────────────────────
  const addWorkOrder = () => {
    const name = newWoName.trim();
    if (!name) return;
    setWorkOrders((p) => [...p, newWO(name)]);
    setNewWoName("");
  };

  const removeWorkOrder = (id) => setWorkOrders((p) => p.filter((wo) => wo._id !== id));

  const toggleWO = (id) =>
    setWorkOrders((p) => p.map((wo) => (wo._id === id ? { ...wo, open: !wo.open } : wo)));

  const startRename = (wo, e) => {
    e.stopPropagation();
    setRenamingId(wo._id);
    setRenameValue(wo.name);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const confirmRename = () => {
    const name = renameValue.trim();
    if (name) setWorkOrders((p) => p.map((wo) => (wo._id === renamingId ? { ...wo, name } : wo)));
    setRenamingId(null);
  };

  const cancelRename = () => setRenamingId(null);

  const setRowField = (woId, key, field, val) =>
    setWorkOrders((p) =>
      p.map((wo) =>
        wo._id !== woId ? wo : { ...wo, rows: wo.rows.map((r) => (r._key === key ? { ...r, [field]: val } : r)) }
      )
    );

  const addRow = (woId) =>
    setWorkOrders((p) => p.map((wo) => (wo._id !== woId ? wo : { ...wo, rows: [...wo.rows, newRow()] })));

  const removeRow = (woId, key) =>
    setWorkOrders((p) =>
      p.map((wo) => (wo._id !== woId ? wo : { ...wo, rows: wo.rows.filter((r) => r._key !== key) }))
    );

  const saveWorkOrder = async (wo) => {
    const validRows = wo.rows.filter((r) => r.productId && parseInt(r.qty) > 0);
    if (validRows.length === 0) return;
    setSavingWoId(wo._id);
    try {
      const saved = await addPreviewOrder({
        workOrder: wo.name,
        items: validRows.map((r) => ({ productId: parseInt(r.productId), qty: parseInt(r.qty) })),
      });
      setWorkOrders((p) => p.filter((w) => w._id !== wo._id));
      setOpenSavedIds((p) => new Set([...p, saved.id]));
    } finally {
      setSavingWoId(null);
    }
  };

  // ── Saved WO actions ──────────────────────────────────────────────────────
  const toggleSaved = (id) =>
    setOpenSavedIds((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const startEdit = (order) => {
    setEditingId(order.id);
    setEditName(order.workOrder);
    setEditRows((order.items || []).map((item) => ({
      _key: ++_key,
      productId: String(item.productId),
      qty:       String(item.qty),
    })));
    setOpenSavedIds((p) => new Set([...p, order.id]));
  };

  const cancelEdit = () => { setEditingId(null); setEditName(""); setEditRows([]); };

  const setEditRowField = (key, field, val) =>
    setEditRows((p) => p.map((r) => (r._key === key ? { ...r, [field]: val } : r)));

  const addEditRow = () => setEditRows((p) => [...p, newRow()]);

  const removeEditRow = (key) => setEditRows((p) => p.filter((r) => r._key !== key));

  const saveEdit = async () => {
    if (!editName.trim()) return;
    const validRows = editRows.filter((r) => r.productId && parseInt(r.qty) > 0);
    setEditSaving(true);
    try {
      await updatePreviewOrder(editingId, {
        workOrder: editName.trim(),
        items: validRows.map((r) => ({ productId: parseInt(r.productId), qty: parseInt(r.qty) })),
      });
      setEditingId(null);
    } finally {
      setEditSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await deletePreviewOrder(confirmDeleteId);
      setOpenSavedIds((p) => { const n = new Set(p); n.delete(confirmDeleteId); return n; });
      setConfirmDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  // ── FIFO results ──────────────────────────────────────────────────────────
  const sessionResults = useMemo(
    () => workOrders.map((wo) => ({
      woId:    wo._id,
      results: computeResults(wo.rows, products, categories, stockIns, stockOuts),
    })),
    [workOrders, products, categories, stockIns, stockOuts]
  );

  const savedResults = useMemo(
    () => previewOrders.map((order) => {
      const rows = (order.items || []).map((item) => ({
        _key:      item.id,
        productId: String(item.productId),
        qty:       String(item.qty),
      }));
      return {
        orderId: order.id,
        results: computeResults(rows, products, categories, stockIns, stockOuts),
      };
    }),
    [previewOrders, products, categories, stockIns, stockOuts]
  );

  const editResults = useMemo(
    () => computeResults(editRows, products, categories, stockIns, stockOuts),
    [editRows, products, categories, stockIns, stockOuts]
  );

  // ── Shared product rows editor ────────────────────────────────────────────
  const renderRows = (rows, onSetField, onAddRow, onRemoveRow, prodList) => (
    <>
      <table className="prev-input-table">
        <thead>
          <tr>
            <th>Product</th>
            <th style={{ width: 160 }}>Qty to Consume</th>
            <th style={{ width: 44 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const prod = products.find((p) => p.id === parseInt(r.productId));
            return (
              <tr key={r._key}>
                <td>
                  <select
                    className="form-input form-input-sm"
                    value={r.productId}
                    onChange={(e) => onSetField(r._key, "productId", e.target.value)}
                  >
                    <option value="">— Select product —</option>
                    {prodList.map((p) => (
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
                      onChange={(e) => onSetField(r._key, "qty", e.target.value)}
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
                  {rows.length > 1 && (
                    <button className="icon-btn icon-btn-red" onClick={() => onRemoveRow(r._key)}>
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
        <button className="btn btn-outline btn-sm" onClick={onAddRow}>
          <Plus size={13} /> Add Product
        </button>
      </div>
    </>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Preview</h1>
          <p className="page-subtitle">Simulate stock-outs per work order. Save to records for future reference.</p>
        </div>
      </div>

      {/* ── Top controls ── */}
      <div className="card" style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sub)", flexShrink: 0, minWidth: 60 }}>Branch:</span>
          <select
            className="form-input select-sm"
            style={{ minWidth: 170 }}
            value={branchId}
            onChange={(e) => { setBranchId(e.target.value); setParentCatId(""); setSubCatId(""); clearProductSelections(); }}
          >
            <option value="">— All Branches —</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sub)", flexShrink: 0 }}>Category:</span>
          <select
            className="form-input select-sm"
            style={{ minWidth: 170 }}
            value={parentCatId}
            onChange={(e) => { setParentCatId(e.target.value); setSubCatId(""); clearProductSelections(); }}
          >
            <option value="">— All Categories —</option>
            {rootCats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>

          {subCats.length > 0 && (
            <>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sub)", flexShrink: 0 }}>Sub:</span>
              <select
                className="form-input select-sm"
                style={{ minWidth: 160 }}
                value={subCatId}
                onChange={(e) => { setSubCatId(e.target.value); clearProductSelections(); }}
              >
                <option value="">— All Subcategories —</option>
                {subCats.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
            </>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sub)", flexShrink: 0, minWidth: 60 }}>Work Order:</span>
          <input
            className="form-input form-input-sm"
            style={{ flex: 1, minWidth: 200, maxWidth: 300 }}
            placeholder="e.g. WO-2024-001"
            value={newWoName}
            onChange={(e) => setNewWoName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addWorkOrder()}
          />
          <button className="btn btn-primary btn-sm" onClick={addWorkOrder} disabled={!newWoName.trim()}>
            <Plus size={13} /> Add Work Order
          </button>
        </div>
      </div>

      {/* ══ SESSION (UNSAVED) WOs ══════════════════════════════════════════════ */}
      {workOrders.length > 0 && (
        <>
          <div style={{ marginTop: 20, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Unsaved Simulation
            </span>
            <span className="badge badge-neutral" style={{ fontSize: 11 }}>{workOrders.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {workOrders.map((wo) => {
              const { results } = sessionResults.find((r) => r.woId === wo._id) || { results: [] };
              const isSaving    = savingWoId === wo._id;
              const hasItems    = wo.rows.some((r) => r.productId && parseInt(r.qty) > 0);

              return (
                <div key={wo._id} className={`wo-card ${wo.open ? "wo-card-open" : ""}`}>
                  <div className="wo-card-header" style={{ cursor: "pointer" }} onClick={() => toggleWO(wo._id)}>
                    <div className="wo-card-left">
                      {wo.open
                        ? <ChevronDown size={16} style={{ color: "#6366f1", flexShrink: 0 }} />
                        : <ChevronRight size={16} style={{ color: "var(--text-sub)", flexShrink: 0 }} />
                      }
                      {renamingId === wo._id ? (
                        <input
                          ref={renameInputRef}
                          className="form-input form-input-sm"
                          style={{ width: 200, fontWeight: 700 }}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") cancelRename(); }}
                          onBlur={confirmRename}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{wo.name}</span>
                      )}
                      <HeaderBadges results={results} savingOrLoading={isSaving} />
                    </div>
                    <div className="wo-card-right">
                      {renamingId === wo._id ? (
                        <>
                          <button className="icon-btn icon-btn-green" title="Save name" onClick={(e) => { e.stopPropagation(); confirmRename(); }}><Check size={14} /></button>
                          <button className="icon-btn" title="Cancel" onClick={(e) => { e.stopPropagation(); cancelRename(); }}><X size={14} /></button>
                        </>
                      ) : (
                        <button className="icon-btn" title="Rename" onClick={(e) => startRename(wo, e)}><Pencil size={14} /></button>
                      )}
                      <button
                        className="btn btn-sm"
                        style={{ background: "var(--success)", color: "#fff", opacity: isSaving || !hasItems ? 0.5 : 1 }}
                        title="Save to records"
                        disabled={isSaving || !hasItems}
                        onClick={(e) => { e.stopPropagation(); saveWorkOrder(wo); }}
                      >
                        <Save size={13} /> {isSaving ? "Saving…" : "Save"}
                      </button>
                      <button
                        className="icon-btn icon-btn-red"
                        title="Remove"
                        onClick={(e) => { e.stopPropagation(); removeWorkOrder(wo._id); }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {wo.open && (
                    <div className="wo-card-body" style={{ paddingTop: 16 }}>
                      {renderRows(
                        wo.rows,
                        (key, field, val) => setRowField(wo._id, key, field, val),
                        () => addRow(wo._id),
                        (key) => removeRow(wo._id, key),
                        filteredProds
                      )}
                      {results.length > 0 && (
                        <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                          <ResultsSummary results={results} />
                          <ResultsTable results={results} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══ SAVED RECORDS ═════════════════════════════════════════════════════ */}
      <div style={{ marginTop: 24, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Saved Records
        </span>
        <span className="badge badge-neutral" style={{ fontSize: 11 }}>{previewOrders.length}</span>
      </div>

      {previewOrders.length === 0 && workOrders.length === 0 && (
        <div className="card prev-empty" style={{ marginTop: 8 }}>
          <ClipboardList size={36} className="prev-empty-icon" />
          <p>Add a work order above to start simulating stock consumption.</p>
          <p style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 4 }}>Click "Save" on a work order to keep it as a permanent record.</p>
        </div>
      )}

      {previewOrders.length === 0 && workOrders.length > 0 && (
        <div className="card prev-empty" style={{ marginTop: 8, padding: "20px 24px" }}>
          <p style={{ fontSize: 13, color: "var(--text-sub)" }}>No saved records yet. Click "Save" on any work order above to persist it.</p>
        </div>
      )}

      {previewOrders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {previewOrders.map((order) => {
            const isOpen    = openSavedIds.has(order.id);
            const isEditing = editingId === order.id;
            const { results: viewResults } = savedResults.find((r) => r.orderId === order.id) || { results: [] };
            const results   = isEditing ? editResults : viewResults;
            const itemCount = (order.items || []).length;

            return (
              <div key={order.id} className={`wo-card ${isOpen ? "wo-card-open" : ""}`} style={{ borderLeft: "3px solid var(--primary)" }}>
                <div className="wo-card-header" style={{ cursor: "pointer" }} onClick={() => !isEditing && toggleSaved(order.id)}>
                  <div className="wo-card-left">
                    {isOpen
                      ? <ChevronDown size={16} style={{ color: "#6366f1", flexShrink: 0 }} />
                      : <ChevronRight size={16} style={{ color: "var(--text-sub)", flexShrink: 0 }} />
                    }
                    {isEditing ? (
                      <input
                        className="form-input form-input-sm"
                        style={{ width: 220, fontWeight: 700 }}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{order.workOrder}</span>
                    )}
                    {!isEditing && (
                      <>
                        <span className="wo-badge wo-badge-solo" style={{ fontSize: 11 }}>{itemCount} product{itemCount !== 1 ? "s" : ""}</span>
                        <span className="td-meta" style={{ fontSize: 11 }}>
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN") : ""}
                        </span>
                        <HeaderBadges results={viewResults} savingOrLoading={false} />
                      </>
                    )}
                  </div>
                  <div className="wo-card-right">
                    {isEditing ? (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={editSaving || !editName.trim()}
                          onClick={(e) => { e.stopPropagation(); saveEdit(); }}
                        >
                          <Check size={13} /> {editSaving ? "Saving…" : "Save Changes"}
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); cancelEdit(); }}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="icon-btn"
                          title="Edit"
                          onClick={(e) => { e.stopPropagation(); startEdit(order); }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="icon-btn icon-btn-red"
                          title="Delete"
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(order.id); }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="wo-card-body" style={{ paddingTop: 16 }}>
                    {isEditing ? (
                      <>
                        {renderRows(
                          editRows,
                          setEditRowField,
                          addEditRow,
                          removeEditRow,
                          products
                        )}
                        {editResults.length > 0 && (
                          <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                            <ResultsSummary results={editResults} />
                            <ResultsTable results={editResults} />
                          </div>
                        )}
                      </>
                    ) : (
                      viewResults.length > 0 ? (
                        <div>
                          <ResultsSummary results={viewResults} />
                          <ResultsTable results={viewResults} />
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-sub)", fontSize: 13 }}>
                          No results — products may have been removed or items not yet added.
                        </p>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete Preview Record"
          message="This will permanently delete this work order preview and all its items. This action cannot be undone."
          danger
          confirmLabel={deleting ? "Deleting…" : "Delete"}
          onConfirm={doDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
