import { useCallback, useRef } from "react";
import { apiCall, apiMultiCall } from "./useGeotabApi.js";
import { FAULT_LIMIT } from "../lib/constants.js";
import { buildDiagnosticMaps } from "../lib/diagnosticUtils.js";
import { computeCelMetrics, buildTrendBuckets } from "../lib/computeMetrics.js";
import { buildDtcRows, buildUnitRows, buildCommRows } from "../lib/buildRows.js";
import { autoSelectGranularity } from "../lib/dateUtils.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useDataLoader() {
  const diagCacheRef = useRef(null);
  const abortRef = useRef(null);

  const fetchDiagnostics = useCallback(async (api) => {
    if (diagCacheRef.current) return diagCacheRef.current;
    const [diagnostics, failureModes] = await Promise.all([
      apiCall(api, "Get", { typeName: "Diagnostic", resultsLimit: 50000 }),
      apiCall(api, "Get", { typeName: "FailureMode", resultsLimit: 50000 }),
    ]);
    diagCacheRef.current = buildDiagnosticMaps(diagnostics || [], failureModes || []);
    return diagCacheRef.current;
  }, []);

  const fetchCelFaults = useCallback(async (api, dateRange, diagMaps, onProgress) => {
    const signal = abortRef.current?.signal;
    const { celDiagnosticIds } = diagMaps;

    // Targeted CEL queries
    const celIds = Object.keys(celDiagnosticIds);
    const celCalls = celIds.map((diagId) => [
      "Get",
      {
        typeName: "FaultData",
        search: {
          fromDate: dateRange.from,
          toDate: dateRange.to,
          diagnosticSearch: { id: diagId },
        },
        resultsLimit: FAULT_LIMIT,
      },
    ]);

    let celFaults = [];
    if (celCalls.length > 0) {
      const results = await apiMultiCall(api, celCalls);
      results.forEach((arr) => {
        if (Array.isArray(arr)) celFaults = celFaults.concat(arr);
      });
    }

    // OBD faults — time-chunked
    const CHUNK_DAYS = 7;
    const fromMs = new Date(dateRange.from).getTime();
    const toMs = new Date(dateRange.to).getTime();
    const chunks = [];
    let cursor = fromMs;
    while (cursor < toMs) {
      const chunkEnd = Math.min(cursor + CHUNK_DAYS * 86400000, toMs);
      chunks.push({
        from: new Date(cursor).toISOString(),
        to: new Date(chunkEnd).toISOString(),
      });
      cursor = chunkEnd;
    }

    const totalChunks = chunks.length;
    let completedChunks = 0;
    let obdFaults = [];

    for (let i = 0; i < chunks.length; i++) {
      if (signal?.aborted) return null;
      if (i > 0) await delay(300);
      if (signal?.aborted) return null;

      const faults = await apiCall(api, "Get", {
        typeName: "FaultData",
        search: {
          fromDate: chunks[i].from,
          toDate: chunks[i].to,
          diagnosticSearch: { diagnosticType: "ObdFault" },
        },
        resultsLimit: FAULT_LIMIT,
      });
      obdFaults = obdFaults.concat(faults);
      completedChunks++;
      if (onProgress) onProgress((completedChunks / totalChunks) * 100);
    }

    // Merge CEL faults into OBD (dedup)
    const obdIds = {};
    obdFaults.forEach((f) => {
      if (f.id) obdIds[f.id] = true;
    });
    celFaults.forEach((f) => {
      if (f.id && !obdIds[f.id]) obdFaults.push(f);
    });

    return { celFaults, allFaults: obdFaults };
  }, []);

  const fetchTrips = useCallback(async (api, devices, dateRange, onProgress) => {
    const signal = abortRef.current?.signal;
    const CHUNK_DAYS = 7;
    const TRIP_LIMIT = 50000;

    const fromMs = new Date(dateRange.from).getTime();
    const toMs = new Date(dateRange.to).getTime();
    const chunks = [];
    let cursor = fromMs;
    while (cursor < toMs) {
      const chunkEnd = Math.min(cursor + CHUNK_DAYS * 86400000, toMs);
      chunks.push({
        from: new Date(cursor).toISOString(),
        to: new Date(chunkEnd).toISOString(),
      });
      cursor = chunkEnd;
    }

    const deviceSet = {};
    devices.forEach((d) => {
      deviceSet[d.id] = true;
    });

    const totalChunks = chunks.length;
    let completedChunks = 0;
    const allTrips = {};

    for (let i = 0; i < chunks.length; i++) {
      if (signal?.aborted) return null;
      if (i > 0) await delay(300);
      if (signal?.aborted) return null;

      const trips = await apiCall(api, "Get", {
        typeName: "Trip",
        search: {
          fromDate: chunks[i].from,
          toDate: chunks[i].to,
        },
        resultsLimit: TRIP_LIMIT,
      });

      trips.forEach((trip) => {
        const did = trip.device ? trip.device.id : null;
        if (!did || !deviceSet[did]) return;
        if (!allTrips[did]) allTrips[did] = [];
        allTrips[did].push(trip);
      });

      completedChunks++;
      if (onProgress) onProgress((completedChunks / totalChunks) * 100);
    }

    return allTrips;
  }, []);

  const loadData = useCallback(
    async (api, devices, dateRange, foundation, onStatus) => {
      // Abort any previous load
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      const { allDevices, deviceGroupNames, vinCache, deviceStatusMap } = foundation;

      try {
        onStatus({ loading: true, text: "Fetching fault data...", progress: 0 });

        // Step 1: Diagnostics
        const diagMaps = await fetchDiagnostics(api);
        if (abortRef.current.signal.aborted) return null;

        // Step 2: Faults
        const faultResult = await fetchCelFaults(api, dateRange, diagMaps, (pct) => {
          onStatus({
            loading: true,
            text: "Fetching fault data... " + Math.round(pct) + "%",
            progress: pct * 0.5,
          });
        });
        if (!faultResult || abortRef.current.signal.aborted) return null;

        // Step 3: Trips
        onStatus({ loading: true, text: "Fetching trip data...", progress: 50 });
        const trips = await fetchTrips(api, devices, dateRange, (pct) => {
          onStatus({
            loading: true,
            text: "Fetching trip data... " + Math.round(pct) + "%",
            progress: 50 + pct * 0.5,
          });
        });
        if (!trips || abortRef.current.signal.aborted) return null;

        // Step 4: Compute
        onStatus({ loading: true, text: "Computing metrics...", progress: 95 });
        const metrics = computeCelMetrics(devices, faultResult.celFaults, trips);
        const granularity = autoSelectGranularity(dateRange);
        const trendBuckets = buildTrendBuckets(
          faultResult.celFaults,
          trips,
          devices,
          granularity
        );

        const dtcRows = buildDtcRows(
          faultResult.allFaults,
          devices,
          allDevices,
          diagMaps.diagnosticMap,
          diagMaps.failureModeMap,
          diagMaps.celDiagnosticIds
        );
        const unitRows = buildUnitRows(
          devices,
          metrics,
          deviceGroupNames,
          vinCache,
          deviceStatusMap,
          faultResult.allFaults,
          diagMaps.diagnosticMap,
          diagMaps.celDiagnosticIds
        );
        const commRows = buildCommRows(devices, deviceGroupNames, deviceStatusMap);

        onStatus({ loading: false, text: "", progress: 100 });

        return {
          ...metrics,
          trendBuckets,
          dtcRows,
          unitRows,
          commRows,
          celFaults: faultResult.celFaults,
          allFaults: faultResult.allFaults,
          trips,
          granularity,
          diagnosticMap: diagMaps.diagnosticMap,
        };
      } catch (err) {
        if (!abortRef.current.signal.aborted) {
          console.error("CEL Dashboard error:", err);
          onStatus({ loading: false, error: true, text: "Error loading data. Please try again." });
        }
        return null;
      }
    },
    [fetchDiagnostics, fetchCelFaults, fetchTrips]
  );

  const abort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  return { loadData, abort };
}
