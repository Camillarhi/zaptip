chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg) return;

  if (msg.type === "zaptip-fetch-lnurl") {
    fetchLnurl(msg.address)
      .then(sendResponse)
      .catch(function (err) {
        sendResponse({ ok: false, error: (err && err.message) || String(err) });
      });
    return true;
  }

  if (msg.type === "zaptip-fetch-invoice") {
    fetchInvoice(msg.callback, msg.sats)
      .then(sendResponse)
      .catch(function (err) {
        sendResponse({ ok: false, error: (err && err.message) || String(err) });
      });
    return true;
  }
});

async function fetchLnurl(address) {
  var parts = String(address).split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("Invalid Lightning address: " + address);
  }
  var user = parts[0];
  var domain = parts[1];

  var url =
    "https://" + domain + "/.well-known/lnurlp/" + encodeURIComponent(user);
  var resp = await fetch(url, { headers: { Accept: "application/json" } });
  if (!resp.ok) {
    throw new Error("LNURL fetch failed: HTTP " + resp.status);
  }
  var data = await resp.json();
  if (data.status === "ERROR") {
    throw new Error(data.reason || "LNURL server returned an error.");
  }
  if (!data.callback) {
    throw new Error("No callback URL in LNURL response.");
  }

  return {
    ok: true,
    callback: data.callback,
    minSendable: data.minSendable,
    maxSendable: data.maxSendable,
  };
}

async function fetchInvoice(callback, sats) {
  if (!callback) throw new Error("Missing callback URL.");
  if (!sats || sats <= 0) throw new Error("Enter a valid amount in sats.");

  var cb = new URL(callback);
  cb.searchParams.set("amount", String(sats * 1000));
  var resp = await fetch(cb.toString(), { headers: { Accept: "application/json" } });
  if (!resp.ok) {
    throw new Error("Invoice fetch failed: HTTP " + resp.status);
  }
  var data = await resp.json();
  if (data.status === "ERROR") {
    throw new Error(data.reason || "Could not get an invoice.");
  }
  if (!data.pr) {
    throw new Error("No invoice (pr) in callback response.");
  }

  return { ok: true, invoice: data.pr };
}
