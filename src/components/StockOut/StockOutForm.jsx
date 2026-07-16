import { useState } from "react";
import { Plus, Trash2, ScanLine } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import BarcodeScanner from "../common/BarcodeScanner";

const today = () => new Date().toISOString().split("T")[0];
let _key = 0;
const emptyItem = () => ({ _key: ++_key, productId: "", qty: "" });

export default function StockOutForm({ onSave, onCancel }) {
  const { branches, categories, products } = useApp();
  const toast = useToast();

  const [workOrder,   setWorkOrder]   = useState("");
  const [date,        setDate]        = useState(today());
  const [reason,      setReason]      = useState("");
  const [notes,       setNotes]       = useState("");
  const [branchId,    setBranchId]    = useState("");
  const [parentCatId, setParentCatId] = useState("");
  const [subCatId,    setSubCatId]    = useState("");
  const [items,       setItems]       = useState([emptyItem()]);
  const [errors,      setErrors]      = useState({});
  const [saving,      setSaving]      = useState(false);
  const [scanningFor, setScanningFor] = useState(null);

  // Products available in the selected branch
  const branchProds = branchId
    ? products.filter(p => parseInt(p.branchId) === parseInt(branchId))
    : products;

  // Root categories that have products in the current branch
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

  // Category IDs to filter products by (parent + all its subs, or just the selected sub)
  const catFilterIds = subCatId
    ? [parseInt(subCatId)]
    : parentCatId
      ? [parseInt(parentCatId), ...categories.filter(c => c.parentId === parseInt(parentCatId)).map(c => c.id)]
      : null;

  const filteredProds = catFilterIds
    ? branchProds.filter(p => catFilterIds.includes(p.categoryId))
    : branchProds;

  const setItemField = (_key, field, val) => {
    setItems(p => p.map(it => it._key === _key ? { ...it, [field]: val } : it));
    setErrors(p => ({ ...p, [`${_key}_${field}`]: "" }));
  };

  const addItem = () => setItems(p => [...p, emptyItem()]);
  const removeItem = (_key) => setItems(p => p.filter(it => it._key !== _key));

  const handleScan = (value) => {
    const match = products.find(p =>
      p.sku?.toLowerCase() === value.toLowerCase() || String(p.id) === value
    );
    if (match) {
      setItemField(scanningFor, "productId", String(match.id));
      if (!branchId) setBranchId(String(match.branchId || ""));
      toast.success(`Found: ${match.name}`);
    } else {
      toast.error(`No product matched: ${value}`);
    }
    setScanningFor(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!workOrder.trim()) errs.workOrder = "Work order number is required.";
    if (!reason.trim())    errs.reason    = "Reason is required.";
    items.forEach(it => {
      if (!it.productId)                                     errs[`${it._key}_productId`] = "Select a product";
      const qty = parseInt(it.qty);
      if (!it.qty || isNaN(qty) || qty <= 0)                 errs[`${it._key}_qty`]       = "Enter valid qty";
      if (it.productId) {
        const prod = products.find(p => p.id === parseInt(it.productId));
        if (prod && qty > Number(prod.stock))                errs[`${it._key}_qty`]       = `Max ${prod.stock}`;
      }
    });
    // Check for duplicate products
    const ids = items.map(it => it.productId).filter(Boolean);
    if (new Set(ids).size !== ids.length) errs._items = "Duplicate products — each product can only appear once.";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      await onSave({
        workOrder: workOrder.trim(),
        date:      date || today(),
        reason:    reason.trim(),
        notes:     notes.trim(),
        items: items.map(it => {
          const prod = products.find(p => p.id === parseInt(it.productId));
          return {
            productId: parseInt(it.productId),
            branchId:  prod?.branchId || parseInt(branchId) || null,
            qty:       parseInt(it.qty),
          };
        }),
      });
    } catch (err) {
      setErrors({ api: err.message });
    } finally {
      setSaving(false);
    }
  };

  const totalQty = items.reduce((s, it) => s + (parseInt(it.qty) || 0), 0);

  return (
    <>
      {scanningFor !== null && (
        <BarcodeScanner
          title="Scan Product Barcode"
          onScan={handleScan}
          onClose={() => setScanningFor(null)}
        />
      )}

      <form onSubmit={submit} className="so-batch-form">
        {errors.api && <div className="form-api-error">{errors.api}</div>}

        {/* ── Header fields ── */}
        <div className="form-grid">
          <div className="form-group form-span-2">
            <label className="form-label">
              Work Order Number <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              className={`form-input${errors.workOrder ? " input-error" : ""}`}
              value={workOrder}
              onChange={e => { setWorkOrder(e.target.value); setErrors(p => ({ ...p, workOrder: "" })); }}
              placeholder="e.g. WO-2024-001"
            />
            {errors.workOrder && <span className="form-error">{errors.workOrder}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Branch (filter)</label>
            <select className="form-input" value={branchId} onChange={e => { setBranchId(e.target.value); setParentCatId(""); setSubCatId(""); setItems(p => p.map(it => ({ ...it, productId: "" }))); }}>
              <option value="">— All Branches —</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Category (filter)</label>
            <select className="form-input" value={parentCatId} onChange={e => { setParentCatId(e.target.value); setSubCatId(""); setItems(p => p.map(it => ({ ...it, productId: "" }))); }}>
              <option value="">— All Categories —</option>
              {rootCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          {subCats.length > 0 && (
            <div className="form-group form-span-2">
              <label className="form-label">Subcategory (filter)</label>
              <select className="form-input" value={subCatId} onChange={e => { setSubCatId(e.target.value); setItems(p => p.map(it => ({ ...it, productId: "" }))); }}>
                <option value="">— All Subcategories —</option>
                {subCats.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
            </div>
          )}

          <div className="form-group form-span-2">
            <label className="form-label">
              Reason <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              className={`form-input${errors.reason ? " input-error" : ""}`}
              value={reason}
              onChange={e => { setReason(e.target.value); setErrors(p => ({ ...p, reason: "" })); }}
              placeholder="e.g. Production use, Damage, Transfer"
            />
            {errors.reason && <span className="form-error">{errors.reason}</span>}
          </div>

          <div className="form-group form-span-2">
            <label className="form-label">Notes</label>
            <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
        </div>

        {/* ── Line Items ── */}
        <div className="so-items-section">
          <div className="so-items-header">
            <span className="so-items-title">Items</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={addItem}>
              <Plus size={13} /> Add Item
            </button>
          </div>

          {errors._items && <div className="so-items-error">{errors._items}</div>}

          <div className="so-items-table-wrap">
            <table className="so-items-table">
              <thead>
                <tr>
                  <th style={{ width: "44%" }}>Product</th>
                  <th style={{ width: "20%" }}>Available</th>
                  <th style={{ width: "20%" }}>Qty *</th>
                  <th style={{ width: "16%" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const prod = products.find(p => p.id === parseInt(it.productId));
                  return (
                    <tr key={it._key}>
                      <td>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <select
                            className={`form-input form-input-sm${errors[`${it._key}_productId`] ? " input-error" : ""}`}
                            value={it.productId}
                            onChange={e => setItemField(it._key, "productId", e.target.value)}
                          >
                            <option value="">— Select —</option>
                            {filteredProds.map(p => (
                              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                            ))}
                          </select>
                          <button type="button" className="icon-btn" title="Scan barcode" onClick={() => setScanningFor(it._key)}>
                            <ScanLine size={14} />
                          </button>
                        </div>
                        {errors[`${it._key}_productId`] && <span className="form-error">{errors[`${it._key}_productId`]}</span>}
                      </td>
                      <td>
                        {prod
                          ? <span className={`badge badge-${Number(prod.stock) === 0 ? "danger" : Number(prod.stock) <= Number(prod.minStock) ? "warning" : "success"}`}>{prod.stock} {prod.unit}</span>
                          : <span className="td-meta">—</span>}
                      </td>
                      <td>
                        <input
                          type="number" min="1"
                          className={`form-input form-input-sm${errors[`${it._key}_qty`] ? " input-error" : ""}`}
                          value={it.qty}
                          onChange={e => setItemField(it._key, "qty", e.target.value)}
                          placeholder="0"
                        />
                        {errors[`${it._key}_qty`] && <span className="form-error">{errors[`${it._key}_qty`]}</span>}
                      </td>
                      <td className="text-center">
                        {items.length > 1 && (
                          <button type="button" className="icon-btn icon-btn-red" onClick={() => removeItem(it._key)}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {items.length > 1 && (
                <tfoot>
                  <tr>
                    <td colSpan={2} className="text-right" style={{ padding: "8px 10px", fontSize: 13, color: "var(--text-sub)" }}>Total qty:</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700 }}>{totalQty}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-warning" disabled={saving || totalQty === 0}>
            {saving ? "Saving…" : `Issue Stock Out (${totalQty} units)`}
          </button>
        </div>
      </form>
    </>
  );
}
