const BossFinal = (() => {
  let active = false;
  let x = 0, y = 0;
  let cooldown = 0;
  let thrown = 0;
  let projectiles = [];

  function reset() {
    active = false;
    x = y = cooldown = thrown = 0;
    projectiles = [];
  }

  function start(px, py) {
    active = true;
    x = px;
    y = py;
    thrown = 0;
    projectiles = [];
  }

  function update(dt, player, camX) {
    if (!active) return;

    cooldown -= dt * 1000;
    if (cooldown <= 0 && thrown < 50) {
      projectiles.push({x: x, y: y, vx: (player.x - x) / 50 * 7, vy: -5});
      cooldown = 700;
      thrown++;
    }

    projectiles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 1400 * dt; // gravity
      if (rectsOverlap({x:p.x, y:p.y, w:10, h:10},{x:player.x,y:player.y,w:player.w,h:player.h})) {
        player.vy = -300; // knockback
      }
    });

    projectiles = projectiles.filter(p => p.y < 540); // remove off-screen
  }

  function render(ctx, camX) {
    if (!active) return;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(Math.round(x-camX), Math.round(y), 60, 60);

    ctx.fillStyle = '#00ffcc';
    projectiles.forEach(p => ctx.fillRect(Math.round(p.x-camX), Math.round(p.y), 10, 10));
  }

  return { active, start, update, render, reset, thrown, projectiles };
})();
