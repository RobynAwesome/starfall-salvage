const CACHE_NAME = "starfall-salvage-v20260521-curve-anticipation";

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
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
