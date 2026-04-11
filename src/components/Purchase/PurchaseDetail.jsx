import { useState } from "react";
import { CheckCircle, XCircle, Edit2, Truck, Calendar, Building2, FileText } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import ConfirmDialog from "../common/ConfirmDialog";
import Modal from "../common/Modal";
import PurchaseForm from "./PurchaseForm";

const STATUS_COLOR = {
  Draft:     "neutral",
  Ordered:   "blue",
  Partial:   "warning",
  Received:  "success",
  Cancelled: "danger",
};

export default function PurchaseDetail({ po, onClose }) {
  const { branches, categories, products, receivePurchase, updatePurchase, updatePurchaseStatus } = useApp();
  const toast = useToast();
  const [confirmReceive, setConfirmReceive] = useState(false);
  const [confirmCancel, setConfirmCancel]   = useState(false);
  const [showEdit, setShowEdit]             = useState(false);

  const branch = branches.find(b => b.id === po.branchId);

  const orderTotal = (po.items || []).reduce((s, it) => s + Number(it.orderedQty) * Number(it.unitCost), 0);

  const canReceive = po.status === "Ordered" || po.status === "Partial";
  const canEdit    = po.status === "Draft";
  const canOrder   = po.status === "Draft";
  const canCancel  = po.status === "Draft" || po.status === "Ordered";

  const handleReceive = async () => {
    try {
      await receivePurchase(po.id);
      setConfirmReceive(false);
      onClose();
      toast.success("Stock received and inventory updated.");
    } catch (e) {
      toast.error(e.message || "Failed to receive stock.");
      setConfirmReceive(false);
    }
  };

  const handleCancel = async () => {
    try {
      await updatePurchaseStatus(po.id, "Cancelled");
      setConfirmCancel(false);
      onClose();
      toast.success("Purchase order cancelled.");
    } catch (e) {
      toast.error(e.message || "Failed to cancel order.");
      setConfirmCancel(false);
    }
  };

  return (
    <>
      <div className="po-detail">
        <div className="po-detail-header">
          <div className="po-detail-meta">
            <div className="po-detail-row">
              <Building2 size={14} />
              <span><strong>Branch:</strong> {branch?.name || po.branchName}</span>
            </div>
            <div className="po-detail-row">
              <Truck size={14} />
              <span><strong>Supplier:</strong> {po.supplier}</span>
              {po.supplierContact && <span className="td-meta">({po.supplierContact})</span>}
            </div>
            <div className="po-detail-row">
              <Calendar size={14} />
              <span><strong>Order Date:</strong> {po.orderDate}</span>
              {po.expectedDate  && <span className="td-meta">| Expected: {po.expectedDate}</span>}
              {po.receivedDate  && <span className="td-meta">| Received: {po.receivedDate}</span>}
            </div>
            {po.notes && (
              <div className="po-detail-row">
                <FileText size={14} />
                <span>{po.notes}</span>
              </div>
            )}
          </div>
          <div className="po-detail-status-wrap">
            <span className={`badge badge-${STATUS_COLOR[po.status] || "neutral"} badge-lg`}>{po.status}</span>
          </div>
        </div>

        <div className="table-wrapper" style={{ marginTop: 16 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Ordered</th>
                <th>Received</th>
                <th>Unit Cost</th>
                <th>Line Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(po.items || []).map((item, idx) => {
                const prod = products.find(p => p.id === item.productId);
                const cat  = prod ? categories.find(c => c.id === prod.categoryId) : null;
                const pending = Number(item.orderedQty) - Number(item.receivedQty);
                return (
                  <tr key={idx}>
                    <td>
                      <p className="td-name">{item.productName || prod?.name || "Unknown"}</p>
                      <p className="td-meta">{item.sku || prod?.sku}</p>
                    </td>
                    <td>
                      {(item.categoryName || cat) && (
                        <span className="cat-chip">{cat?.icon || ""} {item.categoryName || cat?.name}</span>
                      )}
                    </td>
                    <td><strong>{item.orderedQty}</strong> {prod?.unit}</td>
                    <td>
                      {Number(item.receivedQty) > 0
                        ? <span className="mv-in">+{item.receivedQty}</span>
                        : <span className="td-meta">—</span>}
                    </td>
                    <td>₹{Number(item.unitCost).toFixed(2)}</td>
                    <td className="td-price">₹{(Number(item.orderedQty) * Number(item.unitCost)).toFixed(2)}</td>
                    <td>
                      {pending <= 0
                        ? <span className="badge badge-success">Received</span>
                        : <span className="badge badge-warning">Pending {pending}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="text-right" style={{ fontWeight: 600, padding: "10px 12px" }}>Order Total</td>
                <td style={{ fontWeight: 700, fontSize: 15, padding: "10px 12px" }}>₹{orderTotal.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="po-detail-actions">
          {canEdit && (
            <button className="btn btn-outline" onClick={() => setShowEdit(true)}><Edit2 size={14} /> Edit</button>
          )}
          {canOrder && (
            <button className="btn btn-primary" onClick={async () => {
              try { await updatePurchaseStatus(po.id, "Ordered"); onClose(); toast.success("Order marked as Ordered."); }
              catch (e) { toast.error(e.message || "Failed to update status."); }
            }}>
              <Truck size={14} /> Mark as Ordered
            </button>
          )}
          {canReceive && (
            <button className="btn btn-success" onClick={() => setConfirmReceive(true)}>
              <CheckCircle size={14} /> Receive Stock
            </button>
          )}
          {canCancel && (
            <button className="btn btn-outline" style={{ color: "var(--danger)", borderColor: "var(--danger)" }} onClick={() => setConfirmCancel(true)}>
              <XCircle size={14} /> Cancel Order
            </button>
          )}
        </div>
      </div>

      {confirmReceive && (
        <ConfirmDialog
          title="Receive Purchase Order"
          message={`Receive all items on ${po.orderNumber}? Stock levels will be updated automatically.`}
          onConfirm={handleReceive}
          onCancel={() => setConfirmReceive(false)}
        />
      )}
      {confirmCancel && (
        <ConfirmDialog
          title="Cancel Purchase Order"
          message={`Cancel ${po.orderNumber}? This cannot be undone.`}
          danger
          onConfirm={handleCancel}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
      {showEdit && (
        <Modal title={`Edit ${po.orderNumber}`} onClose={() => setShowEdit(false)} size="xl">
          <PurchaseForm
            initial={po}
            onSave={async data => {
              try { await updatePurchase(po.id, data); setShowEdit(false); onClose(); toast.success("Purchase order updated."); }
              catch (e) { toast.error(e.message || "Failed to update purchase order."); throw e; }
            }}
            onCancel={() => setShowEdit(false)}
          />
        </Modal>
      )}
    </>
  );
}
