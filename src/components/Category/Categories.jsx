import { useState } from "react";
import { Plus, Edit2, Trash2, Search, ChevronDown, ChevronRight } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import Modal from "../common/Modal";
import ConfirmDialog from "../common/ConfirmDialog";
import CategoryForm from "./CategoryForm";
import EmptyState from "../common/EmptyState";

function CategoryCard({ c, products, branches, onEdit, onDelete, isChild = false }) {
  const prods    = products.filter(p => p.categoryId === c.id);
  const lowStock = prods.filter(p => Number(p.stock) <= Number(p.minStock)).length;
  const branch   = branches.find(b => b.id === c.branchId);

  return (
    <div className={`cat-card card${isChild ? " cat-card-child" : ""}`}>
      <div className="cat-card-top">
        <span className="cat-big-icon">{c.icon}</span>
        <div className="cat-actions">
          <button className="icon-btn icon-btn-green" onClick={() => onEdit(c)} title="Edit"><Edit2 size={13} /></button>
          <button className="icon-btn icon-btn-red"   onClick={() => onDelete(c)} title="Delete"><Trash2 size={13} /></button>
        </div>
      </div>
      <h3 className="cat-name">{c.name}</h3>
      {isChild && <p className="cat-parent-badge">↳ subcategory</p>}
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
}

function CategoryGroup({ parent, children, products, branches, onEdit, onDelete }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="cat-group">
      <div className="cat-group-header" onClick={() => setOpen(o => !o)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="cat-group-icon">{parent.icon}</span>
        <span className="cat-group-name">{parent.name}</span>
        <span className="cat-group-count">{children.length} sub</span>
      </div>
      <div className="cat-group-parent">
        <CategoryCard c={parent} products={products} branches={branches} onEdit={onEdit} onDelete={onDelete} />
      </div>
      {open && children.length > 0 && (
        <div className="cat-group-children">
          {children.map(child => (
            <CategoryCard key={child.id} c={child} products={products} branches={branches} onEdit={onEdit} onDelete={onDelete} isChild />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Categories() {
  const { branches, categories, products, addCategory, updateCategory, deleteCategory } = useApp();
  const toast = useToast();
  const [search, setSearch]   = useState("");
  const [filterB, setFilterB] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [delItem, setDelItem]   = useState(null);

  const matchesFilter = (c) => {
    const matchB = filterB === "all" || String(c.branchId) === filterB;
    const matchS = !search || c.name.toLowerCase().includes(search.toLowerCase());
    return matchB && matchS;
  };

  const roots    = categories.filter(c => !c.parentId);
  const subs     = categories.filter(c => !!c.parentId);

  // For display: roots that match OR have matching children
  const visibleRoots = roots.filter(r =>
    matchesFilter(r) || subs.some(s => s.parentId === r.id && matchesFilter(s))
  );

  // Standalone subcategories whose parent is filtered out
  const orphanSubs = subs.filter(s =>
    matchesFilter(s) && !visibleRoots.find(r => r.id === s.parentId)
  );

  const totalVisible = visibleRoots.length + orphanSubs.length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">{categories.length} categories · {subs.length} subcategories</p>
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
        <span className="filter-count">{totalVisible} shown</span>
      </div>

      {totalVisible === 0 ? (
        <EmptyState icon="🏷️" title="No categories found" subtitle="Add a category to organise your products."
          action={<button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Category</button>} />
      ) : (
        <div className="cat-tree">
          {visibleRoots.map(r => {
            const children = subs.filter(s => s.parentId === r.id && matchesFilter(s));
            const rootMatches = matchesFilter(r);
            if (children.length > 0) {
              return (
                <CategoryGroup
                  key={r.id}
                  parent={r}
                  children={children}
                  products={products}
                  branches={branches}
                  onEdit={setEditItem}
                  onDelete={setDelItem}
                />
              );
            }
            if (rootMatches) {
              return (
                <CategoryCard key={r.id} c={r} products={products} branches={branches} onEdit={setEditItem} onDelete={setDelItem} />
              );
            }
            return null;
          })}
          {orphanSubs.map(s => (
            <CategoryCard key={s.id} c={s} products={products} branches={branches} onEdit={setEditItem} onDelete={setDelItem} isChild />
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Category" onClose={() => setShowAdd(false)} size="md">
          <CategoryForm
            onSave={async d => {
              try { await addCategory(d); setShowAdd(false); toast.success("Category added successfully."); }
              catch (e) { toast.error(e.message || "Failed to add category."); throw e; }
            }}
            onCancel={() => setShowAdd(false)}
          />
        </Modal>
      )}
      {editItem && (
        <Modal title="Edit Category" onClose={() => setEditItem(null)} size="md">
          <CategoryForm
            initial={editItem}
            onSave={async d => {
              try { await updateCategory(editItem.id, d); setEditItem(null); toast.success("Category updated successfully."); }
              catch (e) { toast.error(e.message || "Failed to update category."); throw e; }
            }}
            onCancel={() => setEditItem(null)}
          />
        </Modal>
      )}
      {delItem && (
        <ConfirmDialog
          title="Delete Category"
          message={`Delete "${delItem.name}"? ${delItem.parentId ? "Products in this subcategory will also be removed." : "All subcategories and products will also be removed."}`}
          danger
          onConfirm={async () => {
            try { await deleteCategory(delItem.id); setDelItem(null); toast.success("Category deleted."); }
            catch (e) { toast.error(e.message || "Failed to delete category."); setDelItem(null); }
          }}
          onCancel={() => setDelItem(null)}
        />
      )}
    </div>
  );
}
