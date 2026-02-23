/**
 * CEL Dashboard — MyGeotab Add-In
 *
 * Provides Check Engine Light percentage trends and DTC insights
 * for fleet vehicles using Geotab API fault/trip data and NHTSA
 * VIN decoding for make/year/engine metadata.
 */

geotab.addin.celDashboard = function () {
  "use strict";

  // ── Constants ──────────────────────────────────────────────────────────
  var MULTI_CALL_BATCH = 50;
  var FAULT_LIMIT = 50000;
  var NOT_REPORTING_DAYS = 3;

  // CEL diagnostic names to match
  var CEL_DIAGNOSTIC_NAMES = [
    "Vehicle warning light is on",
    "Low priority warning light is on"
  ];

  // Telematics device fault code reference (from Geotab support docs)
  // Key: "code|description" — updated monthly
  var TELEMATICS_FAULTS = {
    "128|Flash memory failure": { severity: "Critical", effect: "Hardware failure in flash memory", action: "Contact Geotab Support for device replacement" },
    "129|Internal clock stopped": { severity: "Critical", effect: "Device clock has stopped", action: "Verify provisioning completion; contact Support if persists" },
    "130|All power removed - device restarted": { severity: "Informational", effect: "Device lost and regained power", action: "Check for unexpected power disconnections or resets" },
    "131|Low voltage in power supply": { severity: "Warning", effect: "Power supply voltage is below threshold", action: "Check vehicle battery voltage and wiring connections" },
    "132|Firmware Update Applied Successfully": { severity: "Informational", effect: "Device firmware was updated", action: "No action required; expected behavior" },
    "133|Device restarted (internal watchdog)": { severity: "Informational", effect: "Internal watchdog triggered restart", action: "Monitor frequency; contact Support if recurring" },
    "134|Device restarted (internal reset)": { severity: "Informational", effect: "Internal reset occurred", action: "Verify power stability to device" },
    "135|Vehicle battery has low voltage": { severity: "Warning", effect: "Vehicle battery voltage is low", action: "Check voltage data in MyGeotab Measurements; test battery" },
    "136|Telematics device unplugged": { severity: "Informational", effect: "Device lost power connection", action: "Verify device is securely installed and plugged in" },
    "139|GPS quality poor": { severity: "Warning", effect: "GPS signal quality is degraded", action: "Check device placement; follow GPS troubleshooting steps" },
    "140|GPS module not responding": { severity: "Critical", effect: "GPS chipset not sending messages for 30+ seconds", action: "May indicate hardware failure; contact Support" },
    "145|GPS antenna unplugged": { severity: "Warning", effect: "GPS antenna disconnected", action: "Contact Support for device replacement" },
    "147|Problem communicating with engine - CAN mode failed": { severity: "Warning", effect: "Cannot communicate with engine ECU via CAN bus", action: "Verify device install and ensure it is secured properly" },
    "166|Collision limit for acceleration exceeded": { severity: "Warning", effect: "Possible collision or loose device connection", action: "Inspect vehicle for damage; verify device is securely mounted" },
    "168|Vehicle warning light is on": { severity: "Informational", effect: "Check engine or warning light illuminated", action: "Verify warning light on vehicle; consult mechanic" },
    "172|Excessive accelerometer events": { severity: "Warning", effect: "Accelerometer generating excessive events", action: "Verify device is securely installed with zip ties" },
    "174|Excessive accelerometer events over threshold": { severity: "Warning", effect: "IMU channel disabled due to excessive events", action: "Verify installation; device reset may be required" },
    "175|Low priority warning light on": { severity: "Informational", effect: "Low priority warning light illuminated", action: "Fault read from vehicle is low priority; monitor" },
    "197|Device disabled in MyAdmin": { severity: "Informational", effect: "Subscription suspended or terminated", action: "Activate rate plan in MyAdmin" },
    "265|Accelerometer disabled due to excessive data": { severity: "Warning", effect: "Accelerometer auto-disabled", action: "Verify device installation and proper mounting" },
    "281|Accelerometer calibration in progress": { severity: "Informational", effect: "Device calibrating accelerometer", action: "Drive with valid GPS and stable orientation to complete" },
    "282|CAN BUS disabled due to excessive errors": { severity: "Warning", effect: "CAN bus communication disabled", action: "Verify device installation; check harness connections" },
    "284|Accident log data disabled": { severity: "Informational", effect: "Excessive data threshold reached (300 logs/10 min)", action: "Verify device mounting; check for vibration sources" },
    "287|Excessive CAN BUS errors - listen only mode": { severity: "Warning", effect: "Device in listen-only mode; OBD-II data lost", action: "Verify install; may need harness swap or professional diagnosis" },
    "289|CAN BUS short detected": { severity: "Critical", effect: "Short circuit detected on CAN bus", action: "Remove device immediately; contact Support" },
    "290|Low voltage - device restarted": { severity: "Warning", effect: "Brown-out reset detected", action: "Check power supply and battery connections" },
    "292|Internal reset initiated": { severity: "Informational", effect: "Device brownout at ~7-8V", action: "Verify power stability to device" },
    "296|Internal stack error": { severity: "Informational", effect: "OS error logged internally", action: "Contact Geotab Support" },
    "297|RAM memory failure": { severity: "Critical", effect: "Hardware failure in RAM", action: "Contact Geotab Support for device replacement" },
    "298|GPS failure fault": { severity: "Critical", effect: "Failed GPS version retrieval", action: "Device may need replacement; contact Support" },
    "377|Device reset due to parameter change": { severity: "Informational", effect: "Manual reset after parameter updates", action: "No action required; expected behavior" },
    "449|Log data buffer overrun": { severity: "Warning", effect: "Potential data loss from buffer overflow", action: "Ensure good cellular coverage in operating area" },
    "461|Network communication fault codes detected": { severity: "Informational", effect: "U-code network fault detected", action: "May indicate harness issue; inspect wiring" },
    "462|GPS config retry fail": { severity: "Critical", effect: "Device not tracking correctly", action: "Device may need replacement; contact Support" },
    "463|IOX-Battery overcurrent condition": { severity: "Warning", effect: "IOX drawing excessive current", action: "Verify IOX installation; check current draw limits" },
    "466|Engine hours stale": { severity: "Informational", effect: "ECU not transmitting engine hours data", action: "Verify CAN bus communication; check ECU compatibility" },
    "477|Disabled due to production test firmware": { severity: "Informational", effect: "Device running test firmware", action: "Should resolve after provisioning; contact Support if persists" },
    "478|Variable length data logging disabled": { severity: "Informational", effect: "Excessive data threshold exceeded", action: "Monitor data volume; verify device installation" },
    "487|IOX power permanently disabled": { severity: "Critical", effect: "Power fault persisted ~22m45s", action: "Power cycle device to attempt recovery; contact Support" },
    "488|SWC chip failure": { severity: "Warning", effect: "Possible CAN transceiver hardware failure", action: "Contact Geotab Support for diagnosis" },
    "490|IOX-Battery power permanently disabled": { severity: "Critical", effect: "IOX power fault persisted ~3 minutes", action: "Power cycle device; contact Support if unresolved" },
    "491|SWC fuse blown": { severity: "Warning", effect: "SWC fuse blown or manufacturer-specific fault", action: "Inspect fuse; contact Support for guidance" },
    "614|Odometer source changed": { severity: "Informational", effect: "Odometer reporting source changed", action: "Verify odometer data accuracy in MyGeotab" },
    "615|Harsh Event data unavailable": { severity: "Warning", effect: "Excessive harsh events detected", action: "Verify device installation is secure" },
    "616|Collision data unavailable": { severity: "Warning", effect: "Excessive collision events detected", action: "May indicate loose installation; verify mounting" }
  };

  // Build a code-only index for telematics faults (for matching by code when controller is GO device)
  var TELEMATICS_FAULTS_BY_CODE = {};
  (function () {
    for (var k in TELEMATICS_FAULTS) {
      if (TELEMATICS_FAULTS.hasOwnProperty(k)) {
        var code = k.split("|")[0];
        TELEMATICS_FAULTS_BY_CODE[code] = TELEMATICS_FAULTS[k];
      }
    }
  })();

  function isGoDeviceController(fault) {
    if (!fault.controller) return false;
    var id = fault.controller.id || "";
    var name = (fault.controller.name || "").toLowerCase();
    return id === "ControllerGoDeviceId" || id === "ControllerNoneId" || name.indexOf("go") === 0 || name.indexOf("geotab") >= 0;
  }

  function getTelematicsFaultInfo(code, description, fault) {
    // Try exact match first (code + description)
    var key = code + "|" + description;
    if (TELEMATICS_FAULTS[key]) return TELEMATICS_FAULTS[key];
    // If controller is GO device, match by code alone
    if (fault && isGoDeviceController(fault) && TELEMATICS_FAULTS_BY_CODE[code]) {
      return TELEMATICS_FAULTS_BY_CODE[code];
    }
    return null;
  }

  // ── State ──────────────────────────────────────────────────────────────
  var api;
  var allDevices = [];
  var allGroups = {};
  var groupHierarchy = { regions: [], branches: {} }; // branches keyed by regionId
  var deviceStatusMap = {};
  var diagnosticMap = {}; // diagnosticId -> { name, code, source }
  var failureModeMap = {}; // failureModeId -> { name, description, ... }
  var celDiagnosticIds = {}; // set of diagnostic IDs that match CEL_DIAGNOSTIC_NAMES
  var vinCache = {};
  var deviceGroupMap = {}; // deviceId -> { region, branch }
  var pageState = null; // MyGeotab state object for page navigation
  var abortController = null;
  var firstFocus = true;
  var chartInstance = null;
  var activeTab = "trend";
  var currentGranularity = "month";

  // Computed data (populated on Apply)
  var celData = {
    deviceCelPct: {},      // deviceId -> celPct number
    deviceDrivenDays: {},  // deviceId -> count
    deviceCelDays: {},     // deviceId -> count
    trendBuckets: [],      // [{label, value}]
    dtcRows: [],           // raw DTC fault rows
    unitRows: [],          // per-device summary rows
    commRows: [],          // per-device comm rows
    celFaults: [],         // raw CEL faults
    allFaults: [],         // raw all faults
    trips: {}              // deviceId -> [trip]
  };

  // Cached date range for skip-re-fetch
  var lastFetchRange = null;

  // Sort state per table
  var sortState = {
    dtc: { col: "date", dir: "desc" },
    unit: { col: "celPct", dir: "desc" },
    comm: { col: "daysSince", dir: "desc" }
  };

  // ── DOM refs (set during initialize) ───────────────────────────────────
  var els = {};

  // ── Helpers ────────────────────────────────────────────────────────────

  function $(id) {
    return document.getElementById(id);
  }

  function dayKey(d) {
    var dt = new Date(d);
    return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  }

  function weekKey(d) {
    var dt = new Date(d);
    var day = dt.getDay();
    var diff = dt.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    var monday = new Date(dt.setDate(diff));
    return dayKey(monday);
  }

  function monthKey(d) {
    var dt = new Date(d);
    return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0");
  }

  function formatDate(d) {
    if (!d) return "--";
    var dt = new Date(d);
    return (dt.getMonth() + 1) + "/" + dt.getDate() + "/" + dt.getFullYear();
  }

  function formatPct(n) {
    if (n == null || isNaN(n)) return "--";
    return n.toFixed(1) + "%";
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function getDateRange() {
    var now = new Date();
    var preset = document.querySelector(".cel-preset.active");
    var key = preset ? preset.dataset.preset : "7days";
    var from, to;

    to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (key) {
      case "yesterday":
        from = new Date(now);
        from.setDate(from.getDate() - 1);
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setHours(23, 59, 59);
        break;
      case "7days":
        from = new Date(now);
        from.setDate(from.getDate() - 7);
        from.setHours(0, 0, 0, 0);
        break;
      case "custom":
        from = els.fromDate.value ? new Date(els.fromDate.value + "T00:00:00") : new Date(now.getTime() - 30 * 86400000);
        to = els.toDate.value ? new Date(els.toDate.value + "T23:59:59") : to;
        break;
      case "30days":
      default:
        from = new Date(now);
        from.setDate(from.getDate() - 30);
        from.setHours(0, 0, 0, 0);
        break;
    }

    return { from: from.toISOString(), to: to.toISOString() };
  }

  function isAborted() {
    return abortController && abortController.signal && abortController.signal.aborted;
  }

  function showLoading(show, text) {
    els.loading.style.display = show ? "flex" : "none";
    els.empty.style.display = "none";
    if (text) els.loadingText.textContent = text;
  }

  function showEmpty(show) {
    els.empty.style.display = show ? "flex" : "none";
  }

  function setProgress(pct) {
    els.progressBar.style.width = Math.min(100, Math.round(pct)) + "%";
  }

  function showWarning(msg) {
    els.warning.style.display = msg ? "block" : "none";
    els.warning.textContent = msg || "";
  }

  function unitLink(deviceId, name) {
    return '<a href="#" class="cel-unit-link" data-device-id="' + deviceId + '">' + escapeHtml(name) + '</a>';
  }

  function goToFaults(deviceId) {
    var dateRange = getDateRange();
    var preset = document.querySelector(".cel-preset.active");
    var label = preset ? preset.textContent : "Last 7 Days";
    var hash = "#faults,dateRange:(from:'" + dateRange.from + "',label:" + label + ",to:'" + dateRange.to + "'),faultAssets:!(" + deviceId + ")";
    window.top.location.hash = hash;
  }

  // ── API Helpers ────────────────────────────────────────────────────────

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function apiCall(method, params) {
    return new Promise(function (resolve, reject) {
      api.call(method, params, resolve, reject);
    });
  }

  function apiMultiCall(calls) {
    return new Promise(function (resolve, reject) {
      api.multiCall(calls, resolve, reject);
    });
  }

  /** multiCall with retry + exponential backoff on failure. */
  function apiMultiCallRetry(calls, maxRetries) {
    maxRetries = maxRetries || 3;
    var attempt = 0;
    function tryCall() {
      return apiMultiCall(calls).catch(function (err) {
        attempt++;
        if (attempt >= maxRetries) throw err;
        var wait = Math.min(1000 * Math.pow(2, attempt), 8000);
        console.warn("CEL Dashboard: multiCall failed (attempt " + attempt + "), retrying in " + wait + "ms", err);
        return delay(wait).then(tryCall);
      });
    }
    return tryCall();
  }

  // ── Group Hierarchy ────────────────────────────────────────────────────

  function buildGroupHierarchy(groups, userGroupFilter) {
    allGroups = {};
    groups.forEach(function (g) {
      allGroups[g.id] = g;
    });

    // Find root groups to walk from (user's group filter or CompanyGroup)
    var rootIds = [];
    if (userGroupFilter && userGroupFilter.length) {
      userGroupFilter.forEach(function (g) {
        rootIds.push(g.id || g);
      });
    } else {
      // Default: CompanyGroup
      groups.forEach(function (g) {
        if (g.name === "CompanyGroup" || g.id === "GroupCompanyId") {
          rootIds.push(g.id);
        }
      });
    }

    // Children map
    var childrenMap = {};
    groups.forEach(function (g) {
      if (g.parent && g.parent.id) {
        if (!childrenMap[g.parent.id]) childrenMap[g.parent.id] = [];
        childrenMap[g.parent.id].push(g);
      }
    });

    // Level 1 = regions, Level 2 = branches
    var regions = [];
    var branches = {};

    rootIds.forEach(function (rootId) {
      var level1 = childrenMap[rootId] || [];
      level1.forEach(function (reg) {
        regions.push(reg);
        branches[reg.id] = childrenMap[reg.id] || [];
      });
    });

    // Sort alphabetically
    regions.sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
    Object.keys(branches).forEach(function (rid) {
      branches[rid].sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
    });

    groupHierarchy = { regions: regions, branches: branches };
  }

  function mapDeviceGroups() {
    deviceGroupMap = {};
    allDevices.forEach(function (dev) {
      if (!dev.groups || !dev.groups.length) {
        deviceGroupMap[dev.id] = { region: "--", regionId: null, branch: "--", branchId: null };
        return;
      }

      var devGroupIds = {};
      dev.groups.forEach(function (g) { devGroupIds[g.id] = true; });

      var foundRegion = null, foundBranch = null;

      groupHierarchy.regions.forEach(function (reg) {
        // Check if device is directly in region
        if (devGroupIds[reg.id]) {
          foundRegion = reg;
        }
        // Check branches
        var brs = groupHierarchy.branches[reg.id] || [];
        brs.forEach(function (br) {
          if (devGroupIds[br.id]) {
            foundRegion = reg;
            foundBranch = br;
          }
        });
      });

      deviceGroupMap[dev.id] = {
        region: foundRegion ? foundRegion.name : "--",
        regionId: foundRegion ? foundRegion.id : null,
        branch: foundBranch ? foundBranch.name : "--",
        branchId: foundBranch ? foundBranch.id : null
      };
    });
  }

  function populateRegionDropdown() {
    var current = els.region.value;
    els.region.innerHTML = '<option value="all">All Regions</option>';
    groupHierarchy.regions.forEach(function (r) {
      var opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = r.name || r.id;
      els.region.appendChild(opt);
    });
    if (current && els.region.querySelector('option[value="' + current + '"]')) {
      els.region.value = current;
    }
  }

  function populateBranchDropdown(regionId) {
    var current = els.branch.value;
    els.branch.innerHTML = '<option value="all">All Branches</option>';
    if (regionId && regionId !== "all") {
      var brs = groupHierarchy.branches[regionId] || [];
      brs.forEach(function (b) {
        var opt = document.createElement("option");
        opt.value = b.id;
        opt.textContent = b.name || b.id;
        els.branch.appendChild(opt);
      });
    }
    if (current && els.branch.querySelector('option[value="' + current + '"]')) {
      els.branch.value = current;
    }
  }

  function populateVehicleDropdown() {
    var current = els.vehicle.value;
    els.vehicle.innerHTML = '<option value="all">All Vehicles</option>';
    var sorted = allDevices.slice().sort(function (a, b) {
      return (a.name || "").localeCompare(b.name || "");
    });
    sorted.forEach(function (d) {
      var opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.name || d.id;
      els.vehicle.appendChild(opt);
    });
    if (current && els.vehicle.querySelector('option[value="' + current + '"]')) {
      els.vehicle.value = current;
    }
  }

  // ── Vehicle Info (from MyGeotab Device entity) ─────────────────────────

  function buildDeviceInfoMap() {
    vinCache = {};
    allDevices.forEach(function (d) {
      vinCache[d.id] = {
        year: d.year || d.modelYear || "--",
        make: d.make || "--",
        vtype: d.vehicleType || d.deviceType || "--",
        engine: d.engineType || "--"
      };
    });
  }

  function populateVinDropdowns() {
    var years = {}, makes = {}, types = {};
    Object.keys(vinCache).forEach(function (did) {
      var v = vinCache[did];
      if (v.year && v.year !== "--") years[v.year] = true;
      if (v.make && v.make !== "--") makes[v.make] = true;
      if (v.vtype && v.vtype !== "--") types[v.vtype] = true;
    });

    populateFilterDropdown(els.year, years, "All Years");
    populateFilterDropdown(els.make, makes, "All Makes");
    populateFilterDropdown(els.vtype, types, "All Types");
  }

  function populateFilterDropdown(selectEl, valuesObj, allLabel) {
    var current = selectEl.value;
    selectEl.innerHTML = '<option value="all">' + allLabel + "</option>";
    var sorted = Object.keys(valuesObj).sort();
    sorted.forEach(function (v) {
      var opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    });
    if (current && selectEl.querySelector('option[value="' + current + '"]')) {
      selectEl.value = current;
    }
  }

  function getVinInfo(device) {
    return vinCache[device.id] || { year: "--", make: "--", vtype: "--", engine: "--" };
  }

  // ── Filtered Devices ───────────────────────────────────────────────────

  function filteredDevices() {
    var vehicleId = els.vehicle.value;
    var regionId = els.region.value;
    var branchId = els.branch.value;
    var year = els.year.value;
    var make = els.make.value;
    var vtype = els.vtype.value;

    // Single vehicle shortcut
    if (vehicleId !== "all") {
      return allDevices.filter(function (dev) { return dev.id === vehicleId; });
    }

    return allDevices.filter(function (dev) {
      var dg = deviceGroupMap[dev.id] || {};
      if (regionId !== "all" && dg.regionId !== regionId) return false;
      if (branchId !== "all" && dg.branchId !== branchId) return false;

      if (year !== "all" || make !== "all" || vtype !== "all") {
        var vi = getVinInfo(dev);
        if (year !== "all" && vi.year !== year) return false;
        if (make !== "all" && vi.make !== make) return false;
        if (vtype !== "all" && vi.vtype !== vtype) return false;
      }

      return true;
    });
  }

  // ── Data Fetch ─────────────────────────────────────────────────────────

  function fetchDiagnostics() {
    if (Object.keys(diagnosticMap).length > 0) return Promise.resolve();
    return Promise.all([
      apiCall("Get", { typeName: "Diagnostic", resultsLimit: 50000 }),
      apiCall("Get", { typeName: "FailureMode", resultsLimit: 50000 })
    ]).then(function (results) {
      var diagnostics = results[0] || [];
      var failureModes = results[1] || [];

      // Build failure mode lookup
      failureModes.forEach(function (fm) {
        failureModeMap[fm.id] = {
          name: fm.name || "",
          description: fm.description || "",
          recommendedAction: fm.recommendedAction || "",
          effectOnComponent: fm.effectOnComponent || ""
        };
      });

      // Build diagnostic lookup
      diagnostics.forEach(function (d) {
        diagnosticMap[d.id] = {
          name: d.name || "",
          code: d.code || null,
          source: d.source ? (d.source.name || d.source.id || "--") : "--"
        };
        // Check if this diagnostic matches our CEL names
        var lowerName = (d.name || "").toLowerCase();
        for (var i = 0; i < CEL_DIAGNOSTIC_NAMES.length; i++) {
          if (lowerName === CEL_DIAGNOSTIC_NAMES[i].toLowerCase()) {
            celDiagnosticIds[d.id] = true;
            break;
          }
        }
      });
    });
  }

  function isCelFault(fault) {
    if (!fault.diagnostic) return false;
    return celDiagnosticIds[fault.diagnostic.id] === true;
  }

  function getDiagnosticInfo(fault) {
    if (!fault.diagnostic) return { name: "--", code: "--", source: "--" };
    var diag = diagnosticMap[fault.diagnostic.id];
    if (diag) return diag;
    // Fallback to what's on the fault itself
    return {
      name: fault.diagnostic.name || "--",
      code: fault.diagnostic.code || fault.diagnostic.id || "--",
      source: (fault.diagnostic.source && fault.diagnostic.source.name) ? fault.diagnostic.source.name : "--"
    };
  }

  function getFailureModeInfo(fault) {
    if (!fault.failureMode) return { name: "--", description: "--", recommendedAction: "--", effectOnComponent: "--" };
    var fm = failureModeMap[fault.failureMode.id];
    if (fm) return fm;
    return {
      name: fault.failureMode.name || "--",
      description: fault.failureMode.description || "--",
      recommendedAction: fault.failureMode.recommendedAction || "--",
      effectOnComponent: fault.failureMode.effectOnComponent || "--"
    };
  }

  function formatSeverity(fault) {
    // Use the SDK's severity enum directly from the FaultData entity
    if (fault.severity != null && fault.severity !== "None") {
      // Clean up enum names for display (e.g. "MalfunctionIndicatorWarningLamp" -> "Malfunction Indicator Warning Lamp")
      var raw = String(fault.severity);
      return raw.replace(/([A-Z])/g, " $1").trim();
    }
    // Fallback to lamp flags
    if (fault.redStopLamp === true) return "Red Stop Lamp";
    if (fault.malfunctionLamp === true) return "Malfunction Lamp";
    if (fault.amberWarningLamp === true) return "Amber Warning";
    if (fault.protectWarningLamp === true) return "Protect Warning";
    return "None";
  }

  function severityBadgeClass(severity) {
    var lower = severity.toLowerCase();
    if (lower.indexOf("red") >= 0 || lower.indexOf("malfunction") >= 0) return "cel-badge-critical";
    if (lower.indexOf("amber") >= 0 || lower.indexOf("warning") >= 0 || lower.indexOf("protect") >= 0) return "cel-badge-warning";
    return "cel-badge-info";
  }

  function fetchCelFaults(dateRange, onProgress) {
    return fetchDiagnostics().then(function () {
      // Build targeted CEL queries — one per matching diagnostic ID
      var celIds = Object.keys(celDiagnosticIds);
      var celCalls = celIds.map(function (diagId) {
        return ["Get", {
          typeName: "FaultData",
          search: {
            fromDate: dateRange.from,
            toDate: dateRange.to,
            diagnosticSearch: { id: diagId }
          },
          resultsLimit: FAULT_LIMIT
        }];
      });

      // Fetch CEL faults via multiCall (small, targeted)
      var celPromise = celCalls.length > 0
        ? apiMultiCall(celCalls).then(function (results) {
            var merged = [];
            results.forEach(function (arr) {
              if (Array.isArray(arr)) merged = merged.concat(arr);
            });
            return merged;
          })
        : Promise.resolve([]);

      // OBD faults — time-chunked to avoid 50k limit
      var CHUNK_DAYS = 7;
      var fromMs = new Date(dateRange.from).getTime();
      var toMs = new Date(dateRange.to).getTime();
      var chunks = [];
      var cursor = fromMs;
      while (cursor < toMs) {
        var chunkEnd = Math.min(cursor + CHUNK_DAYS * 86400000, toMs);
        chunks.push({
          from: new Date(cursor).toISOString(),
          to: new Date(chunkEnd).toISOString()
        });
        cursor = chunkEnd;
      }

      var totalChunks = chunks.length;
      var completedChunks = 0;
      var obdFaults = [];

      var obdPromise = chunks.reduce(function (chain, chunk, chunkIdx) {
        return chain.then(function () {
          if (isAborted()) return;
          var pause = chunkIdx > 0 ? delay(300) : Promise.resolve();
          return pause.then(function () {
            if (isAborted()) return;
            return apiCall("Get", {
              typeName: "FaultData",
              search: {
                fromDate: chunk.from,
                toDate: chunk.to,
                diagnosticSearch: { diagnosticType: "ObdFault" }
              },
              resultsLimit: FAULT_LIMIT
            }).then(function (faults) {
              obdFaults = obdFaults.concat(faults);
              completedChunks++;
              if (onProgress) onProgress(completedChunks / totalChunks * 100);
            });
          });
        });
      }, Promise.resolve()).then(function () {
        return obdFaults;
      });

      return Promise.all([celPromise, obdPromise]);
    }).then(function (results) {
      var celFaults = results[0];
      var obdFaults = results[1];

      // Merge CEL faults into obdFaults if not already present (they may overlap)
      var obdIds = {};
      obdFaults.forEach(function (f) { if (f.id) obdIds[f.id] = true; });
      celFaults.forEach(function (f) {
        if (f.id && !obdIds[f.id]) obdFaults.push(f);
      });

      return { celFaults: celFaults, allFaults: obdFaults, hitLimit: false };
    });
  }

  function fetchTrips(devices, dateRange, onProgress) {
    // Fleet-level trip queries chunked by 7-day windows.
    // ~5 calls for 30 days, ~13 for 90 days (vs 33 batches of 50 per-device calls).
    var CHUNK_DAYS = 7;
    var TRIP_LIMIT = 50000;

    var fromMs = new Date(dateRange.from).getTime();
    var toMs = new Date(dateRange.to).getTime();
    var chunks = [];
    var cursor = fromMs;
    while (cursor < toMs) {
      var chunkEnd = Math.min(cursor + CHUNK_DAYS * 86400000, toMs);
      chunks.push({
        from: new Date(cursor).toISOString(),
        to: new Date(chunkEnd).toISOString()
      });
      cursor = chunkEnd;
    }

    // Build device ID set for filtering results
    var deviceSet = {};
    devices.forEach(function (d) { deviceSet[d.id] = true; });

    var totalChunks = chunks.length;
    var completedChunks = 0;
    var allTrips = {}; // deviceId -> [trip]

    return chunks.reduce(function (chain, chunk, chunkIdx) {
      return chain.then(function () {
        if (isAborted()) return;
        var pause = chunkIdx > 0 ? delay(300) : Promise.resolve();
        return pause.then(function () {
          if (isAborted()) return;
          return apiCall("Get", {
            typeName: "Trip",
            search: {
              fromDate: chunk.from,
              toDate: chunk.to
            },
            resultsLimit: TRIP_LIMIT
          }).then(function (trips) {
            trips.forEach(function (trip) {
              var did = trip.device ? trip.device.id : null;
              if (!did || !deviceSet[did]) return;
              if (!allTrips[did]) allTrips[did] = [];
              allTrips[did].push(trip);
            });
            completedChunks++;
            if (onProgress) onProgress(completedChunks / totalChunks * 100);
          });
        });
      });
    }, Promise.resolve()).then(function () {
      return allTrips;
    });
  }

  // ── CEL% Computation ──────────────────────────────────────────────────

  function computeCelMetrics(devices, celFaults, trips) {
    var deviceCelPct = {};
    var deviceDrivenDays = {};
    var deviceCelDays = {};

    // Build CEL days per device
    var celDaysByDevice = {};
    celFaults.forEach(function (f) {
      var did = f.device ? f.device.id : null;
      if (!did) return;
      if (!celDaysByDevice[did]) celDaysByDevice[did] = {};
      celDaysByDevice[did][dayKey(f.dateTime)] = true;
    });

    // Build driven days per device
    devices.forEach(function (dev) {
      var devTrips = trips[dev.id] || [];
      var driven = {};
      devTrips.forEach(function (trip) {
        if (trip.start) driven[dayKey(trip.start)] = true;
        if (trip.stop) driven[dayKey(trip.stop)] = true;
      });

      var drivenCount = Object.keys(driven).length;
      deviceDrivenDays[dev.id] = drivenCount;

      // Intersect driven days with CEL days
      var celDays = celDaysByDevice[dev.id] || {};
      var intersection = 0;
      Object.keys(driven).forEach(function (dk) {
        if (celDays[dk]) intersection++;
      });

      deviceCelDays[dev.id] = intersection;
      deviceCelPct[dev.id] = drivenCount > 0 ? (intersection / drivenCount * 100) : 0;
    });

    return {
      deviceCelPct: deviceCelPct,
      deviceDrivenDays: deviceDrivenDays,
      deviceCelDays: deviceCelDays
    };
  }

  function computeFleetCelPct(deviceCelPct) {
    var vals = [];
    Object.keys(deviceCelPct).forEach(function (did) {
      vals.push(deviceCelPct[did]);
    });
    if (vals.length === 0) return 0;
    var sum = 0;
    vals.forEach(function (v) { sum += v; });
    return sum / vals.length;
  }

  // ── Trend Buckets ─────────────────────────────────────────────────────

  function buildTrendBuckets(celFaults, trips, devices, granularity) {
    // Build a map of all device-days with driven status and CEL status
    var allDays = {};
    var deviceSet = {};
    devices.forEach(function (d) { deviceSet[d.id] = true; });

    // Driven days across all devices
    var drivenByDay = {};
    devices.forEach(function (dev) {
      var devTrips = trips[dev.id] || [];
      devTrips.forEach(function (trip) {
        if (trip.start) {
          var dk = dayKey(trip.start);
          if (!drivenByDay[dk]) drivenByDay[dk] = {};
          drivenByDay[dk][dev.id] = true;
          allDays[dk] = true;
        }
      });
    });

    // CEL days across all devices
    var celByDay = {};
    celFaults.forEach(function (f) {
      var did = f.device ? f.device.id : null;
      if (!did || !deviceSet[did]) return;
      var dk = dayKey(f.dateTime);
      if (!celByDay[dk]) celByDay[dk] = {};
      celByDay[dk][did] = true;
      allDays[dk] = true;
    });

    // Compute per-bucket
    var keyFn;
    if (granularity === "day") keyFn = function (dk) { return dk; };
    else if (granularity === "week") keyFn = function (dk) { return weekKey(dk); };
    else keyFn = function (dk) { return monthKey(dk); };

    var buckets = {};
    Object.keys(allDays).sort().forEach(function (dk) {
      var bk = keyFn(dk);
      if (!buckets[bk]) buckets[bk] = { totalDriven: 0, totalCelDriven: 0 };

      var driven = drivenByDay[dk] || {};
      var cel = celByDay[dk] || {};

      Object.keys(driven).forEach(function (did) {
        buckets[bk].totalDriven++;
        if (cel[did]) buckets[bk].totalCelDriven++;
      });
    });

    var result = [];
    Object.keys(buckets).sort().forEach(function (bk) {
      var b = buckets[bk];
      var pct = b.totalDriven > 0 ? (b.totalCelDriven / b.totalDriven * 100) : 0;
      result.push({ label: bk, value: pct });
    });

    return result;
  }

  // ── Build Rows ────────────────────────────────────────────────────────

  function buildDtcRows(faults, devices) {
    // Full device name lookup (all devices, not just filtered)
    var nameMap = {};
    allDevices.forEach(function (d) { nameMap[d.id] = d.name || d.id; });

    // Filter faults to only devices in the filtered set
    var deviceSet = {};
    devices.forEach(function (d) { deviceSet[d.id] = true; });

    var filtered = faults.filter(function (f) {
      var did = f.device ? f.device.id : null;
      return did && deviceSet[did];
    });

    // Count occurrences per device+code
    var occMap = {};
    filtered.forEach(function (f) {
      var did = f.device.id;
      var diag = getDiagnosticInfo(f);
      var code = diag.code ? diag.code.toString() : "--";
      var key = did + "|" + code;
      occMap[key] = (occMap[key] || 0) + 1;
    });

    return filtered.map(function (f) {
      var did = f.device.id;
      var diag = getDiagnosticInfo(f);
      var fm = getFailureModeInfo(f);
      var code = diag.code ? diag.code.toString() : "--";
      var key = did + "|" + code;

      var state = "Active";
      if (f.state === 2 || f.state === "Pending") state = "Pending";
      else if (f.state === 0 || f.state === "Cleared" || f.state === "Inactive") state = "Cleared";

      var severity = formatSeverity(f);
      var description = diag.name || "--";
      var effect = fm.effectOnComponent || "--";
      var action = fm.recommendedAction || "--";

      // Enrich with static telematics fault reference when available
      var telRef = getTelematicsFaultInfo(code, description, f);
      if (telRef) {
        if (severity === "None" || severity === "--") severity = telRef.severity;
        if (effect === "--") effect = telRef.effect;
        if (action === "--") action = telRef.action;
      }

      return {
        date: f.dateTime,
        deviceId: did,
        unit: nameMap[did] || did,
        code: code,
        description: description,
        state: state,
        severity: severity,
        faultClass: diag.source || "--",
        controller: f.controller ? (f.controller.name || f.controller.id || "--") : "--",
        effect: effect,
        action: action,
        count: occMap[key] || 1
      };
    });
  }

  function buildUnitRows(devices, dateRange) {
    var now = new Date();

    return devices.map(function (dev) {
      var vi = getVinInfo(dev);
      var dg = deviceGroupMap[dev.id] || {};
      var celPct = celData.deviceCelPct[dev.id] || 0;
      var status = deviceStatusMap[dev.id];
      var lastReported = status ? status.dateTime || status.lastCommunication : null;

      // Count active DTCs for this device
      var activeDtcs = 0;
      var dtcCodes = {};
      var repeatDtcs = 0;
      celData.allFaults.forEach(function (f) {
        if (f.device && f.device.id === dev.id) {
          var diag = getDiagnosticInfo(f);
          var code = diag.code ? diag.code.toString() : "--";
          if (isCelFault(f)) activeDtcs++;
          dtcCodes[code] = (dtcCodes[code] || 0) + 1;
        }
      });
      Object.keys(dtcCodes).forEach(function (c) {
        if (dtcCodes[c] > 1) repeatDtcs++;
      });

      return {
        id: dev.id,
        name: dev.name || dev.id,
        region: dg.region || "--",
        branch: dg.branch || "--",
        year: vi.year,
        make: vi.make,
        vtype: vi.vtype,
        engine: vi.engine,
        celPct: celPct,
        activeDtcs: activeDtcs,
        repeatDtcs: repeatDtcs,
        lastReported: lastReported
      };
    });
  }

  function buildCommRows(devices) {
    var now = new Date();

    return devices.map(function (dev) {
      var dg = deviceGroupMap[dev.id] || {};
      var status = deviceStatusMap[dev.id];
      var lastComm = status ? (status.dateTime || status.lastCommunication || null) : null;
      var daysSince = 0;
      var isDriving = false;

      if (lastComm) {
        daysSince = Math.floor((now.getTime() - new Date(lastComm).getTime()) / 86400000);
      }

      if (status && status.isDriving !== undefined) {
        isDriving = status.isDriving;
      }

      var reportingStatus = daysSince <= NOT_REPORTING_DAYS ? "Reporting" : "Not Reporting";

      return {
        id: dev.id,
        name: dev.name || dev.id,
        region: dg.region || "--",
        branch: dg.branch || "--",
        lastComm: lastComm,
        daysSince: daysSince,
        status: reportingStatus,
        driving: isDriving ? "Yes" : "No"
      };
    });
  }

  // ── Rendering ─────────────────────────────────────────────────────────

  function renderActiveTab() {
    switch (activeTab) {
      case "trend": renderTrend(); break;
      case "dtc": renderDtcTable(); break;
      case "unit": renderUnitTable(); break;
      case "comm": renderCommTable(); break;
    }
  }

  // ── Trend Tab ─────────────────────────────────────────────────────────

  function renderTrend() {
    renderKpis();
    renderChart();
    renderTop10();
  }

  function renderKpis() {
    var devices = filteredDevices();
    var deviceSet = {};
    devices.forEach(function (d) { deviceSet[d.id] = true; });

    // Current CEL%: average across filtered devices that have data
    var vals = [];
    devices.forEach(function (d) {
      if (celData.deviceDrivenDays[d.id] > 0) {
        vals.push(celData.deviceCelPct[d.id] || 0);
      }
    });

    var periodPct = vals.length > 0 ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : 0;

    // Active CEL count: devices with any CEL day > 0
    var activeCelCount = 0;
    devices.forEach(function (d) {
      if ((celData.deviceCelDays[d.id] || 0) > 0) activeCelCount++;
    });

    els.kpiCurrent.textContent = formatPct(periodPct);
    els.kpiPeriod.textContent = formatPct(periodPct);

    // Prior period comparison
    // We approximate by splitting the trend buckets in half
    var buckets = celData.trendBuckets;
    if (buckets.length >= 2) {
      var mid = Math.floor(buckets.length / 2);
      var priorSum = 0, priorCount = 0;
      var currentSum = 0, currentCount = 0;
      for (var i = 0; i < mid; i++) { priorSum += buckets[i].value; priorCount++; }
      for (var j = mid; j < buckets.length; j++) { currentSum += buckets[j].value; currentCount++; }
      var priorAvg = priorCount > 0 ? priorSum / priorCount : 0;
      var currentAvg = currentCount > 0 ? currentSum / currentCount : 0;
      var diff = currentAvg - priorAvg;

      els.kpiPrior.textContent = (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%";
      els.kpiPrior.className = "cel-kpi-value " + (diff > 0 ? "cel-trend-up" : diff < 0 ? "cel-trend-down" : "");
      els.kpiCurrent.textContent = formatPct(currentAvg);
    } else {
      els.kpiPrior.textContent = "--";
      els.kpiPrior.className = "cel-kpi-value";
    }

    els.kpiActive.textContent = activeCelCount;
  }

  function renderChart() {
    var buckets = celData.trendBuckets;
    var labels = buckets.map(function (b) { return b.label; });
    var values = buckets.map(function (b) { return b.value; });

    if (chartInstance) {
      chartInstance.data.labels = labels;
      chartInstance.data.datasets[0].data = values;
      chartInstance.update("none");
      return;
    }

    var ctx = els.chart.getContext("2d");
    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "CEL%",
          data: values,
          borderColor: "#4a90d9",
          backgroundColor: "rgba(74, 144, 217, 0.1)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#4a90d9"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              callback: function (v) { return v + "%"; }
            },
            title: { display: true, text: "CEL%" }
          },
          x: {
            title: { display: true, text: "Period" }
          }
        }
      }
    });
  }

  function renderTop10() {
    var devices = filteredDevices();
    var deviceSet = {};
    devices.forEach(function (d) { deviceSet[d.id] = true; });

    // Top 10 Highest CEL%
    var celArr = [];
    devices.forEach(function (d) {
      if (celData.deviceDrivenDays[d.id] > 0) {
        celArr.push({ name: d.name || d.id, pct: celData.deviceCelPct[d.id] || 0 });
      }
    });
    celArr.sort(function (a, b) { return b.pct - a.pct; });
    renderSmallTable(els.top10Cel, celArr.slice(0, 10), function (r) {
      return "<td>" + escapeHtml(r.name) + "</td><td>" + formatPct(r.pct) + "</td>";
    });

    // Top 10 Highest DTC Count (per device)
    var dtcCount = {};
    celData.allFaults.forEach(function (f) {
      var did = f.device ? f.device.id : null;
      if (!did || !deviceSet[did]) return;
      dtcCount[did] = (dtcCount[did] || 0) + 1;
    });
    var dtcArr = [];
    Object.keys(dtcCount).forEach(function (did) {
      var d = allDevices.find(function (dv) { return dv.id === did; });
      dtcArr.push({ name: d ? d.name : did, count: dtcCount[did] });
    });
    dtcArr.sort(function (a, b) { return b.count - a.count; });
    renderSmallTable(els.top10Dtc, dtcArr.slice(0, 10), function (r) {
      return "<td>" + escapeHtml(r.name) + "</td><td>" + r.count + "</td>";
    });

    // Top 10 Most Recurring Faults (by DTC code + description)
    var codeCount = {};
    var codeNames = {};
    celData.allFaults.forEach(function (f) {
      var did = f.device ? f.device.id : null;
      if (!did || !deviceSet[did]) return;
      var diag = getDiagnosticInfo(f);
      var code = diag.code ? diag.code.toString() : "--";
      codeCount[code] = (codeCount[code] || 0) + 1;
      if (!codeNames[code] && diag.name && diag.name !== "--") codeNames[code] = diag.name;
    });
    var codeArr = [];
    Object.keys(codeCount).forEach(function (code) {
      var label = codeNames[code] ? code + " - " + codeNames[code] : code;
      codeArr.push({ code: label, count: codeCount[code] });
    });
    codeArr.sort(function (a, b) { return b.count - a.count; });
    renderSmallTable(els.top10Recurring, codeArr.slice(0, 10), function (r) {
      return "<td>" + escapeHtml(r.code) + "</td><td>" + r.count + "</td>";
    });
  }

  function renderSmallTable(tbody, rows, cellFn) {
    var frag = document.createDocumentFragment();
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      tr.innerHTML = cellFn(r);
      frag.appendChild(tr);
    });
    tbody.innerHTML = "";
    tbody.appendChild(frag);
    if (rows.length === 0) {
      var tr = document.createElement("tr");
      tr.innerHTML = '<td colspan="2" style="text-align:center;color:#888;">No data</td>';
      tbody.appendChild(tr);
    }
  }

  // ── DTC Table ─────────────────────────────────────────────────────────

  function renderDtcTable() {
    var rows = celData.dtcRows.slice();
    var stateFilter = els.dtcState.value;
    var searchTerm = els.dtcSearch.value.toLowerCase();

    if (stateFilter !== "all") {
      rows = rows.filter(function (r) { return r.state === stateFilter; });
    }
    if (searchTerm) {
      rows = rows.filter(function (r) {
        return r.code.toLowerCase().indexOf(searchTerm) >= 0 ||
               r.unit.toLowerCase().indexOf(searchTerm) >= 0 ||
               r.description.toLowerCase().indexOf(searchTerm) >= 0;
      });
    }

    sortRows(rows, sortState.dtc);
    renderTableBody(els.dtcBody, rows, function (r) {
      var stateClass = "cel-state-" + r.state.toLowerCase();
      var sevClass = "cel-badge " + severityBadgeClass(r.severity);
      return '<td>' + formatDate(r.date) + '</td>' +
        '<td>' + unitLink(r.deviceId, r.unit) + '</td>' +
        '<td>' + escapeHtml(r.code) + '</td>' +
        '<td>' + escapeHtml(r.description) + '</td>' +
        '<td><span class="' + stateClass + '">' + r.state + '</span></td>' +
        '<td><span class="' + sevClass + '">' + escapeHtml(r.severity) + '</span></td>' +
        '<td>' + escapeHtml(r.faultClass) + '</td>' +
        '<td>' + escapeHtml(r.controller) + '</td>' +
        '<td>' + escapeHtml(r.effect) + '</td>' +
        '<td>' + escapeHtml(r.action) + '</td>' +
        '<td>' + r.count + '</td>';
    });
  }

  // ── Unit Table ────────────────────────────────────────────────────────

  function renderUnitTable() {
    var rows = celData.unitRows.slice();
    var searchTerm = els.unitSearch.value.toLowerCase();

    if (searchTerm) {
      rows = rows.filter(function (r) {
        return r.name.toLowerCase().indexOf(searchTerm) >= 0 ||
               r.region.toLowerCase().indexOf(searchTerm) >= 0 ||
               r.branch.toLowerCase().indexOf(searchTerm) >= 0 ||
               r.make.toLowerCase().indexOf(searchTerm) >= 0;
      });
    }

    sortRows(rows, sortState.unit);
    renderTableBody(els.unitBody, rows, function (r) {
      return '<td>' + unitLink(r.id, r.name) + '</td>' +
        '<td>' + escapeHtml(r.region) + '</td>' +
        '<td>' + escapeHtml(r.branch) + '</td>' +
        '<td>' + escapeHtml(r.year) + '</td>' +
        '<td>' + escapeHtml(r.make) + '</td>' +
        '<td>' + escapeHtml(r.vtype) + '</td>' +
        '<td>' + escapeHtml(r.engine) + '</td>' +
        '<td>' + formatPct(r.celPct) + '</td>' +
        '<td>' + r.activeDtcs + '</td>' +
        '<td>' + r.repeatDtcs + '</td>' +
        '<td>' + formatDate(r.lastReported) + '</td>';
    });
  }

  // ── Comm Table ────────────────────────────────────────────────────────

  function renderCommTable() {
    var rows = celData.commRows.slice();
    var statusFilter = els.commStatus.value;
    var searchTerm = els.commSearch.value.toLowerCase();

    if (statusFilter !== "all") {
      rows = rows.filter(function (r) {
        if (statusFilter === "reporting") return r.status === "Reporting";
        return r.status === "Not Reporting";
      });
    }
    if (searchTerm) {
      rows = rows.filter(function (r) {
        return r.name.toLowerCase().indexOf(searchTerm) >= 0 ||
               r.region.toLowerCase().indexOf(searchTerm) >= 0 ||
               r.branch.toLowerCase().indexOf(searchTerm) >= 0;
      });
    }

    sortRows(rows, sortState.comm);
    renderTableBody(els.commBody, rows, function (r) {
      var statusClass = r.status === "Reporting" ? "cel-status-reporting" : "cel-status-not-reporting";
      return '<td>' + unitLink(r.id, r.name) + '</td>' +
        '<td>' + escapeHtml(r.region) + '</td>' +
        '<td>' + escapeHtml(r.branch) + '</td>' +
        '<td>' + formatDate(r.lastComm) + '</td>' +
        '<td>' + r.daysSince + '</td>' +
        '<td><span class="' + statusClass + '">' + r.status + '</span></td>' +
        '<td>' + r.driving + '</td>';
    });
  }

  // ── Table Utilities ───────────────────────────────────────────────────

  function renderTableBody(tbody, rows, cellFn) {
    var frag = document.createDocumentFragment();
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      tr.innerHTML = cellFn(r);
      frag.appendChild(tr);
    });
    tbody.innerHTML = "";
    tbody.appendChild(frag);
  }

  function sortRows(rows, state) {
    var col = state.col;
    var dir = state.dir === "asc" ? 1 : -1;

    rows.sort(function (a, b) {
      var va = a[col], vb = b[col];
      if (va == null) va = "";
      if (vb == null) vb = "";
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  function handleSort(tableId, th) {
    var col = th.dataset.col;
    if (!col) return;
    var state = sortState[tableId];
    if (state.col === col) {
      state.dir = state.dir === "asc" ? "desc" : "asc";
    } else {
      state.col = col;
      state.dir = "asc";
    }

    // Update arrow indicators
    var table = th.closest("table");
    table.querySelectorAll(".cel-sortable").forEach(function (h) {
      h.classList.remove("cel-sort-asc", "cel-sort-desc");
    });
    th.classList.add("cel-sort-" + state.dir);

    // Re-render
    switch (tableId) {
      case "dtc": renderDtcTable(); break;
      case "unit": renderUnitTable(); break;
      case "comm": renderCommTable(); break;
    }
  }

  // ── CSV Export ─────────────────────────────────────────────────────────

  function exportCsv(filename, headers, rows) {
    var lines = [headers.join(",")];
    rows.forEach(function (r) {
      var vals = headers.map(function (h) {
        var v = r[h] != null ? String(r[h]) : "";
        // Escape commas and quotes
        if (v.indexOf(",") >= 0 || v.indexOf('"') >= 0 || v.indexOf("\n") >= 0) {
          v = '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
      });
      lines.push(vals.join(","));
    });

    var blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Main Load (Apply) ─────────────────────────────────────────────────

  function loadData() {
    if (abortController) abortController.abort();
    abortController = new AbortController();

    showLoading(true, "Fetching fault data...");
    showEmpty(false);
    showWarning(null);
    setProgress(0);

    var dateRange = getDateRange();
    var devices = filteredDevices();

    if (devices.length === 0) {
      showLoading(false);
      showEmpty(true);
      return;
    }

    els.progress.textContent = devices.length + " vehicles selected";

    // Step 1: Fetch fault data (time-chunked)
    fetchCelFaults(dateRange, function (pct) {
      setProgress(pct * 0.5); // faults = first 50% of progress
      els.loadingText.textContent = "Fetching fault data... " + Math.round(pct) + "%";
    }).then(function (result) {
      if (isAborted()) return;

      celData.celFaults = result.celFaults;
      celData.allFaults = result.allFaults;

      // Step 2: Fetch trips (time-chunked)
      showLoading(true, "Fetching trip data...");
      return fetchTrips(devices, dateRange, function (pct) {
        setProgress(50 + pct * 0.5); // trips = second 50% of progress
        els.loadingText.textContent = "Fetching trip data... " + Math.round(pct) + "%";
      });
    }).then(function (trips) {
      if (isAborted()) return;
      if (!trips) return;

      celData.trips = trips;

      // Step 3: Compute metrics
      showLoading(true, "Computing metrics...");
      var metrics = computeCelMetrics(devices, celData.celFaults, trips);
      celData.deviceCelPct = metrics.deviceCelPct;
      celData.deviceDrivenDays = metrics.deviceDrivenDays;
      celData.deviceCelDays = metrics.deviceCelDays;

      // Auto-select granularity based on date range, then build trend buckets
      autoSelectGranularity(dateRange);
      celData.trendBuckets = buildTrendBuckets(celData.celFaults, trips, devices, currentGranularity);

      // Build table rows
      celData.dtcRows = buildDtcRows(celData.allFaults, devices);
      celData.unitRows = buildUnitRows(devices, dateRange);
      celData.commRows = buildCommRows(devices);

      lastFetchRange = dateRange;

      // Render
      renderActiveTab();
      showLoading(false);
    }).catch(function (err) {
      if (!isAborted()) {
        console.error("CEL Dashboard error:", err);
        showLoading(false);
        showEmpty(true);
        els.empty.textContent = "Error loading data. Please try again.";
      }
    });
  }

  // ── UI Event Handlers ─────────────────────────────────────────────────

  function onPresetClick(e) {
    var btn = e.target.closest(".cel-preset");
    if (!btn) return;

    document.querySelectorAll(".cel-preset").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");

    var isCustom = btn.dataset.preset === "custom";
    els.customDates.style.display = isCustom ? "" : "none";

    if (isCustom && !els.fromDate.value) {
      var now = new Date();
      var from = new Date(now);
      from.setDate(from.getDate() - 30);
      els.fromDate.value = from.toISOString().slice(0, 10);
      els.toDate.value = now.toISOString().slice(0, 10);
    }
  }

  function onTabClick(e) {
    var btn = e.target.closest(".cel-tab");
    if (!btn) return;

    document.querySelectorAll(".cel-tab").forEach(function (t) { t.classList.remove("active"); });
    btn.classList.add("active");

    activeTab = btn.dataset.tab;

    // Show/hide panels
    document.querySelectorAll(".cel-panel").forEach(function (p) { p.classList.remove("active"); });
    var panel = $("cel-panel-" + activeTab);
    if (panel) panel.classList.add("active");

    // Show/hide KPI strip (only on trend tab)
    els.kpiStrip.style.display = activeTab === "trend" ? "flex" : "none";

    // Re-render active tab
    if (celData.trendBuckets.length > 0 || celData.dtcRows.length > 0 || celData.unitRows.length > 0) {
      renderActiveTab();
    }
  }

  function onGranularityClick(e) {
    var btn = e.target.closest(".cel-gran-btn");
    if (!btn) return;

    document.querySelectorAll(".cel-gran-btn").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");

    currentGranularity = btn.dataset.gran;

    // Re-bucket from in-memory data (no API call)
    var devices = filteredDevices();
    celData.trendBuckets = buildTrendBuckets(celData.celFaults, celData.trips, devices, currentGranularity);
    renderChart();
    renderKpis();
  }

  function autoSelectGranularity(dateRange) {
    var fromMs = new Date(dateRange.from).getTime();
    var toMs = new Date(dateRange.to).getTime();
    var days = Math.round((toMs - fromMs) / 86400000);

    if (days <= 14) {
      currentGranularity = "day";
    } else if (days <= 60) {
      currentGranularity = "week";
    } else {
      currentGranularity = "month";
    }

    // Update button state to match
    document.querySelectorAll(".cel-gran-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.gran === currentGranularity);
    });
  }

  function onRegionChange() {
    populateBranchDropdown(els.region.value);
  }

  // ── Add-In Lifecycle ──────────────────────────────────────────────────

  return {
    initialize: function (freshApi, state, callback) {
      api = freshApi;
      pageState = state;

      // Cache DOM refs
      els.fromDate = $("cel-from");
      els.toDate = $("cel-to");
      els.customDates = $("cel-custom-dates");
      els.region = $("cel-region");
      els.branch = $("cel-branch");
      els.vehicle = $("cel-vehicle");
      els.year = $("cel-year");
      els.make = $("cel-make");
      els.vtype = $("cel-vtype");
      els.apply = $("cel-apply");
      els.progress = $("cel-progress");
      els.loading = $("cel-loading");
      els.loadingText = $("cel-loading-text");
      els.progressBar = $("cel-progress-bar");
      els.empty = $("cel-empty");
      els.warning = $("cel-warning");
      els.chart = $("cel-chart");
      els.kpiStrip = $("cel-kpi-strip");
      els.kpiCurrent = $("cel-kpi-current");
      els.kpiPeriod = $("cel-kpi-period");
      els.kpiPrior = $("cel-kpi-prior");
      els.kpiActive = $("cel-kpi-active");
      els.top10Cel = $("cel-top10-cel");
      els.top10Dtc = $("cel-top10-dtc");
      els.top10Recurring = $("cel-top10-recurring");
      els.dtcState = $("cel-dtc-state");
      els.dtcSearch = $("cel-dtc-search");
      els.dtcBody = $("cel-dtc-body");
      els.unitSearch = $("cel-unit-search");
      els.unitBody = $("cel-unit-body");
      els.commStatus = $("cel-comm-status");
      els.commSearch = $("cel-comm-search");
      els.commBody = $("cel-comm-body");

      // Event listeners
      els.apply.addEventListener("click", loadData);
      document.querySelector(".cel-presets").addEventListener("click", onPresetClick);
      $("cel-tabs").addEventListener("click", onTabClick);
      document.querySelector(".cel-granularity").addEventListener("click", onGranularityClick);
      els.region.addEventListener("change", onRegionChange);

      // Unit link click handler (delegated on content area)
      $("cel-content").addEventListener("click", function (e) {
        var link = e.target.closest(".cel-unit-link");
        if (link) {
          e.preventDefault();
          goToFaults(link.dataset.deviceId);
          return;
        }
      });

      // Table sort listeners
      $("cel-dtc-table").addEventListener("click", function (e) {
        var th = e.target.closest(".cel-sortable");
        if (th) handleSort("dtc", th);
      });
      $("cel-unit-table").addEventListener("click", function (e) {
        var th = e.target.closest(".cel-sortable");
        if (th) handleSort("unit", th);
      });
      $("cel-comm-table").addEventListener("click", function (e) {
        var th = e.target.closest(".cel-sortable");
        if (th) handleSort("comm", th);
      });

      // Search / filter listeners (re-render on input)
      els.dtcState.addEventListener("change", renderDtcTable);
      els.dtcSearch.addEventListener("input", renderDtcTable);
      els.unitSearch.addEventListener("input", renderUnitTable);
      els.commStatus.addEventListener("change", renderCommTable);
      els.commSearch.addEventListener("input", renderCommTable);

      // CSV export listeners
      $("cel-unit-export").addEventListener("click", function () {
        var headers = ["name", "region", "branch", "year", "make", "vtype", "engine", "celPct", "activeDtcs", "repeatDtcs", "lastReported"];
        exportCsv("cel_unit_detail.csv", headers, celData.unitRows);
      });
      $("cel-comm-export").addEventListener("click", function () {
        var headers = ["name", "region", "branch", "lastComm", "daysSince", "status", "driving"];
        exportCsv("cel_comm_report.csv", headers, celData.commRows);
      });

      // Load foundation data in parallel: Devices + Groups + DeviceStatusInfo
      var groupFilter = state.getGroupFilter();

      Promise.all([
        apiCall("Get", { typeName: "Device", resultsLimit: 5000 }),
        apiCall("Get", { typeName: "Group", resultsLimit: 5000 }),
        apiCall("Get", { typeName: "DeviceStatusInfo", resultsLimit: 5000 })
      ]).then(function (results) {
        allDevices = results[0] || [];
        var groups = results[1] || [];
        var statusArr = results[2] || [];

        // Build device status map
        statusArr.forEach(function (s) {
          if (s.device && s.device.id) {
            deviceStatusMap[s.device.id] = s;
          }
        });

        // Build group hierarchy and map devices
        buildGroupHierarchy(groups, groupFilter);
        mapDeviceGroups();
        populateRegionDropdown();
        populateBranchDropdown(els.region.value);
        populateVehicleDropdown();

        // Build vehicle info from Device entity properties
        buildDeviceInfoMap();
        populateVinDropdowns();
        callback();
      }).catch(function (err) {
        console.error("CEL Dashboard init error:", err);
        callback();
      });
    },

    focus: function (freshApi, state) {
      api = freshApi;
      pageState = state;

      // Refresh devices and status
      Promise.all([
        apiCall("Get", { typeName: "Device", resultsLimit: 5000 }),
        apiCall("Get", { typeName: "DeviceStatusInfo", resultsLimit: 5000 })
      ]).then(function (results) {
        allDevices = results[0] || [];
        var statusArr = results[1] || [];
        statusArr.forEach(function (s) {
          if (s.device && s.device.id) {
            deviceStatusMap[s.device.id] = s;
          }
        });
        mapDeviceGroups();
        populateVehicleDropdown();
        buildDeviceInfoMap();
      }).catch(function () {});

      // Auto-load on first focus
      if (firstFocus) {
        firstFocus = false;
        loadData();
      }
    },

    blur: function () {
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      showLoading(false);
    }
  };
};
