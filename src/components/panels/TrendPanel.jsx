import CelChart from "../CelChart.jsx";
import Top10Row from "../Top10Row.jsx";

const GRANULARITIES = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
];

export default function TrendPanel({ celData, devices, allDevices, granularity, onGranularityChange }) {
  return (
    <div className="cel-panel active" id="cel-panel-trend">
      <div className="cel-chart-controls">
        <div className="cel-granularity">
          {GRANULARITIES.map((g) => (
            <button
              key={g.key}
              className={"cel-gran-btn" + (granularity === g.key ? " active" : "")}
              onClick={() => onGranularityChange(g.key)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <CelChart buckets={celData?.trendBuckets || []} />

      <Top10Row celData={celData} devices={devices} allDevices={allDevices} />
    </div>
  );
}
