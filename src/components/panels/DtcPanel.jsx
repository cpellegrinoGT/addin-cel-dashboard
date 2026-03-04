import { useState, useMemo, useCallback } from "react";
import { DTC_PAGE_SIZE } from "../../lib/constants.js";
import { formatDate } from "../../lib/dateUtils.js";
import { severityBadgeClass } from "../../lib/diagnosticUtils.js";
import { goToFaults } from "../../lib/navigation.js";

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

export default function DtcPanel({ dtcRows, dateRange, preset }) {
  const [stateFilter, setStateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let rows = dtcRows;
    if (stateFilter !== "all") {
      rows = rows.filter((r) => r.state === stateFilter);
    }
    if (categoryFilter !== "all") {
      rows = rows.filter((r) => {
        const desc = (r.description || "").toLowerCase();
        return desc.includes(categoryFilter);
      });
    }
    if (search) {
      const lower = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.code.toLowerCase().includes(lower) ||
          r.unit.toLowerCase().includes(lower) ||
          r.description.toLowerCase().includes(lower)
      );
    }
    return sortRows(rows, sortCol, sortDir);
  }, [dtcRows, stateFilter, categoryFilter, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / DTC_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * DTC_PAGE_SIZE;
  const pageRows = filtered.slice(startIdx, startIdx + DTC_PAGE_SIZE);

  const handleSort = useCallback(
    (col) => {
      if (sortCol === col) {
        setSortDir(sortDir === "asc" ? "desc" : "asc");
      } else {
        setSortCol(col);
        setSortDir("asc");
      }
      setPage(1);
    },
    [sortCol, sortDir]
  );

  const sortArrow = (col) => {
    if (sortCol !== col) return "";
    return sortDir === "asc" ? " \u25B2" : " \u25BC";
  };

  const handleUnitClick = (e, deviceId) => {
    e.preventDefault();
    const labels = { yesterday: "Yesterday", "7days": "Last 7 Days", "30days": "Last 30 Days", custom: "Custom" };
    goToFaults(deviceId, dateRange, labels[preset] || "Last 7 Days");
  };

  return (
    <div className="cel-panel active" id="cel-panel-dtc">
      <div className="cel-panel-toolbar">
        <div className="cel-control-group">
          <label htmlFor="cel-dtc-state">Fault State</label>
          <select
            id="cel-dtc-state"
            value={stateFilter}
            onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All States</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Cleared">Cleared</option>
          </select>
        </div>
        <div className="cel-control-group">
          <label htmlFor="cel-dtc-category">Category</label>
          <select
            id="cel-dtc-category"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All</option>
            <option value="engine">Engine</option>
            <option value="exhaust">Exhaust</option>
          </select>
        </div>
        <div className="cel-control-group">
          <label htmlFor="cel-dtc-search">Search</label>
          <input
            type="text"
            id="cel-dtc-search"
            placeholder="Search DTC codes or units..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="cel-table-wrapper">
        <table className="cel-table" id="cel-dtc-table">
          <thead>
            <tr>
              {[
                { col: "date", label: "Date", sortable: true },
                { col: "unit", label: "Unit", sortable: true },
                { col: "code", label: "DTC Code", sortable: true },
                { col: "description", label: "Description", sortable: false },
                { col: "state", label: "State", sortable: true },
                { col: "severity", label: "Severity", sortable: true },
                { col: "faultClass", label: "Class", sortable: true },
                { col: "controller", label: "ECU", sortable: false },
                { col: "effect", label: "Effect on Component", sortable: false },
                { col: "action", label: "Recommended Action", sortable: false },
                { col: "count", label: "Occurrences", sortable: true },
              ].map((h) => (
                <th
                  key={h.col}
                  data-col={h.col}
                  className={h.sortable ? "cel-sortable" : ""}
                  onClick={h.sortable ? () => handleSort(h.col) : undefined}
                >
                  {h.label}
                  {h.sortable && <span className="cel-sort-arrow">{sortArrow(h.col)}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={i}>
                <td>{formatDate(r.date)}</td>
                <td>
                  <a href="#" className="cel-unit-link" onClick={(e) => handleUnitClick(e, r.deviceId)}>
                    {r.unit}
                  </a>
                </td>
                <td>{r.code}</td>
                <td>{r.description}</td>
                <td>
                  <span className={"cel-state-" + r.state.toLowerCase()}>{r.state}</span>
                </td>
                <td>
                  <span className={"cel-badge " + severityBadgeClass(r.severity)}>{r.severity}</span>
                </td>
                <td>{r.faultClass}</td>
                <td>{r.controller}</td>
                <td>{r.effect}</td>
                <td>{r.action}</td>
                <td>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="cel-pagination">
          <button
            className="cel-page-btn"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            &laquo; Prev
          </button>
          <span className="cel-page-info">
            Showing {startIdx + 1}&ndash;{Math.min(startIdx + DTC_PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <button
            className="cel-page-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            Next &raquo;
          </button>
        </div>
      )}
    </div>
  );
}
