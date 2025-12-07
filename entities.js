// -----------------------------------------------------
//  SPRITE DEFINITIONS
// -----------------------------------------------------
const playerSprite = new Image();
playerSprite.src = "assets/sprites/run.png";

const bossSprite = new Image();
bossSprite.src = "assets/sprites/golruk.png";

// Nuovi Sprite per il livello Discoteca/Party
const djDiscSprite = new Image();
djDiscSprite.src = "assets/sprites/djdisc.png";

const discoBallSprite = new Image();
discoBallSprite.src = "assets/sprites/disco.png";

const drinkEnemySprite = new Image();
drinkEnemySprite.src = "assets/sprites/drink.png";


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
      // Adattiamo la collisione per supportare sia l'array che l'oggetto (livelli vecchi e nuovi)
      const plat = Array.isArray(p) 
        ? { x: p[0], y: p[1], w: p[2], h: p[3] }
        : { x: p.x, y: p.y, w: p.w, h: p.h };

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
//  PROJECTILE CLASS (per il Boss)
// -----------------------------------------------------
class Projectile {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 16;
    this.vx = vx;
    this.vy = vy;
    this.color = '#ff0000';
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx, camX) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(Math.round(this.x - camX + this.w/2), Math.round(this.y + this.h/2), this.w/2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// -----------------------------------------------------
//  EXPORT GLOBAL
// -----------------------------------------------------
window.Player = Player;
window.rectsOverlap = rectsOverlap;
window.Projectile = Projectile;
window.bossSprite = bossSprite;
// Esportiamo i nuovi sprite
window.djDiscSprite = djDiscSprite;
window.discoBallSprite = discoBallSprite;
window.drinkEnemySprite = drinkEnemySprite;
