import { useState, useMemo } from "react";
import { Plus, ChevronDown, ChevronRight, Filter, FileText, Check, X, CheckCircle2, Truck, Pencil } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import Modal from "../common/Modal";
import StockOutForm from "./StockOutForm";

export default function StockOut() {
  const { stockOuts, products, branches, categories, addStockOut, addStockOutBatch, updateStockOut, completeWorkOrder, dispatchWorkOrder } = useApp();
  const toast = useToast();

  const [activeTab,     setActiveTab]     = useState("running");
  const [showAdd,       setShowAdd]       = useState(false);
  const [filterB,       setFilterB]       = useState("all");
  const [search,        setSearch]        = useState("");
  const [openGroups,    setOpenGroups]    = useState(new Set());

  // inline add-product-to-group
  const [addingToGroup, setAddingToGroup] = useState(null);
  const [newProdId,     setNewProdId]     = useState("");
  const [newQty,        setNewQty]        = useState("");
  const [addSaving,     setAddSaving]     = useState(false);
  const [addCatId,      setAddCatId]      = useState("");
  const [addSubCatId,   setAddSubCatId]   = useState("");

  // complete work order confirmation
  const [confirmComplete, setConfirmComplete] = useState(null); // workOrder string
  const [completing,      setCompleting]      = useState(false);

  // dispatch modal
  const [dispatchModal,   setDispatchModal]   = useState(null); // workOrder string
  const [dispatchBillVal, setDispatchBillVal] = useState("");
  const [dispatching,     setDispatching]     = useState(false);

  // inline item qty edit
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemQty,   setEditItemQty]   = useState("");
  const [editItemSaving, setEditItemSaving] = useState(false);

  const startEditItem = (it) => { setEditingItemId(it.id); setEditItemQty(String(it.qty)); };
  const cancelEditItem = () => { setEditingItemId(null); setEditItemQty(""); };

  const saveEditItem = async (it) => {
    const qty = parseInt(editItemQty);
    if (!qty || qty <= 0) return toast.error("Enter a valid quantity.");
    const prod = products.find(p => p.id === it.productId);
    const maxAllowed = Number(it.qty) + Number(prod?.stock ?? 0);
    if (qty > maxAllowed) return toast.error(`Max allowed: ${maxAllowed} units.`);
    setEditItemSaving(true);
    try {
      await updateStockOut(it.id, { qty });
      toast.success("Quantity updated.");
      cancelEditItem();
    } catch (e) {
      toast.error(e.message || "Failed to update.");
    } finally {
      setEditItemSaving(false);
    }
  };

  const toggleGroup = (key) =>
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // ── add product to existing group ────────────────────────────
  const startAddItem = (groupKey) => {
    setAddingToGroup(groupKey);
    setNewProdId("");
    setNewQty("");
    setAddCatId("");
    setAddSubCatId("");
  };
  const cancelAddItem = () => {
    setAddingToGroup(null);
    setNewProdId("");
    setNewQty("");
    setAddCatId("");
    setAddSubCatId("");
  };

  const saveAddItem = async (group) => {
    const qty  = parseInt(newQty);
    const prod = products.find(p => p.id === parseInt(newProdId));
    if (!newProdId)                              return toast.error("Select a product.");
    if (!qty || qty <= 0)                        return toast.error("Enter a valid quantity.");
    if (prod && qty > Number(prod.stock))        return toast.error(`Only ${prod.stock} units in stock.`);
    setAddSaving(true);
    try {
      await addStockOut({
        workOrder: group.workOrder,
        productId: parseInt(newProdId),
        branchId:  prod?.branchId || group.items[0]?.branchId || null,
        qty,
        date:   group.date,
        reason: group.reason,
        notes:  group.notes,
      });
      toast.success(`${prod?.name || "Item"} added to ${group.workOrder}.`);
      cancelAddItem();
    } catch (e) {
      toast.error(e.message || "Failed to add item.");
    } finally {
      setAddSaving(false);
    }
  };

  // ── complete work order ───────────────────────────────────────
  const doComplete = async (workOrder) => {
    setCompleting(true);
    try {
      await completeWorkOrder(workOrder);
      toast.success(`Work order ${workOrder} marked as completed.`);
      setConfirmComplete(null);
    } catch (e) {
      toast.error(e.message || "Failed to complete work order.");
    } finally {
      setCompleting(false);
    }
  };

  const doDispatch = async () => {
    if (!dispatchBillVal.trim()) return toast.error("Enter a bill number.");
    setDispatching(true);
    try {
      await dispatchWorkOrder(dispatchModal, dispatchBillVal.trim());
      toast.success(`Work order ${dispatchModal} dispatched — Bill: ${dispatchBillVal.trim()}`);
      setDispatchModal(null);
      setDispatchBillVal("");
    } catch (e) {
      toast.error(e.message || "Failed to dispatch.");
    } finally {
      setDispatching(false);
    }
  };

  // ── grouping ─────────────────────────────────────────────────
  const groups = useMemo(() => {
    const sorted = [...stockOuts].sort(
      (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
    );

    const map = new Map();
    sorted.forEach(so => {
      if (filterB !== "all" && so.branchId !== parseInt(filterB)) return;
      const key = so.workOrder || `__solo_${so.id}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          workOrder:  so.workOrder || null,
          date:       so.date,
          branchName: so.branchName || "",
          reason:     so.reason || "",
          notes:      so.notes  || "",
          status:      so.status || "running",
          dispatchBill: so.dispatchBill || null,
          items:       [],
        });
      }
      map.get(key).items.push(so);
    });

    return [...map.values()]
      .filter(g => g.status === activeTab)
      .filter(g =>
        !search.trim() ||
        g.workOrder?.toLowerCase().includes(search.toLowerCase()) ||
        g.reason?.toLowerCase().includes(search.toLowerCase()) ||
        g.items.some(it => (it.productName || "").toLowerCase().includes(search.toLowerCase()))
      );
  }, [stockOuts, filterB, search, activeTab]);

  const runningCount = useMemo(() => {
    const keys = new Set(stockOuts.filter(s => (s.status || "running") === "running").map(s => s.workOrder || `__solo_${s.id}`));
    return keys.size;
  }, [stockOuts]);

  const completedCount = useMemo(() => {
    const keys = new Set(stockOuts.filter(s => s.status === "completed").map(s => s.workOrder || `__solo_${s.id}`));
    return keys.size;
  }, [stockOuts]);

  const totalItems  = groups.reduce((s, g) => s + g.items.length, 0);
  const totalQty    = groups.reduce((s, g) => g.items.reduce((ss, it) => ss + Number(it.qty), s), 0);
  const totalAmount = groups.reduce((s, g) =>
    g.items.reduce((ss, it) => {
      const prod = products.find(p => p.id === it.productId);
      const val  = it.totalCost != null
        ? Number(it.totalCost)
        : Number(it.qty) * Number(prod?.costPrice || 0);
      return ss + val;
    }, s), 0);

  const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Out</h1>
          <p className="page-subtitle">
            {groups.length} work order{groups.length !== 1 ? "s" : ""}
            &nbsp;·&nbsp; {totalItems} line{totalItems !== 1 ? "s" : ""}
            &nbsp;·&nbsp; <strong>{totalQty} units</strong> issued
            {totalAmount > 0 && <>&nbsp;·&nbsp; <strong>{fmt(totalAmount)}</strong></>}
          </p>
        </div>
        <button className="btn btn-warning" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> New Stock Out
        </button>
      </div>

      {/* Tabs */}
      <div className="so-tab-bar">
        <button
          className={`so-tab-btn${activeTab === "running" ? " so-tab-active" : ""}`}
          onClick={() => setActiveTab("running")}
        >
          Running
          <span className="so-tab-count">{runningCount}</span>
        </button>
        <button
          className={`so-tab-btn${activeTab === "completed" ? " so-tab-active" : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          Completed
          <span className="so-tab-count">{completedCount}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card filters-bar">
        <Filter size={14} style={{ color: "var(--text-meta)", flexShrink: 0 }} />
        <select className="form-input select-sm" value={filterB} onChange={e => setFilterB(e.target.value)}>
          <option value="all">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input
          className="form-input select-sm"
          style={{ minWidth: 200 }}
          placeholder="Search work order / product…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="filter-count">{groups.length} groups</span>
      </div>

      {/* Accordion */}
      {groups.length === 0 ? (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-sub)" }}>
          No {activeTab} work orders found.
        </div>
      ) : (
        <div className="wo-list">
          {groups.map(group => {
            const isOpen   = openGroups.has(group.key);
            const groupQty = group.items.reduce((s, it) => s + Number(it.qty), 0);
            const groupAmount = group.items.reduce((s, it) => {
              const prod = products.find(p => p.id === it.productId);
              const val  = it.totalCost != null
                ? Number(it.totalCost)
                : Number(it.qty) * Number(prod?.costPrice || 0);
              return s + val;
            }, 0);
            const hasGroupCost = groupAmount > 0;
            const isWO     = !!group.workOrder;
            const isAdding = addingToGroup === group.key;
            const isConfirmingComplete = confirmComplete !== null && confirmComplete === group.workOrder;
            const isDispatched = !!group.dispatchBill;

            const groupBranchId = group.items[0]?.branchId;
            const addableProds  = groupBranchId
              ? products.filter(p => parseInt(p.branchId) === parseInt(groupBranchId))
              : products;
            const usedIds    = new Set(group.items.map(it => it.productId));
            const availProds = addableProds.filter(p => !usedIds.has(p.id));

            // category / subcategory filter for inline add
            const addRootCats = categories.filter(c =>
              !c.parentId && addableProds.some(p => {
                const cat = categories.find(x => x.id === p.categoryId);
                return p.categoryId === c.id || (cat && cat.parentId === c.id);
              })
            );
            const addSubCats = addCatId
              ? categories.filter(c => c.parentId === parseInt(addCatId))
              : [];
            const addCatFilterIds = addSubCatId
              ? [parseInt(addSubCatId)]
              : addCatId
                ? [parseInt(addCatId), ...categories.filter(c => c.parentId === parseInt(addCatId)).map(c => c.id)]
                : null;
            const filteredAvailProds = addCatFilterIds
              ? availProds.filter(p => addCatFilterIds.includes(p.categoryId))
              : availProds;

            return (
              <div key={group.key} className={`wo-card${isOpen ? " wo-card-open" : ""}`}>
                {/* Header */}
                <div className="wo-card-header" onClick={() => toggleGroup(group.key)}>
                  <div className="wo-card-left">
                    <span className="wo-chevron-icon">
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                    {isWO ? (
                      <span className="wo-badge"><FileText size={12} /> {group.workOrder}</span>
                    ) : (
                      <span className="wo-badge wo-badge-solo">Entry</span>
                    )}
                    {isDispatched && (
                      <span className="wo-dispatched-badge"><Truck size={11} /> Dispatched</span>
                    )}
                    <span className="wo-date">{group.date}</span>
                    {group.branchName && <span className="td-meta wo-branch">{group.branchName}</span>}
                    {group.reason && <span className="wo-reason-inline">{group.reason}</span>}
                  </div>
                  <div className="wo-card-right">
                    <span className="td-meta">{group.items.length} item{group.items.length !== 1 ? "s" : ""}</span>
                    <span className="mv-out">−{groupQty} units</span>
                    {hasGroupCost && groupAmount > 0 && <span className="wo-amount">{fmt(groupAmount)}</span>}
                  </div>
                </div>

                {/* Body */}
                {isOpen && (
                  <div className="wo-card-body">
                    {group.notes && <p className="wo-notes">{group.notes}</p>}
                    {isDispatched && (
                      <div className="wo-dispatch-info">
                        <Truck size={13} />
                        <span>Dispatched · Bill <strong>{group.dispatchBill}</strong></span>
                      </div>
                    )}

                    <table className="wo-items-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>SKU</th>
                          <th>Category</th>
                          <th className="text-right">Qty</th>
                          <th className="text-right">Rate (₹)</th>
                          <th className="text-right">Amount (₹)</th>
                          {activeTab === "running" && <th style={{ width: 44 }}></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map(it => {
                          const prod     = products.find(p => p.id === it.productId);
                          const cat      = categories.find(c => c.id === (it.categoryId || prod?.categoryId));
                          const isFifo   = it.totalCost != null;
                          const amount   = isFifo
                            ? Number(it.totalCost)
                            : (Number(prod?.costPrice || 0) > 0 ? Number(it.qty) * Number(prod.costPrice) : null);
                          const unitRate = amount != null && Number(it.qty) > 0 ? amount / Number(it.qty) : null;
                          const isEditingThis = editingItemId === it.id;
                          return (
                            <tr key={it.id}>
                              <td><p className="td-name">{it.productName || prod?.name || "—"}</p></td>
                              <td><span className="td-meta">{it.sku || prod?.sku || "—"}</span></td>
                              <td>
                                {(it.categoryName || cat) && (
                                  <span className="cat-chip">{cat?.icon || ""} {it.categoryName || cat?.name}</span>
                                )}
                              </td>
                              <td className="text-right">
                                {isEditingThis ? (
                                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                                    <input
                                      type="number" min="1"
                                      className="form-input form-input-sm"
                                      style={{ width: 72, textAlign: "right" }}
                                      value={editItemQty}
                                      onChange={e => setEditItemQty(e.target.value)}
                                      onKeyDown={e => { if (e.key === "Enter") saveEditItem(it); if (e.key === "Escape") cancelEditItem(); }}
                                      autoFocus
                                    />
                                    <button className="icon-btn icon-btn-green" title="Save" disabled={editItemSaving} onClick={() => saveEditItem(it)}><Check size={13} /></button>
                                    <button className="icon-btn" title="Cancel" onClick={cancelEditItem}><X size={13} /></button>
                                  </div>
                                ) : (
                                  <span className="mv-out">−{it.qty} {it.unit || prod?.unit || ""}</span>
                                )}
                              </td>
                              <td className="text-right">
                                <span className={isFifo ? "td-rate-fifo" : "td-meta"}>
                                  {unitRate != null ? fmt(unitRate) : "—"}
                                </span>
                              </td>
                              <td className="text-right" style={{ fontWeight: isFifo ? 600 : 400, color: isFifo ? "var(--text)" : "var(--text-sub)" }}>
                                {amount != null ? fmt(amount) : "—"}
                              </td>
                              {activeTab === "running" && (
                                <td className="text-center">
                                  {!isEditingThis && (
                                    <button className="icon-btn" title="Edit qty" onClick={() => startEditItem(it)}>
                                      <Pencil size={14} />
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}

                        {/* inline add-product filter row */}
                        {isAdding && (
                          <tr>
                            <td colSpan={7} style={{ padding: "10px 12px 4px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sub)", flexShrink: 0 }}>Category:</span>
                                <select
                                  className="form-input select-sm"
                                  style={{ minWidth: 160 }}
                                  value={addCatId}
                                  onChange={e => { setAddCatId(e.target.value); setAddSubCatId(""); setNewProdId(""); }}
                                >
                                  <option value="">— All Categories —</option>
                                  {addRootCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                                </select>
                                {addSubCats.length > 0 && (
                                  <>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sub)", flexShrink: 0 }}>Sub:</span>
                                    <select
                                      className="form-input select-sm"
                                      style={{ minWidth: 150 }}
                                      value={addSubCatId}
                                      onChange={e => { setAddSubCatId(e.target.value); setNewProdId(""); }}
                                    >
                                      <option value="">— All Subcategories —</option>
                                      {addSubCats.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                                    </select>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* inline add-product row */}
                        {isAdding && (
                          <tr className="wo-add-row">
                            <td colSpan={2}>
                              <select
                                className="form-input form-input-sm"
                                style={{ width: "100%" }}
                                value={newProdId}
                                onChange={e => setNewProdId(e.target.value)}
                                autoFocus
                              >
                                <option value="">— Select product —</option>
                                {filteredAvailProds.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.sku}) — {p.stock} in stock
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td />
                            <td className="text-right">
                              <input
                                type="number" min="1"
                                className="form-input form-input-sm"
                                style={{ width: 72, textAlign: "right" }}
                                placeholder="Qty"
                                value={newQty}
                                onChange={e => setNewQty(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") saveAddItem(group); if (e.key === "Escape") cancelAddItem(); }}
                              />
                            </td>
                            <td colSpan={2} />
                            <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                              <button className="icon-btn icon-btn-green" title="Add" disabled={addSaving} onClick={() => saveAddItem(group)}><Check size={13} /></button>
                              <button className="icon-btn" title="Cancel" onClick={cancelAddItem} style={{ marginLeft: 4 }}><X size={13} /></button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="text-right" style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-sub)", fontWeight: 600 }}>Total</td>
                          <td className="text-right" style={{ padding: "8px 12px", fontWeight: 700 }}>{groupQty} units</td>
                          <td />
                          <td className="text-right" style={{ padding: "8px 12px", fontWeight: 700, color: "var(--text)" }}>{hasGroupCost && groupAmount > 0 ? fmt(groupAmount) : "—"}</td>
                          {activeTab === "running" && <td />}
                        </tr>
                      </tfoot>
                    </table>

                    {/* Dispatch button — only on completed tab, only for WO groups not yet dispatched */}
                    {activeTab === "completed" && isWO && !isDispatched && (
                      <div className="wo-add-item-bar">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => { setDispatchModal(group.workOrder); setDispatchBillVal(""); }}
                        >
                          <Truck size={13} /> Ready to Dispatch
                        </button>
                      </div>
                    )}

                    {/* Action bar — only on running tab */}
                    {activeTab === "running" && (
                      <>
                        {isConfirmingComplete ? (
                          <div className="wo-confirm-complete">
                            <span>Mark <strong>{group.workOrder}</strong> as completed? This cannot be undone.</span>
                            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                              <button
                                className="btn btn-success btn-sm"
                                disabled={completing}
                                onClick={() => doComplete(confirmComplete)}
                              >
                                <CheckCircle2 size={13} /> {completing ? "Completing…" : "Yes, Complete"}
                              </button>
                              <button className="btn btn-outline btn-sm" onClick={() => setConfirmComplete(null)}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="wo-add-item-bar">
                            {!isAdding && (
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => startAddItem(group.key)}
                                disabled={availProds.length === 0}
                                title={availProds.length === 0 ? "No more products available" : ""}
                              >
                                <Plus size={13} /> Add Product
                              </button>
                            )}
                            {isWO && !isAdding && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => setConfirmComplete(group.workOrder)}
                              >
                                <CheckCircle2 size={13} /> Complete Work Order
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {dispatchModal && (
        <Modal title="Ready to Dispatch" onClose={() => setDispatchModal(null)}>
          <div style={{ padding: "8px 0 16px" }}>
            <p style={{ marginBottom: 16, fontSize: 14, color: "var(--text-sub)" }}>
              Enter the sell-bill number for work order <strong>{dispatchModal}</strong>.
            </p>
            <div className="form-group">
              <label className="form-label">Sell-Bill Number <span style={{ color: "var(--danger)" }}>*</span></label>
              <input
                className="form-input"
                placeholder="e.g. INV-2024-001"
                value={dispatchBillVal}
                onChange={e => setDispatchBillVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doDispatch()}
                autoFocus
              />
            </div>
            <div className="form-actions" style={{ marginTop: 20 }}>
              <button className="btn btn-outline" onClick={() => setDispatchModal(null)} disabled={dispatching}>Cancel</button>
              <button className="btn btn-primary" onClick={doDispatch} disabled={dispatching || !dispatchBillVal.trim()}>
                <Truck size={14} /> {dispatching ? "Dispatching…" : "Confirm Dispatch"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showAdd && (
        <Modal title="New Stock Out" onClose={() => setShowAdd(false)} size="xl">
          <StockOutForm
            onSave={async (data) => {
              try {
                await addStockOutBatch(data);
                setShowAdd(false);
                toast.success(`Work order ${data.workOrder} recorded — ${data.items.length} item(s) issued.`);
              } catch (e) {
                toast.error(e.message || "Failed to record stock out.");
                throw e;
              }
            }}
            onCancel={() => setShowAdd(false)}
          />
        </Modal>
      )}
    </div>
  );
}
