// player.js (Versione con Anti-Tunnelling e Rigorosa separazione X/Y)

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
        
        // GESTIONE INVINCIBILITÀ (omessa logica)
        if (this.invincible) {
            this.invincibilityTimer += dt;
            if (this.invincibilityTimer >= INVINCIBILITY_DURATION) {
                this.invincible = false;
                this.invincibilityTimer = 0;
            }
        }
        
        // 1. INPUT ORIZZONTALE (omessa logica)
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

        // 2. LOGICA DI SALTO (omessa logica)
        if ((keys.Space || keys.ArrowUp) && this.onGround) {
            this.vy = this.jumpForce;
            this.onGround = false; 
        }

        // 3. GRAVITÀ (omessa logica)
        if (!this.onGround) {
            this.vy += this.gravity * dt; 
        }

        if (this.vy !== 0) {
            this.onGround = false;
        }

        // 4. MOVIMENTO
        let newX = this.x + this.vx * dt;
        let newY = this.y + this.vy * dt;
        
        const oldY = this.y; 
        
        // 5. COLLISIONI (X-axis) - Spostamento e Blocco Laterale
        this.x = newX;
        if (window.rectsOverlap) {
            for (let p of platforms) {
                const pRect = { x: p[0], y: p[1], w: p[2], h: p[3] };
                if (rectsOverlap(this, pRect)) { 
                    
                    // ************** NUOVA LOGICA X RIGOROSA **************
                    // Se la base del giocatore era sopra o al limite della cima della piattaforma 
                    // nel frame precedente, non correggere la X, lascia che la Y gestisca l'atterraggio.
                    if (oldY + this.h <= pRect.y) continue; 
                    
                    // Altrimenti, è una collisione laterale:
                    if (this.vx > 0) {
                        this.x = pRect.x - this.w; 
                    } else if (this.vx < 0) {
                        this.x = pRect.x + pRect.w; 
                    }
                    this.vx = 0; 
                }
            }
        }
        
        // 6. COLLISIONI (Y-axis) - Atterraggio e Testata
        this.y = newY;
        if (window.rectsOverlap) {
            for (let p of platforms) {
                const pRect = { x: p[0], y: p[1], w: p[2], h: p[3] };
                
                // Per il check Y usiamo l'X già corretta
                if (pRect.w > 0 && pRect.h > 0 && rectsOverlap(this, pRect)) {
                    
                    if (this.vy > 0) { 
                        // **ATTERRAGGIO (dal sopra) - Logica Anti-Tunnelling**
                        
                        // Controlla se la vecchia posizione Y era sopra o al limite della cima.
                        // Questo copre sia i salti corti che i salti lunghi.
                        if (oldY + this.h <= pRect.y + 10) { // Tolleranza 10px per frame skip
                             this.y = pRect.y - this.h; 
                             this.onGround = true; 
                             this.vy = 0; 
                        }
                        
                    } else if (this.vy < 0) { 
                        // **TESTATA (dal sotto)**
                        this.y = pRect.y + pRect.h; 
                        this.vy = 0; 
                    }
                }
            }
        }
        
        // 7. Animazione (omessa logica)
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
        // ... (Logica draw omessa per brevità)
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
