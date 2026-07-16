import { useState } from "react";
import { CheckCircle, XCircle, Edit2, Truck, Calendar, Building2, FileText, Package } from "lucide-react";
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

/* ── Receive Stock Modal ─────────────────────────────────────────────────── */
function ReceiveModal({ po, products, onConfirm, onClose, saving }) {
  const initQtys = () => {
    const m = {};
    (po.items || []).forEach(item => {
      const remaining = Number(item.orderedQty) - Number(item.receivedQty);
      m[item.id] = remaining > 0 ? String(remaining) : "0";
    });
    return m;
  };

  const initRates = () => {
    const m = {};
    (po.items || []).forEach(item => {
      const remaining = Number(item.orderedQty) - Number(item.receivedQty);
      m[item.id] = remaining > 0 ? String(item.unitCost || "") : "";
    });
    return m;
  };

  const [qtys, setQtys] = useState(initQtys);
  const [rates, setRates] = useState(initRates);
  const [billNumber, setBillNumber] = useState("");
  const [errors, setErrors] = useState({});

  const set = (id, val) => {
    setQtys(p => ({ ...p, [id]: val }));
    setErrors(p => ({ ...p, [id]: "" }));
  };

  const setRate = (id, val) => {
    setRates(p => ({ ...p, [id]: val }));
    setErrors(p => ({ ...p, [`rate_${id}`]: "" }));
  };

  const submit = () => {
    const errs = {};
    if (!billNumber.trim()) errs._bill = "Bill number is required.";
    (po.items || []).forEach(item => {
      const remaining = Number(item.orderedQty) - Number(item.receivedQty);
      if (remaining <= 0) return;
      const val  = parseInt(qtys[item.id] ?? 0);
      const rate = parseFloat(rates[item.id] ?? "");
      if (isNaN(val) || val < 0)          errs[item.id]         = "Must be ≥ 0";
      if (val > remaining)                 errs[item.id]         = `Max ${remaining}`;
      if (val > 0 && (isNaN(rate) || rate <= 0)) errs[`rate_${item.id}`] = "Enter a valid rate";
    });
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const receivedItems = (po.items || [])
      .map(item => ({
        item_id:      item.id,
        received_qty: parseInt(qtys[item.id] ?? 0),
        unit_cost:    parseFloat(rates[item.id] ?? 0) || null,
      }))
      .filter(r => r.received_qty > 0);

    if (!receivedItems.length) {
      setErrors({ _global: "Enter at least one received quantity greater than 0." });
      return;
    }
    onConfirm(receivedItems, billNumber.trim());
  };

  const totalNow = (po.items || []).reduce((s, item) => s + (parseInt(qtys[item.id] ?? 0) || 0), 0);

  return (
    <div className="rcv-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rcv-modal">
        <div className="rcv-header">
          <div>
            <h2 className="rcv-title">Receive Stock</h2>
            <p className="rcv-sub">{po.orderNumber} · {po.supplier}</p>
          </div>
          <span className={`badge badge-${STATUS_COLOR[po.status] || "neutral"}`}>{po.status}</span>
        </div>

        <div className="rcv-body">
          {errors._global && <div className="rcv-global-err">{errors._global}</div>}

          <div className="rcv-bill-row">
            <label className="rcv-bill-label" htmlFor="rcv-bill-input">
              Bill / Invoice Number <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              id="rcv-bill-input"
              type="text"
              className={`rcv-bill-input${errors._bill ? " rcv-qty-err" : ""}`}
              placeholder="e.g. INV-2024-001"
              value={billNumber}
              onChange={e => { setBillNumber(e.target.value); setErrors(p => ({ ...p, _bill: "" })); }}
            />
            {errors._bill && <span className="rcv-err-msg">{errors._bill}</span>}
          </div>

          <table className="rcv-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="text-center">Ordered</th>
                <th className="text-center">Already Received</th>
                <th className="text-center">Remaining</th>
                <th className="text-center">Rate (₹) *</th>
                <th className="text-center">Receive Now *</th>
              </tr>
            </thead>
            <tbody>
              {(po.items || []).map(item => {
                const prod      = products.find(p => p.id === item.productId);
                const ordered   = Number(item.orderedQty);
                const already   = Number(item.receivedQty);
                const remaining = ordered - already;
                const fullyRcvd = remaining <= 0;

                return (
                  <tr key={item.id} className={fullyRcvd ? "rcv-row-done" : ""}>
                    <td>
                      <p className="td-name">{item.productName || prod?.name || "—"}</p>
                      <p className="td-meta">{item.sku || prod?.sku}</p>
                    </td>
                    <td className="text-center">{ordered} <span className="td-meta">{prod?.unit}</span></td>
                    <td className="text-center">
                      {already > 0
                        ? <span className="mv-in">+{already}</span>
                        : <span className="td-meta">—</span>}
                    </td>
                    <td className="text-center">
                      {fullyRcvd
                        ? <span className="badge badge-success">Done</span>
                        : <strong>{remaining}</strong>}
                    </td>
                    <td className="text-center">
                      {fullyRcvd ? (
                        <span className="td-meta">—</span>
                      ) : (
                        <div className="rcv-qty-wrap">
                          <input
                            type="number" min="0" step="0.01"
                            className={`rcv-qty-input${errors[`rate_${item.id}`] ? " rcv-qty-err" : ""}`}
                            value={rates[item.id] ?? ""}
                            onChange={e => setRate(item.id, e.target.value)}
                          />
                          {errors[`rate_${item.id}`] && <span className="rcv-err-msg">{errors[`rate_${item.id}`]}</span>}
                        </div>
                      )}
                    </td>
                    <td className="text-center">
                      {fullyRcvd ? (
                        <span className="td-meta">—</span>
                      ) : (
                        <div className="rcv-qty-wrap">
                          <input
                            type="number" min="0" max={remaining}
                            className={`rcv-qty-input${errors[item.id] ? " rcv-qty-err" : ""}`}
                            value={qtys[item.id] ?? ""}
                            onChange={e => set(item.id, e.target.value)}
                          />
                          {errors[item.id] && <span className="rcv-err-msg">{errors[item.id]}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rcv-footer">
          <span className="rcv-total-hint">
            Total receiving now: <strong>{totalNow} units</strong>
          </span>
          <div className="rcv-actions">
            <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn btn-success" onClick={submit} disabled={saving || totalNow === 0}>
              {saving ? "Saving…" : <><CheckCircle size={14} /> Confirm Receipt</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main PurchaseDetail ─────────────────────────────────────────────────── */
export default function PurchaseDetail({ po, onClose }) {
  const { branches, categories, products, stockIns, receivePurchase, updatePurchase, updatePurchaseStatus } = useApp();
  const toast = useToast();
  const [showReceive,   setShowReceive]   = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showEdit,      setShowEdit]      = useState(false);
  const [saving,        setSaving]        = useState(false);

  const branch = branches.find(b => b.id === po.branchId);
  const orderTotal = (po.items || []).reduce((s, it) => s + Number(it.orderedQty) * Number(it.unitCost), 0);

  // Flat list of stock_in lines for this PO, newest first
  const receiptLines = stockIns
    .filter(s => s.purchaseId === po.id)
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
    .map(s => {
      const prod = products.find(p => p.id === s.productId);
      const qty  = Number(s.qty);
      const rate = s.unitCost != null ? Number(s.unitCost) : null;
      return {
        date:       s.date,
        billNumber: s.billNumber || "—",
        product:    s.productName || prod?.name || "—",
        qty,
        rate,
        total:      rate != null ? qty * rate : null,
        unit:       s.unit || prod?.unit || "",
      };
    });

  const canReceive = po.status === "Ordered" || po.status === "Partial";
  const canEdit    = po.status === "Draft";
  const canOrder   = po.status === "Draft";
  const canCancel  = po.status === "Draft" || po.status === "Ordered";

  const handleReceive = async (receivedItems, billNumber) => {
    setSaving(true);
    try {
      const updated = await receivePurchase(po.id, receivedItems, billNumber);
      setShowReceive(false);
      toast.success(updated.status === "Received"
        ? "All items received. Stock updated."
        : "Partial receipt saved. Stock updated.");
      // Update the in-place po reference so the table refreshes
      Object.assign(po, updated);
      if (updated.status === "Received") onClose();
    } catch (e) {
      toast.error(e.message || "Failed to receive stock.");
    } finally {
      setSaving(false);
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
              {po.expectedDate && <span className="td-meta">| Expected: {po.expectedDate}</span>}
              {po.receivedDate && <span className="td-meta">| Received: {po.receivedDate}</span>}
            </div>
            {po.billNumber && (
              <div className="po-detail-row">
                <FileText size={14} />
                <span><strong>Bill No:</strong> {po.billNumber}</span>
              </div>
            )}
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
                <th>Pending</th>
                <th>Unit Cost</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {(po.items || []).map((item, idx) => {
                const prod    = products.find(p => p.id === item.productId);
                const cat     = prod ? categories.find(c => c.id === prod.categoryId) : null;
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
                    <td><strong>{item.orderedQty}</strong> <span className="td-meta">{prod?.unit}</span></td>
                    <td>
                      {Number(item.receivedQty) > 0
                        ? <span className="mv-in">+{item.receivedQty}</span>
                        : <span className="td-meta">—</span>}
                    </td>
                    <td>
                      {pending <= 0
                        ? <span className="badge badge-success">Complete</span>
                        : <span className="badge badge-warning">{pending} pending</span>}
                    </td>
                    <td>₹{Number(item.unitCost).toFixed(2)}</td>
                    <td className="td-price">₹{(Number(item.orderedQty) * Number(item.unitCost)).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} className="text-right" style={{ fontWeight: 600, padding: "10px 12px" }}>Order Total</td>
                <td style={{ fontWeight: 700, fontSize: 15, padding: "10px 12px" }}>₹{orderTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {receiptLines.length > 0 && (
          <div className="rcpt-history">
            <h3 className="rcpt-history-title">Receipt History</h3>
            <table className="rcpt-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Bill / Invoice No.</th>
                  <th>Product</th>
                  <th className="text-right">Rate (₹)</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {receiptLines.map((line, i) => (
                  <tr key={i}>
                    <td className="rcpt-date">{line.date}</td>
                    <td><span className="rcpt-bill">{line.billNumber}</span></td>
                    <td>{line.product}</td>
                    <td className="text-right rcpt-rate">
                      {line.rate != null ? `₹${Number(line.rate).toFixed(2)}` : "—"}
                    </td>
                    <td className="text-right rcpt-total">
                      {line.qty}{line.unit ? ` ${line.unit}` : ""}
                    </td>
                    <td className="text-right rcpt-line-total">
                      {line.total != null ? `₹${line.total.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-right rcpt-foot-label">Total Received</td>
                  <td className="text-right rcpt-foot-total">
                    {receiptLines.reduce((s, l) => s + l.qty, 0)}
                  </td>
                  <td className="text-right rcpt-foot-total">
                    {(() => {
                      const tot = receiptLines.reduce((s, l) => s + (l.total ?? 0), 0);
                      return tot > 0 ? `₹${tot.toFixed(2)}` : "—";
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

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
            <button className="btn btn-success" onClick={() => setShowReceive(true)}>
              <Package size={14} /> Receive Stock
            </button>
          )}
          {canCancel && (
            <button className="btn btn-outline" style={{ color: "var(--danger)", borderColor: "var(--danger)" }} onClick={() => setConfirmCancel(true)}>
              <XCircle size={14} /> Cancel Order
            </button>
          )}
        </div>
      </div>

      {showReceive && (
        <ReceiveModal
          po={po}
          products={products}
          saving={saving}
          onConfirm={handleReceive}
          onClose={() => setShowReceive(false)}
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
