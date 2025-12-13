const cacheName = "pie-3lvl-cache-v3"; 

const assets = [
  // Files base
  "./",                // <--- IMPORTANTE: Cacha la root del sito
  "index.html",
  // "style.css",      // <--- ATTENZIONE: Toglilo se il CSS è dentro index.html!
  "rects.js", 
  "engine.js",
  "projectile.js", 
  "player.js", 
  "boss_final.js",
  "game.js",
  // "ending.js",      // <--- Controlla: nel tuo index.html non c'era <script src="ending.js">. Se non lo usi, toglilo!
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
  "assets/sprites/win.png",  // <--- AGGIUNTO: Fondamentale per la schermata finale!

  // Musica
  "assets/music/music_normal.mp3",
  "assets/music/music_final.mp3",

  // Livelli
  "levels/level1.json",
  "levels/level2.json",
  "levels/level3.json"
];

// 1. Installazione
self.addEventListener("install", e => {
  console.log('[Service Worker] Installazione v3...');
  e.waitUntil(
    caches.open(cacheName)
    .then(c => c.addAll(assets))
    .catch(err => console.error("[SW ERROR] Un file della lista non esiste!", err)) // Ti aiuta a trovare errori
  );
});

// 2. Attivazione e pulizia
self.addEventListener('activate', event => {
    console.log('[Service Worker] Attivato. Pulizia vecchie cache.');
    const cacheWhitelist = [cacheName];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 3. Fetch
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
