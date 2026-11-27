/* Mat la viteză – lucrul fără internet pe telefon (doar pe site, nu din fișier).
   La fiecare versiune nouă se schimbă VER și ?v= din index.html (testul test/offline.test.js verifică potrivirea). */
const VER = "mlv-2026112801";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable.png", "apple-touch-icon.png",
  "fonts/nunito-latin.woff2", "fonts/nunito-latin-ext.woff2",
  "stil.css?v=2026112801", "sah.js?v=2026112801", "reguli.js?v=2026112801", "liga.js?v=2026112801", "efecte.js?v=2026112801", "qr.js?v=2026112801", "copie.js?v=2026112801", "ui.js?v=2026112801"];

self.addEventListener("install", e => { e.waitUntil(caches.open(VER).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    // pagina: întâi internetul (ca să vină versiunea nouă), iar fără internet – copia salvată
    e.respondWith(Promise.race([fetch(req), new Promise((_, no) => setTimeout(no, 4000))])
      .then(r => { const c = r.clone(); caches.open(VER).then(x => x.put("./", c)); return r; })
      .catch(() => caches.match("./").then(r => r || caches.match("index.html"))));
    return;
  }
  // fișierele (au versiunea în nume): întâi copia salvată
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => {
    if (n.ok) { const c = n.clone(); caches.open(VER).then(x => x.put(req, c)); }
    return n;
  })));
});
