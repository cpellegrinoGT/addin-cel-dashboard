import { useCallback } from "react";

export function apiCall(api, method, params) {
  return new Promise((resolve, reject) => {
    api.call(method, params, resolve, reject);
  });
}

export function apiMultiCall(api, calls) {
  return new Promise((resolve, reject) => {
    api.multiCall(calls, resolve, reject);
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function apiMultiCallRetry(api, calls, maxRetries = 3) {
  let attempt = 0;
  function tryCall() {
    return apiMultiCall(api, calls).catch((err) => {
      attempt++;
      if (attempt >= maxRetries) throw err;
      const wait = Math.min(1000 * Math.pow(2, attempt), 8000);
      console.warn(
        "CEL Dashboard: multiCall failed (attempt " + attempt + "), retrying in " + wait + "ms",
        err
      );
      return delay(wait).then(tryCall);
    });
  }
  return tryCall();
}

export function useApiCall(api) {
  return useCallback(
    (method, params) => {
      if (!api) return Promise.reject(new Error("API not available"));
      return apiCall(api, method, params);
    },
    [api]
  );
}
