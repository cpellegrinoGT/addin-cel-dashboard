import { useReducer, useCallback, useImperativeHandle, forwardRef, useMemo } from "react";
import GeotabContext from "../context/GeotabContext.js";
import { apiCall } from "../hooks/useGeotabApi.js";
import { useDataLoader } from "../hooks/useDataLoader.js";
import { buildDeviceInfoMap } from "../lib/vinUtils.js";
import { buildGroupMap, buildGroupHierarchy, mapDeviceGroups, filteredDevices, getSortedGroups } from "../lib/groupUtils.js";
import { getDateRange } from "../lib/dateUtils.js";
import { buildTrendBuckets } from "../lib/computeMetrics.js";
import Toolbar from "./Toolbar.jsx";
import TabBar from "./TabBar.jsx";
import KpiStrip from "./KpiStrip.jsx";
import TrendPanel from "./panels/TrendPanel.jsx";
import DtcPanel from "./panels/DtcPanel.jsx";
import UnitPanel from "./panels/UnitPanel.jsx";
import CommPanel from "./panels/CommPanel.jsx";
import LoadingOverlay from "./LoadingOverlay.jsx";
import "@geotab/zenith/dist/index.css";
import "../styles/cel.css";

const initialState = {
  // Foundation data
  allDevices: [],
  allGroups: {},
  groupHierarchy: { regions: [], branches: {} },
  deviceStatusMap: {},
  vinCache: {},
  deviceGroupMap: {},
  deviceGroupNames: {},

  // Filters
  preset: "7days",
  fromDate: "",
  toDate: "",
  selectedGroupIds: [],
  selectedVehicleIds: [],
  year: "all",
  make: "all",

  // UI
  activeTab: "trend",
  loading: false,
  loadingText: "",
  progress: 0,
  error: false,
  warning: "",

  // Computed data
  celData: null,
  granularity: "month",
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_FOUNDATION":
      return { ...state, ...action.payload };
    case "SET_FILTER":
      return { ...state, [action.key]: action.value };
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    case "SET_LOADING":
      return {
        ...state,
        loading: action.loading,
        loadingText: action.text || "",
        progress: action.progress ?? state.progress,
        error: action.error || false,
      };
    case "SET_CEL_DATA":
      return { ...state, celData: action.data, granularity: action.data?.granularity || state.granularity };
    case "SET_GRANULARITY":
      return { ...state, granularity: action.granularity };
    case "SET_WARNING":
      return { ...state, warning: action.msg };
    default:
      return state;
  }
}

