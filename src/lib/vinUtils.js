export const VIN_YEAR_CODES = {
  A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015, G: 2016, H: 2017,
  J: 2018, K: 2019, L: 2020, M: 2021, N: 2022, P: 2023, R: 2024, S: 2025,
  T: 2026, V: 2027, W: 2028, X: 2029, Y: 2030,
  1: 2001, 2: 2002, 3: 2003, 4: 2004, 5: 2005, 6: 2006, 7: 2007, 8: 2008, 9: 2009,
};

export const WMI_MAKE = {
  "1G1": "Chevrolet", "1G2": "Pontiac", "1GC": "Chevrolet", "1GT": "GMC",
  "1GY": "Cadillac", "1FA": "Ford", "1FB": "Ford", "1FC": "Ford", "1FD": "Ford",
  "1FM": "Ford", "1FT": "Ford", "1FU": "Freightliner", "1FV": "Freightliner",
  "1GD": "Chevrolet", "1G6": "Cadillac", "1HG": "Honda", "1J4": "Jeep",
  "1J8": "Jeep", "1C3": "Chrysler", "1C4": "Chrysler", "1C6": "RAM",
  "1LN": "Lincoln", "1N4": "Nissan", "1N6": "Nissan", "1NX": "Toyota",
  "2C3": "Chrysler", "2C4": "Chrysler", "2FA": "Ford", "2FM": "Ford",
  "2FT": "Ford", "2G1": "Chevrolet", "2GC": "Chevrolet", "2GT": "GMC",
  "2HG": "Honda", "2HK": "Honda", "2T1": "Toyota", "2T2": "Lexus",
  "3C4": "Chrysler", "3C6": "RAM", "3D7": "RAM", "3FA": "Ford", "3G5": "Buick",
  "3GN": "GMC", "3GT": "GMC", "3GC": "Chevrolet", "3N1": "Nissan",
  "3VW": "Volkswagen", "4T1": "Toyota", "4T3": "Toyota", "4T4": "Toyota",
  "5FN": "Honda", "5J6": "Honda", "5NP": "Hyundai", "5N1": "Nissan",
  "5TD": "Toyota", "5TF": "Toyota", "5YJ": "Tesla",
  JHM: "Honda", JN1: "Nissan", JN8: "Nissan", JTE: "Toyota",
  JTD: "Toyota", JTM: "Toyota", JTN: "Toyota",
  KND: "Kia", KM8: "Hyundai", KMH: "Hyundai",
  SAJ: "Jaguar", SAL: "Land Rover",
  WAU: "Audi", WBA: "BMW", WBS: "BMW", WDB: "Mercedes-Benz",
  WDD: "Mercedes-Benz", WDC: "Mercedes-Benz", WF0: "Ford",
  WME: "Smart", WP0: "Porsche", WVW: "Volkswagen",
  YV1: "Volvo", YV4: "Volvo", ZFF: "Ferrari",
};

export function buildDeviceInfoMap(devices) {
  const vinCache = {};
  devices.forEach((d) => {
    let year = d.year || d.modelYear || "--";
    let make = d.make || "--";
    const vin = d.vehicleIdentificationNumber || d.vin || "";

    if ((year === "--" || year === "" || year === 0) && vin.length >= 10) {
      const code = vin.charAt(9).toUpperCase();
      if (VIN_YEAR_CODES[code]) year = VIN_YEAR_CODES[code];
    }
    if ((make === "--" || make === "") && vin.length >= 3) {
      const wmi = vin.substring(0, 3).toUpperCase();
      if (WMI_MAKE[wmi]) make = WMI_MAKE[wmi];
    }

    vinCache[d.id] = {
      year: year || "--",
      make: make || "--",
      engine: d.engineType || "--",
    };
  });
  return vinCache;
}

export function getVinInfo(deviceId, vinCache) {
  return vinCache[deviceId] || { year: "--", make: "--", engine: "--" };
}

export function getUniqueYears(vinCache) {
  const years = {};
  Object.values(vinCache).forEach((v) => {
    if (v.year && v.year !== "--") years[v.year] = true;
  });
  return Object.keys(years).sort();
}

export function getUniqueMakes(vinCache) {
  const makes = {};
  Object.values(vinCache).forEach((v) => {
    if (v.make && v.make !== "--") makes[v.make] = true;
  });
  return Object.keys(makes).sort();
}
