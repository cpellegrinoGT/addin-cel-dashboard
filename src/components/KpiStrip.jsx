import { useMemo } from "react";
import { formatPct } from "../lib/dateUtils.js";

export default function KpiStrip({ celData, devices }) {
  const kpis = useMemo(() => {
    if (!celData) return { currentPct: 0, periodPct: 0, priorDiff: null, activeCount: 0 };

    const vals = [];
    devices.forEach((d) => {
      if (celData.deviceDrivenDays[d.id] > 0) {
        vals.push(celData.deviceCelPct[d.id] || 0);
      }
    });

    const periodPct = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

    let activeCount = 0;
    devices.forEach((d) => {
      if ((celData.deviceCelDays[d.id] || 0) > 0) activeCount++;
    });

    const buckets = celData.trendBuckets || [];
    let currentPct = periodPct;
    let priorDiff = null;

    if (buckets.length >= 2) {
      const mid = Math.floor(buckets.length / 2);
      let priorSum = 0, priorCount = 0;
      let currentSum = 0, currentCount = 0;
      for (let i = 0; i < mid; i++) { priorSum += buckets[i].value; priorCount++; }
      for (let j = mid; j < buckets.length; j++) { currentSum += buckets[j].value; currentCount++; }
      const priorAvg = priorCount > 0 ? priorSum / priorCount : 0;
      const currentAvg = currentCount > 0 ? currentSum / currentCount : 0;
      priorDiff = currentAvg - priorAvg;
      currentPct = currentAvg;
    }

    return { currentPct, periodPct, priorDiff, activeCount };
  }, [celData, devices]);

  const priorClass =
    kpis.priorDiff != null
      ? kpis.priorDiff > 0
        ? "cel-kpi-value cel-trend-up"
        : kpis.priorDiff < 0
          ? "cel-kpi-value cel-trend-down"
          : "cel-kpi-value"
      : "cel-kpi-value";

  const priorText =
    kpis.priorDiff != null
      ? (kpis.priorDiff >= 0 ? "+" : "") + kpis.priorDiff.toFixed(1) + "%"
      : "--";

  return (
    <div id="cel-kpi-strip">
      <div className="cel-kpi-card">
        <div className="cel-kpi-label">Current CEL%</div>
        <div className="cel-kpi-value">{formatPct(kpis.currentPct)}</div>
      </div>
      <div className="cel-kpi-card">
        <div className="cel-kpi-label">Period CEL%</div>
        <div className="cel-kpi-value">{formatPct(kpis.periodPct)}</div>
      </div>
      <div className="cel-kpi-card">
        <div className="cel-kpi-label">vs Prior Period</div>
        <div className={priorClass}>{priorText}</div>
      </div>
      <div className="cel-kpi-card">
        <div className="cel-kpi-label">Vehicles w/ Active CEL</div>
        <div className="cel-kpi-value">{kpis.activeCount}</div>
      </div>
    </div>
  );
}
