import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, Filter } from "lucide-react";
import { useApp } from "../../context/AppContext";
import Modal from "../common/Modal";
import ConfirmDialog from "../common/ConfirmDialog";
import ProductForm from "./ProductForm";
import EmptyState from "../common/EmptyState";
import DataTable from "../common/DataTable";

export default function Products() {
  const { branches, categories, products, addProduct, updateProduct, deleteProduct } = useApp();

  const [filterB, setFilterB]   = useState("all");
  const [filterC, setFilterC]   = useState("all");
  const [filterS, setFilterS]   = useState("all");
  const [showAdd, setShowAdd]   = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [delItem, setDelItem]   = useState(null);

  const filteredCats = filterB === "all"
    ? categories
    : categories.filter(c => !c.branchId || parseInt(c.branchId) === parseInt(filterB));

  const filtered = useMemo(() =>
    products.filter(p => {
      const matchB = filterB === "all" || parseInt(p.branchId) === parseInt(filterB);
      const matchC = filterC === "all" || parseInt(p.categoryId) === parseInt(filterC);
      const matchS =
        filterS === "all" ||
        (filterS === "ok"  && Number(p.stock) > Number(p.minStock)) ||
        (filterS === "low" && Number(p.stock) <= Number(p.minStock) && Number(p.stock) > 0) ||
        (filterS === "out" && Number(p.stock) === 0);
      return matchB && matchC && matchS;
    }),
  [products, filterB, filterC, filterS]);

  const columns = useMemo(() => [
    {
      key: "name", label: "Product / SKU", sortable: true,
      sortValue: r => r.name,
      render: r => (<><p className="td-name">{r.name}</p><p className="td-meta">{r.sku}</p></>),
      exportValue: r => `${r.name} (${r.sku})`,
    },
    {
      key: "branch", label: "Branch", sortable: true,
      sortValue: r => r.branchName || "",
      render: r => <span className="td-meta">{r.branchName || "—"}</span>,
      exportValue: r => r.branchName || "",
    },
    {
      key: "category", label: "Category", sortable: true,
      sortValue: r => r.categoryName || "",
      render: r => {
        const cat = categories.find(c => c.id === r.categoryId);
        return <span className="cat-chip">{cat?.icon || ""} {r.categoryName || "—"}</span>;
      },
      exportValue: r => r.categoryName || "",
    },
    {
      key: "costPrice", label: "Cost (₹)", sortable: true,
      render: r => <span className="td-price">₹{Number(r.costPrice).toFixed(2)}</span>,
      exportValue: r => Number(r.costPrice).toFixed(2),
    },
    {
      key: "sellingPrice", label: "Sell (₹)", sortable: true,
      render: r => <span className="td-meta">₹{Number(r.sellingPrice).toFixed(2)}</span>,
      exportValue: r => Number(r.sellingPrice).toFixed(2),
    },
    {
      key: "stock", label: "Stock", sortable: true,
      render: r => {
        const s = Number(r.stock) === 0 ? "out" : Number(r.stock) <= Number(r.minStock) ? "low" : "ok";
        return (
          <div>
            <span className={`badge badge-${s === "out" ? "danger" : s === "low" ? "warning" : "success"}`}>
              {r.stock} {r.unit}
            </span>
            {s !== "ok" && <p className="td-meta" style={{ marginTop: 2 }}>Min: {r.minStock}</p>}
          </div>
        );
      },
      exportValue: r => r.stock,
    },
    {
      key: "location", label: "Location", sortable: true,
      render: r => <span className="td-meta">{r.location || "—"}</span>,
      exportValue: r => r.location || "",
    },
    {
      key: "actions", label: "Actions", exportValue: false, stopClick: true,
      render: r => (
        <div className="row-actions">
          <button className="icon-btn icon-btn-green" title="Edit"   onClick={() => setEditItem(r)}><Edit2  size={14} /></button>
          <button className="icon-btn icon-btn-red"   title="Delete" onClick={() => setDelItem(r)}><Trash2 size={14} /></button>
        </div>
      ),
    },
  ], [categories]); // eslint-disable-line

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">{products.length} products across all branches</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Product
        </button>
      </div>

      <div className="card filters-bar">
        <Filter size={14} style={{ color: "var(--text-meta)", flexShrink: 0 }} />
        <select className="form-input select-sm" value={filterB} onChange={e => { setFilterB(e.target.value); setFilterC("all"); }}>
          <option value="all">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="form-input select-sm" value={filterC} onChange={e => setFilterC(e.target.value)}>
          <option value="all">All Categories</option>
          {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <select className="form-input select-sm" value={filterS} onChange={e => setFilterS(e.target.value)}>
          <option value="all">All Stock</option>
          <option value="ok">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
        <span className="filter-count">{filtered.length} results</span>
      </div>

      {products.length === 0 ? (
        <EmptyState icon="📦" title="No products yet" subtitle="Add your first product to start tracking inventory."
          action={<button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Product</button>} />
      ) : (
        <div className="card">
          <DataTable columns={columns} data={filtered} fileName="products" defaultPageSize={10} emptyMessage="No products match your filters." />
        </div>
      )}

      {showAdd && (
        <Modal title="Add Product" onClose={() => setShowAdd(false)} size="lg">
          <ProductForm onSave={async d => { await addProduct(d); setShowAdd(false); }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
      {editItem && (
        <Modal title="Edit Product" onClose={() => setEditItem(null)} size="lg">
          <ProductForm initial={editItem} onSave={async d => { await updateProduct(editItem.id, d); setEditItem(null); }} onCancel={() => setEditItem(null)} />
        </Modal>
      )}
      {delItem && (
        <ConfirmDialog title="Delete Product" message={`Delete "${delItem.name}"? This cannot be undone.`} danger
          onConfirm={async () => { await deleteProduct(delItem.id); setDelItem(null); }} onCancel={() => setDelItem(null)} />
      )}
    </div>
  );
}
