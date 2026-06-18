(function () {
  "use strict";

  if (window.__zaptipLoaded) return;
  window.__zaptipLoaded = true;

  var LN_ADDRESS_RE = /[\w.+-]+@[\w-]+\.[\w.]+/;
  var BTN_ID = "zaptip-btn";
  var PRESETS = [100, 500, 1000];

  function getBioElement() {
    return (
      document.querySelector("[data-bio-text]") ||
      document.querySelector(".user-profile-bio") ||
      document.querySelector(".p-note") ||
      null
    );
  }

  function findLightningAddress() {
    var bio = getBioElement();
    if (!bio) return null;
    var text = bio.textContent || "";
    var match = text.match(LN_ADDRESS_RE);
    return match ? match[0] : null;
  }

  function findAnchor() {
    return (
      document.querySelector(".vcard-names-container") ||
      document.querySelector(".js-profile-editable-area") ||
      getBioElement() ||
      null
    );
  }

  function createZapButton(address) {
    var btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.className = "zaptip-btn";
    btn.textContent = "⚡ Zap";
    btn.title = "Tip " + address + " with Lightning";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      openModal(address);
    });

    var wrap = document.createElement("div");
    wrap.className = "zaptip-btn-wrap";
    wrap.appendChild(btn);
    return wrap;
  }

  function injectButton(address) {
    if (document.getElementById(BTN_ID)) return;
    var anchor = findAnchor();
    if (!anchor) return;
    anchor.appendChild(createZapButton(address));
  }

  function getRepoAboutElement() {
    var headings = document.querySelectorAll("h2, h3");
    for (var i = 0; i < headings.length; i++) {
      if ((headings[i].textContent || "").trim() === "About") {
        var cell = headings[i].closest("div");
        var scope = cell && cell.parentElement ? cell.parentElement : document;
        var f4 = scope.querySelector("p.f4") || scope.querySelector(".f4");
        if (f4) return f4;
      }
    }
    return document.querySelector("p.f4");
  }

  function findRepoLightningAddress() {
    var about = getRepoAboutElement();
    if (!about) return null;
    var text = about.textContent || "";
    var match = text.match(LN_ADDRESS_RE);
    return match ? match[0] : null;
  }

  function injectRepoButton(address) {
    if (document.getElementById(BTN_ID)) return;
    var about = getRepoAboutElement();
    if (!about || !about.parentNode) return;
    about.parentNode.insertBefore(createZapButton(address), about);
  }

  function removeButton() {
    var existing = document.getElementById(BTN_ID);
    if (existing && existing.parentNode) {
      var wrap = existing.closest(".zaptip-btn-wrap") || existing;
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }
  }

  var amountSats = PRESETS[0];

  function closeModal() {
    var overlay = document.getElementById("zaptip-overlay");
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    document.removeEventListener("keydown", onEsc);
  }

  function onEsc(e) {
    if (e.key === "Escape") closeModal();
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function openModal(address) {
    closeModal();
    amountSats = PRESETS[0];

    var overlay = el("div");
    overlay.id = "zaptip-overlay";
    overlay.className = "zaptip-overlay";
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });

    var modal = el("div", "zaptip-modal");
    modal.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    var header = el("div", "zaptip-header");
    header.appendChild(el("div", "zaptip-title", "⚡ Zap"));
    var closeBtn = el("button", "zaptip-close", "×");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.addEventListener("click", closeModal);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    var sub = el("div", "zaptip-sub", "Tipping " + address);
    modal.appendChild(sub);

    var body = el("div", "zaptip-body");
    modal.appendChild(body);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.addEventListener("keydown", onEsc);

    loadLimits(body, address);
  }

  async function loadLimits(body, address) {
    renderLoading(body, "Fetching tip limits…");
    try {
      var res = await sendToBackground({
        type: "zaptip-fetch-lnurl",
        address: address,
      });
      if (!res || !res.ok) {
        throw new Error((res && res.error) || "Could not load tip limits.");
      }
      var minSats =
        typeof res.minSendable === "number" ? Math.ceil(res.minSendable / 1000) : 1;
      var maxSats =
        typeof res.maxSendable === "number"
          ? Math.floor(res.maxSendable / 1000)
          : Infinity;
      renderAmountChooser(body, {
        address: address,
        callback: res.callback,
        minSats: minSats,
        maxSats: maxSats,
      });
    } catch (err) {
      renderStatus(
        body,
        "err",
        "Something went wrong",
        (err && err.message) || String(err)
      );
    }
  }

  function renderAmountChooser(body, ctx) {
    body.innerHTML = "";
    var minSats = ctx.minSats;
    var maxSats = ctx.maxSats;

    amountSats = 0;
    for (var i = 0; i < PRESETS.length; i++) {
      if (PRESETS[i] >= minSats && PRESETS[i] <= maxSats) {
        amountSats = PRESETS[i];
        break;
      }
    }

    var errEl = el("div", "zaptip-inline-error");
    function clearError() {
      errEl.textContent = "";
    }
    function showError(m) {
      errEl.textContent = m;
    }

    var presetRow = el("div", "zaptip-presets");
    PRESETS.forEach(function (sats) {
      var b = el("button", "zaptip-amount", sats + " sats");
      b.type = "button";
      var allowed = sats >= minSats && sats <= maxSats;
      if (!allowed) {
        b.disabled = true;
        b.classList.add("zaptip-amount-disabled");
      }
      if (sats === amountSats) b.classList.add("zaptip-amount-active");
      b.addEventListener("click", function () {
        if (b.disabled) return;
        amountSats = sats;
        custom.value = "";
        clearError();
        Array.prototype.forEach.call(
          presetRow.querySelectorAll(".zaptip-amount"),
          function (x) {
            x.classList.remove("zaptip-amount-active");
          }
        );
        b.classList.add("zaptip-amount-active");
      });
      presetRow.appendChild(b);
    });
    body.appendChild(presetRow);

    body.appendChild(el("div", "zaptip-min-label", "Min: " + minSats + " sats"));

    var customWrap = el("div", "zaptip-custom-wrap");
    var custom = document.createElement("input");
    custom.type = "number";
    custom.min = String(minSats);
    custom.placeholder = "Min " + minSats + " sats";
    custom.className = "zaptip-custom";
    custom.addEventListener("input", function () {
      clearError();
      var v = parseInt(custom.value, 10);
      if (!isNaN(v) && v > 0) {
        amountSats = v;
        Array.prototype.forEach.call(
          presetRow.querySelectorAll(".zaptip-amount"),
          function (x) {
            x.classList.remove("zaptip-amount-active");
          }
        );
      }
    });
    customWrap.appendChild(custom);
    body.appendChild(customWrap);

    body.appendChild(errEl);

    var confirm = el("button", "zaptip-confirm", "Send Zap");
    confirm.type = "button";
    confirm.addEventListener("click", function () {
      var v = parseInt(custom.value, 10);
      var sats = !isNaN(v) && v > 0 ? v : amountSats;
      if (!sats || sats <= 0) {
        showError("Enter an amount in sats");
        return;
      }
      if (sats < minSats) {
        showError("Minimum tip is " + minSats + " sats");
        return;
      }
      if (maxSats !== Infinity && sats > maxSats) {
        showError("Maximum tip is " + maxSats + " sats");
        return;
      }
      clearError();
      pay(body, ctx, sats);
    });
    body.appendChild(confirm);
  }

  function renderStatus(body, cls, title, detail) {
    body.innerHTML = "";
    var wrap = el("div", "zaptip-status " + cls);
    wrap.appendChild(el("div", "zaptip-status-icon", cls === "ok" ? "✓" : "✕"));
    wrap.appendChild(el("div", "zaptip-status-title", title));
    if (detail) {
      var d = el("pre", "zaptip-status-detail", detail);
      wrap.appendChild(d);
    }
    body.appendChild(wrap);
  }

  function renderLoading(body, msg) {
    body.innerHTML = "";
    var wrap = el("div", "zaptip-loading");
    wrap.appendChild(el("div", "zaptip-spinner"));
    wrap.appendChild(el("div", null, msg || "Working…"));
    body.appendChild(wrap);
  }

  function renderQR(body, invoice) {
    body.innerHTML = "";
    body.appendChild(el("div", "zaptip-qr-label", "Scan with a Lightning wallet"));
    var holder = el("div", "zaptip-qr");
    body.appendChild(holder);

    try {
      new QRCode(holder, {
        text: invoice,
        width: 240,
        height: 240,
        correctLevel: QRCode.CorrectLevel.M,
      });
    } catch (err) {
      renderStatus(body, "err", "Could not render QR code", String(err));
      return;
    }

    var inv = el("textarea", "zaptip-invoice");
    inv.readOnly = true;
    inv.value = invoice;
    inv.addEventListener("click", function () {
      inv.select();
    });
    body.appendChild(inv);

    var copy = el("button", "zaptip-copy", "Copy invoice");
    copy.type = "button";
    copy.addEventListener("click", function () {
      try {
        navigator.clipboard.writeText(invoice);
        copy.textContent = "Copied!";
        setTimeout(function () {
          copy.textContent = "Copy invoice";
        }, 1500);
      } catch (e) {
        inv.select();
      }
    });
    body.appendChild(copy);
  }

  async function pay(body, ctx, sats) {
    try {
      renderLoading(body, "Fetching invoice…");

      var res = await sendToBackground({
        type: "zaptip-fetch-invoice",
        callback: ctx.callback,
        sats: sats,
      });
      if (!res || !res.ok) {
        throw new Error((res && res.error) || "Could not get an invoice.");
      }
      var invoice = res.invoice;

      renderLoading(body, "Requesting wallet…");
      var payResult = await weblnPay(invoice);
      if (payResult.hadWebln && payResult.ok) {
        renderStatus(body, "ok", "Payment sent!", null);
      } else {
        renderQR(body, invoice);
      }
    } catch (err) {
      renderStatus(
        body,
        "err",
        "Something went wrong",
        (err && err.message) || String(err)
      );
    }
  }

  function sendToBackground(msg) {
    return new Promise(function (resolve, reject) {
      try {
        chrome.runtime.sendMessage(msg, function (resp) {
          var lastErr = chrome.runtime.lastError;
          if (lastErr) {
            reject(new Error(lastErr.message));
            return;
          }
          resolve(resp);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  var payCounter = 0;
  function weblnPay(invoice) {
    return new Promise(function (resolve) {
      var id = "zap-" + ++payCounter + "-" + Date.now();
      var timer = setTimeout(function () {
        window.removeEventListener("message", onMsg);
        resolve({ hadWebln: false });
      }, 120000);

      function onMsg(event) {
        if (event.source !== window) return;
        var d = event.data;
        if (!d || d.zaptip !== true || d.type !== "pay-result" || d.id !== id) {
          return;
        }
        clearTimeout(timer);
        window.removeEventListener("message", onMsg);
        resolve(d);
      }

      window.addEventListener("message", onMsg);
      window.postMessage(
        { zaptip: true, type: "pay-request", id: id, invoice: invoice },
        "*"
      );
    });
  }

  function scan() {
    try {
      var address = findLightningAddress();
      if (address) {
        injectButton(address);
        return;
      }

      var segments = window.location.pathname.split("/").filter(Boolean);
      if (segments.length === 2) {
        var repoAddress = findRepoLightningAddress();
        if (repoAddress) {
          injectRepoButton(repoAddress);
          return;
        }
      }

      removeButton();
    } catch (e) {}
  }

  var scanTimer = null;
  function scheduleScan() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 150);
  }

  scheduleScan();
  document.addEventListener("turbo:load", scheduleScan);
  document.addEventListener("pjax:end", scheduleScan);
  window.addEventListener("popstate", scheduleScan);

  var observer = new MutationObserver(function () {
    if (!document.getElementById(BTN_ID)) scheduleScan();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
