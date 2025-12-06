// **************************************************
// ATTENZIONE: Il codice JSON nel tuo input era
// probabilmente destinato a level3.json. Ho rimosso
// il JSON e inserito il codice JS della classe BossFinal.
// **************************************************

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
    maxProjectiles = config.projectiles || 50;
    projectileSpeed = config.projectileSpeed || 7;
    cooldown = config.cooldown || 700;
  }

  function shoot(player) {
    if (thrown >= maxProjectiles) return;

    const targetX = player.x + player.w / 2;
    const targetY = player.y + player.h / 2;
    const bossCenterX = x + w / 2;
    const bossCenterY = y + h / 2;

    const angle = Math.atan2(targetY - bossCenterY, targetX - bossCenterX);
    const vx = Math.cos(angle) * projectileSpeed * 100; // *100 per scaling
    const vy = Math.sin(angle) * projectileSpeed * 100;

    projectiles.push(new Projectile(bossCenterX - 8, bossCenterY - 8, vx, vy));
    thrown++;
    lastShot = performance.now();
  }

  function update(dt, player, camX) {
    if (!active) return;

    // Shooting logic
    if (thrown < maxProjectiles && performance.now() - lastShot > cooldown) {
      shoot(player);
    }

    // Update projectiles
    projectiles.forEach(p => p.update(dt));
    // Remove projectiles out of bounds
    projectiles = projectiles.filter(p => p.x > camX - 100 && p.x < camX + 1060);

    // Collision check
    const game = window.Game; // Access Game module
    projectiles.forEach((p, index) => {
      if (rectsOverlap(p, player)) {
        game.onPlayerHit(); // Chiama la funzione di gestione del colpo in game.js
        projectiles.splice(index, 1); // Rimuovi il proiettile
      }
    });

  }

  function render(ctx, camX) {
    if (!active) return;

    // Draw Boss
    if (bossSprite.complete && bossSprite.width > 0) {
      ctx.drawImage(bossSprite, Math.round(x - camX), Math.round(y), w, h);
    } else {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(Math.round(x - camX), Math.round(y), w, h);
    }

    // Draw projectiles
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
