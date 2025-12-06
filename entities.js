// -----------------------------------------------------
//  SPRITE PLAYER
// -----------------------------------------------------
const playerSprite = new Image();
playerSprite.src = "assets/sprites/run.png";
let playerSpriteLoaded = false;
playerSprite.onload = () => { playerSpriteLoaded = true; };

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
    this.x = x || 80;
    this.y = y || 300;
    this.w = 40;
    this.h = 56;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.color = "#ffd86b"; // fallback color se sprite non caricata
    this.score = 0;
  }

  update(dt, input, platforms) {
    const maxSpeed = 260;
    const jumpPower = 520;

    // input
    const left = input.keys?.["ArrowLeft"] || input.keys?.["a"] || input.touch?.left;
    const right = input.keys?.["ArrowRight"] || input.keys?.["d"] || input.touch?.right;
    const up = input.keys?.["ArrowUp"] || input.keys?.["w"] || input.keys?.[" "] || input.touch?.jump;

    // movimento orizzontale
    if (left && !right) this.vx = -maxSpeed;
    else if (right && !left) this.vx = maxSpeed;
    else this.vx = 0;

    // gravità
    this.vy += 1400 * dt;

    // salto
    if (up && this.onGround) {
      this.vy = -jumpPower;
      this.onGround = false;
    }

    // movimento
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // collisioni con piattaforme
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

    // limite a sinistra
    if (this.x < 0) this.x = 0;
  }

  draw(ctx, camX) {
    if (playerSpriteLoaded) {
      ctx.drawImage(
        playerSprite,
        Math.round(this.x - camX),
        Math.round(this.y),
        this.w,
        this.h
      );
    } else {
      // fallback rettangolo
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
