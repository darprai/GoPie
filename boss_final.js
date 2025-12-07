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
    thrown = 0; 
  }

  function shoot(player) {
    if (thrown >= maxProjectiles) return;

    const targetX = player.x + player.w / 2;
    const targetY = player.y + player.h / 2;
    const bossCenterX = x + w / 2;
    const bossCenterY = y + h / 2;

    const angle = Math.atan2(targetY - bossCenterY, targetX - bossCenterX);
    
    const randomAngleOffset = (Math.random() - 0.5) * 0.4; 
    const finalAngle = angle + randomAngleOffset;

    const vx = Math.cos(finalAngle) * projectileSpeed * 100; 
    const vy = Math.sin(finalAngle) * projectileSpeed * 100;

    projectiles.push(new Projectile(bossCenterX - 8, bossCenterY - 8, vx, vy));
    thrown++;
    lastShot = performance.now();
  }

  function update(dt, player, camX) {
    if (!active) return;

    if (thrown < maxProjectiles && performance.now() - lastShot > cooldown) {
      shoot(player);
    }

    projectiles.forEach(p => p.update(dt));
    
    projectiles = projectiles.filter(p => p.x > camX - 100 && p.x < camX + 1060 && p.y < 600);
  }

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
