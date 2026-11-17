// ===== Service worker : permet d'ouvrir l'application sans Internet =====
// Pour publier une mise à jour, change le numéro de VERSION.
const VERSION = "lecons-v1";
const FICHIERS = [
  "./", "./index.html", "./style.css", "./app.js", "./lexique.js", "./manifest.json",
  "./icones/icone-192.png", "./icones/icone-512.png", "./icones/favicon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(c => c !== VERSION && c !== "lecons-outils").map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                 // envois (OCR, IA) : toujours par Internet
  const url = new URL(req.url);

  // Outil de lecture des photos (Tesseract) : gardé après le premier téléchargement
  if (url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(caches.open("lecons-outils").then(async c => {
      const garde = await c.match(req);
      if (garde) return garde;
      const rep = await fetch(req);
      if (rep.ok) c.put(req, rep.clone());
      return rep;
    }));
    return;
  }

  // Fichiers de l'application : version gardée tout de suite, mise à jour en arrière-plan
  if (url.origin === self.location.origin) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const garde = await c.match(req, { ignoreSearch: true });
      const reseau = fetch(req).then(rep => { if (rep.ok) c.put(req, rep.clone()); return rep; }).catch(() => garde);
      return garde || reseau;
    }));
  }
});
