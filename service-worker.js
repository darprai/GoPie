const cacheName="pie-3lvl-cache";
const assets=[
"index.html","style.css","engine.js","entities.js","game.js","boss_final.js",
"ending.js","manifest.json","assets/sprites/icon-192.png","assets/sprites/icon-512.png"
];
self.addEventListener("install",e=>{
    e.waitUntil(caches.open(cacheName).then(c=>c.addAll(assets)))
});
self.addEventListener("fetch",e=>{
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))
});
