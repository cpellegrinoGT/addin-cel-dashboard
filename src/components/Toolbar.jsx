import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { getUniqueYears, getUniqueMakes } from "../lib/vinUtils.js";

const PRESETS = [
  { key: "yesterday", label: "Yesterday" },
  { key: "7days", label: "Last 7 Days" },
  { key: "30days", label: "Last 30 Days" },
  { key: "custom", label: "Custom" },
];

function MultiSelectDropdown({ label, items, selectedIds, onChange, idKey = "id", labelKey = "name" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return items;
    const lower = search.toLowerCase();
    return items.filter((item) => (item[labelKey] || "").toLowerCase().includes(lower));
  }, [items, search, labelKey]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggle = useCallback(
    (id) => {
      if (selectedSet.has(id)) {
        onChange(selectedIds.filter((v) => v !== id));
      } else {
        onChange([...selectedIds, id]);
      }
    },
    [selectedIds, selectedSet, onChange]
  );

  const selectedLabels = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      map[item[idKey]] = item[labelKey] || item[idKey];
    });
    return selectedIds.map((id) => ({ id, label: map[id] || id }));
  }, [items, selectedIds, idKey, labelKey]);

  return (
    <div className="cel-control-group cel-multiselect" ref={ref}>
      <label>{label}</label>
      <div className="cel-multiselect-trigger" onClick={() => setOpen(!open)}>
        {selectedIds.length === 0 ? (
          <span className="cel-multiselect-placeholder">All {label}</span>
        ) : (
          <span className="cel-multiselect-count">{selectedIds.length} selected</span>
        )}
        <span className="cel-multiselect-arrow">{open ? "\u25B2" : "\u25BC"}</span>
      </div>

      {selectedLabels.length > 0 && (
        <div className="cel-pills">
          {selectedLabels.map(({ id, label: lbl }) => (
            <span key={id} className="cel-pill">
              {lbl}
              <button
                className="cel-pill-x"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(id);
                }}
              >
                &times;
              </button>
            </span>
          ))}
          <button
            className="cel-pill-clear"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
          >
            Clear All
          </button>
        </div>
      )}

      {open && (
        <div className="cel-multiselect-dropdown">
          <input
            type="text"
            className="cel-multiselect-search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="cel-multiselect-list">
            {filtered.map((item) => {
              const id = item[idKey];
              return (
                <label key={id} className="cel-multiselect-item">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(id)}
                    onChange={() => toggle(id)}
                  />
                  <span>{item[labelKey] || id}</span>
                </label>
              );
            })}
            {filtered.length === 0 && <div className="cel-multiselect-empty">No matches</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Toolbar({
  preset,
  fromDate,
  toDate,
  selectedGroupIds,
  selectedVehicleIds,
  year,
  make,
  groups,
  vehicles,
  vinCache,
  deviceCount,
  onFilterChange,
  onApply,
}) {
  const years = useMemo(() => getUniqueYears(vinCache || {}), [vinCache]);
  const makes = useMemo(() => getUniqueMakes(vinCache || {}), [vinCache]);

  return (
    <div id="cel-toolbar">
      <div className="cel-control-group">
        <label>Timeframe</label>
        <div className="cel-presets">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              className={"cel-preset" + (preset === p.key ? " active" : "")}
              onClick={() => onFilterChange("preset", p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {preset === "custom" && (
        <div className="cel-control-group" id="cel-custom-dates">
          <label htmlFor="cel-from">From</label>
          <input
            type="date"
            id="cel-from"
            value={fromDate}
            onChange={(e) => onFilterChange("fromDate", e.target.value)}
          />
          <label htmlFor="cel-to">To</label>
          <input
            type="date"
            id="cel-to"
            value={toDate}
            onChange={(e) => onFilterChange("toDate", e.target.value)}
          />
        </div>
      )}

      <MultiSelectDropdown
        label="Groups"
        items={groups}
        selectedIds={selectedGroupIds}
        onChange={(val) => onFilterChange("selectedGroupIds", val)}
      />

      <MultiSelectDropdown
        label="Vehicles"
        items={vehicles}
        selectedIds={selectedVehicleIds}
        onChange={(val) => onFilterChange("selectedVehicleIds", val)}
      />

      <div className="cel-control-group">
        <label htmlFor="cel-year">Year</label>
        <select
          id="cel-year"
          value={year}
          onChange={(e) => onFilterChange("year", e.target.value)}
        >
          <option value="all">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="cel-control-group">
        <label htmlFor="cel-make">Make</label>
        <select
          id="cel-make"
          value={make}
          onChange={(e) => onFilterChange("make", e.target.value)}
        >
          <option value="all">All Makes</option>
          {makes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="cel-control-group">
        <button id="cel-apply" onClick={onApply}>
          Apply
        </button>
      </div>

      <div className="cel-control-group">
        <span id="cel-progress">
          {deviceCount > 0 ? deviceCount + " vehicles selected" : ""}
        </span>
      </div>
    </div>
  );
}
