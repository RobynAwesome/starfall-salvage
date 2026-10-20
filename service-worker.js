const CACHE_NAME = "starfall-salvage-v20261020-sovereign-hangar-mki";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./src/game.js",
  "./src/pwa-boot.js",
  "./src/kopano-vault.js",
  "./kopano-flight-mark.svg",
  "./manifest.webmanifest",
  "./hangar/index.html",
  "./hangar/styles.css",
  "./hangar/app.bundle.js",
  "./hangar/evidence/mk1-gameplay/mk1-triangles.json"
];

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    const url = new URL(event.request.url);
    const isHangar =
      url.pathname.endsWith("/hangar/") ||
      url.pathname.endsWith("/hangar/index.html") ||
      url.pathname.includes("/hangar/");
    const fallbackRoute = isHangar ? "./hangar/index.html" : "./index.html";

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy);
              if (isHangar) {
                cache.put("./hangar/index.html", response.clone());
              } else {
                cache.put("./index.html", response.clone());
                cache.put("./", response.clone());
              }
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request, { ignoreSearch: true }).then((cached) => {
            if (cached) return cached;
            return caches.match(fallbackRoute).then((routeCached) => {
              if (routeCached) return routeCached;
              return caches.match("./").then((rootCached) => rootCached || caches.match("./index.html"));
            });
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((response) => {
      if (response) return response;
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok && event.request.method === "GET") {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      });
    })
  );
});
