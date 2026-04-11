import { useState } from "react";
import { useApp } from "../../context/AppContext";

const empty = { branchId: "", categoryId: "", name: "", sku: "", unit: "", costPrice: "", sellingPrice: "", stock: "", minStock: "", location: "", color: "", description: "" };

export default function ProductForm({ initial = null, onSave, onCancel }) {
  const { branches, categories } = useApp();
  const [f, setF] = useState(
    initial ? {
      ...initial,
      branchId:   String(initial.branchId   || ""),
      categoryId: String(initial.categoryId || ""),
    } : empty
  );
  const [err, setErr]       = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(p => ({ ...p, [k]: "" })); };

  const onBranchChange = (val) => { setF(p => ({ ...p, branchId: val, categoryId: "" })); };

  const filteredCats = f.branchId
    ? categories.filter(c => !c.branchId || parseInt(c.branchId) === parseInt(f.branchId))
    : categories;

  const submit = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (!f.branchId)                         e2.branchId   = "Select a branch";
    if (!f.categoryId)                       e2.categoryId = "Select a category";
    if (!f.name.trim())                      e2.name       = "Name is required";
    if (!f.sku.trim())                       e2.sku        = "SKU is required";
    if (!f.unit.trim())                      e2.unit       = "Unit is required";
    if (!f.costPrice || isNaN(f.costPrice))  e2.costPrice  = "Valid cost price required";
    if (!f.sellingPrice  || isNaN(f.sellingPrice)) e2.sellingPrice  = "Valid selling price required";
    if (f.stock === "" || isNaN(f.stock))    e2.stock      = "Stock quantity required";
    if (!f.minStock || isNaN(f.minStock))    e2.minStock   = "Min stock required";
    if (Object.keys(e2).length) { setErr(e2); return; }

    setSaving(true);
    try {
      await onSave({
        categoryId:    parseInt(f.categoryId),
        name:          f.name,
        sku:           f.sku,
        unit:          f.unit,
        costPrice:     parseFloat(f.costPrice),
        sellingPrice:  parseFloat(f.sellingPrice),
        stock:         parseInt(f.stock),
        minStock:      parseInt(f.minStock),
        location:      f.location,
        color:         f.color,
        description:   f.description,
      });
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
          <label className="form-label">Branch *</label>
          <select className={`form-input${err.branchId ? " input-error" : ""}`} value={f.branchId} onChange={e => onBranchChange(e.target.value)}>
            <option value="">-- Select Branch --</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {err.branchId && <span className="form-error">{err.branchId}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Category *</label>
          <select className={`form-input${err.categoryId ? " input-error" : ""}`} value={f.categoryId} onChange={e => set("categoryId", e.target.value)}>
            <option value="">-- Select Category --</option>
            {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          {err.categoryId && <span className="form-error">{err.categoryId}</span>}
        </div>

        <div className="form-group form-span-2">
          <label className="form-label">Product Name *</label>
          <input className={`form-input${err.name ? " input-error" : ""}`} value={f.name} onChange={e => set("name", e.target.value)} placeholder="e.g. UPVC Main Frame Profile 70mm" />
          {err.name && <span className="form-error">{err.name}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">SKU *</label>
          <input className={`form-input${err.sku ? " input-error" : ""}`} value={f.sku} onChange={e => set("sku", e.target.value)} placeholder="e.g. B1-UPV-MF70" />
          {err.sku && <span className="form-error">{err.sku}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Unit *</label>
          <input className={`form-input${err.unit ? " input-error" : ""}`} value={f.unit} onChange={e => set("unit", e.target.value)} placeholder="e.g. Each, m², Length" />
          {err.unit && <span className="form-error">{err.unit}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Cost Price (₹) *</label>
          <input type="number" step="0.01" className={`form-input${err.costPrice ? " input-error" : ""}`} value={f.costPrice} onChange={e => set("costPrice", e.target.value)} placeholder="0.00" />
          {err.costPrice && <span className="form-error">{err.costPrice}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Selling Price (₹) *</label>
          <input type="number" step="0.01" className={`form-input${err.sellingPrice ? " input-error" : ""}`} value={f.sellingPrice} onChange={e => set("sellingPrice", e.target.value)} placeholder="0.00" />
          {err.sellingPrice && <span className="form-error">{err.sellingPrice}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Opening Stock *</label>
          <input type="number" className={`form-input${err.stock ? " input-error" : ""}`} value={f.stock} onChange={e => set("stock", e.target.value)} placeholder="0" />
          {err.stock && <span className="form-error">{err.stock}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Min Stock *</label>
          <input type="number" className={`form-input${err.minStock ? " input-error" : ""}`} value={f.minStock} onChange={e => set("minStock", e.target.value)} placeholder="0" />
          {err.minStock && <span className="form-error">{err.minStock}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Storage Location</label>
          <input className="form-input" value={f.location || ""} onChange={e => set("location", e.target.value)} placeholder="e.g. Rack A1" />
        </div>
        <div className="form-group">
          <label className="form-label">Colour</label>
          <input className="form-input" value={f.color || ""} onChange={e => set("color", e.target.value)} placeholder="e.g. White, Grey, Chrome" />
        </div>

        <div className="form-group form-span-2">
          <label className="form-label">Description</label>
          <textarea className="form-input form-textarea" rows={2} value={f.description || ""} onChange={e => set("description", e.target.value)} placeholder="Product description..." />
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : initial ? "Save Changes" : "Add Product"}</button>
      </div>
    </form>
  );
}
