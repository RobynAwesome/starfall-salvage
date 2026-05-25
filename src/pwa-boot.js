import { KopanoVault } from "./kopano-vault.js";

const BUILD = "20260525-fullscreen-presence";
const SW_URL = `/service-worker.js?v=${encodeURIComponent(BUILD)}`;
const SW_RELOAD_KEY = `starfall-sw-refresh:${BUILD}`;

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

function forceFreshControllerReload() {
  try {
    if (sessionStorage.getItem(SW_RELOAD_KEY) === "1") {
      return;
    }
    sessionStorage.setItem(SW_RELOAD_KEY, "1");
  } catch (error) {
    console.warn("service worker reload marker unavailable", error);
  }

  window.location.reload();
}

function requestServiceWorkerUpdate(registration) {
  if (!registration?.update) {
    return;
  }
  registration.update().catch((error) => {
    console.warn("service worker update check failed", error);
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    let controllerRefreshArmed = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!controllerRefreshArmed) {
        return;
      }
      forceFreshControllerReload();
    });

    navigator.serviceWorker
      .register(SW_URL, { updateViaCache: "none" })
      .then((registration) => {
        controllerRefreshArmed = true;

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) {
            return;
          }
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && registration.waiting) {
              registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        requestServiceWorkerUpdate(registration);

        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            requestServiceWorkerUpdate(registration);
          }
        });

        window.addEventListener("focus", () => {
          requestServiceWorkerUpdate(registration);
        });
      })
      .catch((error) => console.warn("service worker registration failed", error));
  });
}
