/* Insight POS — Service Worker (offline / local-first)
   Cachea el "app shell" para que el sistema funcione sin internet. */
var CACHE = "insight-pos-v3";
var ASSETS = [
  "app.html", "pos.html", "cobros.html", "nomina.html", "tributario.html",
  "manifest.webmanifest",
  "assets/styles.css",
  "assets/restaurant.css",
  "assets/app-pos.css",
  "assets/config.js",
  "assets/store.js",
  "assets/gate.js",
  "assets/hub.js",
  "assets/pos-app.js",
  "assets/cobros.js",
  "assets/nomina.js",
  "assets/tributario.js",
  "assets/icon.svg",
  "assets/icon-maskable.svg"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // addAll falla si un recurso no está; usamos add individual tolerante
      return Promise.all(ASSETS.map(function (url) {
        return c.add(url).catch(function () { return null; });
      }));
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Estrategia: cache-first para los assets del shell, network-first para el resto.
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // solo mismo origen
  if (url.pathname.indexOf("/api/") === 0) return;  // nunca cachear la API

  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        // sin red y sin cache: si es navegación, servir app.html
        if (req.mode === "navigate") return caches.match("app.html");
      });
    })
  );
});
