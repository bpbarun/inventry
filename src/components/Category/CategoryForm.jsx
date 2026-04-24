import { useState } from "react";
import { useApp } from "../../context/AppContext";

const ICONS = ["🪟","🔲","🔧","🔩","📦","🏗️","🔑","⚙️","🪝","🛡️"];
const empty = { branchId: "", parentId: "", name: "", icon: "📦", description: "" };

export default function CategoryForm({ initial = null, onSave, onCancel }) {
  const { branches, categories } = useApp();
  const [f, setF] = useState(initial
    ? { ...initial, branchId: String(initial.branchId || ""), parentId: String(initial.parentId || "") }
    : empty
  );
  const [err, setErr] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(p => ({ ...p, [k]: "" })); };

  // Only root categories (no parent) can be parents; exclude self
  const parentOptions = categories.filter(c =>
    !c.parentId && (!initial || c.id !== initial.id)
  );

  const submit = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (!f.name.trim()) e2.name = "Category name is required";
    if (Object.keys(e2).length) { setErr(e2); return; }
    setSaving(true);
    try {
      await onSave({
        ...f,
        branchId: f.branchId ? parseInt(f.branchId) : null,
        parentId: f.parentId ? parseInt(f.parentId) : null,
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
          <label className="form-label">Branch (optional)</label>
          <select className="form-input" value={f.branchId} onChange={e => set("branchId", e.target.value)}>
            <option value="">-- All Branches --</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Parent Category (optional)</label>
          <select className="form-input" value={f.parentId} onChange={e => set("parentId", e.target.value)}>
            <option value="">-- Top Level --</option>
            {parentOptions.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group form-span-2">
          <label className="form-label">Category Name *</label>
          <input className={`form-input${err.name ? " input-error" : ""}`} value={f.name} onChange={e => set("name", e.target.value)} placeholder="e.g. UPVC Profiles" />
          {err.name && <span className="form-error">{err.name}</span>}
        </div>
        <div className="form-group form-span-2">
          <label className="form-label">Icon</label>
          <div className="icon-picker">
            {ICONS.map(ic => (
              <button type="button" key={ic} className={`icon-pick-btn${f.icon === ic ? " icon-pick-active" : ""}`} onClick={() => set("icon", ic)}>{ic}</button>
            ))}
          </div>
        </div>
        <div className="form-group form-span-2">
          <label className="form-label">Description</label>
          <textarea className="form-input form-textarea" rows={2} value={f.description || ""} onChange={e => set("description", e.target.value)} placeholder="Short description..." />
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : initial ? "Save Changes" : "Add Category"}</button>
      </div>
    </form>
  );
}
