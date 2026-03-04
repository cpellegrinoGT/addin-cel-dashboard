export function dayKey(d) {
  const dt = new Date(d);
  return (
    dt.getFullYear() +
    "-" +
    String(dt.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(dt.getDate()).padStart(2, "0")
  );
}

export function weekKey(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(dt.setDate(diff));
  return dayKey(monday);
}

export function monthKey(d) {
  const dt = new Date(d);
  return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0");
}

export function formatDate(d) {
  if (!d) return "--";
  const dt = new Date(d);
  return dt.getMonth() + 1 + "/" + dt.getDate() + "/" + dt.getFullYear();
}

export function formatPct(n) {
  if (n == null || isNaN(n)) return "--";
  return n.toFixed(1) + "%";
}

export function getDateRange(preset, fromDate, toDate) {
  const now = new Date();
  let from, to;

  to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (preset) {
    case "yesterday": {
      from = new Date(now);
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to = new Date(from);
      to.setHours(23, 59, 59);
      break;
    }
    case "7days": {
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case "custom": {
      from = fromDate
        ? new Date(fromDate + "T00:00:00")
        : new Date(now.getTime() - 30 * 86400000);
      to = toDate ? new Date(toDate + "T23:59:59") : to;
      break;
    }
    case "30days":
    default: {
      from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      break;
    }
  }

  return { from: from.toISOString(), to: to.toISOString() };
}

export function autoSelectGranularity(dateRange) {
  const fromMs = new Date(dateRange.from).getTime();
  const toMs = new Date(dateRange.to).getTime();
  const days = Math.round((toMs - fromMs) / 86400000);

  if (days <= 14) return "day";
  if (days <= 60) return "week";
  return "month";
}
