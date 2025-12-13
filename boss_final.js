// boss_final.js (AGGIORNATO: con logica di disattivazione)

// La dipendenza rectsOverlap è definita in rects.js
// La dipendenza Projectile è definita in projectile.js

const BossFinal = (() => {
  let active = false;
  // Dimensioni predefinite triplicate: 60->180, 80->240
  let x = 0, y = 0, w = 180, h = 240; 
  let projectiles = [];
  let thrown = 0;
  let maxProjectiles = 50;
  let projectileSpeed = 10; // Nuovo default basso
  let cooldown = 1500; // Cooldown di 1.5 secondi
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
    // Usa 180/240 se non specificato nel JSON
    w = config.w || 180; 
    h = config.h || 240;
    maxProjectiles = config.projectiles || 50;
    projectileSpeed = config.projectileSpeed || 10;
    cooldown = config.cooldown || 1500; 
    thrown = 0; 
  }

  function shoot(player) {
    if (thrown >= maxProjectiles) return;

    const targetX = player.x + player.w / 2;
    const targetY = player.y + player.h / 2;
    const bossCenterX = x + w / 2;
    const bossCenterY = y + h / 2;

    // Calcola l'angolo verso il giocatore
    const angle = Math.atan2(targetY - bossCenterY, targetX - bossCenterX);
    
    // Piccolo offset per aggiungere una sfida
    const randomAngleOffset = (Math.random() - 0.5) * 0.4; 
    const finalAngle = angle + randomAngleOffset;

    // Calcolo della velocità finale: LENTA (10 * 5 = 50 unità)
    const speedMultiplier = 5; 
    const finalSpeed = projectileSpeed * speedMultiplier; 

    const vx = Math.cos(finalAngle) * finalSpeed; 
    const vy = Math.sin(finalAngle) * finalSpeed;

    // Crea il proiettile. Sottraiamo 30 (metà della nuova larghezza/altezza 60) per centrarlo
    projectiles.push(new window.Projectile(bossCenterX - 30, bossCenterY - 30, vx, vy)); 
    thrown++;
    lastShot = performance.now();
  }

  function update(dt, player, camX) {
    if (!active) return;

    // Controlla il cooldown e spara
    if (thrown < maxProjectiles && performance.now() - lastShot > cooldown) {
      shoot(player);
    }

    projectiles.forEach(p => p.update(dt));
    
    // Filtra i proiettili fuori dallo schermo
    projectiles = projectiles.filter(p => p.x > camX - 100 && p.x < camX + 1060 && p.y < 600);
    
    // NUOVO: Disattiva il boss solo quando ha lanciato tutto E lo schermo è libero da proiettili
    if (thrown >= maxProjectiles && projectiles.length === 0) {
        active = false;
    }
  }

  function render(ctx, camX) {
    if (!active) return;

    const drawX = Math.round(x - camX);
    const drawY = Math.round(y);

    // Disegna l'immagine di Golruk (w e h sono le nuove dimensioni 180x240)
    if (window.bossSprite && window.bossSprite.complete && window.bossSprite.width > 0) {
      ctx.drawImage(window.bossSprite, drawX, drawY, w, h);
    } else {
      ctx.fillStyle = '#ff0000'; 
      ctx.fillRect(drawX, drawY, w, h);
    }

    // I proiettili vengono disegnati grandi da Projectile.draw()
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
