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
    this.fireCooldown = 1.2;
  },

  update(dt, player, camX) {
    if (!this.active) return;

    this.fireCooldown -= dt;

    // --- Spara proiettile ---
    if (this.fireCooldown <= 0) {
      this.fireCooldown = 1.2;
      this.thrown++;

      const speed = 380;

      // Coordinate reali del player rispetto alla mappa
      const realPlayerX = player.x;
      const realPlayerY = player.y;

      // Calcolo angolo corretto verso il player
      const angle = Math.atan2(
        realPlayerY - this.y,
        realPlayerX - this.x
      );

      this.projectiles.push({
        x: this.x + 40,
        y: this.y + 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
    }

    // --- Aggiorna proiettili ---
    for (let p of this.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // --- Rimuovi proiettili fuori schermo ---
    this.projectiles = this.projectiles.filter(
      p => p.x > -300 && p.x < 6000 && p.y > -300 && p.y < 2000
    );
  },

  render(ctx, camX) {
    if (!this.active) return;

    // Disegno boss
    if (this.sprite.complete && this.sprite.width > 0) {
      ctx.drawImage(this.sprite, this.x - camX, this.y, 80, 100);
    }

    // Disegno proiettili
    ctx.fillStyle = "#00ccff";
    for (let p of this.projectiles) {
      ctx.fillRect(p.x - camX, p.y, 14, 14);
    }
  }
};

BossFinal.load();
