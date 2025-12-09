// player.js (Versione con caduta illimitata, correzioni grafiche e Logica Collisione Y FINALIZZATA)

const Player = function(x, y) {
    this.x = x;
    this.y = y;
    this.w = 40; 
    this.h = 40; 
    this.vx = 0;
    this.vy = 0;
    this.speed = 250; 
    
    // Fisica
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
    const INVINCIBILITY_DURATION = 1.0; 

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

        // **NOTA: La logica di morte per caduta è disabilitata come richiesto.**

        // 5. COLLISIONI (X-axis) - Spostamento e Blocco Laterale
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
        
        // 6. COLLISIONI (Y-axis) - Atterraggio, Testata e Blocco Sotto
        this.y = newY;
        if (window.rectsOverlap) {
            for (let p of platforms) {
                const pRect = { x: p[0], y: p[1], w: p[2], h: p[3] };
                
                if (pRect.w > 0 && pRect.h > 0 && rectsOverlap(this, pRect)) {
                    
                    const oldY = this.y - this.vy * dt;
                    
                    if (this.vy > 0 && oldY + this.h <= pRect.y) { 
                        // **ATTERRAGGIO (dal sopra) - Caso standard**
                        this.y = pRect.y - this.h; 
                        this.onGround = true; 
                        this.vy = 0; 
                        
                    } else if (this.vy < 0 && oldY >= pRect.y + pRect.h) { 
                        // **TESTATA (dal sotto) - Caso standard**
                        this.y = pRect.y + pRect.h; 
                        this.vy = 0; 
                        
                    } else if (this.vy > 0 && this.y + this.h > pRect.y && this.y < pRect.y) {
                         // **CORREZIONE SPURIA 1: Atterraggio mancato per frame rate alto**
                         this.y = pRect.y - this.h; 
                         this.onGround = true; 
                         this.vy = 0; 
                         
                    } else if (this.y + this.h > pRect.y && this.y < pRect.y + pRect.h) {
                         // **CORREZIONE CRITICA: Gestione dell'intrappolamento/passaggio sotto**
                         if (this.vy >= 0) { // Se stiamo cadendo o siamo fermi in Y
                              if (this.y + this.h / 2 < pRect.y + pRect.h / 2) {
                                  // Siamo più vicini alla cima della piattaforma -> forziamo l'atterraggio
                                  this.y = pRect.y - this.h;
                                  this.onGround = true;
                                  this.vy = 0;
                              } else {
                                  // Siamo più vicini al fondo della piattaforma -> spingiamo giù
                                  this.y = pRect.y + pRect.h;
                                  this.vy = 0;
                              }
                         }
                    }
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
            // Non disegnare se invincibile (effetto lampeggiante)
        } else if (spriteReady) {
            
            // CORREZIONE CRITICA PER IL MIRRORING
            ctx.save();
            
            if (!this.facingRight) {
                ctx.scale(-1, 1);
                ctx.drawImage(spriteToUse, frameX, 0, 40, 40, -(x + this.w), y, this.w, this.h); 
            } else {
                ctx.drawImage(spriteToUse, frameX, 0, 40, 40, x, y, this.w, this.h);
            }
            
            ctx.restore();
            
        } else {
            ctx.fillStyle = 'blue';
            ctx.fillRect(x, y, this.w, this.h);
        }
    };
};

window.Player = Player;
