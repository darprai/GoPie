const cacheName = "pie-3lvl-cache-v2";

const assets = [
  "index.html",
  "style.css",
  "engine.js",
  "entities.js",
  "game.js",
  "boss_final.js",
  "ending.js",
  "manifest.json",

  // assets grafici
  "assets/sprites/pie.png",
  "assets/sprites/run.png",
  "assets/sprites/golruk.png",
  "assets/sprites/heart.png",
  "assets/sprites/icon-192.png",
  "assets/sprites/icon-512.png",
  "assets/sprites/favicon.ico",

  // musica
  "assets/music/music_normal.mp3",
  "assets/music/music_final.mp3",

  // livelli
  "levels/level1.json",
  "levels/level2.json",
  "levels/level3.json"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(cacheName).then(c => c.addAll(assets)));
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
