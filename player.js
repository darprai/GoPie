// player.js (Versione con Y-Stepping anti-tunnelling)

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

        // 2. LOGICA DI SALTO
        if ((keys.Space || keys.ArrowUp) && this.onGround) {
            this.vy = this.jumpForce;
            this.onGround = false; 
        }

        // 3. GRAVITÀ
        // Se non siamo a terra, applichiamo la gravità.
        if (!this.onGround) {
            this.vy += this.gravity * dt; 
        }

        // Reset di onGround
        this.onGround = false;


        // 4. MOVIMENTO e COLLISIONI X (Indipendente dalla Y)
        const oldX = this.x;
        this.x += this.vx * dt;

        if (window.rectsOverlap) {
            for (let p of platforms) {
                const pRect = { x: p[0], y: p[1], w: p[2], h: p[3] };
                if (rectsOverlap(this, pRect)) { 
                    
                    // Se siamo chiaramente sopra la piattaforma, saltiamo la correzione X
                    if (this.y + this.h <= pRect.y + 5) continue; 
                    
                    // Altrimenti, correggiamo l'X
                    if (this.vx > 0) {
                        this.x = pRect.x - this.w; 
                    } else if (this.vx < 0) {
                        this.x = pRect.x + pRect.w; 
                    }
                    this.vx = 0; 
                }
            }
        }
        
        // 5. MOVIMENTO e COLLISIONI Y (Y-Stepping)
        const totalMovementY = this.vy * dt;
        let remainingMovement = Math.abs(totalMovementY);
        const step = Math.sign(totalMovementY); // +1 se cade, -1 se sale
        
        // La dimensione dello step è 1 pixel o un po' di più per velocizzare
        const stepSize = 4; 

        while (remainingMovement > 0) {
            const move = Math.min(remainingMovement, stepSize);
            this.y += move * step;
            remainingMovement -= move;

            let collisionDetected = false;

            for (let p of platforms) {
                const pRect = { x: p[0], y: p[1], w: p[2], h: p[3] };
                
                if (pRect.w > 0 && pRect.h > 0 && rectsOverlap(this, pRect)) {
                    collisionDetected = true;

                    if (step > 0) { 
                        // **ATTERRAGGIO (Caduta)**
                        this.y = pRect.y - this.h; // Posiziona esattamente sopra
                        this.onGround = true;      // Siamo a terra
                        this.vy = 0;               // Ferma la caduta
                        
                    } else if (step < 0) { 
                        // **TESTATA (Salto)**
                        this.y = pRect.y + pRect.h; // Posiziona esattamente sotto
                        this.vy = 0;               // Ferma il salto
                    }
                    
                    // Dopo una collisione Y, fermiamo il movimento residuo
                    remainingMovement = 0; 
                    break; 
                }
            }

            if (collisionDetected) {
                break; // Usciamo dal loop while dopo la correzione
            }
        }
        
        // 6. Animazione (omessa logica)
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
