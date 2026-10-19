const CACHE_NAME = "starfall-salvage-v20260526-ready-shell";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./src/game.js",
  "./src/pwa-boot.js",
  "./src/kopano-vault.js",
  "./kopano-flight-mark.svg",
  "./manifest.webmanifest"
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
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./", copy));
          return response;
        })
        .catch(() => caches.match("./").then((response) => response || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request)));
});
