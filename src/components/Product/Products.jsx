import { useState, useMemo, useEffect } from "react";
import { Plus, Edit2, Trash2, Filter, ScanLine, History } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import Modal from "../common/Modal";
import ConfirmDialog from "../common/ConfirmDialog";
import ProductForm from "./ProductForm";
import EmptyState from "../common/EmptyState";
import DataTable from "../common/DataTable";
import BarcodeScanner from "../common/BarcodeScanner";

/* ── Rate History Modal ──────────────────────────────────────────────────── */
function RateHistoryModal({ product, stockIns, onClose }) {
  const lines = stockIns
    .filter(s => s.productId === product.id)
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

  const totalQty   = lines.reduce((s, l) => s + Number(l.qty), 0);
  const totalValue = lines.reduce((s, l) => s + (l.unitCost != null ? Number(l.qty) * Number(l.unitCost) : 0), 0);

  return (
    <Modal title={`Rate History — ${product.name}`} onClose={onClose} size="lg">
      {lines.length === 0 ? (
        <p style={{ padding: "24px", textAlign: "center", color: "var(--text-sub)" }}>No stock-in records found for this product.</p>
      ) : (
        <table className="rcpt-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Bill / Invoice No.</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Rate (₹)</th>
              <th className="text-right">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((s, i) => {
              const rate  = s.unitCost != null ? Number(s.unitCost) : null;
              const total = rate != null ? Number(s.qty) * rate : null;
              return (
                <tr key={i}>
                  <td className="rcpt-date">{s.date}</td>
                  <td><span className="rcpt-bill">{s.billNumber || "—"}</span></td>
                  <td className="text-right rcpt-total">{s.qty}{product.unit ? ` ${product.unit}` : ""}</td>
                  <td className="text-right rcpt-rate">{rate != null ? `₹${rate.toFixed(2)}` : "—"}</td>
                  <td className="text-right rcpt-line-total">{total != null ? `₹${total.toFixed(2)}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="text-right rcpt-foot-label">Total</td>
              <td className="text-right rcpt-foot-total">{totalQty}{product.unit ? ` ${product.unit}` : ""}</td>
              <td className="rcpt-foot-label" />
              <td className="text-right rcpt-foot-total">{totalValue > 0 ? `₹${totalValue.toFixed(2)}` : "—"}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </Modal>
  );
}

export default function Products() {
  const { branches, categories, products, stockIns, addProduct, updateProduct, deleteProduct } = useApp();
  const toast = useToast();

  const [filterB, setFilterB]   = useState("all");
  const [filterC, setFilterC]   = useState("all");
  const [filterSub, setFilterSub] = useState("all");
  const [filterS, setFilterS]   = useState("all");
  const [showAdd, setShowAdd]   = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [delItem, setDelItem]   = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanHighlight, setScanHighlight] = useState(null);
  const [rateHistoryItem, setRateHistoryItem] = useState(null);

  // ── Multi-select ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmBulkDel, setConfirmBulkDel] = useState(false);
  const [bulkDeleting,   setBulkDeleting]   = useState(false);

  // Clear selection when filters change
  useEffect(() => { setSelectedIds(new Set()); }, [filterB, filterC, filterSub, filterS]);

  const doBulkDelete = async () => {
    setBulkDeleting(true);
    let failed = 0;
    for (const id of selectedIds) {
      try { await deleteProduct(id); }
      catch { failed++; }
    }
    setBulkDeleting(false);
    setConfirmBulkDel(false);
    setSelectedIds(new Set());
    if (failed > 0) toast.error(`${failed} product(s) could not be deleted.`);
    else toast.success(`${selectedIds.size} product(s) deleted.`);
  };

  const handleScan = (value) => {
    setScanning(false);
    const match = products.find(p =>
      p.sku?.toLowerCase() === value.toLowerCase() ||
      String(p.id) === value
    );
    if (match) {
      setFilterB("all"); setFilterC("all"); setFilterSub("all"); setFilterS("all");
      setScanHighlight(match.id);
      toast.success(`Found: ${match.name} — SKU ${match.sku}`);
      setTimeout(() => setScanHighlight(null), 3000);
    } else {
      toast.error(`No product matched barcode: ${value}`);
    }
  };

  // Root categories relevant to selected branch
  const rootCats = categories.filter(c =>
    !c.parentId && (filterB === "all" || products.some(p => {
      if (parseInt(p.branchId) !== parseInt(filterB)) return false;
      const cat = categories.find(x => x.id === p.categoryId);
      return p.categoryId === c.id || (cat && cat.parentId === c.id);
    }))
  );

  // Subcategories of selected root
  const subCats = filterC === "all"
    ? []
    : categories.filter(c => c.parentId === parseInt(filterC));

  // Build effective category id set for filtering
  const catFilterIds = filterSub !== "all"
    ? new Set([parseInt(filterSub)])
    : filterC !== "all"
      ? new Set([parseInt(filterC), ...categories.filter(c => c.parentId === parseInt(filterC)).map(c => c.id)])
      : null;

  const filtered = useMemo(() =>
    products.filter(p => {
      const matchB = filterB === "all" || parseInt(p.branchId) === parseInt(filterB);
      const matchC = !catFilterIds || catFilterIds.has(p.categoryId);
      const matchS =
        filterS === "all" ||
        (filterS === "ok"  && Number(p.stock) > Number(p.minStock)) ||
        (filterS === "low" && Number(p.stock) <= Number(p.minStock) && Number(p.stock) > 0) ||
        (filterS === "out" && Number(p.stock) === 0);
      return matchB && matchC && matchS;
    }),
  [products, filterB, filterC, filterSub, filterS]); // eslint-disable-line

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
      stopClick: true,
      render: r => (
        <button className="rate-history-btn" onClick={() => setRateHistoryItem(r)} title="View rate history">
          <span className="td-price">₹{Number(r.costPrice).toFixed(2)}</span>
          <History size={11} className="rate-history-icon" />
        </button>
      ),
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
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setScanning(true)}>
            <ScanLine size={15} /> Scan
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      {scanning && (
        <BarcodeScanner
          title="Scan to Find Product"
          onScan={handleScan}
          onClose={() => setScanning(false)}
        />
      )}

      <div className="card filters-bar">
        <Filter size={14} style={{ color: "var(--text-meta)", flexShrink: 0 }} />
        <select className="form-input select-sm" value={filterB} onChange={e => { setFilterB(e.target.value); setFilterC("all"); setFilterSub("all"); }}>
          <option value="all">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="form-input select-sm" value={filterC} onChange={e => { setFilterC(e.target.value); setFilterSub("all"); }}>
          <option value="all">All Categories</option>
          {rootCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        {subCats.length > 0 && (
          <select className="form-input select-sm" value={filterSub} onChange={e => setFilterSub(e.target.value)}>
            <option value="all">All Subcategories</option>
            {subCats.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
        )}
        <select className="form-input select-sm" value={filterS} onChange={e => setFilterS(e.target.value)}>
          <option value="all">All Stock</option>
          <option value="ok">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
        <span className="filter-count">{filtered.length} results</span>
      </div>

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="bulk-action-bar">
          <span className="bulk-action-count">{selectedIds.size} product{selectedIds.size !== 1 ? "s" : ""} selected</span>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmBulkDel(true)}>
            <Trash2 size={13} /> Delete Selected
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setSelectedIds(new Set())}>
            Clear Selection
          </button>
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState icon="📦" title="No products yet" subtitle="Add your first product to start tracking inventory."
          action={<button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Product</button>} />
      ) : (
        <div className="card">
          <DataTable
            columns={columns}
            data={filtered}
            fileName="products"
            defaultPageSize={10}
            emptyMessage="No products match your filters."
            rowClassName={r => r.id === scanHighlight ? "row-scan-highlight" : ""}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </div>
      )}

      {showAdd && (
        <Modal title="Add Product" onClose={() => setShowAdd(false)} size="lg">
          <ProductForm
            onSave={async d => {
              try { await addProduct(d); setShowAdd(false); toast.success("Product added successfully."); }
              catch (e) { toast.error(e.message || "Failed to add product."); throw e; }
            }}
            onCancel={() => setShowAdd(false)}
          />
        </Modal>
      )}
      {editItem && (
        <Modal title="Edit Product" onClose={() => setEditItem(null)} size="lg">
          <ProductForm
            initial={editItem}
            onSave={async d => {
              try { await updateProduct(editItem.id, d); setEditItem(null); toast.success("Product updated successfully."); }
              catch (e) { toast.error(e.message || "Failed to update product."); throw e; }
            }}
            onCancel={() => setEditItem(null)}
          />
        </Modal>
      )}
      {delItem && (
        <ConfirmDialog title="Delete Product" message={`Delete "${delItem.name}"? This cannot be undone.`} danger
          onConfirm={async () => {
            try { await deleteProduct(delItem.id); setDelItem(null); toast.success("Product deleted."); }
            catch (e) { toast.error(e.message || "Failed to delete product."); setDelItem(null); }
          }}
          onCancel={() => setDelItem(null)} />
      )}
      {confirmBulkDel && (
        <ConfirmDialog
          title="Delete Selected Products"
          message={`Permanently delete ${selectedIds.size} product${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`}
          danger
          onConfirm={doBulkDelete}
          onCancel={() => setConfirmBulkDel(false)}
          confirmLabel={bulkDeleting ? "Deleting…" : `Delete ${selectedIds.size} Product${selectedIds.size !== 1 ? "s" : ""}`}
        />
      )}
      {rateHistoryItem && (
        <RateHistoryModal
          product={rateHistoryItem}
          stockIns={stockIns}
          onClose={() => setRateHistoryItem(null)}
        />
      )}
    </div>
  );
}
