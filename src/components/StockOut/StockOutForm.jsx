import { useState } from "react";
import { ScanLine } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import BarcodeScanner from "../common/BarcodeScanner";

const today = () => new Date().toISOString().split("T")[0];
const empty = { branchId: "", parentCatId: "", subCatId: "", productId: "", qty: "", reason: "", reference: "", notes: "", date: today() };

export default function StockOutForm({ onSave, onCancel }) {
  const { branches, categories, products } = useApp();
  const toast = useToast();
  const [f, setF]           = useState(empty);
  const [err, setErr]       = useState({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);

  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(p => ({ ...p, [k]: "" })); };

  const branchProds = f.branchId
    ? products.filter(p => parseInt(p.branchId) === parseInt(f.branchId))
    : products;

  // Root categories with products in this branch
  const rootCats = categories.filter(c =>
    !c.parentId && branchProds.some(p => {
      const cat = categories.find(x => x.id === p.categoryId);
      return p.categoryId === c.id || (cat && cat.parentId === c.id);
    })
  );

  const subCats = f.parentCatId
    ? categories.filter(c => c.parentId === parseInt(f.parentCatId))
    : [];

  const catFilterIds = f.subCatId
    ? [parseInt(f.subCatId)]
    : f.parentCatId
      ? [parseInt(f.parentCatId), ...categories.filter(c => c.parentId === parseInt(f.parentCatId)).map(c => c.id)]
      : null;

  const filteredProds = catFilterIds
    ? branchProds.filter(p => catFilterIds.includes(p.categoryId))
    : branchProds;

  const selectedProd = products.find(p => p.id === parseInt(f.productId));

  const handleScan = (value) => {
    setScanning(false);
    const match = products.find(p =>
      p.sku?.toLowerCase() === value.toLowerCase() || String(p.id) === value
    );
    if (match) {
      const cat = categories.find(c => c.id === match.categoryId);
      const parentId = cat?.parentId ? String(cat.parentId) : String(match.categoryId || "");
      const subId    = cat?.parentId ? String(match.categoryId) : "";
      setF(p => ({ ...p, productId: String(match.id), branchId: String(match.branchId || ""), parentCatId: parentId, subCatId: subId }));
      toast.success(`Product found: ${match.name}`);
    } else {
      toast.error(`No product matched barcode: ${value}`);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (!f.productId)                                    e2.productId = "Select a product";
    if (!f.qty || isNaN(f.qty) || parseInt(f.qty) <= 0) e2.qty       = "Enter valid quantity";
    if (selectedProd && parseInt(f.qty) > Number(selectedProd.stock)) e2.qty = `Only ${selectedProd.stock} in stock`;
    if (!f.reason.trim())                                e2.reason    = "Reason is required";
    if (Object.keys(e2).length) { setErr(e2); return; }
    setSaving(true);
    try {
      await onSave({
        productId: parseInt(f.productId),
        branchId:  parseInt(f.branchId),
        qty:       parseInt(f.qty),
        reason:    f.reason,
        reference: f.reference,
        notes:     f.notes,
        date:      f.date || today(),
      });
    } catch (err) {
      setErr({ api: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {scanning && (
        <BarcodeScanner title="Scan Product Barcode" onScan={handleScan} onClose={() => setScanning(false)} />
      )}
      <form onSubmit={submit}>
        {err.api && <div className="form-api-error">{err.api}</div>}
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Branch (filter)</label>
            <select className="form-input" value={f.branchId} onChange={e => setF(p => ({ ...p, branchId: e.target.value, parentCatId: "", subCatId: "", productId: "" }))}>
              <option value="">-- All Branches --</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Category (filter)</label>
            <select className="form-input" value={f.parentCatId} onChange={e => setF(p => ({ ...p, parentCatId: e.target.value, subCatId: "", productId: "" }))}>
              <option value="">-- All Categories --</option>
              {rootCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          {subCats.length > 0 && (
            <div className="form-group form-span-2">
              <label className="form-label">Subcategory (filter)</label>
              <select className="form-input" value={f.subCatId} onChange={e => setF(p => ({ ...p, subCatId: e.target.value, productId: "" }))}>
                <option value="">-- All Subcategories --</option>
                {subCats.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
            </div>
          )}

          <div className="form-group form-span-2">
            <div className="form-label-row">
              <label className="form-label">Product *</label>
              <button type="button" className="scan-btn" onClick={() => setScanning(true)}>
                <ScanLine size={14} /> Scan Barcode
              </button>
            </div>
            <select className={`form-input${err.productId ? " input-error" : ""}`} value={f.productId} onChange={e => set("productId", e.target.value)}>
              <option value="">-- Select Product --</option>
              {filteredProds.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Stock: {p.stock}</option>)}
            </select>
            {err.productId && <span className="form-error">{err.productId}</span>}
            {selectedProd && <p className="form-hint">Available: <strong>{selectedProd.stock} {selectedProd.unit}</strong></p>}
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
          <div className="form-group form-span-2">
            <label className="form-label">Reason *</label>
            <input className={`form-input${err.reason ? " input-error" : ""}`} value={f.reason} onChange={e => set("reason", e.target.value)} placeholder="e.g. Job #2024-050, Damage, Transfer" />
            {err.reason && <span className="form-error">{err.reason}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Reference</label>
            <input className="form-input" value={f.reference} onChange={e => set("reference", e.target.value)} placeholder="e.g. JOB-050" />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes" />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-warning" disabled={saving}>{saving ? "Saving…" : "Issue Stock Out"}</button>
        </div>
      </form>
    </>
  );
}
