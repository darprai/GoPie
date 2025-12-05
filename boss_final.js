// --- Boss Finale (definizione completa)
const BossFinal = {
  active: false,
  x: 0,
  y: 0,
  projectiles: [],
  thrown: 0,
  fireCooldown: 0,

  reset() {
    this.active = false;
    this.projectiles = [];
    this.thrown = 0;
    this.fireCooldown = 0;
  },

  start(x, y) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.projectiles = [];
    this.thrown = 0;
    this.fireCooldown = 1.5; // delay first throw
  },

  update(dt, player, camX) {
    if (!this.active) return;

    this.fireCooldown -= dt;
    
    // Shoot bottles toward player
    if (this.fireCooldown <= 0) {
      this.fireCooldown = 1.2; // every 1.2 seconds
      this.thrown++;

      const speed = 380;
      const angle = Math.atan2(player.y - this.y, (player.x - camX) - this.x);

      this.projectiles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed
      });
    }

    // Update projectiles
    for (let p of this.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Remove off-screen projectiles
    this.projectiles = this.projectiles.filter(
      p => p.x > -200 && p.x < 2000 && p.y > -200 && p.y < 1200
    );
  },

  render(ctx, camX) {
    if (!this.active) return;

    // draw boss
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(this.x - camX, this.y, 60, 80);

    // eyes
    ctx.fillStyle = "#fff";
    ctx.fillRect(this.x - camX + 12, this.y + 20, 12, 12);
    ctx.fillRect(this.x - camX + 36, this.y + 20, 12, 12);

    // draw projectiles
    for (let p of this.projectiles) {
      ctx.fillStyle = "#00ccff";
      ctx.fillRect(p.x - camX, p.y, 14, 14);
    }
  }
};
