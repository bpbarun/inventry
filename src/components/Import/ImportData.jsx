import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Trash2, X } from "lucide-react";
import { importApi } from "../../services/api";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import "./ImportData.css";

const REQUIRED_COLS  = ["branch", "category", "name"];
const OPTIONAL_COLS  = ["subcategory", "sku", "unit", "cost_price", "selling_price", "stock", "min_stock", "max_stock", "description"];
const ALL_COLS       = [...REQUIRED_COLS, ...OPTIONAL_COLS];

const TEMPLATE_DATA = [
  ["branch", "category", "subcategory", "name", "sku", "unit", "cost_price", "selling_price", "stock", "min_stock", "max_stock", "description"],
  ["Main Branch", "Electronics", "",         "USB Cable",  "USB-001", "pcs", 50,  99,  100, 10, 500,  "Type-C USB Cable"],
  ["Main Branch", "Electronics", "Cables",   "HDMI Cable", "HDMI-01", "pcs", 80,  149, 60,  5,  300,  "HDMI 2.0 cable"],
  ["Warehouse",   "Stationery",  "Writing",  "Ball Pen",   "BP-001",  "box", 20,  45,  200, 20, 1000, "Blue ball pen box of 10"],
];

function downloadTemplate() {
  const ws  = XLSX.utils.aoa_to_sheet(TEMPLATE_DATA);
  const wb  = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  XLSX.writeFile(wb, "inventry_import_template.xlsx");
}

function normaliseRow(raw) {
  // Accept both "Branch Name" and "branch_name" style headers
  const row = {};
  Object.entries(raw).forEach(([k, v]) => {
    const key = k.trim().toLowerCase().replace(/\s+/g, "_");
    row[key] = v === undefined || v === null ? "" : String(v).trim();
  });
  return row;
}

function validateRow(row, idx) {
  const errors = [];
  if (!row.branch)   errors.push("Branch is required");
  if (!row.category) errors.push("Category is required");
  if (!row.name)     errors.push("Product name is required");
  if (row.cost_price    && isNaN(Number(row.cost_price)))    errors.push("Cost price must be a number");
  if (row.selling_price && isNaN(Number(row.selling_price))) errors.push("Selling price must be a number");
  if (row.stock         && isNaN(Number(row.stock)))         errors.push("Stock must be a number");
  return errors;
}

