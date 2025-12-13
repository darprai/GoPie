// boss_final.js (AGGIORNATO: Boss 3x più grande, Proiettili più lenti)

// La dipendenza rectsOverlap è definita in rects.js
// La dipendenza Projectile è definita in projectile.js

const BossFinal = (() => {
  let active = false;
  // Triplichiamo le dimensioni predefinite per Golruk (60 -> 180, 80 -> 240)
  let x = 0, y = 0, w = 180, h = 240; 
  let projectiles = [];
  let thrown = 0;
  let maxProjectiles = 50;
  let projectileSpeed = 7;
  let cooldown = 1500; 
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
    // Usa le nuove dimensioni se non specificate nel JSON
    w = config.w || 180;  
    h = config.h || 240;
    maxProjectiles = config.projectiles || 50;
    projectileSpeed = config.projectileSpeed || 7;
    cooldown = config.cooldown || 1500; 
    thrown = 0; 
  }

  function shoot(player) {
    if (thrown >= maxProjectiles) return;

    const targetX = player.x + player.w / 2;
    const targetY = player.y + player.h / 2;
    const bossCenterX = x + w / 2;
    const bossCenterY = y + h / 2;

    const angle = Math.atan2(targetY - bossCenterY, targetX - bossCenterX);
    
    // Manteniamo un piccolo offset casuale per la mira
    const randomAngleOffset = (Math.random() - 0.5) * 0.4; 
    const finalAngle = angle + randomAngleOffset;

    // ************************************************************
    // MODIFICHE CHIAVE PER LA VELOCITÀ
    // ************************************************************
    // 1. Rimuovi o riduci drasticamente il 'speedMultiplier' per un movimento lento.
    // Il valore 1.5 è un buon punto di partenza per una velocità molto lenta (1.5 * 7 = 10.5)
    const speedMultiplier = 1.5; 
    const finalSpeed = projectileSpeed * speedMultiplier; 

    const vx = Math.cos(finalAngle) * finalSpeed; 
    const vy = Math.sin(finalAngle) * finalSpeed;
    // ************************************************************

    // NOTA: La dimensione del proiettile è definita in Projectile
    projectiles.push(new Projectile(bossCenterX - 10, bossCenterY - 10, vx, vy)); 
    thrown++;
    lastShot = performance.now();
  }
  
  // (La funzione update rimane invariata)
  function update(dt, player, camX) {
    if (!active) return;

    if (thrown < maxProjectiles && performance.now() - lastShot > cooldown) {
      shoot(player);
    }

    projectiles.forEach(p => p.update(dt));
    
    projectiles = projectiles.filter(p => p.x > camX - 100 && p.x < camX + 1060 && p.y < 600);
  }

  // (La funzione render rimane invariata, utilizza le nuove w/h)
  function render(ctx, camX) {
    if (!active) return;

    const drawX = Math.round(x - camX);
    const drawY = Math.round(y);

    if (window.bossSprite && window.bossSprite.complete && window.bossSprite.width > 0) {
      ctx.drawImage(window.bossSprite, drawX, drawY, w, h);
    } else {
      ctx.fillStyle = '#ff0000'; 
      ctx.fillRect(drawX, drawY, w, h);
    }

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
