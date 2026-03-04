const TABS = [
  { key: "trend", label: "CEL% Trend" },
  { key: "dtc", label: "DTC Diagnostic" },
  { key: "unit", label: "Unit Detail" },
  { key: "comm", label: "Asset Status" },
];

export default function TabBar({ activeTab, onTabChange }) {
  return (
    <div id="cel-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={"cel-tab" + (activeTab === tab.key ? " active" : "")}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
