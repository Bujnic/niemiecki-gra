// Zwiększ VERSION po każdej zmianie plików, żeby telefon pobrał nową wersję.
const VERSION = "v19";
const CACHE = `niemiecki-b2-${VERSION}`;
const FILES = [
  "./",
  "index.html",
  "styles.css",
  "przygoda.css",
  "theme.css",
  "data.js",
  "app.js",
  "extra.js",
  "speech.js",
  "badges.js",
  "words.js",
  "fx.js",
  "recruiter.js",
  "grammar.js",
  "kolos.js",
  "rewards.js",
  "adventure.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Najpierw internet: zawsze świeża wersja gry, a bez internetu – ostatnia zapisana kopia.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const sameOrigin = new URL(e.request.url).origin === location.origin;
  if (!sameOrigin) return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html"))
      )
  );
});
