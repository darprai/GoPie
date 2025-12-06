class Projectile {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx / 100; // Scalato per una velocità più gestibile in update
    this.vy = vy / 100;
    this.w = 16;
    this.h = 16;
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
  }

  draw(ctx, camX) {
    if (window.drinkEnemySprite.complete) {
      ctx.drawImage(window.drinkEnemySprite, Math.round(this.x - camX), Math.round(this.y), this.w, this.h);
    } else {
      // Fallback
      ctx.fillStyle = '#00FFFF';
      ctx.fillRect(Math.round(this.x - camX), Math.round(this.y), this.w, this.h);
    }
  }
}

window.Projectile = Projectile;
