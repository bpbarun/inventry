import { useState } from "react";
import { Plus, Edit2, Trash2, MapPin, Phone, Mail, User } from "lucide-react";
import { useApp } from "../../context/AppContext";
import Modal from "../common/Modal";
import ConfirmDialog from "../common/ConfirmDialog";
import BranchForm from "./BranchForm";
import EmptyState from "../common/EmptyState";

export default function Branches() {
  const { branches, products, addBranch, updateBranch, deleteBranch } = useApp();
  const [showAdd, setShowAdd]   = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [delItem, setDelItem]   = useState(null);

  const branchStats = (b) => {
    const prods = products.filter(p => p.branchId === b.id);
    const value = prods.reduce((s, p) => s + Number(p.stock) * Number(p.costPrice), 0);
    return { prods: prods.length, value };
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Branches</h1>
          <p className="page-subtitle">{branches.length} branch{branches.length !== 1 ? "es" : ""} registered</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Branch
        </button>
      </div>

      {branches.length === 0 ? (
        <EmptyState icon="🏢" title="No branches yet" subtitle="Add your first branch to get started."
          action={<button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Branch</button>} />
      ) : (
        <div className="branches-grid">
          {branches.map(b => {
            const { prods, value } = branchStats(b);
            return (
              <div key={b.id} className="branch-card card">
                <div className="branch-card-top">
                  <div className="branch-avatar">{b.name[0]}</div>
                  <div className="branch-info">
                    <h3 className="branch-name">{b.name}</h3>
                    <span className={`badge ${(b.status || "Active") === "Active" ? "badge-success" : "badge-neutral"}`}>{b.status || "Active"}</span>
                  </div>
                  <div className="branch-actions">
                    <button className="icon-btn icon-btn-green" onClick={() => setEditItem(b)} title="Edit"><Edit2 size={14} /></button>
                    <button className="icon-btn icon-btn-red"   onClick={() => setDelItem(b)}  title="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="branch-contact">
                  {b.manager && <span><User size={12} /> {b.manager}</span>}
                  {b.phone   && <span><Phone size={12} /> {b.phone}</span>}
                  {b.email   && <span><Mail size={12} /> {b.email}</span>}
                  {b.address && <span><MapPin size={12} /> {b.address}</span>}
                </div>

                <div className="branch-stats">
                  <div className="bs-item"><span className="bs-val">{prods}</span><span className="bs-lbl">Products</span></div>
                  <div className="bs-item"><span className="bs-val">₹{value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span><span className="bs-lbl">Stock Value</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Branch" onClose={() => setShowAdd(false)} size="md">
          <BranchForm onSave={async d => { await addBranch(d); setShowAdd(false); }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
      {editItem && (
        <Modal title="Edit Branch" onClose={() => setEditItem(null)} size="md">
          <BranchForm initial={editItem} onSave={async d => { await updateBranch(editItem.id, d); setEditItem(null); }} onCancel={() => setEditItem(null)} />
        </Modal>
      )}
      {delItem && (
        <ConfirmDialog
          title="Delete Branch"
          message={`Delete "${delItem.name}"? This will also delete all its products. This cannot be undone.`}
          danger
          onConfirm={async () => { await deleteBranch(delItem.id); setDelItem(null); }}
          onCancel={() => setDelItem(null)}
        />
      )}
    </div>
  );
}
