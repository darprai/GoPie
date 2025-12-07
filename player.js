const Player = function(x, y) {
    this.x = x;
    this.y = y;
    this.w = 40; 
    this.h = 40; 
    this.vx = 0;
    this.vy = 0;
    this.speed = 250; 
    this.jumpForce = -900; // FORZA DI SALTO AUMENTATA
    this.gravity = 2500; 
    this.onGround = false;
    this.lives = 3; 
    this.score = 0;
    this.facingRight = true;
    this.isMoving = false;
    this.animationFrame = 0;
    this.animationTimer = 0;

    // Aggiungi un piccolo offset per rendere la collisione con il terreno più indulgente
    this.groundEpsilon = 5; 

    // Velocità di reset (necessaria per il riavvio del livello)
    this.reset = function(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.lives = 3;
        this.score = 0;
    };
    
    // Incrementa le vite se < 3
    this.collectHeart = function() {
        if (this.lives < 3) {
            this.lives++;
        }
        this.score += 50; 
    };

    // Ritorna true se il giocatore ha ancora vite
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
        // Controlla sia Space che ArrowUp
        if ((keys.Space || keys.ArrowUp) && this.onGround) {
            this.vy = this.jumpForce;
            this.onGround = false;
        }

        // 3. GRAVITÀ
        this.vy += this.gravity * dt;

        // 4. MOVIMENTO
        let newX = this.x + this.vx * dt;
        let newY = this.y + this.vy * dt;

        // 5. COLLISIONI (X-axis)
        this.x = newX;
        for (let p of platforms) {
            if (rectsOverlap(this, p)) {
                if (this.vx > 0) {
                    this.x = p.x - this.w; // Colpisce a destra
                } else if (this.vx < 0) {
                    this.x = p.x + p.w;  // Colpisce a sinistra
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
                    // Atterra su piattaforma
                    this.y = p.y - this.h + this.groundEpsilon; // Spinge leggermente su per evitare ricontrollo
                    this.onGround = true;
                    this.vy = 0;
                } else if (this.vy < 0) {
                    // Colpisce testa
                    this.y = p.y + p.h;
                    this.vy = 0;
                }
            }
        }
        
        // Rimozione del groundEpsilon per evitare bug di salto multiplo
        if (this.onGround) {
            this.y = this.y - this.groundEpsilon;
        }


        // 7. Animazione (solo Run)
        if (this.isMoving) {
            this.animationTimer += dt;
            if (this.animationTimer > 0.1) {
                this.animationFrame = (this.animationFrame + 1) % 4;
                this.animationTimer = 0;
            }
        } else {
            this.animationFrame = 0; // Torna al frame di Idle
        }
    };

    this.draw = function(ctx, camX) {
        const x = Math.round(this.x - camX);
        const y = Math.round(this.y);
        
        let spriteToUse = window.playerSprite;
        let frameX = 0; // Idle frame

        if (this.isMoving && window.runSprite.complete) {
            spriteToUse = window.runSprite;
            // Frame d'animazione per la corsa
            frameX = this.animationFrame * 40; 
        }

        // Disegna l'ombra/contorno rosso in caso di danno (solo se non è l'ultimo livello)
        if (Game.getCurLevelIndex() !== 2 && this.lives <= 1 && Math.floor(performance.now() / 100) % 2 === 0) {
             ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
             ctx.fillRect(x, y, this.w, this.h);
        }

        // Disegna lo sprite
        ctx.save();
        if (!this.facingRight) {
            // Rifletti l'immagine orizzontalmente
            ctx.scale(-1, 1);
            ctx.drawImage(spriteToUse, frameX, 0, this.w, this.h, -(x + this.w), y, this.w, this.h);
        } else {
            ctx.drawImage(spriteToUse, frameX, 0, this.w, this.h, x, y, this.w, this.h);
        }
        ctx.restore();
    };
};
