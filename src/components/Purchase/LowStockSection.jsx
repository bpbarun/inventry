import { useState, useMemo } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ShoppingCart, CheckSquare, Square } from "lucide-react";
import { useApp } from "../../context/AppContext";

export default function LowStockSection({ onCreatePO }) {
  const { branches, categories, products, lowStockProducts } = useApp();

  const lowItems = lowStockProducts();
  const [open, setOpen]         = useState(true);
  const [filterB, setFilterB]   = useState("all");
  const [selected, setSelected] = useState(new Set());

  // Low items are products with branchId directly
  const visible = useMemo(() => {
    if (filterB === "all") return lowItems;
    return lowItems.filter(p => p.branchId === parseInt(filterB));
  }, [lowItems, filterB]);

  // Branches that have at least one low-stock product
  const affectedBranches = useMemo(() => {
    const ids = new Set(lowItems.map(p => p.branchId).filter(Boolean));
    return branches.filter(b => ids.has(b.id));
  }, [lowItems, branches]);

  if (lowItems.length === 0) return null;

  const toggleItem = (id) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () => {
    const allIds = visible.map(p => p.id);
    const allSelected = allIds.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      allIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const selectedInView  = visible.filter(p => selected.has(p.id));
  const allViewSelected = visible.length > 0 && visible.every(p => selected.has(p.id));

  const handleCreatePO = () => {
    if (selectedInView.length === 0) return;

    const branchIds = new Set(selectedInView.map(p => p.branchId));
    if (branchIds.size > 1) {
      alert("Selected products belong to different branches. Please filter by a single branch before creating a PO.");
      return;
    }

    const branchId = [...branchIds][0];
    const items = selectedInView.map(p => {
      const cat = categories.find(c => c.id === p.categoryId);
      return {
        categoryId:  cat?.id || "",
        productId:   p.id,
        orderedQty:  Math.max(1, Number(p.minStock) - Number(p.stock)),
        unitCost:    p.costPrice,
        receivedQty: 0,
      };
    });

    onCreatePO({ branchId, items, status: "Draft" });
    setSelected(new Set());
  };

  return (
    <div className="ls-card card">
      <div className="ls-header" onClick={() => setOpen(o => !o)}>
        <div className="ls-header-left">
          <AlertTriangle size={17} className="ls-icon" />
          <div>
            <span className="ls-title">Low Stock Alert</span>
            <span className="ls-subtitle">
              {lowItems.length} product{lowItems.length !== 1 ? "s" : ""} need restocking across{" "}
              {affectedBranches.length} branch{affectedBranches.length !== 1 ? "es" : ""}
            </span>
          </div>
        </div>
        <div className="ls-header-right">
          {selected.size > 0 && (
            <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); handleCreatePO(); }}>
              <ShoppingCart size={13} /> Create PO ({selected.size})
            </button>
          )}
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {open && (
        <div className="ls-body">
          <div className="ls-filters">
            <label className="form-label" style={{ marginBottom: 0 }}>Filter by Branch:</label>
            <div className="ls-branch-btns">
              <button className={`ls-branch-btn${filterB === "all" ? " ls-branch-active" : ""}`} onClick={() => setFilterB("all")}>
                All ({lowItems.length})
              </button>
              {affectedBranches.map(b => {
                const count = lowItems.filter(p => p.branchId === b.id).length;
                return (
                  <button key={b.id} className={`ls-branch-btn${filterB === String(b.id) ? " ls-branch-active" : ""}`} onClick={() => setFilterB(String(b.id))}>
                    {b.name} ({count})
                  </button>
                );
              })}
            </div>
            {selected.size > 0 && <span className="ls-sel-hint">{selected.size} item{selected.size !== 1 ? "s" : ""} selected</span>}
          </div>

          <div className="table-wrapper ls-table-wrap">
            <table className="table ls-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <button className="ls-check-btn" onClick={toggleAll}>
                      {allViewSelected ? <CheckSquare size={15} className="ls-check-active" /> : <Square size={15} className="ls-check-idle" />}
                    </button>
                  </th>
                  <th>Product</th>
                  <th>Branch</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Min</th>
                  <th>Deficit</th>
                  <th>Suggested Qty</th>
                  <th>Unit Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(p => {
                  const cat        = categories.find(c => c.id === p.categoryId);
                  const branch     = branches.find(b => b.id === p.branchId);
                  const deficit    = Number(p.minStock) - Number(p.stock);
                  const suggested  = Math.max(1, deficit);
                  const isSelected = selected.has(p.id);
                  return (
                    <tr key={p.id} className={`ls-row${isSelected ? " ls-row-selected" : ""}`} onClick={() => toggleItem(p.id)}>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="ls-check-btn" onClick={() => toggleItem(p.id)}>
                          {isSelected ? <CheckSquare size={15} className="ls-check-active" /> : <Square size={15} className="ls-check-idle" />}
                        </button>
                      </td>
                      <td><p className="td-name">{p.name}</p><p className="td-meta">{p.sku}</p></td>
                      <td className="td-meta">{branch?.name || p.branchName || "—"}</td>
                      <td>{cat && <span className="cat-chip">{cat.icon} {cat.name}</span>}</td>
                      <td><span className={`badge badge-${Number(p.stock) === 0 ? "danger" : "warning"}`}>{Number(p.stock) === 0 ? "Out" : p.stock}</span></td>
                      <td className="td-meta">{p.minStock}</td>
                      <td><span className="ls-deficit">-{deficit < 0 ? 0 : deficit}</span></td>
                      <td><span className="ls-suggested">{suggested} {p.unit}</span></td>
                      <td className="td-meta">₹{Number(p.costPrice).toFixed(2)}</td>
                      <td><span className={`badge badge-${Number(p.stock) === 0 ? "danger" : "warning"}`}>{Number(p.stock) === 0 ? "Out of Stock" : "Low Stock"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedInView.length > 0 && (
            <div className="ls-action-bar">
              <span className="ls-action-info">
                <strong>{selectedInView.length}</strong> item{selectedInView.length !== 1 ? "s" : ""} selected &nbsp;·&nbsp;
                Est. value: <strong>₹{selectedInView.reduce((s, p) => s + Math.max(1, Number(p.minStock) - Number(p.stock)) * Number(p.costPrice), 0).toFixed(2)}</strong>
              </span>
              <button className="btn btn-primary" onClick={handleCreatePO}>
                <ShoppingCart size={14} /> Create Purchase Order
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
