// player.js (Versione con Y-Stepping, Nemici e Logica di Morte/Punteggio)

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
    this.score = 0; // INIZIALIZZAZIONE PUNTEGGIO
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
        this.score = 0; // Reset del punteggio
    };
    
    this.hit = function() {
        if (this.invincible) {
            return true;
        }
        // Chiama la funzione di gestione della morte che deve essere in Game.js
        if (window.Game && window.Game.onPlayerDied) {
            window.Game.onPlayerDied();
        }
        return false;
    };

    // AGGIUNTA DI "enemies" NELLA FIRMA
    this.update = function(dt, input, platforms, enemies) {
        platforms = platforms || []; 
        enemies = enemies || []; 
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

        this.onGround = false;


        // 4. MOVIMENTO e COLLISIONI X 
        this.x += this.vx * dt;

        if (window.rectsOverlap) {
            for (let p of platforms) {
                if (!Array.isArray(p) || p.length < 4) continue;
                const pRect = { x: p[0], y: p[1], w: p[2], h: p[3] };
                if (rectsOverlap(this, pRect)) { 
                    
                    if (this.y + this.h <= pRect.y + 5) continue; 
                    
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
        const step = Math.sign(totalMovementY); 
        const stepSize = 4; 

        while (remainingMovement > 0) {
            const move = Math.min(remainingMovement, stepSize);
            this.y += move * step;
            remainingMovement -= move;

            let collisionDetected = false;

            for (let p of platforms) {
                if (!Array.isArray(p) || p.length < 4) continue;
                const pRect = { x: p[0], y: p[1], w: p[2], h: p[3] };
                
                if (pRect.w > 0 && pRect.h > 0 && rectsOverlap(this, pRect)) {
                    collisionDetected = true;

                    if (step > 0) { 
                        // ATTERRAGGIO (Caduta)
                        this.y = pRect.y - this.h; 
                        this.onGround = true;      
                        this.vy = 0;               
                        
                    } else if (step < 0) { 
                        // TESTATA (Salto)
                        this.y = pRect.y + pRect.h; 
                        this.vy = 0;               
                    }
                    
                    remainingMovement = 0; 
                    break; 
                }
            }

            if (collisionDetected) {
                break; 
            }
        }
        
        // *************************************************************************
        // NUOVE LOGICHE: Morte per Caduta e Collisioni con Nemici/Collezionabili
        // *************************************************************************
        
        // PUNTO 1: CONTROLLO CADUTA MORTALE
        const DEATH_Y = 700; // Un limite di morte sicuro sotto la piattaforma più bassa (Y=540)
        if (this.y > DEATH_Y) {
            this.hit(); 
        }

        // PUNTO 2 & 3: GESTIONE NEMICI / COLLEZIONABILI
        // Iteriamo al contrario per permettere la rimozione se gestita in Game.js
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            const eRect = { x: e.x, y: e.y, w: e.w, h: e.h };

            if (window.rectsOverlap(this, eRect)) {
                
                if (e.type === "drink") {
                    // I drink uccidono
                    this.hit(); 
                    break; // Morte immediata
                } else if (e.type === "heart") {
                    // Cuori danno 50 punti
                    this.score += 50; 
                    
                    // Chiama la funzione per rimuovere l'oggetto (deve essere in Game.js)
                    if (window.Game && window.Game.removeEnemy) {
                         window.Game.removeEnemy(i); 
                    }
                }
            }
        }


        // 8. Animazione
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
            // Non disegnare se invincibile
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
        
        // PUNTO 3: DRAW DEL PUNTEGGIO in alto a sinistra
        ctx.fillStyle = 'white';
        ctx.font = '20px sans-serif';
        ctx.fillText(`Punti: ${this.score}`, 10, 30); 
    };
};

window.Player = Player;
