export const TELEMATICS_FAULTS = {
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
  "616|Collision data unavailable": { severity: "Warning", effect: "Excessive collision events detected", action: "May indicate loose installation; verify mounting" },
};

// Build a code-only index for telematics faults
const TELEMATICS_FAULTS_BY_CODE = {};
for (const k in TELEMATICS_FAULTS) {
  const code = k.split("|")[0];
  TELEMATICS_FAULTS_BY_CODE[code] = TELEMATICS_FAULTS[k];
}

export function isGoDeviceController(fault) {
  if (!fault.controller) return false;
  const id = fault.controller.id || "";
  const name = (fault.controller.name || "").toLowerCase();
  return (
    id === "ControllerGoDeviceId" ||
    id === "ControllerNoneId" ||
    name.indexOf("go") === 0 ||
    name.indexOf("geotab") >= 0
  );
}

export function getTelematicsFaultInfo(code, description, fault) {
  const key = code + "|" + description;
  if (TELEMATICS_FAULTS[key]) return TELEMATICS_FAULTS[key];
  if (fault && isGoDeviceController(fault) && TELEMATICS_FAULTS_BY_CODE[code]) {
    return TELEMATICS_FAULTS_BY_CODE[code];
  }
  return null;
}