const App = forwardRef(function App(props, ref) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { loadData, abort } = useDataLoader();

  const devices = useMemo(
    () =>
      filteredDevices(state.allDevices, state.allGroups, state.vinCache, {
        selectedGroupIds: state.selectedGroupIds,
        selectedVehicleIds: state.selectedVehicleIds,
        year: state.year,
        make: state.make,
      }),
    [state.allDevices, state.allGroups, state.vinCache, state.selectedGroupIds, state.selectedVehicleIds, state.year, state.make]
  );

  const sortedGroups = useMemo(() => getSortedGroups(state.allGroups), [state.allGroups]);

  const sortedVehicles = useMemo(
    () => state.allDevices.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [state.allDevices]
  );

  const handleApply = useCallback(async () => {
    const api = state._api;
    if (!api) return;

    const dateRange = getDateRange(state.preset, state.fromDate, state.toDate);

    const devs = filteredDevices(state.allDevices, state.allGroups, state.vinCache, {
      selectedGroupIds: state.selectedGroupIds,
      selectedVehicleIds: state.selectedVehicleIds,
      year: state.year,
      make: state.make,
    });

    if (devs.length === 0) {
      dispatch({ type: "SET_LOADING", loading: false, error: true, text: "No data found for the selected filters." });
      return;
    }

    dispatch({ type: "SET_WARNING", msg: "" });

    const result = await loadData(api, devs, dateRange, {
      allDevices: state.allDevices,
      deviceGroupNames: state.deviceGroupNames,
      vinCache: state.vinCache,
      deviceStatusMap: state.deviceStatusMap,
    }, (status) => {
      dispatch({ type: "SET_LOADING", ...status });
    });

    if (result) {
      dispatch({ type: "SET_CEL_DATA", data: result });
    }
  }, [state._api, state.preset, state.fromDate, state.toDate, state.allDevices, state.allGroups, state.vinCache, state.selectedGroupIds, state.selectedVehicleIds, state.year, state.make, state.deviceGroupNames, state.deviceStatusMap, loadData]);

  const handleGranularityChange = useCallback((gran) => {
    if (!state.celData) return;
    const dateRange = getDateRange(state.preset, state.fromDate, state.toDate);
    const devs = filteredDevices(state.allDevices, state.allGroups, state.vinCache, {
      selectedGroupIds: state.selectedGroupIds,
      selectedVehicleIds: state.selectedVehicleIds,
      year: state.year,
      make: state.make,
    });
    const trendBuckets = buildTrendBuckets(state.celData.celFaults, state.celData.trips, devs, gran);
    dispatch({ type: "SET_GRANULARITY", granularity: gran });
    dispatch({ type: "SET_CEL_DATA", data: { ...state.celData, trendBuckets, granularity: gran } });
  }, [state.celData, state.preset, state.fromDate, state.toDate, state.allDevices, state.allGroups, state.vinCache, state.selectedGroupIds, state.selectedVehicleIds, state.year, state.make]);

  // Initialize + lifecycle bridge
  const initializeFoundation = useCallback(async (api, pageState) => {
    const groupFilter = pageState?.getGroupFilter?.() || [];

    const [devicesRaw, groups, statusArr] = await Promise.all([
      apiCall(api, "Get", { typeName: "Device", resultsLimit: 5000 }),
      apiCall(api, "Get", { typeName: "Group", resultsLimit: 5000 }),
      apiCall(api, "Get", { typeName: "DeviceStatusInfo", resultsLimit: 5000 }),
    ]);

    const now = new Date();
    const allDevices = (devicesRaw || []).filter((d) => {
      if (!d.activeTo) return true;
      return new Date(d.activeTo) > now;
    });

    const dsMap = {};
    (statusArr || []).forEach((s) => {
      if (s.device?.id) dsMap[s.device.id] = s;
    });

    const allGroups = buildGroupMap(groups || []);
    const hierarchy = buildGroupHierarchy(groups || [], allGroups, groupFilter);
    const { deviceGroupMap, deviceGroupNames } = mapDeviceGroups(allDevices, allGroups, hierarchy);
    const vinCache = buildDeviceInfoMap(allDevices);

    dispatch({
      type: "SET_FOUNDATION",
      payload: {
        _api: api,
        _pageState: pageState,
        allDevices,
        allGroups,
        groupHierarchy: hierarchy,
        deviceStatusMap: dsMap,
        vinCache,
        deviceGroupMap,
        deviceGroupNames,
      },
    });

    return true;
  }, []);

  useImperativeHandle(ref, () => ({
    async updateApi(api, pageState) {
      dispatch({ type: "SET_FOUNDATION", payload: { _api: api, _pageState: pageState } });

      // Refresh devices + status
      try {
        const [devicesRaw, statusArr] = await Promise.all([
          apiCall(api, "Get", { typeName: "Device", resultsLimit: 5000 }),
          apiCall(api, "Get", { typeName: "DeviceStatusInfo", resultsLimit: 5000 }),
        ]);
        const now = new Date();
        const allDevices = (devicesRaw || []).filter((d) => {
          if (!d.activeTo) return true;
          return new Date(d.activeTo) > now;
        });
        const dsMap = {};
        (statusArr || []).forEach((s) => {
          if (s.device?.id) dsMap[s.device.id] = s;
        });
        const { deviceGroupMap, deviceGroupNames } = mapDeviceGroups(
          allDevices,
          state.allGroups,
          state.groupHierarchy
        );
        const vinCache = buildDeviceInfoMap(allDevices);
        dispatch({
          type: "SET_FOUNDATION",
          payload: { allDevices, deviceStatusMap: dsMap, deviceGroupMap, deviceGroupNames, vinCache },
        });
      } catch {}
    },
    abort() {
      abort();
      dispatch({ type: "SET_LOADING", loading: false });
    },
    initializeFoundation,
  }), [abort, initializeFoundation, state.allGroups, state.groupHierarchy]);

  const dateRange = useMemo(
    () => getDateRange(state.preset, state.fromDate, state.toDate),
    [state.preset, state.fromDate, state.toDate]
  );

  return (
    <GeotabContext.Provider value={{ api: state._api, pageState: state._pageState }}>
      <div id="cel-root">
        <Toolbar
          preset={state.preset}
          fromDate={state.fromDate}
          toDate={state.toDate}
          selectedGroupIds={state.selectedGroupIds}
          selectedVehicleIds={state.selectedVehicleIds}
          year={state.year}
          make={state.make}
          groups={sortedGroups}
          vehicles={sortedVehicles}
          vinCache={state.vinCache}
          deviceCount={devices.length}
          onFilterChange={(key, value) => dispatch({ type: "SET_FILTER", key, value })}
          onApply={handleApply}
        />

        <TabBar activeTab={state.activeTab} onTabChange={(tab) => dispatch({ type: "SET_TAB", tab })} />

        {state.activeTab === "trend" && state.celData && (
          <KpiStrip celData={state.celData} devices={devices} />
        )}

        <div id="cel-content">
          {state.activeTab === "trend" && (
            <TrendPanel
              celData={state.celData}
              devices={devices}
              allDevices={state.allDevices}
              granularity={state.granularity}
              onGranularityChange={handleGranularityChange}
            />
          )}
          {state.activeTab === "dtc" && (
            <DtcPanel
              dtcRows={state.celData?.dtcRows || []}
              dateRange={dateRange}
              preset={state.preset}
            />
          )}
          {state.activeTab === "unit" && (
            <UnitPanel
              unitRows={state.celData?.unitRows || []}
              dateRange={dateRange}
              preset={state.preset}
            />
          )}
          {state.activeTab === "comm" && (
            <CommPanel commRows={state.celData?.commRows || []} />
          )}

          <LoadingOverlay
            visible={state.loading}
            text={state.loadingText}
            progress={state.progress}
          />

          {state.error && !state.loading && (
            <div id="cel-empty">{state.loadingText || "No data found for the selected filters."}</div>
          )}

          {state.warning && <div id="cel-warning">{state.warning}</div>}
        </div>
      </div>
    </GeotabContext.Provider>
  );
});

export default App;
