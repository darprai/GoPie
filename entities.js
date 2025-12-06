// -----------------------------------------------------
//  SPRITE PLAYER
// -----------------------------------------------------
const playerSprite = new Image();
playerSprite.src = "assets/sprites/run.png";

// -----------------------------------------------------
//  HELPERS
// -----------------------------------------------------
function rectsOverlap(a, b) {
  return !(
    a.x + a.w < b.x ||
    a.x > b.x + b.w ||
    a.y + a.h < b.y ||
    a.y > b.y + b.h
  );
}

// -----------------------------------------------------
//  PLAYER CLASS
// -----------------------------------------------------
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 40;
    this.h = 56;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.color = "#ffd86b"; // fallback color
    this.score = 0;
  }

  update(dt, input, platforms) {
    const maxSpeed = 260;
    const jumpPower = 520;

    const left = input.keys["ArrowLeft"] || input.keys["a"] || input.touch.left;
    const right = input.keys["ArrowRight"] || input.keys["d"] || input.touch.right;
    const up = input.keys["ArrowUp"] || input.keys["w"] || input.keys[" "] || input.touch.jump;

    // horizontal movement
    if (left && !right) this.vx = -maxSpeed;
    else if (right && !left) this.vx = maxSpeed;
    else this.vx = 0;

    // gravity
    this.vy += 1400 * dt;

    // jump
    if (up && this.onGround) {
      this.vy = -jumpPower;
      this.onGround = false;
    }

    // move
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // platform collisions
    this.onGround = false;
    for (let p of platforms) {
      const plat = { x: p[0], y: p[1], w: p[2], h: p[3] };
      if (
        this.x + this.w > plat.x &&
        this.x < plat.x + plat.w &&
        this.y + this.h > plat.y &&
        this.y + this.h < plat.y + plat.h + 20 &&
        this.vy >= 0
      ) {
        this.y = plat.y - this.h;
        this.vy = 0;
        this.onGround = true;
      }
    }

    if (this.x < 0) this.x = 0;
  }

  draw(ctx, camX) {
    if (playerSprite.complete && playerSprite.width > 0) {
      ctx.drawImage(
        playerSprite,
        Math.round(this.x - camX),
        Math.round(this.y),
        this.w,
        this.h
      );
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(
        Math.round(this.x - camX),
        Math.round(this.y),
        this.w,
        this.h
      );
    }
  }
}

// -----------------------------------------------------
//  EXPORT GLOBAL
// -----------------------------------------------------
window.Player = Player;
window.rectsOverlap = rectsOverlap;
