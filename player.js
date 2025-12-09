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
    
    this.invincible = false;
    this.invincibilityTimer = 0;
    const INVINCIBILITY_DURATION = 1.5; 

    this.groundEpsilon = 5; 

    this.reset = function(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
    };
    
    this.resetFull = function(x, y) {
        this.reset(x, y);
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
        if (this.invincible) {
            return true; 
        }
        
        this.lives--;
        this.invincible = true;
        this.invincibilityTimer = 0; 
        
        if (this.lives > 0) {
            return true; 
        }
        return false; 
    };

    this.update = function(dt, input, platforms) {
        const keys = input;
        
        // GESTIONE INVINCIBILITÀ
        if (this.invincible) {
            this.invincibilityTimer += dt;
            if (this.invincibilityTimer >= INVINCIBILITY_DURATION) {
                this.invincible = false;
                this.invincibilityTimer = 0;
            }
        }
        
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
            const pRect = { x: p[0], y: p[1], w: p[2], h: p[3] };
            
            // Assicurati che rectsOverlap esista e sia definito globalmente in rects.js
            if (window.rectsOverlap && rectsOverlap(this, pRect)) { 
                if (this.vx > 0) {
                    this.x = pRect.x - this.w; 
                } else if (this.vx < 0) {
                    this.x = pRect.x + pRect.w; 
                }
                this.vx = 0; 
            }
        }
        
        // 6. COLLISIONI (Y-axis) - MODIFICATO PER MAGGIORE STABILITÀ
        this.y = newY;
        
        // Passo 6a: Prepara una posizione di fallback 'grounded' per il player
        // Creiamo un rettangolo appena SOTTO il player per vedere se tocchiamo terra
        const futureGroundRect = {
            x: this.x,
            y: this.y + 1, // 1 pixel sotto la posizione attuale
            w: this.w,
            h: this.h 
        };
        
        let wasOnGround = this.onGround;
        this.onGround = false; // Presumiamo che non siamo a terra fino a prova contraria

        for (let p of platforms) {
            const pRect = { x: p[0], y: p[1], w: p[2], h: p[3] };
            
            if (window.rectsOverlap && rectsOverlap(this, pRect)) {
                
                if (this.vy > 0) { // **IL PLAYER STA CADENDO**
                    // La collisione avviene dal basso (il player atterra)
                    this.y = pRect.y - this.h; // Sposta il player sopra la piattaforma
                    this.onGround = true;
                    this.vy = 0;
                    
                } else if (this.vy < 0) { // **IL PLAYER STA SALENDO (COLLISIONE DAL BASSO)**
                    // La collisione avviene dall'alto (il player colpisce con la testa)
                    this.y = pRect.y + pRect.h; // Sposta il player sotto la piattaforma
                    this.vy = 0; // Inverte la direzione (sbatte la testa)
                }
            }
        }
        
        // 6b: Controllo di stabilità: Se il player era a terra e VY è 0, 
        // usiamo un controllo aggiuntivo per vedere se siamo ANCORA a terra.
        if (this.vy === 0 && !this.onGround) {
             // Controlla se la posizione futureGroundRect si sovrappone a QUALSIASI piattaforma
             for (let p of platforms) {
                 const pRect = { x: p[0], y: p[1], w: p[2], h: p[3] };
                 if (window.rectsOverlap && rectsOverlap(futureGroundRect, pRect)) {
                     // Siamo a 1 pixel dal suolo, quindi siamo considerati a terra
                     this.onGround = true;
                     break; 
                 }
             }
        }


        // 7. Animazione
        if (this.isMoving && this.onGround) { 
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
        let spriteReady = false;

        if (this.isMoving && window.runSprite && window.runSprite.complete) {
            spriteToUse = window.runSprite;
            frameX = this.animationFrame * 40;
            spriteReady = true;
        } else if (window.playerSprite && window.playerSprite.complete) {
            spriteToUse = window.playerSprite;
            frameX = 0;
            spriteReady = true;
        }

        if (this.invincible && Math.floor(this.invincibilityTimer * 10) % 2 === 0) {
            // Non disegnare se invincibile e sul frame "off"
        } else if (spriteReady) {
            ctx.save();
            if (!this.facingRight) {
                ctx.scale(-1, 1);
                ctx.drawImage(spriteToUse, frameX, 0, 40, 40, -(x + this.w), y, this.w, this.h); 
            } else {
                ctx.drawImage(spriteToUse, frameX, 0, 40, 40, x, y, this.w, this.h);
            }
            ctx.restore();
        } else {
            // Disegna un quadrato solido se le sprite non sono pronte
            ctx.fillStyle = 'blue';
            ctx.fillRect(x, y, this.w, this.h);
        }

        if (window.Game && window.Game.getCurLevelIndex() !== 2 && this.lives <= 1 && Math.floor(performance.now() / 100) % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fillRect(x, y, this.w, this.h);
        }
    };
};

window.Player = Player;
