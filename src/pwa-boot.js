import { KopanoVault } from "./kopano-vault.js";

const BUILD = "20260525-fullscreen-weapons";

window.__kopanoVault = null;
window.__kopanoVaultReady = KopanoVault.open()
  .then((vault) => {
    window.__kopanoVault = vault;
    return vault;
  })
  .catch((error) => {
    console.warn("kopano_vault: boot deferred", error);
    return null;
  });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`/service-worker.js?v=${encodeURIComponent(BUILD)}`)
      .catch((error) => console.warn("service worker registration failed", error));
  });
}
