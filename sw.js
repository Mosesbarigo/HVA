/* Huonville Primary School Assessment System - service worker
   Caches the app shell so it installs and opens offline (pin to taskbar /
   home screen). Firebase/network traffic is NOT cached so live sync keeps
   working. Bump CACHE_NAME whenever the icons or shell files change. */
const CACHE_NAME = 'hps-assessment-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/favicon-64.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (c) {
      return Promise.all(SHELL.map(function (u) {
        return c.add(u).catch(function () { /* ignore a missing optional asset */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Never cache Firebase / Google APIs / cross-origin CDN sync traffic.
  if (url.origin !== self.location.origin ||
      /firebase|firestore|googleapis|gstatic/i.test(url.href)) {
    return; // let the network handle it
  }

  // Cache-first for same-origin shell, with a network fallback that also
  // fills the cache for next time.
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(req, copy); }).catch(function () {});
        return res;
      }).catch(function () {
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
