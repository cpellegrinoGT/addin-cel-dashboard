import { CEL_DIAGNOSTIC_NAMES } from "./constants.js";
import { getTelematicsFaultInfo } from "./telematicsFaults.js";

export function buildDiagnosticMaps(diagnostics, failureModes) {
  const diagnosticMap = {};
  const failureModeMap = {};
  const celDiagnosticIds = {};

  failureModes.forEach((fm) => {
    failureModeMap[fm.id] = {
      name: fm.name || "",
      description: fm.description || "",
      recommendedAction: fm.recommendedAction || "",
      effectOnComponent: fm.effectOnComponent || "",
    };
  });

  diagnostics.forEach((d) => {
    diagnosticMap[d.id] = {
      name: d.name || "",
      code: d.code || null,
      source: d.source ? d.source.name || d.source.id || "--" : "--",
    };
    const lowerName = (d.name || "").toLowerCase();
    for (let i = 0; i < CEL_DIAGNOSTIC_NAMES.length; i++) {
      if (lowerName === CEL_DIAGNOSTIC_NAMES[i].toLowerCase()) {
        celDiagnosticIds[d.id] = true;
        break;
      }
    }
  });

  return { diagnosticMap, failureModeMap, celDiagnosticIds };
}

export function isCelFault(fault, celDiagnosticIds) {
  if (!fault.diagnostic) return false;
  return celDiagnosticIds[fault.diagnostic.id] === true;
}

export function getDiagnosticInfo(fault, diagnosticMap) {
  if (!fault.diagnostic) return { name: "--", code: "--", source: "--" };
  const diag = diagnosticMap[fault.diagnostic.id];
  if (diag) return diag;
  return {
    name: fault.diagnostic.name || "--",
    code: fault.diagnostic.code || fault.diagnostic.id || "--",
    source:
      fault.diagnostic.source && fault.diagnostic.source.name
        ? fault.diagnostic.source.name
        : "--",
  };
}

export function getFailureModeInfo(fault, failureModeMap) {
  if (!fault.failureMode)
    return {
      name: "--",
      description: "--",
      recommendedAction: "--",
      effectOnComponent: "--",
    };
  const fm = failureModeMap[fault.failureMode.id];
  if (fm) return fm;
  return {
    name: fault.failureMode.name || "--",
    description: fault.failureMode.description || "--",
    recommendedAction: fault.failureMode.recommendedAction || "--",
    effectOnComponent: fault.failureMode.effectOnComponent || "--",
  };
}

export function formatSeverity(fault) {
  if (fault.severity != null && fault.severity !== "None") {
    const raw = String(fault.severity);
    return raw.replace(/([A-Z])/g, " $1").trim();
  }
  if (fault.redStopLamp === true) return "Red Stop Lamp";
  if (fault.malfunctionLamp === true) return "Malfunction Lamp";
  if (fault.amberWarningLamp === true) return "Amber Warning";
  if (fault.protectWarningLamp === true) return "Protect Warning";
  return "None";
}

export function severityBadgeClass(severity) {
  const lower = severity.toLowerCase();
  if (lower.indexOf("red") >= 0 || lower.indexOf("malfunction") >= 0)
    return "cel-badge-critical";
  if (
    lower.indexOf("amber") >= 0 ||
    lower.indexOf("warning") >= 0 ||
    lower.indexOf("protect") >= 0
  )
    return "cel-badge-warning";
  return "cel-badge-info";
}

export function enrichDtcRow(row, fault) {
  const { code, description } = row;
  const telRef = getTelematicsFaultInfo(code, description, fault);
  if (telRef) {
    if (row.severity === "None" || row.severity === "--")
      row.severity = telRef.severity;
    if (row.effect === "--") row.effect = telRef.effect;
    if (row.action === "--") row.action = telRef.action;
  }
  return row;
}
