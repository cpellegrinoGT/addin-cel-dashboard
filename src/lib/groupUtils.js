export function buildGroupMap(groups) {
  const map = {};
  groups.forEach((g) => {
    map[g.id] = g;
  });
  return map;
}

export function buildGroupHierarchy(groups, allGroups, userGroupFilter) {
  const rootIds = [];
  if (userGroupFilter && userGroupFilter.length) {
    userGroupFilter.forEach((g) => rootIds.push(g.id || g));
  } else {
    groups.forEach((g) => {
      if (g.name === "CompanyGroup" || g.id === "GroupCompanyId") {
        rootIds.push(g.id);
      }
    });
  }

  const childrenMap = {};
  groups.forEach((g) => {
    if (g.parent && g.parent.id) {
      if (!childrenMap[g.parent.id]) childrenMap[g.parent.id] = [];
      childrenMap[g.parent.id].push(g);
    }
  });

  const regions = [];
  const branches = {};

  rootIds.forEach((rootId) => {
    const level1 = childrenMap[rootId] || [];
    level1.forEach((reg) => {
      regions.push(reg);
      branches[reg.id] = childrenMap[reg.id] || [];
    });
  });

  regions.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  Object.keys(branches).forEach((rid) => {
    branches[rid].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  });

  return { regions, branches };
}

export function getAncestorIds(groupId, allGroups) {
  const ancestors = [];
  const visited = {};
  let current = groupId;
  while (current && !visited[current]) {
    visited[current] = true;
    const g = allGroups[current];
    if (!g || !g.parent || !g.parent.id) break;
    ancestors.push(g.parent.id);
    current = g.parent.id;
  }
  return ancestors;
}

export function mapDeviceGroups(devices, allGroups, groupHierarchy) {
  const deviceGroupMap = {};
  const deviceGroupNames = {};

  const regionIds = {};
  groupHierarchy.regions.forEach((r) => {
    regionIds[r.id] = r;
  });
  const branchIds = {};
  Object.keys(groupHierarchy.branches).forEach((rid) => {
    groupHierarchy.branches[rid].forEach((b) => {
      branchIds[b.id] = { branch: b, regionId: rid };
    });
  });

  devices.forEach((dev) => {
    if (!dev.groups || !dev.groups.length) {
      deviceGroupMap[dev.id] = { region: "--", regionId: null, branch: "--", branchId: null };
      deviceGroupNames[dev.id] = "--";
      return;
    }

    let foundRegion = null;
    let foundBranch = null;

    for (const dg of dev.groups) {
      if (foundBranch) break;
      const gid = dg.id;

      if (regionIds[gid]) {
        foundRegion = regionIds[gid];
        continue;
      }
      if (branchIds[gid]) {
        foundBranch = branchIds[gid].branch;
        foundRegion = regionIds[branchIds[gid].regionId] || null;
        continue;
      }

      const ancestors = getAncestorIds(gid, allGroups);
      for (const aid of ancestors) {
        if (branchIds[aid]) {
          foundBranch = branchIds[aid].branch;
          foundRegion = regionIds[branchIds[aid].regionId] || null;
          break;
        }
        if (regionIds[aid]) {
          foundRegion = regionIds[aid];
          break;
        }
      }
    }

    deviceGroupMap[dev.id] = {
      region: foundRegion ? foundRegion.name : "--",
      regionId: foundRegion ? foundRegion.id : null,
      branch: foundBranch ? foundBranch.name : "--",
      branchId: foundBranch ? foundBranch.id : null,
    };

    const names = [];
    dev.groups.forEach((dg) => {
      const g = allGroups[dg.id];
      if (g && g.name && g.name !== "CompanyGroup" && g.name !== "**Nothing**") {
        names.push(g.name);
      }
    });
    deviceGroupNames[dev.id] = names.length > 0 ? names.join(", ") : "--";
  });

  return { deviceGroupMap, deviceGroupNames };
}

export function getDescendantIds(groupId, allGroups) {
  const descendants = { [groupId]: true };
  const childrenMap = {};
  Object.keys(allGroups).forEach((gid) => {
    const g = allGroups[gid];
    if (g.parent && g.parent.id) {
      if (!childrenMap[g.parent.id]) childrenMap[g.parent.id] = [];
      childrenMap[g.parent.id].push(gid);
    }
  });
  const queue = [groupId];
  while (queue.length > 0) {
    const current = queue.shift();
    const children = childrenMap[current] || [];
    for (const child of children) {
      if (!descendants[child]) {
        descendants[child] = true;
        queue.push(child);
      }
    }
  }
  return descendants;
}

export function filteredDevices(
  allDevices,
  allGroups,
  vinCache,
  { selectedGroupIds = [], selectedVehicleIds = [], year = "all", make = "all" }
) {
  // Multi-select vehicle shortcut
  if (selectedVehicleIds.length > 0) {
    const vehicleSet = new Set(selectedVehicleIds);
    return allDevices.filter((dev) => vehicleSet.has(dev.id));
  }

  // Pre-compute descendant sets for all selected groups
  let groupSet = null;
  if (selectedGroupIds.length > 0) {
    groupSet = {};
    selectedGroupIds.forEach((gid) => {
      const descendants = getDescendantIds(gid, allGroups);
      Object.assign(groupSet, descendants);
    });
  }

  return allDevices.filter((dev) => {
    if (groupSet) {
      const devGroups = dev.groups || [];
      let inGroup = false;
      for (const dg of devGroups) {
        if (groupSet[dg.id]) {
          inGroup = true;
          break;
        }
      }
      if (!inGroup) return false;
    }

    if (year !== "all" || make !== "all") {
      const vi = vinCache[dev.id] || { year: "--", make: "--" };
      if (year !== "all" && String(vi.year) !== year) return false;
      if (make !== "all" && vi.make !== make) return false;
    }

    return true;
  });
}

export function getSortedGroups(allGroups) {
  const skipIds = { GroupCompanyId: true, GroupNothingId: true };
  const groupList = [];
  Object.keys(allGroups).forEach((gid) => {
    const g = allGroups[gid];
    if (skipIds[gid]) return;
    if (!g.name || g.name === "CompanyGroup" || g.name === "**Nothing**") return;
    groupList.push(g);
  });
  groupList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return groupList;
}
