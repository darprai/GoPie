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
            
            if (window.rectsOverlap && rectsOverlap(this, pRect)) { 
                if (this.vx > 0) {
                    this.x = pRect.x - this.w; 
                } else if (this.vx < 0) {
                    this.x = pRect.x + pRect.w; 
                }
                this.vx = 0; 
            }
        }
        
        // 6. COLLISIONI (Y-axis) - MODIFICATO PER LA STABILITÀ
        this.y = newY;
        this.onGround = false;
        
        // Rivediamo la collisione Y: si assume che la rectsOverlap sia la funzione globale

        let fell = true; // Assumiamo che stia cadendo a meno che non si trovi su qualcosa

        for (let p of platforms) {
            const pRect = { x: p[0], y: p[1], w: p[2], h: p[3] };
            
            if (window.rectsOverlap && rectsOverlap(this, pRect)) {
                
                if (this.vy > 0) { // **IL PLAYER STA CADENDO**
                    // Sposta il player sopra la piattaforma
                    this.y = pRect.y - this.h; 
                    this.onGround = true;
                    this.vy = 0;
                    fell = false;
                    
                } else if (this.vy < 0) { // **IL PLAYER STA SALENDO (COLLISIONE DAL BASSO)**
                    // Sposta il player sotto la piattaforma
                    this.y = pRect.y + pRect.h;
                    this.vy = 0;
                }
            }
        }
        
        // Se dopo aver controllato tutte le piattaforme, il player è ancora a terra
        if (this.vy === 0) {
             // Controllo aggiuntivo per assicurarsi che non si muova lateralmente fuori da una piattaforma
             // Se il player è su una piattaforma, lo consideriamo a terra anche se vy=0
             // Manteniamo this.onGround = (this.vy === 0 && !fell);
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
        // ... (Il resto della funzione draw rimane invariato)
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

        // Disegno vita bassa/invincibilità visiva
        if (window.Game && window.Game.getCurLevelIndex() !== 2 && this.lives <= 1 && Math.floor(performance.now() / 100) % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fillRect(x, y, this.w, this.h);
        }
    };
};

window.Player = Player;
