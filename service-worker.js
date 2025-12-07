const cacheName = "pie-3lvl-cache-v3"; // Versione aggiornata

const assets = [
  // Files base
  "index.html",
  "style.css",
  "rects.js", 
  "engine.js",
  "projectile.js", 
  "player.js", 
  "boss_final.js",
  "game.js",
  "ending.js",
  "manifest.json",

  // Assets grafici
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
  "assets/sprites/palo.png",
  "assets/sprites/ragazza.png",
  "assets/sprites/macchina.png",
  "assets/sprites/icon-512.png", // Inserito per backup della BG

  // Musica
  "assets/music/music_normal.mp3",
  "assets/music/music_final.mp3",

  // Livelli
  "levels/level1.json",
  "levels/level2.json",
  "levels/level3.json"
];

// 1. Installazione e Cache di tutti gli asset
self.addEventListener("install", e => {
  console.log('[Service Worker] Installato. Cached assets:', cacheName);
  e.waitUntil(caches.open(cacheName).then(c => c.addAll(assets)));
});

// 2. Attivazione e pulizia delle vecchie cache
self.addEventListener('activate', event => {
    console.log('[Service Worker] Attivato. Pulizia vecchie cache.');
    const cacheWhitelist = [cacheName];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName); // Elimina le cache obsolete
                    }
                })
            );
        })
    );
});


// 3. Intercetta e Rispondi dalla Cache (strategia cache-first)
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
