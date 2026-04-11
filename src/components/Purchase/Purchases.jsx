import { useState, useMemo } from "react";
import { Plus, Eye, Edit2, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import Modal from "../common/Modal";
import ConfirmDialog from "../common/ConfirmDialog";
import PurchaseForm from "./PurchaseForm";
import PurchaseDetail from "./PurchaseDetail";
import LowStockSection from "./LowStockSection";
import EmptyState from "../common/EmptyState";
import DataTable from "../common/DataTable";

const STATUS_COLOR = {
  Draft:     "neutral",
  Ordered:   "blue",
  Partial:   "warning",
  Received:  "success",
  Cancelled: "danger",
};

const ALL_STATUSES = ["Draft", "Ordered", "Partial", "Received", "Cancelled"];

export default function Purchases() {
  const { purchases, branches, addPurchase, updatePurchase, deletePurchase } = useApp();

  const [filterB, setFilterB] = useState("all");
  const [filterS, setFilterS] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const [viewPO, setViewPO]   = useState(null);
  const [editPO, setEditPO]   = useState(null);
  const [delPO, setDelPO]     = useState(null);

  const filtered = useMemo(() =>
    [...purchases]
      .sort((a, b) => new Date(b.orderDate || b.createdAt) - new Date(a.orderDate || a.createdAt))
      .filter(po => {
        const matchB = filterB === "all" || po.branchId === parseInt(filterB);
        const matchS = filterS === "all" || po.status === filterS;
        return matchB && matchS;
      }),
  [purchases, filterB, filterS]);

  const poTotal     = po => (po.items || []).reduce((s, it) => s + Number(it.orderedQty) * Number(it.unitCost), 0);
  const statusCount = s => purchases.filter(p => p.status === s).length;

  const handleCreatePO = (prefillData = null) => { setPrefill(prefillData); setShowAdd(true); };
  const handleSaveNew  = async (data) => { await addPurchase(data); setShowAdd(false); setPrefill(null); };
  const handleCancelNew = () => { setShowAdd(false); setPrefill(null); };

  const columns = useMemo(() => [
    {
      key: "orderNumber", label: "PO Number", sortable: true,
      render: r => (
        <div>
          <p className="td-name po-number">{r.orderNumber}</p>
          {r.notes && <p className="td-meta td-truncate" style={{ maxWidth: 160 }}>{r.notes}</p>}
        </div>
      ),
      exportValue: r => r.orderNumber,
    },
    {
      key: "branch", label: "Branch", sortable: true,
      sortValue: r => r.branchName || branches.find(b => b.id === r.branchId)?.name || "",
      render: r => <span className="td-meta">{r.branchName || branches.find(b => b.id === r.branchId)?.name || "—"}</span>,
      exportValue: r => r.branchName || "",
    },
    {
      key: "supplier", label: "Supplier", sortable: true,
      render: r => (
        <div>
          <p className="td-name">{r.supplier}</p>
          {r.supplierContact && <p className="td-meta">{r.supplierContact}</p>}
        </div>
      ),
      exportValue: r => r.supplier,
    },
    {
      key: "status", label: "Status", sortable: true,
      render: r => <span className={`badge badge-${STATUS_COLOR[r.status] || "neutral"}`}>{r.status}</span>,
      exportValue: r => r.status,
    },
    {
      key: "orderDate", label: "Order Date", sortable: true,
      render: r => <span className="td-meta">{r.orderDate}</span>,
      exportValue: r => r.orderDate,
    },
    {
      key: "items", label: "Items", sortable: false,
      render: r => <span className="td-meta">{(r.items || []).length} lines</span>,
      exportValue: r => (r.items || []).length,
    },
    {
      key: "total", label: "Total (₹)", sortable: true,
      sortValue: r => poTotal(r),
      render: r => <span className="td-price">₹{poTotal(r).toFixed(2)}</span>,
      exportValue: r => poTotal(r).toFixed(2),
    },
    {
      key: "actions", label: "Actions", exportValue: false, stopClick: true,
      render: r => (
        <div className="row-actions">
          <button className="icon-btn" title="View"   onClick={() => setViewPO(r)}><Eye   size={14} /></button>
          {r.status === "Draft" && (
            <button className="icon-btn icon-btn-green" title="Edit"   onClick={() => setEditPO(r)}><Edit2 size={14} /></button>
          )}
          <button className="icon-btn icon-btn-red" title="Delete" onClick={() => setDelPO(r)}><Trash2 size={14} /></button>
        </div>
      ),
    },
  ], [branches]); // eslint-disable-line

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">{purchases.length} purchase orders total</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleCreatePO()}>
          <Plus size={15} /> New Purchase Order
        </button>
      </div>

      {/* Low Stock Section */}
      <LowStockSection onCreatePO={handleCreatePO} />

      {/* Status summary pills */}
      <div className="po-status-row">
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            className={`po-status-pill ${filterS === s ? "po-status-pill-active" : ""} po-status-pill-${STATUS_COLOR[s]}`}
            onClick={() => setFilterS(filterS === s ? "all" : s)}
          >
            {s}<span className="po-status-count">{statusCount(s)}</span>
          </button>
        ))}
        {filterS !== "all" && <button className="btn btn-outline btn-sm" onClick={() => setFilterS("all")}>Clear</button>}
      </div>

      {/* Branch filter */}
      <div className="card filters-bar">
        <label className="form-label" style={{ marginBottom: 0 }}>Branch:</label>
        <select className="form-input select-sm" value={filterB} onChange={e => setFilterB(e.target.value)}>
          <option value="all">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <span className="filter-count">{filtered.length} orders</span>
      </div>

      {purchases.length === 0 ? (
        <EmptyState icon="🛒" title="No purchase orders yet"
          subtitle="Create your first purchase order to start tracking stock deliveries."
          action={<button className="btn btn-primary" onClick={() => handleCreatePO()}><Plus size={14} /> New Purchase Order</button>} />
      ) : (
        <div className="card">
          <DataTable
            columns={columns}
            data={filtered}
            fileName="purchase-orders"
            defaultPageSize={10}
            emptyMessage="No purchase orders match your filters."
            onRowClick={row => setViewPO(row)}
          />
        </div>
      )}

      {showAdd && (
        <Modal title="New Purchase Order" onClose={handleCancelNew} size="xl">
          <PurchaseForm initial={prefill} onSave={handleSaveNew} onCancel={handleCancelNew} />
        </Modal>
      )}
      {editPO && (
        <Modal title={`Edit ${editPO.orderNumber}`} onClose={() => setEditPO(null)} size="xl">
          <PurchaseForm
            initial={editPO}
            onSave={async d => { await updatePurchase(editPO.id, d); setEditPO(null); }}
            onCancel={() => setEditPO(null)}
          />
        </Modal>
      )}
      {viewPO && (
        <Modal title={viewPO.orderNumber} onClose={() => setViewPO(null)} size="xl">
          <PurchaseDetail po={viewPO} onClose={() => setViewPO(null)} />
        </Modal>
      )}
      {delPO && (
        <ConfirmDialog
          title="Delete Purchase Order"
          message={`Delete "${delPO.orderNumber}"? This cannot be undone.`}
          danger
          onConfirm={async () => { await deletePurchase(delPO.id); setDelPO(null); }}
          onCancel={() => setDelPO(null)}
        />
      )}
    </div>
  );
}
