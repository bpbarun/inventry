import { useState } from "react";

const empty = { name: "", address: "", phone: "", manager: "", email: "", status: "Active" };

export default function BranchForm({ initial = null, onSave, onCancel }) {
  const [f, setF]     = useState(initial || empty);
  const [err, setErr] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(p => ({ ...p, [k]: "" })); };

  const submit = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (!f.name.trim()) e2.name = "Branch name is required";
    if (Object.keys(e2).length) { setErr(e2); return; }
    setSaving(true);
    try {
      await onSave(f);
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
        <div className="form-group form-span-2">
          <label className="form-label">Branch Name *</label>
          <input className={`form-input${err.name ? " input-error" : ""}`} value={f.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Manchester Branch" />
          {err.name && <span className="form-error">{err.name}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Manager</label>
          <input className="form-input" value={f.manager || ""} onChange={e => set("manager", e.target.value)} placeholder="Full name" />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" value={f.phone || ""} onChange={e => set("phone", e.target.value)} placeholder="01234 567890" />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" className="form-input" value={f.email || ""} onChange={e => set("email", e.target.value)} placeholder="branch@company.co.uk" />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-input" value={f.status || "Active"} onChange={e => set("status", e.target.value)}>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
        <div className="form-group form-span-2">
          <label className="form-label">Address</label>
          <textarea className="form-input form-textarea" rows={2} value={f.address || ""} onChange={e => set("address", e.target.value)} placeholder="Full address" />
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : initial ? "Save Changes" : "Add Branch"}</button>
      </div>
    </form>
  );
}
