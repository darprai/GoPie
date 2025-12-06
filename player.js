class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 40;
    this.h = 60;
    this.vx = 0;
    this.vy = 0;
    this.speed = 250;
    this.jumpForce = 450;
    this.grounded = false;
    this.gravity = 980;
    this.lives = 3; 
    this.score = 0;
    this.animTimer = 0;
    this.frame = 0;
    this.maxFrames = 8; 
  }

  update(dt, input, platforms) {
    const isLevel3 = window.Game.getCurLevelIndex() === 2;

    // Movement
    let dx = 0;
    if (!isLevel3) { // Movimento solo in level1 e level2
        if (input.keys['ArrowLeft'] || input.keys['a'] || input.touch.left) dx = -1;
        if (input.keys['ArrowRight'] || input.keys['d'] || input.touch.right) dx = 1;
    }
    
    this.vx = dx * this.speed;

    // Jumping
    if ((input.keys['ArrowUp'] || input.keys[' '] || input.touch.jump) && this.grounded) {
      this.vy = -this.jumpForce;
      this.grounded = false;
    }

    // Apply movement
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;

    // Animation
    this.animTimer += dt;
    if (this.animTimer > 0.1) {
        this.frame = (this.frame + 1) % this.maxFrames;
        this.animTimer = 0;
    }


    // Collision Detection
    this.grounded = false;
    for (let p of platforms) {
      // Collisione Y
      if (this.vy > 0 && rectsOverlap({x: this.x, y: this.y + this.vy * dt, w: this.w, h: this.h}, p)) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.grounded = true;
      } 
      // Collisione X (Non implementata per semplicità, il gioco è a scorrimento orizzontale)
    }

    // Gestione caduta nel vuoto (Trap: Morte istantanea se y è troppo alto/basso)
    if (this.y > 600 && !isLevel3) { // 600 è un valore approssimativo per "caduto di sotto"
      window.Game.onPlayerFell(); // Nuovo gestore per caduta
    }

    // Raccolta Cuori (Gestito in game.js per l'accesso ai dati del livello)
  }

  collectHeart() {
      this.lives = Math.min(5, this.lives + 1); // Max 5 cuori
      this.score += 50; // Punti per cuore
  }

  hit() {
    this.lives--;
    return this.lives > 0;
  }

  draw(ctx, camX) {
    const drawX = Math.round(this.x - camX);
    const drawY = Math.round(this.y);

    // Usa lo sprite di corsa o lo sprite statico
    let sprite = (Math.abs(this.vx) > 0.1 && this.grounded) ? window.runSprite : window.playerSprite;

    if (sprite.complete && sprite.width > 0) {
        // Disegno dello sprite Pie
        const sW = sprite.width / this.maxFrames;
        const sH = sprite.height;
        ctx.drawImage(
            sprite, 
            this.frame * sW, 0, sW, sH, 
            drawX, drawY, this.w, this.h
        );
    } else {
        // Fallback rettangolo
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(drawX, drawY, this.w, this.h);
    }
  }
}

window.Player = Player;
