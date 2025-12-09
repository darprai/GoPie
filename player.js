// player.js (Versione Corretta con Fisica Bilanciata)

const Player = function(x, y) {
    this.x = x;
    this.y = y;
    this.w = 40; 
    this.h = 40; 
    this.vx = 0;
    this.vy = 0;
    this.speed = 250; 
    
    // **MODIFICATO: Fisica Più Lenta e Controllata**
    this.jumpForce = -700;   
    this.gravity = 1800;    
    
    this.onGround = false;
    this.score = 0; 
    this.facingRight = true;
    this.isMoving = false;
    this.animationFrame = 0;
    this.animationTimer = 0;
    
    this.invincible = false; 
    this.invincibilityTimer = 0;
    const INVINCIBILITY_DURATION = 1.0; // Ridotta l'invincibilità per non essere invasiva

    this.reset = function(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.invincible = true; 
        this.invincibilityTimer = 0;
    };
    
    this.resetFull = function(x, y) {
        this.reset(x, y);
        this.score = 0;
    };
    
    this.collectHeart = function() {
        this.score += 50; 
    };

    this.hit = function() {
        if (this.invincible) {
            return true;
        }
        window.Game.onPlayerDied();
        return false;
    };

    this.update = function(dt, input, platforms) {
        platforms = platforms || []; 
        const keys = input;
        
        // GESTIONE INVINCIBILITÀ (identica)
        if (this.invincible) {
            this.invincibilityTimer += dt;
            if (this.invincibilityTimer >= INVINCIBILITY_DURATION) {
                this.invincible = false;
                this.invincibilityTimer = 0;
            }
        }
        
        // 1. INPUT ORIZZONTALE (identica)
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

        // 2. LOGICA DI SALTO (identica)
        if ((keys.Space || keys.ArrowUp) && this.onGround) {
            this.vy = this.jumpForce;
            this.onGround = false; 
        }

        // 3. GRAVITÀ (identica, ma usa il nuovo valore this.gravity)
        if (!this.onGround) {
            this.vy += this.gravity * dt; 
        }

        // --- PRE-COLLISIONE: Reset di onGround
        if (this.vy !== 0) {
            this.onGround = false;
        }

        // 4. MOVIMENTO
        let newX = this.x + this.vx * dt;
        let newY = this.y + this.vy * dt;

        // MORTE SE SI CADE SOTTO IL CANVAS (Y > 540)
        if (newY > 540 + this.h * 2) { 
            window.Game.onPlayerFell();
            return; 
        }

        // 5. COLLISIONI (X-axis) (identica)
        this.x = newX;
        if (window.rectsOverlap) {
            for (let p of platforms) {
                const pRect = { x: p[0], y: p[1], w: p[2], h: p[3] };
                if (rectsOverlap(this, pRect)) { 
                    if (this.vx > 0) {
                        this.x = pRect.x - this.w; 
                    } else if (this.vx < 0) {
                        this.x = pRect.x + pRect.w; 
                    }
                    this.vx = 0; 
                }
            }
        }
        
        // 6. COLLISIONI (Y-axis) (identica)
        this.y = newY;
        if (window.rectsOverlap) {
            for (let p of platforms) {
                const pRect = { x: p[0], y: p[1], w: p[2], h: p[3] };
                
                if (pRect.w > 0 && pRect.h > 0 && rectsOverlap(this, pRect)) {
                    
                    const oldY = this.y - this.vy * dt;
                    
                    if (this.vy > 0 && oldY + this.h <= pRect.y) { 
                        // ATTERRAGGIO
                        this.y = pRect.y - this.h; 
                        this.onGround = true; 
                        this.vy = 0; 
                        
                    } else if (this.vy < 0 && oldY >= pRect.y + pRect.h) { 
                        // TESTATA
                        this.y = pRect.y + pRect.h; 
                        this.vy = 0; 
                    }
                }
            }
        }
        
        // 7. Animazione (identica)
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

        // ... (Logica di selezione sprite) ...
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
            
            // **PUNTO CRITICO RISOLTO: USIAMO SEMPRE SAVE/RESTORE**
            ctx.save();
            
            if (!this.facingRight) {
                // Specchia il contesto orizzontalmente
                ctx.scale(-1, 1);
                // Il disegno deve avvenire a X negativa (o fuori schermo) per apparire specchiato a X positiva
                ctx.drawImage(spriteToUse, frameX, 0, 40, 40, -(x + this.w), y, this.w, this.h); 
            } else {
                // Disegno normale
                ctx.drawImage(spriteToUse, frameX, 0, 40, 40, x, y, this.w, this.h);
            }
            
            // **RESTORE CRITICO**
            // Ripristina la matrice di trasformazione al suo stato precedente (normale)
            ctx.restore();
            
        } else {
            ctx.fillStyle = 'blue';
            ctx.fillRect(x, y, this.w, this.h);
        }
    };
};

window.Player = Player;
