import { useState, useMemo, useCallback } from "react";
import { formatDate } from "../../lib/dateUtils.js";
import { goToDevice } from "../../lib/navigation.js";
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

export default function CommPanel({ commRows }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("daysSince");
  const [sortDir, setSortDir] = useState("desc");

  const filtered = useMemo(() => {
    let rows = commRows;
    if (statusFilter !== "all") {
      rows = rows.filter((r) => {
        if (statusFilter === "reporting") return r.status === "Reporting";
        return r.status === "Not Reporting";
      });
    }
    if (search) {
      const lower = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) || r.groups.toLowerCase().includes(lower)
      );
    }
    return sortRows(rows, sortCol, sortDir);
  }, [commRows, statusFilter, search, sortCol, sortDir]);

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
    const headers = ["name", "groups", "lastComm", "daysSince", "status", "driving"];
    exportCsv("cel_asset_status.csv", headers, commRows);
  };

  const handleUnitClick = (e, deviceId) => {
    e.preventDefault();
    goToDevice(deviceId);
  };

  return (
    <div className="cel-panel active" id="cel-panel-comm">
      <div className="cel-panel-toolbar">
        <div className="cel-control-group">
          <label htmlFor="cel-comm-status">Status</label>
          <select
            id="cel-comm-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="reporting">Reporting</option>
            <option value="not-reporting">Not Reporting</option>
          </select>
        </div>
        <div className="cel-control-group">
          <label htmlFor="cel-comm-search">Search</label>
          <input
            type="text"
            id="cel-comm-search"
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
        <table className="cel-table" id="cel-comm-table">
          <thead>
            <tr>
              {[
                { col: "name", label: "Name" },
                { col: "groups", label: "Groups" },
                { col: "lastComm", label: "Last Communication" },
                { col: "daysSince", label: "Days Since" },
                { col: "status", label: "Status" },
                { col: "driving", label: "Driving" },
              ].map((h) => (
                <th
                  key={h.col}
                  className="cel-sortable"
                  onClick={() => handleSort(h.col)}
                >
                  {h.label}
                  <span className="cel-sort-arrow">{sortArrow(h.col)}</span>
                </th>
              ))}
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
                <td>{formatDate(r.lastComm)}</td>
                <td>{r.daysSince}</td>
                <td>
                  <span
                    className={
                      r.status === "Reporting" ? "cel-status-reporting" : "cel-status-not-reporting"
                    }
                  >
                    {r.status}
                  </span>
                </td>
                <td>{r.driving}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
