(function () {
  var pending = { initialize: null, focus: null, blur: null };
  var ready = false;
  var queued = [];

  window.__celReady = function (impl) {
    pending = impl;
    ready = true;
    queued.forEach(function (fn) { fn(); });
    queued = [];
  };

  // If the module script already ran and stored its impl, pick it up now
  if (window.__celImpl) {
    window.__celReady(window.__celImpl);
  }

  if (typeof geotab === "undefined") { window.geotab = { addin: {} }; }
  if (!geotab.addin) { geotab.addin = {}; }

  geotab.addin.celDashboard = function () {
    return {
      initialize: function (api, state, callback) {
        if (ready) { pending.initialize(api, state, callback); }
        else { queued.push(function () { pending.initialize(api, state, callback); }); }
      },
      focus: function (api, state) {
        if (ready) { pending.focus(api, state); }
        else { queued.push(function () { pending.focus(api, state); }); }
      },
      blur: function () {
        if (ready) { pending.blur(); }
        else { queued.push(function () { pending.blur(); }); }
      }
    };
  };
})();
