export function goToDevice(deviceId) {
  const hash = "#device,id:" + deviceId;
  window.top.location.hash = hash;
}

export function goToFaults(deviceId, dateRange, presetLabel) {
  const label = presetLabel || "Last 7 Days";
  const hash =
    "#faults,dateRange:(from:'" +
    dateRange.from +
    "',label:'" +
    label +
    "',to:'" +
    dateRange.to +
    "'),faultAssets:!(" +
    deviceId +
    ")";
  window.top.location.hash = hash;
}
