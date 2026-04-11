import { useState } from "react";
import { useApp } from "../../context/AppContext";

const today = () => new Date().toISOString().split("T")[0];
const empty = { branchId: "", categoryId: "", productId: "", qty: "", supplier: "", reference: "", notes: "", date: today() };

export default function StockInForm({ onSave, onCancel }) {
  const { branches, categories, products, addStockIn } = useApp();
  const [f, setF]         = useState(empty);
  const [err, setErr]     = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(p => ({ ...p, [k]: "" })); };

  const branchProds   = f.branchId   ? products.filter(p => parseInt(p.branchId) === parseInt(f.branchId))   : products;
  const branchCats    = f.branchId   ? categories.filter(c => branchProds.some(p => parseInt(p.categoryId) === parseInt(c.id))) : categories;
  const filteredProds = f.categoryId ? branchProds.filter(p => parseInt(p.categoryId) === parseInt(f.categoryId)) : branchProds;
  const selectedProd  = products.find(p => p.id === parseInt(f.productId));

  const submit = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (!f.productId)                                    e2.productId = "Select a product";
    if (!f.qty || isNaN(f.qty) || parseInt(f.qty) <= 0) e2.qty       = "Enter valid quantity";
    if (Object.keys(e2).length) { setErr(e2); return; }
    setSaving(true);
    try {
      await addStockIn({
        productId: parseInt(f.productId),
        branchId:  parseInt(f.branchId),
        qty:       parseInt(f.qty),
        supplier:  f.supplier,
        reference: f.reference,
        notes:     f.notes,
        date:      f.date || today(),
      });
      onSave();
    } catch (err) {
      setErr({ api: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {err.api && <div className="form-api-error">{err.api}</div>}
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Branch (filter)</label>
          <select className="form-input" value={f.branchId} onChange={e => { set("branchId", e.target.value); set("categoryId", ""); set("productId", ""); }}>
            <option value="">-- All Branches --</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Category (filter)</label>
          <select className="form-input" value={f.categoryId} onChange={e => { set("categoryId", e.target.value); set("productId", ""); }}>
            <option value="">-- All Categories --</option>
            {branchCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div className="form-group form-span-2">
          <label className="form-label">Product *</label>
          <select className={`form-input${err.productId ? " input-error" : ""}`} value={f.productId} onChange={e => set("productId", e.target.value)}>
            <option value="">-- Select Product --</option>
            {filteredProds.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
          </select>
          {err.productId && <span className="form-error">{err.productId}</span>}
          {selectedProd && <p className="form-hint">Current stock: <strong>{selectedProd.stock} {selectedProd.unit}</strong></p>}
        </div>
        <div className="form-group">
          <label className="form-label">Quantity *</label>
          <input type="number" min="1" className={`form-input${err.qty ? " input-error" : ""}`} value={f.qty} onChange={e => set("qty", e.target.value)} placeholder="0" />
          {err.qty && <span className="form-error">{err.qty}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Date</label>
          <input type="date" className="form-input" value={f.date} onChange={e => set("date", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Supplier</label>
          <input className="form-input" value={f.supplier} onChange={e => set("supplier", e.target.value)} placeholder="Supplier name" />
        </div>
        <div className="form-group">
          <label className="form-label">Reference / PO No.</label>
          <input className="form-input" value={f.reference} onChange={e => set("reference", e.target.value)} placeholder="e.g. PO-2024-001" />
        </div>
        <div className="form-group form-span-2">
          <label className="form-label">Notes</label>
          <textarea className="form-input form-textarea" rows={2} value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes..." />
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-success" disabled={saving}>{saving ? "Saving…" : "Add Stock In"}</button>
      </div>
    </form>
  );
}
