// La dipendenza rectsOverlap è definita in rects.js
// La dipendenza Projectile è definita in projectile.js

const BossFinal = (() => {
  let active = false;
  let x = 0, y = 0, w = 60, h = 80;
  let projectiles = [];
  let thrown = 0;
  let maxProjectiles = 50;
  let projectileSpeed = 7;
  let cooldown = 700;
  let lastShot = 0;

  function reset() {
    active = false;
    projectiles = [];
    thrown = 0;
    lastShot = 0;
  }

  function start(startX, startY, config = {}) {
    active = true;
    x = startX;
    y = startY;
    w = config.w || 60; 
    h = config.h || 80;
    maxProjectiles = config.projectiles || 50;
    projectileSpeed = config.projectileSpeed || 7;
    cooldown = config.cooldown || 700;
    thrown = 0; // Azzera i lanci all'inizio
  }

  function shoot(player) {
    if (thrown >= maxProjectiles) return;

    // Bersaglia il giocatore
    const targetX = player.x + player.w / 2;
    const targetY = player.y + player.h / 2;
    const bossCenterX = x + w / 2;
    const bossCenterY = y + h / 2;

    const angle = Math.atan2(targetY - bossCenterY, targetX - bossCenterX);
    
    // Aggiungi un po' di dispersione (facoltativo, rende il livello più difficile)
    const randomAngleOffset = (Math.random() - 0.5) * 0.4; 
    const finalAngle = angle + randomAngleOffset;

    // Calcola la velocità in x e y
    // USIAMO projectileSpeed * 100 per scaling:
    const vx = Math.cos(finalAngle) * projectileSpeed * 100; 
    const vy = Math.sin(finalAngle) * projectileSpeed * 100;

    // Creiamo il proiettile e lo aggiungiamo all'array locale
    projectiles.push(new Projectile(bossCenterX - 8, bossCenterY - 8, vx, vy));
    thrown++;
    lastShot = performance.now();
  }

  function update(dt, player, camX) {
    if (!active) return;

    // 1. Logica di sparo
    if (thrown < maxProjectiles && performance.now() - lastShot > cooldown) {
      shoot(player);
    }

    // 2. Aggiornamento proiettili
    projectiles.forEach(p => p.update(dt));
    
    // 3. Rimuovi proiettili fuori dal campo visivo esteso
    projectiles = projectiles.filter(p => p.x > camX - 100 && p.x < camX + 1060 && p.y < 600);
    
    // La gestione delle collisioni e la logica di vittoria sono ora in game.js
  }

  function render(ctx, camX) {
    if (!active) return;

    // Draw Boss (Golruk)
    if (window.bossSprite && window.bossSprite.complete && window.bossSprite.width > 0) {
      ctx.drawImage(window.bossSprite, Math.round(x - camX), Math.round(y), w, h);
    } else {
      ctx.fillStyle = '#ff0000'; // Fallback Rettangolo
      ctx.fillRect(Math.round(x - camX), Math.round(y), w, h);
    }

    // Draw projectiles (Drink)
    projectiles.forEach(p => p.draw(ctx, camX));
  }

  return {
    start,
    reset,
    update,
    render,
    get active() { return active; },
    get thrown() { return thrown; },
    get projectiles() { return projectiles; }
  };
})();

window.BossFinal = BossFinal;
