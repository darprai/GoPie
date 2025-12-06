// --- Boss Finale con sprite Golruk ---
const BossFinal = {
  active: false,
  x: 0,
  y: 0,
  projectiles: [],
  thrown: 0,
  fireCooldown: 0,

  sprite: null,

  load() {
    this.sprite = new Image();
    this.sprite.src = "assets/sprites/golruk.png";
  },

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
    this.fireCooldown = 1.5;
  },

  update(dt, player, camX) {
    if (!this.active) return;

    this.fireCooldown -= dt;

    if (this.fireCooldown <= 0) {
      this.fireCooldown = 1.2;
      this.thrown++;

      const speed = 380;
      const angle = Math.atan2(
        player.y - this.y,
        (player.x - camX) - this.x
      );

      this.projectiles.push({
        x: this.x + 40,
        y: this.y + 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
    }

    // Update proiettili
    for (let p of this.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Rimuovi proiettili fuori schermo
    this.projectiles = this.projectiles.filter(
      p => p.x > -200 && p.x < 2000 && p.y > -200 && p.y < 1200
    );
  },

  render(ctx, camX) {
    if (!this.active) return;

    // Boss con sprite vero
    if (this.sprite.complete) {
      ctx.drawImage(this.sprite, this.x - camX, this.y, 80, 100);
    }

    // Proiettili (semplici)
    ctx.fillStyle = "#00ccff";
    for (let p of this.projectiles) {
      ctx.fillRect(p.x - camX, p.y, 14, 14);
    }
  }
};

BossFinal.load();
