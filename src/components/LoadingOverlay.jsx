export default function LoadingOverlay({ visible, text, progress }) {
  if (!visible) return null;

  return (
    <div id="cel-loading" style={{ display: "flex" }}>
      <div className="cel-spinner" />
      <span id="cel-loading-text">{text || "Loading data\u2026"}</span>
      <div className="cel-progress-bar-wrap">
        <div
          className="cel-progress-bar"
          style={{ width: Math.min(100, Math.round(progress || 0)) + "%" }}
        />
      </div>
    </div>
  );
}
