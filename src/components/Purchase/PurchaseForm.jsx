import { useState } from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";

const today = () => new Date().toISOString().split("T")[0];

const emptyItem = () => ({
  _key:        Date.now() + Math.random(),
  parentCatId: "",
  categoryId:  "",
  productId:   "",
  orderedQty:  "",
  unitCost:    "",
  receivedQty: 0,
});

export default function PurchaseForm({ initial = null, onSave, onCancel }) {
  const { branches, categories, products } = useApp();

  const [branchId,         setBranchId]         = useState(initial ? String(initial.branchId) : "");
  const [supplier,         setSupplier]         = useState(initial?.supplier || "");
  const [supplierContact,  setSupplierContact]  = useState(initial?.supplierContact || "");
  const [orderDate,        setOrderDate]        = useState(initial?.orderDate || today());
  const [expectedDate,     setExpectedDate]     = useState(initial?.expectedDate || "");
  const [notes,            setNotes]            = useState(initial?.notes || "");
  const [status,           setStatus]           = useState(initial?.status || "Draft");
  const [errors,           setErrors]           = useState({});
  const [saving,           setSaving]           = useState(false);

  const [items, setItems] = useState(() => {
    if (initial?.items?.length) {
      return initial.items.map(it => {
        const prod = products.find(p => p.id === it.productId);
        let parentCatId = "";
        let categoryId  = "";
        if (prod) {
          const cat = categories.find(c => c.id === prod.categoryId);
          parentCatId = cat?.parentId ? String(cat.parentId) : String(prod.categoryId);
          categoryId  = String(prod.categoryId);
        }
        return { ...it, _key: Date.now() + Math.random(), parentCatId, categoryId };
      });
    }
    return [emptyItem()];
  });

  // Root categories for the selected branch
  const branchRootCats = branchId
    ? categories.filter(c => !c.parentId && (!c.branchId || c.branchId === parseInt(branchId)))
    : [];

  const setItemField = (key, field, value) => {
    setItems(prev =>
      prev.map(it => {
        if (it._key !== key) return it;
        const updated = { ...it, [field]: value };
        if (field === "parentCatId") {
          updated.categoryId = value; // default to parent until sub selected
          updated.productId  = "";
          updated.unitCost   = "";
        }
        if (field === "categoryId") {
          updated.productId = "";
          updated.unitCost  = "";
        }
        if (field === "productId" && value) {
          const prod = products.find(p => p.id === parseInt(value));
          if (prod) updated.unitCost = prod.costPrice;
        }
        return updated;
      })
    );
    setErrors(e => ({ ...e, items: "" }));
  };

  const addItem    = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (key) => setItems(prev => prev.filter(it => it._key !== key));

  const itemSubCats = (item) =>
    item.parentCatId ? categories.filter(c => c.parentId === parseInt(item.parentCatId)) : [];

  const itemProducts = (item) => {
    const bProds = branchId ? products.filter(p => p.branchId === parseInt(branchId)) : products;
    if (!item.categoryId) return bProds;
    // If a subcategory is selected, filter by it; otherwise include parent + all its subs
    const subs = categories.filter(c => c.parentId === parseInt(item.parentCatId)).map(c => c.id);
    const isSub = subs.includes(parseInt(item.categoryId));
    if (isSub) return bProds.filter(p => p.categoryId === parseInt(item.categoryId));
    return bProds.filter(p => p.categoryId === parseInt(item.categoryId) || subs.includes(p.categoryId));
  };

  const validate = () => {
    const e = {};
    if (!branchId)        e.branchId  = "Select a branch";
    if (!supplier.trim()) e.supplier  = "Supplier name is required";
    if (!orderDate)       e.orderDate = "Order date is required";
    const validItems = items.filter(it => it.productId && it.orderedQty && Number(it.orderedQty) > 0);
    if (validItems.length === 0) e.items = "Add at least one product line item";
    const ids = validItems.map(it => it.productId);
    if (new Set(ids).size !== ids.length) e.items = "Duplicate products — use a single line per product";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const cleanItems = items
      .filter(it => it.productId && Number(it.orderedQty) > 0)
      .map(({ _key, categoryId, parentCatId, ...rest }) => ({
        productId:   parseInt(rest.productId),
        orderedQty:  parseInt(rest.orderedQty),
        unitCost:    parseFloat(rest.unitCost) || 0,
        receivedQty: rest.receivedQty || 0,
      }));

    setSaving(true);
    try {
      await onSave({ branchId: parseInt(branchId), supplier, supplierContact, orderDate, expectedDate, notes, status, items: cleanItems });
    } catch (err) {
      setErrors(e => ({ ...e, api: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const orderTotal = items.reduce((s, it) => s + (Number(it.orderedQty) || 0) * (Number(it.unitCost) || 0), 0);

  return (
    <form onSubmit={handleSubmit}>
      {errors.api && <div className="form-api-error">{errors.api}</div>}
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Branch *</label>
          <select
            className={`form-input${errors.branchId ? " input-error" : ""}`}
            value={branchId}
            onChange={e => { setBranchId(e.target.value); setItems([emptyItem()]); setErrors({}); }}
          >
            <option value="">-- Select Branch --</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {errors.branchId && <span className="form-error">{errors.branchId}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="Draft">Draft</option>
            <option value="Ordered">Ordered</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Supplier *</label>
          <input
            className={`form-input${errors.supplier ? " input-error" : ""}`}
            value={supplier}
            onChange={e => { setSupplier(e.target.value); setErrors(er => ({ ...er, supplier: "" })); }}
            placeholder="e.g. PlasTrade UK Ltd"
          />
          {errors.supplier && <span className="form-error">{errors.supplier}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Supplier Contact</label>
          <input className="form-input" value={supplierContact} onChange={e => setSupplierContact(e.target.value)} placeholder="Phone or email" />
        </div>

        <div className="form-group">
          <label className="form-label">Order Date *</label>
          <input
            type="date"
            className={`form-input${errors.orderDate ? " input-error" : ""}`}
            value={orderDate}
            onChange={e => { setOrderDate(e.target.value); setErrors(er => ({ ...er, orderDate: "" })); }}
          />
          {errors.orderDate && <span className="form-error">{errors.orderDate}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Expected Delivery</label>
          <input type="date" className="form-input" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
        </div>

        <div className="form-group form-span-2">
          <label className="form-label">Notes</label>
          <textarea className="form-input form-textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional order notes..." />
        </div>
      </div>

      {/* Line Items */}
      <div className="po-items-section">
        <div className="po-items-header">
          <div>
            <h3 className="po-items-title">Order Items</h3>
            {branchId && <p className="po-items-hint">Select a category, then choose a product.</p>}
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={addItem} disabled={!branchId}>
            <Plus size={13} /> Add Line
          </button>
        </div>

        {!branchId && (
          <div className="po-no-branch-notice"><AlertCircle size={14} /> Select a branch above to start adding products.</div>
        )}
        {errors.items && (
          <div className="po-items-error"><AlertCircle size={14} /> {errors.items}</div>
        )}

        {branchId && (
          <div className="po-items-table-wrap">
            <table className="table po-table">
              <thead>
                <tr>
                  <th style={{ width: "25%" }}>Category / Subcategory</th>
                  <th style={{ width: "27%" }}>Product</th>
                  <th style={{ width: "13%" }}>Qty</th>
                  <th style={{ width: "15%" }}>Unit Cost (₹)</th>
                  <th style={{ width: "14%" }}>Line Total</th>
                  <th style={{ width: "6%" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const selProd    = products.find(p => p.id === parseInt(item.productId));
                  const lineTotal  = (Number(item.orderedQty) || 0) * (Number(item.unitCost) || 0);
                  const availProds = itemProducts(item);
                  const subs       = itemSubCats(item);
                  return (
                    <tr key={item._key} className="po-item-row">
                      <td>
                        <select className="form-input form-input-sm" value={item.parentCatId} onChange={e => setItemField(item._key, "parentCatId", e.target.value)}>
                          <option value="">-- Category --</option>
                          {branchRootCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                        </select>
                        {subs.length > 0 && (
                          <select className="form-input form-input-sm" style={{ marginTop: 4 }} value={item.categoryId} onChange={e => setItemField(item._key, "categoryId", e.target.value)}>
                            <option value={item.parentCatId}>-- No Subcategory --</option>
                            {subs.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td>
                        <select
                          className="form-input form-input-sm"
                          value={item.productId}
                          onChange={e => setItemField(item._key, "productId", e.target.value)}
                          disabled={!item.parentCatId}
                        >
                          <option value="">{item.parentCatId ? "-- Select Product --" : "Select category first"}</option>
                          {availProds.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                        </select>
                        {selProd && <span className="po-stock-hint">In stock: {selProd.stock} {selProd.unit}</span>}
                      </td>
                      <td>
                        <input type="number" min="1" className="form-input form-input-sm" value={item.orderedQty} onChange={e => setItemField(item._key, "orderedQty", e.target.value)} placeholder="0" disabled={!item.productId} />
                      </td>
                      <td>
                        <input type="number" step="0.01" className="form-input form-input-sm" value={item.unitCost} onChange={e => setItemField(item._key, "unitCost", e.target.value)} placeholder="0.00" disabled={!item.productId} />
                      </td>
                      <td className="po-line-total">{lineTotal > 0 ? `₹${lineTotal.toFixed(2)}` : "—"}</td>
                      <td>
                        {items.length > 1 && (
                          <button type="button" className="icon-btn icon-btn-red" onClick={() => removeItem(item._key)}><Trash2 size={14} /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="po-total-label">Order Total</td>
                  <td className="po-grand-total">₹{orderTotal.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : initial ? "Save Changes" : "Create Purchase Order"}
        </button>
      </div>
    </form>
  );
}
