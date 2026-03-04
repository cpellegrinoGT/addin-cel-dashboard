import { createRoot } from "react-dom/client";
import { createElement, createRef } from "react";
import App from "./components/App.jsx";

const appRef = createRef();
let root = null;
let firstFocus = true;

// Poll until appRef.current is set by React, then resolve
function waitForRef(maxMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (appRef.current) return resolve(appRef.current);
      if (Date.now() - start > maxMs) return resolve(null);
      setTimeout(check, 50);
    };
    check();
  });
}

const impl = {
  initialize(freshApi, state, callback) {
    console.log("[CEL] initialize called");
    const container = document.getElementById("cel-root");
    root = createRoot(container);
    root.render(createElement(App, { ref: appRef }));
    console.log("[CEL] React render called, waiting for ref…");

    waitForRef(10000).then(async (ref) => {
      if (ref) {
        console.log("[CEL] ref ready, calling initializeFoundation");
        try {
          await ref.initializeFoundation(freshApi, state);
          console.log("[CEL] initializeFoundation complete");
        } catch (err) {
          console.error("[CEL] initializeFoundation error:", err);
        }
      } else {
        console.error("[CEL] ref never became available (10s timeout)");
      }
      console.log("[CEL] calling callback()");
      callback();
    });
  },

  focus(freshApi, state) {
    console.log("[CEL] focus called, ref:", !!appRef.current);
    if (appRef.current) {
      appRef.current.updateApi(freshApi, state);
    }

    // Auto-load on first focus
    if (firstFocus) {
      firstFocus = false;
      setTimeout(() => {
        const applyBtn = document.getElementById("cel-apply");
        if (applyBtn) applyBtn.click();
      }, 500);
    }
  },

  blur() {
    if (appRef.current) {
      appRef.current.abort();
    }
  },
};

// Support any execution order: shell.js may or may not have run yet
if (typeof window.__celReady === "function") {
  window.__celReady(impl);
} else {
  // shell.js hasn't run yet — store impl for it to pick up
  window.__celImpl = impl;
}
