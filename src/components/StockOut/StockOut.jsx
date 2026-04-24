import { useState, useMemo } from "react";
import { Plus, Printer } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import Modal from "../common/Modal";
import StockOutForm from "./StockOutForm";
import StockOutBill from "./StockOutBill";
import DataTable from "../common/DataTable";

const PRINT_ENABLED = import.meta.env.VITE_STOCK_OUT_PRINT_BILL === "true";

export default function StockOut() {
  const { stockOuts, products, branches, categories, addStockOut } = useApp();
  const toast = useToast();
  const [showAdd,   setShowAdd]   = useState(false);
  const [filterB,   setFilterB]   = useState("all");
  const [billRecord, setBillRecord] = useState(null); // record to print

  const filtered = useMemo(() =>
    [...stockOuts]
      .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
      .filter(so => filterB === "all" || so.branchId === parseInt(filterB)),
  [stockOuts, filterB]);

  const totalQty = filtered.reduce((s, so) => s + Number(so.qty), 0);

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
      render: r => <span className="mv-out">-{r.qty}</span>,
      exportValue: r => r.qty,
    },
    {
      key: "reason", label: "Reason", sortable: true,
      render: r => <span className="td-meta td-truncate">{r.reason || "—"}</span>,
      exportValue: r => r.reason || "",
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
    ...(PRINT_ENABLED ? [{
      key: "actions", label: "", exportValue: false, stopClick: true,
      render: r => (
        <button className="icon-btn" title="Print Bill" onClick={() => setBillRecord(r)}>
          <Printer size={14} />
        </button>
      ),
    }] : []),
  ], [products, branches, categories]); // eslint-disable-line

  const billProduct = billRecord ? products.find(p => p.id === billRecord.productId) : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Out</h1>
          <p className="page-subtitle">{stockOuts.length} records &nbsp;|&nbsp; Filtered total: <strong>{totalQty} units</strong></p>
        </div>
        <button className="btn btn-warning" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> New Stock Out
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
        <DataTable columns={columns} data={filtered} fileName="stock-out" defaultPageSize={10} emptyMessage="No stock out records found." />
      </div>

      {showAdd && (
        <Modal title="New Stock Out" onClose={() => setShowAdd(false)} size="md">
          <StockOutForm
            onSave={async (data) => {
              try {
                const created = await addStockOut(data);
                setShowAdd(false);
                toast.success("Stock out recorded successfully.");
                if (PRINT_ENABLED) setBillRecord(created); // auto-open bill after save
              } catch (e) {
                toast.error(e.message || "Failed to record stock out.");
                throw e;
              }
            }}
            onCancel={() => setShowAdd(false)}
          />
        </Modal>
      )}

      {PRINT_ENABLED && billRecord && (
        <StockOutBill
          record={billRecord}
          product={billProduct}
          onClose={() => setBillRecord(null)}
        />
      )}
    </div>
  );
}
