import { useRef } from "react";
import { Printer, X } from "lucide-react";
import "./StockOutBill.css";

/**
 * Props:
 *   record  — stock-out row (with productName, sku, unit, qty, branchName, reason, reference, date, notes)
 *   product — full product row (for sellingPrice, costPrice)
 *   onClose — close handler
 */
export default function StockOutBill({ record, product, onClose }) {
  const billRef = useRef();

  const billNo      = `SO-${String(record.id).padStart(5, "0")}`;
  const sellingPrice = Number(product?.sellingPrice ?? 0);
  const total        = sellingPrice * Number(record.qty);
  const printDate    = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  const handlePrint = () => {
    const content = billRef.current.innerHTML;
    const win = window.open("", "_blank", "width=800,height=600");
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${billNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; }
    .bill-wrap { max-width: 680px; margin: 0 auto; padding: 32px 40px; }
    .bill-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #6366f1; padding-bottom: 18px; }
    .bill-brand { font-size: 26px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px; }
    .bill-brand-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
    .bill-no-block { text-align: right; }
    .bill-no { font-size: 18px; font-weight: 700; color: #1e293b; }
    .bill-no-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .5px; }
    .bill-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 24px; }
    .bill-meta-row { display: flex; gap: 6px; font-size: 13px; }
    .bill-meta-lbl { color: #64748b; min-width: 80px; }
    .bill-meta-val { color: #1e293b; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    thead tr { background: #6366f1; color: #fff; }
    thead th { padding: 10px 12px; text-align: left; font-weight: 600; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .total-row { background: #eef2ff !important; font-weight: 700; }
    .total-row td { border-top: 2px solid #6366f1; font-size: 14px; }
    .bill-footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 14px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
    .sig-line { margin-top: 48px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 12px; color: #64748b; text-align: right; }
  </style>
</head>
<body>
  <div class="bill-wrap">${content}</div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div className="bill-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bill-modal">
        {/* Toolbar */}
        <div className="bill-toolbar">
          <span className="bill-toolbar-title">Issue Slip — {billNo}</span>
          <div className="bill-toolbar-actions">
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={15} /> Print
            </button>
            <button className="btn btn-outline" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        {/* Printable content */}
        <div className="bill-preview">
          <div ref={billRef}>
            {/* Header */}
            <div className="bill-head">
              <div>
                <div className="bill-brand">Inventry</div>
                <div className="bill-brand-sub">Inventory Management System</div>
              </div>
              <div className="bill-no-block">
                <div className="bill-no-label">Issue Slip</div>
                <div className="bill-no">{billNo}</div>
              </div>
            </div>

            {/* Meta grid */}
            <div className="bill-meta">
              <div className="bill-meta-row">
                <span className="bill-meta-lbl">Date:</span>
                <span className="bill-meta-val">{record.date}</span>
              </div>
              <div className="bill-meta-row">
                <span className="bill-meta-lbl">Printed:</span>
                <span className="bill-meta-val">{printDate}</span>
              </div>
              <div className="bill-meta-row">
                <span className="bill-meta-lbl">Branch:</span>
                <span className="bill-meta-val">{record.branchName || "—"}</span>
              </div>
              <div className="bill-meta-row">
                <span className="bill-meta-lbl">Reference:</span>
                <span className="bill-meta-val">{record.reference || "—"}</span>
              </div>
              <div className="bill-meta-row" style={{ gridColumn: "1 / -1" }}>
                <span className="bill-meta-lbl">Reason:</span>
                <span className="bill-meta-val">{record.reason || "—"}</span>
              </div>
              {record.notes && (
                <div className="bill-meta-row" style={{ gridColumn: "1 / -1" }}>
                  <span className="bill-meta-lbl">Notes:</span>
                  <span className="bill-meta-val">{record.notes}</span>
                </div>
              )}
            </div>

            {/* Items table */}
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Unit</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Unit Price (₹)</th>
                  <th className="text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>{record.productName || "—"}</td>
                  <td>{record.sku || "—"}</td>
                  <td>{record.unit || "pcs"}</td>
                  <td className="text-right">{record.qty}</td>
                  <td className="text-right">{sellingPrice > 0 ? `₹${sellingPrice.toFixed(2)}` : "—"}</td>
                  <td className="text-right">{sellingPrice > 0 ? `₹${total.toFixed(2)}` : "—"}</td>
                </tr>
                {sellingPrice > 0 && (
                  <tr className="total-row">
                    <td colSpan={6} className="text-right">Total</td>
                    <td className="text-right">₹{total.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Signature line */}
            <div className="sig-line">Authorised Signature</div>

            {/* Footer */}
            <div className="bill-footer">
              <span>Generated by Inventry</span>
              <span>{billNo} · {record.date}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
