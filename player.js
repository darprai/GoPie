const Player = function(x, y) {
    this.x = x;
    this.y = y;
    this.w = 40; 
    this.h = 40; 
    this.vx = 0;
    this.vy = 0;
    this.speed = 250; 
    this.jumpForce = -850; 
    this.gravity = 2500; 
    this.onGround = false;
    this.lives = 3; 
    this.score = 0;
    this.facingRight = true;
    this.isMoving = false;
    this.animationFrame = 0;
    this.animationTimer = 0;

    this.groundEpsilon = 5; 

    this.reset = function(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.lives = 3;
        this.score = 0;
    };
    
    this.collectHeart = function() {
        if (this.lives < 3) {
            this.lives++;
        }
        this.score += 50; 
    };

    this.hit = function() {
        this.lives--;
        if (this.lives > 0) {
            return true; 
        }
        return false; 
    };

    this.update = function(dt, input, platforms) {
        const keys = input.keys;
        
        // 1. INPUT ORIZZONTALE
        this.vx = 0;
        if (keys.ArrowLeft) {
            this.vx = -this.speed;
            this.facingRight = false;
            this.isMoving = true;
        } else if (keys.ArrowRight) {
            this.vx = this.speed;
            this.facingRight = true;
            this.isMoving = true;
        } else {
            this.isMoving = false;
        }

        // 2. LOGICA DI SALTO
        if ((keys.Space || keys.ArrowUp) && this.onGround) {
            this.vy = this.jumpForce;
            this.onGround = false;
        }

        // 3. GRAVITÀ
        this.vy += this.gravity * dt;

        // 4. MOVIMENTO
        let newX = this.x + this.vx * dt;
        let newY = this.y + this.vy * dt;

        // MORTE SE SI CADE SOTTO IL CANVAS (Y > 540)
        if (newY > 540) { 
            window.Game.onPlayerFell();
            return; 
        }

        // 5. COLLISIONI (X-axis)
        this.x = newX;
        for (let p of platforms) {
            if (rectsOverlap(this, p)) {
                if (this.vx > 0) {
                    this.x = p.x - this.w; 
                } else if (this.vx < 0) {
                    this.x = p.x + p.w;  
                }
                this.vx = 0; 
            }
        }
        
        // 6. COLLISIONI (Y-axis)
        this.y = newY;
        this.onGround = false;

        for (let p of platforms) {
            if (rectsOverlap(this, p)) {
                if (this.vy > 0) {
                    this.y = p.y - this.h + this.groundEpsilon; 
                    this.onGround = true;
                    this.vy = 0;
                } else if (this.vy < 0) {
                    this.y = p.y + p.h;
                    this.vy = 0;
                }
            }
        }
        
        if (this.onGround) {
            this.y = this.y - this.groundEpsilon;
        }

        // 7. Animazione
        if (this.isMoving) {
            this.animationTimer += dt;
            if (this.animationTimer > 0.1) {
                this.animationFrame = (this.animationFrame + 1) % 4;
                this.animationTimer = 0;
            }
        } else {
            this.animationFrame = 0; 
        }
    };

    this.draw = function(ctx, camX) {
        const x = Math.round(this.x - camX);
        const y = Math.round(this.y);
        
        let spriteToUse = window.playerSprite;
        let frameX = 0; 

        if (this.isMoving && window.runSprite.complete) {
            spriteToUse = window.runSprite;
            frameX = this.animationFrame * 40; 
        }

        if (Game.getCurLevelIndex() !== 2 && this.lives <= 1 && Math.floor(performance.now() / 100) % 2 === 0) {
             ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
             ctx.fillRect(x, y, this.w, this.h);
        }

        ctx.save();
        if (!this.facingRight) {
            ctx.scale(-1, 1);
            ctx.drawImage(spriteToUse, frameX, 0, this.w, this.h, -(x + this.w), y, this.w, this.h);
        } else {
            ctx.drawImage(spriteToUse, frameX, 0, this.w, this.h, x, y, this.w, this.h);
        }
        ctx.restore();
    };
};
