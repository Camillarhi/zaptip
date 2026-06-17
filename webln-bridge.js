(function () {
  "use strict";

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () {
        reject(new Error("WebLN timed out"));
      }, ms);
      Promise.resolve(promise).then(
        function (v) {
          clearTimeout(t);
          resolve(v);
        },
        function (e) {
          clearTimeout(t);
          reject(e);
        }
      );
    });
  }

  window.addEventListener("message", async function (event) {
    if (event.source !== window) return;
    var data = event.data;
    if (!data || data.zaptip !== true || data.type !== "pay-request") return;

    var id = data.id;
    function reply(payload) {
      payload.zaptip = true;
      payload.type = "pay-result";
      payload.id = id;
      window.postMessage(payload, "*");
    }

    var webln = window.webln;
    if (typeof webln === "undefined" || !webln) {
      reply({ hadWebln: false });
      return;
    }

    try {
      await withTimeout(webln.enable(), 8000);
    } catch (e) {
      reply({ hadWebln: false });
      return;
    }

    try {
      await webln.sendPayment(data.invoice);
      reply({ hadWebln: true, ok: true });
    } catch (err) {
      reply({ hadWebln: true, ok: false, error: (err && err.message) || String(err) });
    }
  });
})();
