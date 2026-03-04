import { dayKey, weekKey, monthKey } from "./dateUtils.js";

export function computeCelMetrics(devices, celFaults, trips) {
  const deviceCelPct = {};
  const deviceDrivenDays = {};
  const deviceCelDays = {};

  const celDaysByDevice = {};
  celFaults.forEach((f) => {
    const did = f.device ? f.device.id : null;
    if (!did) return;
    if (!celDaysByDevice[did]) celDaysByDevice[did] = {};
    celDaysByDevice[did][dayKey(f.dateTime)] = true;
  });

  devices.forEach((dev) => {
    const devTrips = trips[dev.id] || [];
    const driven = {};
    devTrips.forEach((trip) => {
      if (trip.start) driven[dayKey(trip.start)] = true;
      if (trip.stop) driven[dayKey(trip.stop)] = true;
    });

    const drivenCount = Object.keys(driven).length;
    deviceDrivenDays[dev.id] = drivenCount;

    const celDays = celDaysByDevice[dev.id] || {};
    let intersection = 0;
    Object.keys(driven).forEach((dk) => {
      if (celDays[dk]) intersection++;
    });

    deviceCelDays[dev.id] = intersection;
    deviceCelPct[dev.id] = drivenCount > 0 ? (intersection / drivenCount) * 100 : 0;
  });

  return { deviceCelPct, deviceDrivenDays, deviceCelDays };
}

export function computeFleetCelPct(deviceCelPct) {
  const vals = Object.values(deviceCelPct);
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function buildTrendBuckets(celFaults, trips, devices, granularity) {
  const allDays = {};
  const deviceSet = {};
  devices.forEach((d) => {
    deviceSet[d.id] = true;
  });

  const drivenByDay = {};
  devices.forEach((dev) => {
    const devTrips = trips[dev.id] || [];
    devTrips.forEach((trip) => {
      if (trip.start) {
        const dk = dayKey(trip.start);
        if (!drivenByDay[dk]) drivenByDay[dk] = {};
        drivenByDay[dk][dev.id] = true;
        allDays[dk] = true;
      }
    });
  });

  const celByDay = {};
  celFaults.forEach((f) => {
    const did = f.device ? f.device.id : null;
    if (!did || !deviceSet[did]) return;
    const dk = dayKey(f.dateTime);
    if (!celByDay[dk]) celByDay[dk] = {};
    celByDay[dk][did] = true;
    allDays[dk] = true;
  });

  let keyFn;
  if (granularity === "day") keyFn = (dk) => dk;
  else if (granularity === "week") keyFn = (dk) => weekKey(dk);
  else keyFn = (dk) => monthKey(dk);

  const buckets = {};
  Object.keys(allDays)
    .sort()
    .forEach((dk) => {
      const bk = keyFn(dk);
      if (!buckets[bk]) buckets[bk] = { totalDriven: 0, totalCelDriven: 0 };

      const driven = drivenByDay[dk] || {};
      const cel = celByDay[dk] || {};

      Object.keys(driven).forEach((did) => {
        buckets[bk].totalDriven++;
        if (cel[did]) buckets[bk].totalCelDriven++;
      });
    });

  const result = [];
  Object.keys(buckets)
    .sort()
    .forEach((bk) => {
      const b = buckets[bk];
      const pct = b.totalDriven > 0 ? (b.totalCelDriven / b.totalDriven) * 100 : 0;
      result.push({ label: bk, value: pct });
    });

  return result;
}