export default function ImportData() {
  const { loadAll }   = useApp();
  const toast         = useToast();
  const fileRef       = useRef();

  const [rows,     setRows]     = useState([]);   // parsed preview rows
  const [rowErrs,  setRowErrs]  = useState({});   // { rowIndex: [errStr] }
  const [fileName, setFileName] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null); // import result from API
  const [dragOver, setDragOver] = useState(false);

  const parseFile = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      toast.error("Please upload an .xlsx, .xls or .csv file.");
      return;
    }
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const wb    = XLSX.read(e.target.result, { type: "binary" });
      const ws    = wb.Sheets[wb.SheetNames[0]];
      const data  = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const normalised = data.map(normaliseRow);
      const errs = {};
      normalised.forEach((row, i) => {
        const e = validateRow(row, i);
        if (e.length) errs[i] = e;
      });

      setRows(normalised);
      setRowErrs(errs);
    };
    reader.readAsBinaryString(file);
  };

  const onFileChange = (e) => parseFile(e.target.files[0]);
  const onDrop       = (e) => {
    e.preventDefault(); setDragOver(false);
    parseFile(e.dataTransfer.files[0]);
  };

  const clearFile = () => {
    setRows([]); setRowErrs({}); setFileName(""); setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    const invalidCount = Object.keys(rowErrs).length;
    if (invalidCount) {
      toast.error(`Fix ${invalidCount} row error${invalidCount > 1 ? "s" : ""} before importing.`);
      return;
    }
    setLoading(true);
    try {
      const res = await importApi.products(rows);
      setResult(res);
      await loadAll();
      toast.success(res.message || "Import complete.");
    } catch (err) {
      toast.error(err.message || "Import failed.");
    } finally {
      setLoading(false);
    }
  };

  const hasErrors   = Object.keys(rowErrs).length > 0;
  const validCount  = rows.length - Object.keys(rowErrs).length;

  return (
    <div className="import-page">
      <div className="import-header">
        <div>
          <h1 className="import-title">Import Products</h1>
          <p className="import-sub">Upload an Excel or CSV file to bulk-import products. Missing branches and categories are created automatically.</p>
        </div>
        <button className="btn-template" onClick={downloadTemplate}>
          <Download size={15} /> Download Template
        </button>
      </div>

      {/* Drop zone */}
      {!rows.length && (
        <div
          className={`import-dropzone${dragOver ? " import-dropzone-active" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={onFileChange} />
          <FileSpreadsheet size={40} className="dropzone-icon" />
          <p className="dropzone-title">Drop your Excel file here</p>
          <p className="dropzone-sub">or click to browse — supports .xlsx, .xls, .csv</p>
        </div>
      )}

      {/* Column guide */}
      {!rows.length && (
        <div className="col-guide">
          <p className="col-guide-title">Expected columns</p>
          <div className="col-guide-list">
            {REQUIRED_COLS.map(c => <span key={c} className="col-badge col-required">{c} *</span>)}
            {OPTIONAL_COLS.map(c => <span key={c} className="col-badge col-optional">{c}</span>)}
          </div>
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <>
          <div className="preview-toolbar">
            <div className="preview-info">
              <FileSpreadsheet size={16} />
              <span className="preview-filename">{fileName}</span>
              <span className="preview-count">{rows.length} rows</span>
              {hasErrors
                ? <span className="preview-err-badge"><AlertCircle size={13} /> {Object.keys(rowErrs).length} errors</span>
                : <span className="preview-ok-badge"><CheckCircle size={13} /> All rows valid</span>
              }
            </div>
            <button className="btn-clear" onClick={clearFile}><X size={14} /> Clear</button>
          </div>

          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>#</th>
                  {ALL_COLS.map(c => <th key={c}>{c}</th>)}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={rowErrs[i] ? "row-err" : ""}>
                    <td className="row-num">{i + 2}</td>
                    {ALL_COLS.map(c => (
                      <td key={c} className={!row[c] && REQUIRED_COLS.includes(c) ? "cell-missing" : ""}>
                        {row[c] || <span className="cell-empty">—</span>}
                      </td>
                    ))}
                    <td>
                      {rowErrs[i]
                        ? <span className="status-err" title={rowErrs[i].join("; ")}><AlertCircle size={14} /> {rowErrs[i][0]}</span>
                        : <span className="status-ok"><CheckCircle size={14} /> OK</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!result && (
            <div className="import-actions">
              <span className="import-ready">
                {hasErrors
                  ? `${validCount} of ${rows.length} rows ready — fix errors to import all`
                  : `${rows.length} rows ready to import`}
              </span>
              <button className="btn-import" onClick={submit} disabled={loading || hasErrors}>
                {loading
                  ? <><span className="btn-spinner" /> Importing…</>
                  : <><Upload size={15} /> Import {validCount} rows</>
                }
              </button>
            </div>
          )}
        </>
      )}

      {/* Result summary */}
      {result && (
        <div className="import-result">
          <div className="result-header">
            <CheckCircle size={22} className="result-icon" />
            <span className="result-title">Import complete</span>
          </div>
          <div className="result-stats">
            <div className="stat-card stat-inserted"><span className="stat-val">{result.inserted}</span><span className="stat-lbl">Inserted</span></div>
            <div className="stat-card stat-updated"><span className="stat-val">{result.updated}</span><span className="stat-lbl">Updated</span></div>
            <div className="stat-card stat-errors"><span className="stat-val">{result.errors?.length ?? 0}</span><span className="stat-lbl">Skipped</span></div>
          </div>
          {result.errors?.length > 0 && (
            <ul className="result-errors">
              {result.errors.map((e, i) => <li key={i}><AlertCircle size={13} /> {e}</li>)}
            </ul>
          )}
          <button className="btn-template" onClick={clearFile} style={{ marginTop: 16 }}>
            <Upload size={14} /> Import another file
          </button>
        </div>
      )}
    </div>
  );
}
