import { useState, useMemo } from "react";
import { Plus, Pencil } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import Modal from "../common/Modal";
import StockInForm from "./StockInForm";
import DataTable from "../common/DataTable";

const today = () => new Date().toISOString().split("T")[0];

export default function StockIn() {
  const { stockIns, products, branches, categories, updateStockIn } = useApp();
  const toast = useToast();
  const [showAdd,  setShowAdd]  = useState(false);
  const [filterB,  setFilterB]  = useState("all");

  // ── Edit state ────────────────────────────────────────────────
  const [editRecord, setEditRecord] = useState(null);
  const [editF,      setEditF]      = useState({});
  const [editErr,    setEditErr]    = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const openEdit = (r) => {
    setEditRecord(r);
    setEditF({
      qty:       r.qty       ?? "",
      unitCost:  r.unitCost  ?? "",
      supplier:  r.supplier  ?? "",
      reference: r.reference ?? "",
      notes:     r.notes     ?? "",
      date:      r.date      || today(),
    });
    setEditErr({});
  };

  const setEF = (k, v) => { setEditF(p => ({ ...p, [k]: v })); setEditErr(p => ({ ...p, [k]: "" })); };

  const submitEdit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!editF.qty || isNaN(editF.qty) || parseInt(editF.qty) <= 0) errs.qty = "Enter a valid quantity";
    if (Object.keys(errs).length) { setEditErr(errs); return; }
    setEditSaving(true);
    try {
      await updateStockIn(editRecord.id, {
        qty:       parseInt(editF.qty),
        unitCost:  editF.unitCost !== "" ? parseFloat(editF.unitCost) : null,
        supplier:  editF.supplier,
        reference: editF.reference,
        notes:     editF.notes,
        date:      editF.date || today(),
      });
      toast.success("Stock in record updated.");
      setEditRecord(null);
    } catch (err) {
      setEditErr({ api: err.message });
    } finally {
      setEditSaving(false);
    }
  };

  const filtered = useMemo(() =>
    [...stockIns]
      .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
      .filter(si => filterB === "all" || si.branchId === parseInt(filterB)),
  [stockIns, filterB]);

  const totalQty = filtered.reduce((s, si) => s + Number(si.qty), 0);

  const columns = useMemo(() => [
    {
      key: "no", label: "#", width: "48px",
      render: (_, i) => <span className="td-meta">{i}</span>,
      exportValue: (_, i) => i,
    },
    {
      key: "product", label: "Product / SKU", sortable: true,
      sortValue: r => r.productName || products.find(p => p.id === r.productId)?.name || "",
      render: r => {
        const pr = products.find(p => p.id === r.productId);
        return <><p className="td-name">{r.productName || pr?.name || "—"}</p><p className="td-meta">{r.sku || pr?.sku}</p></>;
      },
      exportValue: r => `${r.productName || ""} (${r.sku || ""})`,
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
        const name = r.categoryName || cat?.name;
        return name ? <span className="cat-chip">{cat?.icon || ""} {name}</span> : <span className="td-meta">—</span>;
      },
      exportValue: r => r.categoryName || "",
    },
    {
      key: "qty", label: "Qty", sortable: true,
      render: r => <span className="mv-in">+{r.qty}</span>,
      exportValue: r => r.qty,
    },
    {
      key: "unitCost", label: "Unit Cost", sortable: true,
      render: r => <span className="td-meta">{r.unitCost != null ? "₹" + Number(r.unitCost).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}</span>,
      exportValue: r => r.unitCost ?? "",
    },
    {
      key: "supplier", label: "Supplier", sortable: true,
      render: r => <span className="td-meta">{r.supplier || "—"}</span>,
      exportValue: r => r.supplier || "",
    },
    {
      key: "reference", label: "Reference", sortable: true,
      render: r => <span className="td-meta">{r.reference || "—"}</span>,
      exportValue: r => r.reference || "",
    },
    {
      key: "date", label: "Date", sortable: true,
      render: r => <span className="td-meta">{r.date}</span>,
      exportValue: r => r.date,
    },
    {
      key: "notes", label: "Notes",
      render: r => <span className="td-meta td-truncate">{r.notes || "—"}</span>,
      exportValue: r => r.notes || "",
    },
    {
      key: "_actions", label: "", width: "48px", exportValue: false,
      render: r => (
        <button className="icon-btn" title="Edit" onClick={e => { e.stopPropagation(); openEdit(r); }}>
          <Pencil size={14} />
        </button>
      ),
    },
  ], [products, branches, categories]); // eslint-disable-line

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock In</h1>
          <p className="page-subtitle">{stockIns.length} records &nbsp;|&nbsp; Filtered total: <strong>{totalQty} units</strong></p>
        </div>
        <button className="btn btn-success" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> New Stock In
        </button>
      </div>

      <div className="card filters-bar">
        <label className="form-label" style={{ marginBottom: 0 }}>Branch:</label>
        <select className="form-input select-sm" value={filterB} onChange={e => setFilterB(e.target.value)}>
          <option value="all">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <span className="filter-count">{filtered.length} records</span>
      </div>

      <div className="card">
        <DataTable columns={columns} data={filtered} fileName="stock-in" defaultPageSize={10} emptyMessage="No stock in records found." />
      </div>

      {/* ── Add modal ── */}
      {showAdd && (
        <Modal title="New Stock In" onClose={() => setShowAdd(false)} size="md">
          <StockInForm
            onSave={() => { setShowAdd(false); toast.success("Stock in recorded successfully."); }}
            onCancel={() => setShowAdd(false)}
          />
        </Modal>
      )}

      {/* ── Edit modal ── */}
      {editRecord && (
        <Modal title="Edit Stock In" onClose={() => setEditRecord(null)} size="md">
          <form onSubmit={submitEdit}>
            {editErr.api && <div className="form-api-error">{editErr.api}</div>}

            {/* Product display (read-only) */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Product</label>
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                {editRecord.productName || "—"}
                <span className="td-meta" style={{ marginLeft: 8 }}>{editRecord.sku}</span>
              </p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input
                  type="number" min="1"
                  className={`form-input${editErr.qty ? " input-error" : ""}`}
                  value={editF.qty}
                  onChange={e => setEF("qty", e.target.value)}
                />
                {editErr.qty && <span className="form-error">{editErr.qty}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Unit Cost ₹</label>
                <input
                  type="number" min="0" step="0.01"
                  className="form-input"
                  value={editF.unitCost}
                  onChange={e => setEF("unitCost", e.target.value)}
                  placeholder="e.g. 250.00"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={editF.date}
                  onChange={e => setEF("date", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <input
                  className="form-input"
                  value={editF.supplier}
                  onChange={e => setEF("supplier", e.target.value)}
                  placeholder="Supplier name"
                />
              </div>
              <div className="form-group form-span-2">
                <label className="form-label">Reference / PO No.</label>
                <input
                  className="form-input"
                  value={editF.reference}
                  onChange={e => setEF("reference", e.target.value)}
                  placeholder="e.g. PO-2024-001"
                />
              </div>
              <div className="form-group form-span-2">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input form-textarea"
                  rows={2}
                  value={editF.notes}
                  onChange={e => setEF("notes", e.target.value)}
                  placeholder="Optional notes…"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setEditRecord(null)} disabled={editSaving}>Cancel</button>
              <button type="submit" className="btn btn-success" disabled={editSaving}>{editSaving ? "Saving…" : "Save Changes"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
