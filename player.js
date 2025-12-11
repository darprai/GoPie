// player.js (Versione con Y-Stepping, Nemici, Logica di Morte/Punteggio e Dimensioni Corrette)

const Player = function(x, y) {
    // ********************************************
    // CORREZIONE DIMENSIONI W=32, H=48
    // ********************************************
    this.x = x;
    this.y = y;
    this.w = 32; // Corretto da 40 a 32
    this.h = 48; // Corretto da 40 a 48
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
    
    // Variabile per gestire il blocco da cutscene (aggiunta)
    this.canMove = true; 

    this.reset = function(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.invincible = true;
        this.invincibilityTimer = 0;
        this.canMove = true; // Riattivato
    };
    
    this.resetFull = function(x, y) {
        this.reset(x, y);
        this.score = 0;
    };
    
    this.hit = function() {
        if (this.invincible) {
            return true;
        }
        
        if (window.Game && window.Game.onPlayerDied) {
            window.Game.onPlayerDied();
            this.invincible = true; // Necessario per prevenire hit multiple immediate
            this.invincibilityTimer = 0;
        }
        return false;
    };

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
        
        // 1. INPUT ORIZZONTALE (Solo se canMove è true)
        this.vx = 0;
        if (this.canMove) { // Aggiunto controllo canMove
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
        } else {
             this.isMoving = false;
             this.vx = 0; // Forza vx a zero durante la cutscene
        }


        // 2. LOGICA DI SALTO (Solo se canMove è true)
        if (this.canMove && (keys.Space || keys.ArrowUp) && this.onGround) {
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
                    
                    // Previene il blocco verticale accidentale per piattaforme larghe se stai cadendo
                    if (this.y + this.h <= pRect.y + 5) continue; 
                    
                    // Ritorna alla posizione precedente (collisione laterale)
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
                        this.y = pRect.y - this.h; // Corretto con h=48
                        this.onGround = true;
                        this.vy = 0;
                        
                    } else if (step < 0) {
                        // TESTATA (Salto)
                        this.y = pRect.y + pRect.h; // Corretto con h=48
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
        const DEATH_Y = 700; 
        if (this.y > DEATH_Y) {
            this.hit();
            return; // Interrompi update dopo la morte
        }

        // PUNTO 2 & 3: GESTIONE NEMICI / COLLEZIONABILI
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            const eRect = { x: e.x, y: e.y, w: e.w, h: e.h };

            if (window.rectsOverlap(this, eRect)) {
                
                if (e.type === "drink") {
                    // I drink uccidono
                    this.hit();
                    break; 
                } else if (e.type === "heart") {
                    // Cuori danno 50 punti
                    this.score += 50;
                    
                    // Rimuovi l'oggetto
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
        
        // Le sprite sono 40x40, ma il player è 32x48.
        // Dobbiamo decidere se ritagliare il frame 40x40 dalla sorgente
        // o se il frame deve essere adattato a 32x48 se le immagini sono già ritagliate a 40x40.
        // Assumo che le tue sprite siano state ritagliate in frame 40x40, ma dovrebbero essere visualizzate come 32x48.
        const SPRITE_FRAME_SIZE = 40; 
        
        if (this.isMoving && window.runSprite && window.runSprite.complete) {
            spriteToUse = window.runSprite;
            frameX = this.animationFrame * SPRITE_FRAME_SIZE;
            spriteReady = true;
        } else if (window.playerSprite && window.playerSprite.complete) {
            spriteToUse = window.playerSprite;
            frameX = 0;
            spriteReady = true;
        }

        if (this.invincible && Math.floor(this.invincibilityTimer * 10) % 2 === 0) {
            // Non disegnare se invincibile (lampeggio)
        } else if (spriteReady) {
            
            ctx.save();
            
            if (!this.facingRight) {
                ctx.scale(-1, 1);
                // Disegna il frame 40x40 della sorgente, ma ridimensiona e specchia a 32x48
                ctx.drawImage(spriteToUse, frameX, 0, SPRITE_FRAME_SIZE, SPRITE_FRAME_SIZE, 
                              -(x + this.w), y, this.w, this.h); 
            } else {
                // Disegna il frame 40x40 della sorgente, e ridimensiona a 32x48
                ctx.drawImage(spriteToUse, frameX, 0, SPRITE_FRAME_SIZE, SPRITE_FRAME_SIZE, 
                              x, y, this.w, this.h);
            }
            
            ctx.restore();
            
        } else {
            ctx.fillStyle = 'blue';
            ctx.fillRect(x, y, this.w, this.h);
        }
        
        // Disegna il punteggio
        ctx.fillStyle = 'white';
        ctx.font = '20px sans-serif';
        ctx.fillText(`Punti: ${this.score}`, 10, 30);
    };
};

window.Player = Player;
