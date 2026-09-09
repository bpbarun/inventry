import { useState, useMemo, useEffect, Fragment } from "react";
import {
  Filter, Download, ChevronDown, ChevronRight,
  Hammer, PackageCheck, Truck, AlertTriangle,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";

// ── helpers ──────────────────────────────────────────────────────
const fmt = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? String(d) : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const isoDay = (d) => {
  const dt = new Date(d);
  return isNaN(dt) ? "" : dt.toISOString().slice(0, 10);
};

const firstOfMonth = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

function downloadCsv(filename, headerRow, rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headerRow, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const REPORTS = [
  { id: "wip",       label: "WIP (Running)",   icon: Hammer,       dated: true,  dateField: "date" },
  { id: "finished",  label: "Finished Goods",  icon: PackageCheck, dated: true,  dateField: "completed" },
  { id: "dispatch",  label: "Dispatch",        icon: Truck,        dated: true,  dateField: "dispatched" },
  { id: "lowstock",  label: "Low Stock",       icon: AlertTriangle, dated: false, dateField: null },
];

export default function Reports() {
  const { stockOuts, products, branches, categories, lowStockProducts } = useApp();
  const toast = useToast();

  const [report,   setReport]   = useState("wip");
  const [dateOn,   setDateOn]   = useState(false);
  const [from,     setFrom]     = useState(firstOfMonth());
  const [to,       setTo]       = useState(today());
  const [branchId, setBranchId] = useState("all");
  const [search,   setSearch]   = useState("");
  const [detailed, setDetailed] = useState(false);
  const [openKeys, setOpenKeys] = useState(new Set());

  const cfg = REPORTS.find((r) => r.id === report);

  // sensible default: date filter on for finished/dispatch, off for the WIP snapshot
  useEffect(() => {
    setDateOn(report === "finished" || report === "dispatch");
    setOpenKeys(new Set());
  }, [report]);

  const toggleKey = (k) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const itemValue = (it) => {
    if (it.totalCost != null) return Number(it.totalCost);
    const prod = products.find((p) => p.id === it.productId);
    return Number(it.qty) * Number(prod?.costPrice || 0);
  };

  // ── group stock-outs into work orders ──────────────────────────
  const workOrderGroups = useMemo(() => {
    const map = new Map();
    stockOuts.forEach((so) => {
      const key = so.workOrder || `__solo_${so.id}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          workOrder: so.workOrder || null,
          date: so.date,
          createdAt: so.createdAt || so.date,
          completedAt: so.completedAt || null,
          dispatchedAt: so.dispatchedAt || null,
          branchId: so.branchId,
          branchName: so.branchName || branches.find((b) => b.id === so.branchId)?.name || "",
          reason: so.reason || "",
          status: so.status || "running",
          dispatchBill: so.dispatchBill || null,
          items: [],
        });
      }
      const g = map.get(key);
      g.items.push(so);
      if (so.completedAt && !g.completedAt) g.completedAt = so.completedAt;
      if (so.dispatchedAt && !g.dispatchedAt) g.dispatchedAt = so.dispatchedAt;
      if (so.dispatchBill && !g.dispatchBill) g.dispatchBill = so.dispatchBill;
    });
    return [...map.values()].map((g) => ({
      ...g,
      qty: g.items.reduce((s, it) => s + Number(it.qty), 0),
      value: g.items.reduce((s, it) => s + itemValue(it), 0),
      refDate:
        cfg.dateField === "completed" ? (g.completedAt || g.date)
        : cfg.dateField === "dispatched" ? (g.dispatchedAt || g.date)
        : g.date,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockOuts, products, branches, cfg.dateField]);

  const inRange = (d) => {
    if (!dateOn) return true;
    const day = isoDay(d);
    if (!day) return false;
    return (!from || day >= from) && (!to || day <= to);
  };

  const matchesBranch = (bid) => branchId === "all" || bid === parseInt(branchId);
  const q = search.trim().toLowerCase();

  // ── build rows for the active report ───────────────────────────
  const groupRows = useMemo(() => {
    if (report === "lowstock") return [];
    let rows = workOrderGroups;
    if (report === "wip")      rows = rows.filter((g) => g.status === "running");
    if (report === "finished") rows = rows.filter((g) => g.status === "completed");
    if (report === "dispatch") rows = rows.filter((g) => !!g.dispatchBill);
    return rows
      .filter((g) => matchesBranch(g.branchId))
      .filter((g) => inRange(g.refDate))
      .filter((g) =>
        !q ||
        (g.workOrder || "").toLowerCase().includes(q) ||
        (g.reason || "").toLowerCase().includes(q) ||
        (g.dispatchBill || "").toLowerCase().includes(q) ||
        g.items.some((it) => (it.productName || "").toLowerCase().includes(q))
      )
      .sort((a, b) => new Date(b.refDate) - new Date(a.refDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderGroups, report, branchId, dateOn, from, to, q]);

  const lowRows = useMemo(() => {
    if (report !== "lowstock") return [];
    return lowStockProducts()
      .filter((p) => matchesBranch(p.branchId))
      .filter((p) =>
        !q ||
        (p.name || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q)
      )
      .map((p) => {
        const cat = categories.find((c) => c.id === p.categoryId);
        const shortfall = Math.max(0, Number(p.minStock) - Number(p.stock));
        return {
          ...p,
          categoryName: p.categoryName || cat?.name || "—",
          branchName: p.branchName || branches.find((b) => b.id === p.branchId)?.name || "—",
          shortfall,
          reorderValue: shortfall * Number(p.costPrice || 0),
        };
      })
      .sort((a, b) => Number(a.stock) - Number(b.stock));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, lowStockProducts, branchId, q, categories, branches]);

  // ── summary ────────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (report === "lowstock") {
      return [
        { label: "Products", value: lowRows.length },
        { label: "Out of stock", value: lowRows.filter((p) => Number(p.stock) <= 0).length },
        { label: "Total shortfall", value: `${lowRows.reduce((s, p) => s + p.shortfall, 0)} units` },
        { label: "Reorder value", value: fmt(lowRows.reduce((s, p) => s + p.reorderValue, 0)) },
      ];
    }
    const items = groupRows.reduce((s, g) => s + g.items.length, 0);
    const qty = groupRows.reduce((s, g) => s + g.qty, 0);
    const value = groupRows.reduce((s, g) => s + g.value, 0);
    return [
      { label: "Work orders", value: groupRows.length },
      { label: "Line items", value: items },
      { label: "Total qty", value: `${qty} units` },
      { label: "Est. value", value: fmt(value) },
    ];
  }, [report, groupRows, lowRows]);

  // ── CSV export ─────────────────────────────────────────────────
  const rangeTag = dateOn ? `_${from}_to_${to}` : "";

  const exportCsv = () => {
    try {
      if (report === "lowstock") {
        downloadCsv(
          `low-stock_${today()}.csv`,
          ["Product", "SKU", "Branch", "Category", "Current Stock", "Min Stock", "Shortfall", "Reorder Value (cost)"],
          lowRows.map((p) => [
            p.name, p.sku, p.branchName, p.categoryName,
            p.stock, p.minStock, p.shortfall, Number(p.reorderValue).toFixed(2),
          ])
        );
      } else if (detailed) {
        const header = ["Work Order", "Date", "Branch", "Reason",
          ...(report === "dispatch" ? ["Sell-Bill"] : []),
          "Product", "SKU", "Qty", "Unit", "Line Value (cost)"];
        const rows = [];
        groupRows.forEach((g) => {
          g.items.forEach((it) => {
            const prod = products.find((p) => p.id === it.productId);
            rows.push([
              g.workOrder || "(entry)", isoDay(g.refDate), g.branchName, g.reason,
              ...(report === "dispatch" ? [g.dispatchBill || ""] : []),
              it.productName || prod?.name || "—",
              it.sku || prod?.sku || "—",
              it.qty, it.unit || prod?.unit || "",
              itemValue(it).toFixed(2),
            ]);
          });
        });
        downloadCsv(`${report}-report-detailed${rangeTag}.csv`, header, rows);
      } else {
        const header = ["Work Order", "Date", "Branch",
          ...(report === "dispatch" ? ["Sell-Bill"] : []),
          ...(report === "finished" ? ["Dispatch Status"] : []),
          "Items", "Total Qty", "Est. Value (cost)", "Reason"];
        downloadCsv(
          `${report}-report${rangeTag}.csv`,
          header,
          groupRows.map((g) => [
            g.workOrder || "(entry)", isoDay(g.refDate), g.branchName,
            ...(report === "dispatch" ? [g.dispatchBill || ""] : []),
            ...(report === "finished" ? [g.dispatchBill ? `Dispatched (${g.dispatchBill})` : "In stock"] : []),
            g.items.length, g.qty, g.value.toFixed(2), g.reason,
          ])
        );
      }
      toast.success("Report downloaded.");
    } catch (e) {
      toast.error(e.message || "Failed to export.");
    }
  };

  const lineItemCount = groupRows.reduce((s, g) => s + g.items.length, 0);
  const rowCount = report === "lowstock" ? lowRows.length : groupRows.length;
  const dateHeader = report === "dispatch" ? "Dispatch Date" : report === "finished" ? "Completed" : "Date";

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Inventory &amp; work-order reports with date range and CSV export.</p>
        </div>
        <div className="rpt-actions">
          <button className="btn btn-primary" onClick={exportCsv} disabled={rowCount === 0}>
            <Download size={15} /> Download CSV
          </button>
        </div>
      </div>

      {/* Report picker */}
      <div className="so-tab-bar rpt-tab-bar">
        {REPORTS.map((r) => {
          const RIcon = r.icon;
          return (
            <button
              key={r.id}
              className={`so-tab-btn${report === r.id ? " so-tab-active" : ""}`}
              onClick={() => setReport(r.id)}
            >
              <RIcon size={14} /> {r.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="card filters-bar rpt-filters">
        <Filter size={14} style={{ color: "var(--text-meta)", flexShrink: 0 }} />

        <select className="form-input select-sm" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="all">All Branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <input
          className="form-input select-sm"
          style={{ minWidth: 200 }}
          placeholder="Search work order / product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {cfg.dated && (
          <>
            <label className="rpt-check">
              <input type="checkbox" checked={dateOn} onChange={(e) => setDateOn(e.target.checked)} />
              Date range
            </label>
            <input
              type="date" className="form-input select-sm" value={from}
              disabled={!dateOn} max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span className="td-meta">to</span>
            <input
              type="date" className="form-input select-sm" value={to}
              disabled={!dateOn} min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
            />
          </>
        )}

        {report !== "lowstock" && (
          <label className="rpt-check" title="Show one row per product line instead of one row per work order">
            <input type="checkbox" checked={detailed} onChange={(e) => setDetailed(e.target.checked)} />
            One row per product
          </label>
        )}

        <span className="filter-count">
          {report === "lowstock"
            ? `${rowCount} products`
            : detailed
              ? `${lineItemCount} product lines · ${rowCount} work orders`
              : `${rowCount} work orders`}
        </span>
      </div>

      {/* Summary */}
      <div className="rpt-summary card">
        {summary.map((s) => (
          <div key={s.label} className="rpt-stat">
            <span className="rpt-stat-label">{s.label}</span>
            <span className="rpt-stat-value">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {rowCount === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-sub)" }}>
            No data for this report / filter.
          </div>
        ) : report === "lowstock" ? (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th><th>Branch</th><th>Category</th>
                  <th className="text-right">Current</th>
                  <th className="text-right">Min</th>
                  <th className="text-right">Shortfall</th>
                  <th className="text-right">Reorder Value</th>
                </tr>
              </thead>
              <tbody>
                {lowRows.map((p) => (
                  <tr key={p.id}>
                    <td><p className="td-name">{p.name}</p><p className="td-meta">{p.sku}</p></td>
                    <td className="td-meta">{p.branchName}</td>
                    <td className="td-meta">{p.categoryName}</td>
                    <td className="text-right">
                      <span className={`badge ${Number(p.stock) <= 0 ? "badge-danger" : "badge-warning"}`}>{p.stock}</span>
                    </td>
                    <td className="text-right td-meta">{p.minStock}</td>
                    <td className="text-right" style={{ fontWeight: 600, color: "var(--danger)" }}>{p.shortfall}</td>
                    <td className="text-right">{fmt(p.reorderValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : detailed ? (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Work Order</th>
                  <th>{dateHeader}</th>
                  <th>Branch</th>
                  {report === "dispatch" && <th>Sell-Bill</th>}
                  <th>Product</th>
                  <th>SKU</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Line Value</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.flatMap((g) =>
                  g.items.map((it) => {
                    const prod = products.find((p) => p.id === it.productId);
                    return (
                      <tr key={it.id}>
                        <td><span className="td-name">{g.workOrder || "(entry)"}</span></td>
                        <td className="td-meta">{fmtDate(g.refDate)}</td>
                        <td className="td-meta">{g.branchName || "—"}</td>
                        {report === "dispatch" && <td className="td-meta">{g.dispatchBill || "—"}</td>}
                        <td className="td-name">{it.productName || prod?.name || "—"}</td>
                        <td className="td-meta">{it.sku || prod?.sku || "—"}</td>
                        <td className="text-right"><span className="mv-out">−{it.qty} {it.unit || prod?.unit || ""}</span></td>
                        <td className="text-right">{fmt(itemValue(it))}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Work Order</th>
                  <th>{dateHeader}</th>
                  <th>Branch</th>
                  {report === "dispatch" && <th>Sell-Bill</th>}
                  {report === "finished" && <th>Dispatch</th>}
                  <th className="text-right">Items</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Est. Value</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.map((g) => {
                  const open = openKeys.has(g.key);
                  const colSpan = 9 + (report === "dispatch" ? 1 : 0) + (report === "finished" ? 1 : 0);
                  return (
                    <Fragment key={g.key}>
                      <tr style={{ cursor: "pointer" }} onClick={() => toggleKey(g.key)}>
                        <td>{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                        <td><span className="td-name">{g.workOrder || "(entry)"}</span></td>
                        <td className="td-meta">{fmtDate(g.refDate)}</td>
                        <td className="td-meta">{g.branchName || "—"}</td>
                        {report === "dispatch" && <td className="td-meta">{g.dispatchBill || "—"}</td>}
                        {report === "finished" && (
                          <td>
                            {g.dispatchBill
                              ? <span className="badge badge-success">Dispatched</span>
                              : <span className="badge badge-neutral">In stock</span>}
                          </td>
                        )}
                        <td className="text-right td-meta">{g.items.length}</td>
                        <td className="text-right"><span className="mv-out">−{g.qty}</span></td>
                        <td className="text-right">{fmt(g.value)}</td>
                        <td className="td-meta td-truncate">{g.reason || "—"}</td>
                      </tr>
                      {open && (
                        <tr className="rpt-detail-row">
                          <td></td>
                          <td colSpan={colSpan - 1} style={{ padding: 0 }}>
                            <table className="table" style={{ margin: 0 }}>
                              <thead>
                                <tr>
                                  <th>Product</th><th>SKU</th>
                                  <th className="text-right">Qty</th>
                                  <th className="text-right">Line Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {g.items.map((it) => {
                                  const prod = products.find((p) => p.id === it.productId);
                                  return (
                                    <tr key={it.id}>
                                      <td className="td-name">{it.productName || prod?.name || "—"}</td>
                                      <td className="td-meta">{it.sku || prod?.sku || "—"}</td>
                                      <td className="text-right"><span className="mv-out">−{it.qty} {it.unit || prod?.unit || ""}</span></td>
                                      <td className="text-right">{fmt(itemValue(it))}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
