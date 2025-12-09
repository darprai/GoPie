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
    
    // NUOVO: Stato di invincibilità per prevenire danni continui
    this.invincible = false;
    this.invincibilityTimer = 0;
    const INVINCIBILITY_DURATION = 1.5; // 1.5 secondi di invincibilità dopo aver subito un danno

    this.groundEpsilon = 5; 

    this.reset = function(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        // Mantiene vite e punteggio al reset, se il reset non è una nuova partita completa
        // Per un reset completo, dovresti resettare lives e score qui o chiamare un metodo separato.
    };
    
    // NUOVO: Metodo per il reset completo dello stato
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
            return true; // Ha subito un colpo, ma è invincibile, quindi non perde vita
        }
        
        this.lives--;
        this.invincible = true;
        this.invincibilityTimer = 0; // Azzera il timer
        
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
            
            // Assicurati che rectsOverlap esista globalmente (dovrebbe essere in rects.js)
            if (window.rectsOverlap && rectsOverlap(this, pRect)) { 
                if (this.vx > 0) {
                    this.x = pRect.x - this.w; 
                } else if (this.vx < 0) {
                    this.x = pRect.x + pRect.w; 
                }
                this.vx = 0; 
            }
        }
        
        // 6. COLLISIONI (Y-axis)
        this.y = newY;
        this.onGround = false;

        for (let p of platforms) {
            const pRect = { x: p[0], y: p[1], w: p[2], h: p[3] };
            
            if (window.rectsOverlap && rectsOverlap(this, pRect)) {
                if (this.vy > 0) { // Se sta cadendo (o è fermo e si appoggia)
                    this.y = pRect.y - this.h; 
                    this.onGround = true;
                    this.vy = 0;
                } else if (this.vy < 0) { // Se sta saltando e colpisce da sotto
                    this.y = pRect.y + pRect.h;
                    this.vy = 0;
                }
            }
        }

        // 7. Animazione
        if (this.isMoving && this.onGround) { // Animazione solo se si muove E tocca terra
            this.animationTimer += dt;
            if (this.animationTimer > 0.1) {
                this.animationFrame = (this.animationFrame + 1) % 4;
                this.animationTimer = 0;
            }
        } else {
            this.animationFrame = 0; // Fermo o in volo -> frame di stand-by
        }
    };

    this.draw = function(ctx, camX) {
        const x = Math.round(this.x - camX);
        const y = Math.round(this.y);
        
        let spriteToUse = window.playerSprite;
        let frameX = 0;
        let spriteReady = false;

        // Decidi quale sprite usare
        if (this.isMoving && window.runSprite && window.runSprite.complete) {
            spriteToUse = window.runSprite;
            frameX = this.animationFrame * 40;
            spriteReady = true;
        } else if (window.playerSprite && window.playerSprite.complete) {
            spriteToUse = window.playerSprite;
            frameX = 0;
            spriteReady = true;
        }

        // Se l'invincibilità è attiva, facciamo lampeggiare il player
        if (this.invincible && Math.floor(this.invincibilityTimer * 10) % 2 === 0) {
            // Se invincibile e il timer è su un frame "dispari", saltiamo il disegno.
            // Oppure, possiamo solo disegnare il quadrato rosso più sotto.
        } else if (spriteReady) {
            // Disegna la sprite se è pronta e non è un frame di invincibilità "off"
            ctx.save();
            if (!this.facingRight) {
                ctx.scale(-1, 1);
                // Disegna l'immagine capovolta
                ctx.drawImage(spriteToUse, frameX, 0, 40, 40, -(x + this.w), y, this.w, this.h); 
            } else {
                ctx.drawImage(spriteToUse, frameX, 0, 40, 40, x, y, this.w, this.h);
            }
            ctx.restore();
        } else {
            // SOLUZIONE SE PIE.PNG NON COMPAIONO: Disegna un quadrato solido.
            // Questo assicura che il player sia visibile anche se le immagini non sono caricate.
            ctx.fillStyle = 'blue';
            ctx.fillRect(x, y, this.w, this.h);
        }

        // Gestione lampeggio vita bassa (vecchio stile)
        if (window.Game && window.Game.getCurLevelIndex() !== 2 && this.lives <= 1 && Math.floor(performance.now() / 100) % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fillRect(x, y, this.w, this.h);
        }
    };
};

window.Player = Player;
