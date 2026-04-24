import { useState, useMemo, useEffect } from "react";
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  Download, ChevronLeft, ChevronRight, FileSpreadsheet, FileText,
} from "lucide-react";
import * as XLSX from "xlsx";

/**
 * Reusable DataTable
 *
 * columns: [{
 *   key        – unique string
 *   label      – header text
 *   sortable   – bool (default false)
 *   sortValue  – (row) => comparable value  (optional, falls back to row[key])
 *   render     – (row, rowIndex) => ReactNode
 *   exportValue– (row) => string/number for CSV & Excel export
 *                pass `false` to exclude column from export entirely
 *   width      – CSS width string
 *   tdStyle    – inline style for <td>
 * }]
 *
 * data         – array of objects (pre-filtered by parent)
 * fileName     – base name for exported file (no extension)
 * defaultPageSize  – rows per page default
 * emptyMessage – shown when no rows
 * onRowClick   – (row) => void  (optional)
 * extraToolbar – ReactNode placed in toolbar right side (before export buttons)
 */
export default function DataTable({
  columns,
  data,
  fileName = "export",
  defaultPageSize = 10,
  emptyMessage = "No records found.",
  onRowClick,
  rowClassName,
  extraToolbar,
}) {
  const [sort, setSort]     = useState({ key: null, dir: "asc" });
  const [page, setPage]     = useState(1);
  const [perPage, setPerPage] = useState(defaultPageSize);
  const [search, setSearch] = useState("");

  // ── Reset page when outer data or search changes ──────────────────────────
  useEffect(() => { setPage(1); }, [data, search]);

  // ── Text search across all export-eligible columns ────────────────────────
  const searched = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        if (col.exportValue === false) return false;
        const val = col.exportValue
          ? String(col.exportValue(row) ?? "")
          : String(row[col.key] ?? "");
        return val.toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (!sort.key) return searched;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return searched;
    return [...searched].sort((a, b) => {
      const av = col.sortValue ? col.sortValue(a) : (a[sort.key] ?? "");
      const bv = col.sortValue ? col.sortValue(b) : (b[sort.key] ?? "");
      const cmp = String(av).localeCompare(String(bv), undefined, {
        numeric: true, sensitivity: "base",
      });
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [searched, sort, columns]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const paginated  = sorted.slice((page - 1) * perPage, page * perPage);
  const from = sorted.length === 0 ? 0 : (page - 1) * perPage + 1;
  const to   = Math.min(page * perPage, sorted.length);

  const toggleSort = (key) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );

  // ── Export helpers ────────────────────────────────────────────────────────
  const exportCols = columns.filter((c) => c.exportValue !== false);

  const getExportRows = () =>
    sorted.map((row) =>
      exportCols.map((col) =>
        col.exportValue ? col.exportValue(row) : (row[col.key] ?? "")
      )
    );

  const exportCSV = () => {
    const headers = exportCols.map((c) => c.label);
    const rows    = getExportRows().map((r) =>
      r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    );
    const csv  = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    trigger(blob, `${fileName}.csv`);
  };

  const exportExcel = () => {
    const headers = exportCols.map((c) => c.label);
    const rows    = getExportRows();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Auto-width columns
    const colWidths = [headers, ...rows].reduce((acc, r) =>
      r.map((v, i) => Math.max(acc[i] || 8, String(v ?? "").length + 2)), []
    );
    ws["!cols"] = colWidths.map((w) => ({ wch: Math.min(w, 50) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const trigger = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Page number list (with ellipsis) ─────────────────────────────────────
  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);

  // ── Sort icon ─────────────────────────────────────────────────────────────
  const SortIcon = ({ colKey }) => {
    if (sort.key !== colKey)
      return <ChevronsUpDown size={11} className="dt-sort-icon dt-sort-idle" />;
    return sort.dir === "asc"
      ? <ChevronUp   size={11} className="dt-sort-icon dt-sort-active" />
      : <ChevronDown size={11} className="dt-sort-icon dt-sort-active" />;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dt-wrap">
      {/* Toolbar */}
      <div className="dt-toolbar">
        <div className="dt-search-box">
          <Search size={13} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="dt-clear" onClick={() => setSearch("")} title="Clear search">
              ✕
            </button>
          )}
        </div>

        <div className="dt-toolbar-right">
          {extraToolbar}

          <div className="dt-export-btns">
            <button className="btn btn-outline btn-sm" onClick={exportCSV} title="Export as CSV">
              <FileText size={13} /> CSV
            </button>
            <button className="btn btn-outline btn-sm" onClick={exportExcel} title="Export as Excel">
              <FileSpreadsheet size={13} /> Excel
            </button>
          </div>

          <select
            className="form-input select-sm"
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table dt-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : {}}
                  className={col.sortable ? "dt-th-sort" : ""}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                >
                  <span className="dt-th-inner">
                    {col.label}
                    {col.sortable && <SortIcon colKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty-row">{emptyMessage}</td>
              </tr>
            ) : (
              paginated.map((row, idx) => (
                <tr
                  key={row.id ?? idx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={[onRowClick ? "dt-row-clickable" : "", rowClassName?.(row) ?? ""].filter(Boolean).join(" ")}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={col.tdStyle} onClick={col.stopClick ? (e) => e.stopPropagation() : undefined}>
                      {col.render
                        ? col.render(row, from + idx)
                        : (row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="dt-footer">
        <span className="dt-count">
          {sorted.length === 0
            ? "No records"
            : `Showing ${from}–${to} of ${sorted.length}${sorted.length !== data.length ? ` (filtered from ${data.length})` : " records"}`}
        </span>

        {totalPages > 1 && (
          <div className="dt-pages">
            <button className="dt-pg" onClick={() => setPage(1)}           disabled={page === 1} title="First">«</button>
            <button className="dt-pg" onClick={() => setPage((p) => p - 1)} disabled={page === 1}><ChevronLeft size={13} /></button>
            {pageNums.map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="dt-pg-dots">…</span>
              ) : (
                <button
                  key={p}
                  className={`dt-pg${page === p ? " dt-pg-active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              )
            )}
            <button className="dt-pg" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}><ChevronRight size={13} /></button>
            <button className="dt-pg" onClick={() => setPage(totalPages)}   disabled={page === totalPages} title="Last">»</button>
          </div>
        )}
      </div>
    </div>
  );
}
