import { useState, useMemo, useCallback } from "react";
import { formatDate, formatPct } from "../../lib/dateUtils.js";
import { goToFaults } from "../../lib/navigation.js";
import { exportCsv } from "../../lib/exportCsv.js";

function sortRows(rows, col, dir) {
  const d = dir === "asc" ? 1 : -1;
  return rows.slice().sort((a, b) => {
    let va = a[col], vb = b[col];
    if (va == null) va = "";
    if (vb == null) vb = "";
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * d;
    return String(va).localeCompare(String(vb)) * d;
  });
}

export default function UnitPanel({ unitRows, dateRange, preset }) {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("celPct");
  const [sortDir, setSortDir] = useState("desc");

  const filtered = useMemo(() => {
    let rows = unitRows;
    if (search) {
      const lower = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.groups.toLowerCase().includes(lower) ||
          String(r.make).toLowerCase().includes(lower)
      );
    }
    return sortRows(rows, sortCol, sortDir);
  }, [unitRows, search, sortCol, sortDir]);

  const handleSort = useCallback(
    (col) => {
      if (sortCol === col) {
        setSortDir(sortDir === "asc" ? "desc" : "asc");
      } else {
        setSortCol(col);
        setSortDir("asc");
      }
    },
    [sortCol, sortDir]
  );

  const sortArrow = (col) => {
    if (sortCol !== col) return "";
    return sortDir === "asc" ? " \u25B2" : " \u25BC";
  };

  const handleExport = () => {
    const headers = ["name", "groups", "year", "make", "engine", "celPct", "activeDtcs", "repeatDtcs", "lastReported"];
    exportCsv("cel_unit_detail.csv", headers, unitRows);
  };

  const handleUnitClick = (e, deviceId) => {
    e.preventDefault();
    const labels = { yesterday: "Yesterday", "7days": "Last 7 Days", "30days": "Last 30 Days", custom: "Custom" };
    goToFaults(deviceId, dateRange, labels[preset] || "Last 7 Days");
  };

  return (
    <div className="cel-panel active" id="cel-panel-unit">
      <div className="cel-panel-toolbar">
        <div className="cel-control-group">
          <label htmlFor="cel-unit-search">Search</label>
          <input
            type="text"
            id="cel-unit-search"
            placeholder="Search units..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="cel-control-group">
          <button className="cel-export-btn" onClick={handleExport}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="cel-table-wrapper">
        <table className="cel-table" id="cel-unit-table">
          <thead>
            <tr>
              {[
                { col: "name", label: "Name" },
                { col: "groups", label: "Groups" },
                { col: "year", label: "Year" },
                { col: "make", label: "Make" },
                { col: "engine", label: "Engine", sortable: false },
                { col: "celPct", label: "CEL%" },
                { col: "activeDtcs", label: "Active DTCs" },
                { col: "repeatDtcs", label: "Repeat DTCs" },
                { col: "lastReported", label: "Last Reported" },
              ].map((h) => {
                const sortable = h.sortable !== false;
                return (
                  <th
                    key={h.col}
                    className={sortable ? "cel-sortable" : ""}
                    onClick={sortable ? () => handleSort(h.col) : undefined}
                  >
                    {h.label}
                    {sortable && <span className="cel-sort-arrow">{sortArrow(h.col)}</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <a href="#" className="cel-unit-link" onClick={(e) => handleUnitClick(e, r.id)}>
                    {r.name}
                  </a>
                </td>
                <td>{r.groups}</td>
                <td>{String(r.year)}</td>
                <td>{r.make}</td>
                <td>{r.engine}</td>
                <td>{formatPct(r.celPct)}</td>
                <td>{r.activeDtcs}</td>
                <td>{r.repeatDtcs}</td>
                <td>{formatDate(r.lastReported)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
