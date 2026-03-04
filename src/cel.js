import { createRoot } from "react-dom/client";
import { createElement, createRef } from "react";
import App from "./components/App.jsx";

const appRef = createRef();
let root = null;
let firstFocus = true;

geotab.addin.celDashboard = function () {
  return {
    initialize: function (freshApi, state, callback) {
      const container = document.getElementById("cel-root");
      root = createRoot(container);
      root.render(createElement(App, { ref: appRef }));

      // Wait a tick for React to mount, then initialize foundation data
      setTimeout(async () => {
        try {
          await appRef.current.initializeFoundation(freshApi, state);
        } catch (err) {
          console.error("CEL Dashboard init error:", err);
        }
        callback();
      }, 0);
    },

    focus: function (freshApi, state) {
      if (appRef.current) {
        appRef.current.updateApi(freshApi, state);
      }

      // Auto-load on first focus
      if (firstFocus) {
        firstFocus = false;
        // Trigger apply after a brief delay to let updateApi finish
        setTimeout(() => {
          const applyBtn = document.getElementById("cel-apply");
          if (applyBtn) applyBtn.click();
        }, 100);
      }
    },

    blur: function () {
      if (appRef.current) {
        appRef.current.abort();
      }
    },
  };
};
