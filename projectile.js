// Projectile (AGGIORNATO: Proiettile 3x più grande)

const Projectile = function(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    // Dimensioni del proiettile aumentate per visibilità
    this.w = 20; 
    this.h = 20;
    this.vx = vx;
    this.vy = vy;

    this.update = function(dt) {
        // Movimento uniforme
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    };

    this.draw = function(ctx, camX) {
        const drawX = Math.round(this.x - camX);
        const drawY = Math.round(this.y);
        
        if (window.drinkEnemySprite && window.drinkEnemySprite.complete) {
            ctx.drawImage(window.drinkEnemySprite, drawX, drawY, this.w, this.h);
        } else {
            // Fallback
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(drawX + this.w / 2, drawY + this.h / 2, this.w / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    };
};
