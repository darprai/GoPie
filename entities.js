// --- helpers
function rectsOverlap(a,b){
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

// --- Player
class Player {
  constructor(x,y){
    this.x = x; this.y = y;
    this.w = 40; this.h = 56;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.color = '#ffd86b';
    this.score = 0;
  }

  update(dt, input, platforms){
    const accel = 1600;
    const maxSpeed = 260;
    const jumpPower = 520;
    // horizontal control: keyboard or touch
    let left = input.keys['ArrowLeft'] || input.keys['a'] || input.touch.left;
    let right = input.keys['ArrowRight'] || input.keys['d'] || input.touch.right;
    let up = input.keys['ArrowUp'] || input.keys['w'] || input.keys[' '] || input.touch.jump;

    if (left && !right) this.vx = -maxSpeed;
    else if (right && !left) this.vx = maxSpeed;
    else this.vx = 0;

    // gravity
    this.vy += 1400 * dt;

    // jump
    if (up && this.onGround) { this.vy = -jumpPower; this.onGround = false; }

    // integrate
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // simple platform collision (iterate)
    this.onGround = false;
    for (let p of platforms){
      const plat = { x: p[0], y: p[1], w: p[2], h: p[3] };
      if (this.x + this.w > plat.x && this.x < plat.x + plat.w){
        // falling onto platform?
        if (this.y + this.h > plat.y && this.y + this.h < plat.y + plat.h + 20 && this.vy >= 0){
          this.y = plat.y - this.h;
          this.vy = 0;
          this.onGround = true;
        }
      }
    }
    // keep inside left bound
    if (this.x < 0) this.x = 0;
  }

  draw(ctx, camX){
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.round(this.x - camX), Math.round(this.y), this.w, this.h);
    // simple face detail
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(Math.round(this.x - camX)+10, Math.round(this.y)+18, 4,4);
    ctx.fillRect(Math.round(this.x - camX)+26, Math.round(this.y)+18, 4,4);
  }
}
