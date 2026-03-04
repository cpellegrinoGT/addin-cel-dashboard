import { NOT_REPORTING_DAYS } from "./constants.js";
import {
  isCelFault,
  getDiagnosticInfo,
  getFailureModeInfo,
  formatSeverity,
  enrichDtcRow,
} from "./diagnosticUtils.js";

export function buildDtcRows(faults, devices, allDevices, diagnosticMap, failureModeMap, celDiagnosticIds) {
  const nameMap = {};
  allDevices.forEach((d) => {
    nameMap[d.id] = d.name || d.id;
  });

  const deviceSet = {};
  devices.forEach((d) => {
    deviceSet[d.id] = true;
  });

  const filtered = faults.filter((f) => {
    const did = f.device ? f.device.id : null;
    return did && deviceSet[did];
  });

  const occMap = {};
  filtered.forEach((f) => {
    const did = f.device.id;
    const diag = getDiagnosticInfo(f, diagnosticMap);
    const code = diag.code ? diag.code.toString() : "--";
    const key = did + "|" + code;
    occMap[key] = (occMap[key] || 0) + 1;
  });

  return filtered.map((f) => {
    const did = f.device.id;
    const diag = getDiagnosticInfo(f, diagnosticMap);
    const fm = getFailureModeInfo(f, failureModeMap);
    const code = diag.code ? diag.code.toString() : "--";
    const key = did + "|" + code;

    let state = "Active";
    if (f.state === 2 || f.state === "Pending") state = "Pending";
    else if (f.state === 0 || f.state === "Cleared" || f.state === "Inactive") state = "Cleared";

    const row = {
      date: f.dateTime,
      deviceId: did,
      unit: nameMap[did] || did,
      code,
      description: diag.name || "--",
      state,
      severity: formatSeverity(f),
      faultClass: diag.source || "--",
      controller: f.controller
        ? f.controller.name || f.controller.id || "--"
        : "--",
      effect: fm.effectOnComponent || "--",
      action: fm.recommendedAction || "--",
      count: occMap[key] || 1,
    };

    return enrichDtcRow(row, f);
  });
}

export function buildUnitRows(devices, celData, deviceGroupNames, vinCache, deviceStatusMap, allFaults, diagnosticMap, celDiagnosticIds) {
  return devices.map((dev) => {
    const vi = vinCache[dev.id] || { year: "--", make: "--", engine: "--" };
    const celPct = celData.deviceCelPct[dev.id] || 0;
    const status = deviceStatusMap[dev.id];
    const lastReported = status
      ? status.dateTime || status.lastCommunication
      : null;

    let activeDtcs = 0;
    const dtcCodes = {};
    let repeatDtcs = 0;
    allFaults.forEach((f) => {
      if (f.device && f.device.id === dev.id) {
        const diag = getDiagnosticInfo(f, diagnosticMap);
        const code = diag.code ? diag.code.toString() : "--";
        if (isCelFault(f, celDiagnosticIds)) activeDtcs++;
        dtcCodes[code] = (dtcCodes[code] || 0) + 1;
      }
    });
    Object.values(dtcCodes).forEach((c) => {
      if (c > 1) repeatDtcs++;
    });

    return {
      id: dev.id,
      name: dev.name || dev.id,
      groups: deviceGroupNames[dev.id] || "--",
      year: vi.year,
      make: vi.make,
      engine: vi.engine,
      celPct,
      activeDtcs,
      repeatDtcs,
      lastReported,
    };
  });
}

export function buildCommRows(devices, deviceGroupNames, deviceStatusMap) {
  const now = new Date();

  return devices.map((dev) => {
    const status = deviceStatusMap[dev.id];
    const lastComm = status
      ? status.dateTime || status.lastCommunication || null
      : null;
    let daysSince = 0;
    let isDriving = false;

    if (lastComm) {
      daysSince = Math.floor(
        (now.getTime() - new Date(lastComm).getTime()) / 86400000
      );
    }

    if (status && status.isDriving !== undefined) {
      isDriving = status.isDriving;
    }

    const reportingStatus =
      daysSince <= NOT_REPORTING_DAYS ? "Reporting" : "Not Reporting";

    return {
      id: dev.id,
      name: dev.name || dev.id,
      groups: deviceGroupNames[dev.id] || "--",
      lastComm,
      daysSince,
      status: reportingStatus,
      driving: isDriving ? "Yes" : "No",
    };
  });
}
