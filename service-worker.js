const cacheName = "pie-3lvl-cache-v3"; // Versione aggiornata

const assets = [
  "index.html",
  "style.css",
  "rects.js", // NUOVO
  "engine.js",
  "projectile.js", // NUOVO
  "player.js", // NUOVO
  "boss_final.js",
  "game.js",
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
  "assets/sprites/disco.png",
  "assets/sprites/djdisc.png",
  "assets/sprites/drink.png",
  // Riferimenti per la sequenza finale (anche se solo rettangoli, vanno cachati)
  "assets/sprites/palo.png",
  "assets/sprites/ragazza.png",
  "assets/sprites/macchina.png",

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
