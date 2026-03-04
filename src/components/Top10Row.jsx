import { useMemo } from "react";
import { formatPct } from "../lib/dateUtils.js";
import { getDiagnosticInfo } from "../lib/diagnosticUtils.js";

function SmallTable({ title, columns, rows }) {
  return (
    <div className="cel-top10-card">
      <h3>{title}</h3>
      <table className="cel-table cel-table-small">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center", color: "#888" }}>
                No data
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function Top10Row({ celData, devices, allDevices }) {
  const { topCel, topDtc, topRecurring } = useMemo(() => {
    if (!celData) return { topCel: [], topDtc: [], topRecurring: [] };

    console.log("[CEL Top10] celData keys:", Object.keys(celData));
    console.log("[CEL Top10] devices:", devices?.length, "allDevices:", allDevices?.length);
    console.log("[CEL Top10] allFaults:", (celData.allFaults || []).length);
    console.log("[CEL Top10] deviceDrivenDays sample:", Object.entries(celData.deviceDrivenDays || {}).slice(0, 3));
    console.log("[CEL Top10] diagnosticMap keys:", Object.keys(celData.diagnosticMap || {}).length);

    const diagMap = celData.diagnosticMap || {};
    const deviceSet = {};
    devices.forEach((d) => {
      deviceSet[d.id] = true;
    });

    // Top CEL%
    const celArr = [];
    devices.forEach((d) => {
      if (celData.deviceDrivenDays[d.id] > 0) {
        celArr.push({ name: d.name || d.id, pct: celData.deviceCelPct[d.id] || 0 });
      }
    });
    celArr.sort((a, b) => b.pct - a.pct);
    const topCel = celArr.slice(0, 10).map((r) => [r.name, formatPct(r.pct)]);

    // Top DTC count
    const nameMap = {};
    allDevices.forEach((d) => {
      nameMap[d.id] = d.name || d.id;
    });
    const dtcCount = {};
    (celData.allFaults || []).forEach((f) => {
      const did = f.device?.id;
      if (!did || !deviceSet[did]) return;
      dtcCount[did] = (dtcCount[did] || 0) + 1;
    });
    const dtcArr = Object.entries(dtcCount)
      .map(([did, count]) => ({ name: nameMap[did] || did, count }))
      .sort((a, b) => b.count - a.count);
    const topDtc = dtcArr.slice(0, 10).map((r) => [r.name, String(r.count)]);

    // Top recurring faults — use diagnosticMap for code/name lookup
    const codeCount = {};
    const codeNames = {};
    (celData.allFaults || []).forEach((f) => {
      const did = f.device?.id;
      if (!did || !deviceSet[did]) return;
      const diag = getDiagnosticInfo(f, diagMap);
      const code = diag.code ? diag.code.toString() : "--";
      codeCount[code] = (codeCount[code] || 0) + 1;
      if (!codeNames[code] && diag.name && diag.name !== "--") {
        codeNames[code] = diag.name;
      }
    });
    const codeArr = Object.entries(codeCount)
      .map(([code, count]) => ({
        code: codeNames[code] ? code + " - " + codeNames[code] : code,
        count,
      }))
      .sort((a, b) => b.count - a.count);
    const topRecurring = codeArr.slice(0, 10).map((r) => [r.code, String(r.count)]);

    return { topCel, topDtc, topRecurring };
  }, [celData, devices, allDevices]);

  return (
    <div className="cel-top10-row">
      <SmallTable title="Highest CEL%" columns={["Unit", "CEL%"]} rows={topCel} />
      <SmallTable title="Highest DTC Count" columns={["Unit", "DTCs"]} rows={topDtc} />
      <SmallTable title="Most Recurring Faults" columns={["DTC Code", "Count"]} rows={topRecurring} />
    </div>
  );
}
