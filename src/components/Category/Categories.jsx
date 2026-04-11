import { useState } from "react";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
import { useApp } from "../../context/AppContext";
import Modal from "../common/Modal";
import ConfirmDialog from "../common/ConfirmDialog";
import CategoryForm from "./CategoryForm";
import EmptyState from "../common/EmptyState";

export default function Categories() {
  const { branches, categories, products, addCategory, updateCategory, deleteCategory } = useApp();
  const [search, setSearch]   = useState("");
  const [filterB, setFilterB] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [delItem, setDelItem]   = useState(null);

  const filtered = categories.filter(c => {
    const matchB = filterB === "all" || String(c.branchId) === filterB;
    const matchS = !search || c.name.toLowerCase().includes(search.toLowerCase());
    return matchB && matchS;
  });

  const catProducts = (id) => products.filter(p => p.categoryId === id);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">{categories.length} categories</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Category
        </button>
      </div>

      <div className="card filters-bar">
        <div className="filter-search">
          <Search size={15} className="search-icon" />
          <input className="search-input" placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input select-sm" value={filterB} onChange={e => setFilterB(e.target.value)}>
          <option value="all">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <span className="filter-count">{filtered.length} categories</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🏷️" title="No categories found" subtitle="Add a category to organise your products."
          action={<button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Category</button>} />
      ) : (
        <div className="cat-grid">
          {filtered.map(c => {
            const prods    = catProducts(c.id);
            const lowStock = prods.filter(p => Number(p.stock) <= Number(p.minStock)).length;
            const branch   = branches.find(b => b.id === c.branchId);
            return (
              <div key={c.id} className="cat-card card">
                <div className="cat-card-top">
                  <span className="cat-big-icon">{c.icon}</span>
                  <div className="cat-actions">
                    <button className="icon-btn icon-btn-green" onClick={() => setEditItem(c)} title="Edit"><Edit2 size={13} /></button>
                    <button className="icon-btn icon-btn-red"   onClick={() => setDelItem(c)}  title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
                <h3 className="cat-name">{c.name}</h3>
                {branch && <p className="td-meta" style={{ marginBottom: 4 }}>📍 {branch.name}</p>}
                {c.description && <p className="cat-desc">{c.description}</p>}
                <div className="cat-stats">
                  <div><span className="cs-val">{prods.length}</span><span className="cs-lbl">Products</span></div>
                  <div><span className="cs-val">{prods.reduce((s, p) => s + Number(p.stock), 0)}</span><span className="cs-lbl">Units</span></div>
                  <div><span className="cs-val">₹{prods.reduce((s, p) => s + Number(p.stock) * Number(p.costPrice), 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span><span className="cs-lbl">Value</span></div>
                </div>
                {lowStock > 0 && <div className="cat-low-badge">⚠️ {lowStock} item{lowStock > 1 ? "s" : ""} low</div>}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Category" onClose={() => setShowAdd(false)} size="md">
          <CategoryForm onSave={async d => { await addCategory(d); setShowAdd(false); }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
      {editItem && (
        <Modal title="Edit Category" onClose={() => setEditItem(null)} size="md">
          <CategoryForm initial={editItem} onSave={async d => { await updateCategory(editItem.id, d); setEditItem(null); }} onCancel={() => setEditItem(null)} />
        </Modal>
      )}
      {delItem && (
        <ConfirmDialog
          title="Delete Category"
          message={`Delete "${delItem.name}"? All products in this category will also be removed.`}
          danger
          onConfirm={async () => { await deleteCategory(delItem.id); setDelItem(null); }}
          onCancel={() => setDelItem(null)}
        />
      )}
    </div>
  );
}
