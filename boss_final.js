class BossFinal {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 96;
        this.h = 96;

        this.hp = 300;           // vita del boss
        this.maxHp = 300;
        this.speed = 0.8;        // velocità movimento
        this.velY = 0;

        this.gravity = 0.5;

        // Stato base
        this.state = "idle";     // idle, chase, jump_attack
        this.attackCooldown = 0;

        // Hitbox
        this.damage = 20;
    }

    update(dt, player, level) {
        // Gravità
        this.velY += this.gravity;
        this.y += this.velY;

        // Pavimento livello
        if (this.y + this.h > level.groundY) {
            this.y = level.groundY - this.h;
            this.velY = 0;
        }

        // Distanza dal player
        let dist = player.x - this.x;

        // Semplice IA: segue il player
        if (Math.abs(dist) > 50) {
            this.state = "chase";
            this.x += Math.sign(dist) * this.speed;
        }

        // Salto d'attacco
        if (this.attackCooldown <= 0) {
            this.state = "jump_attack";
            this.velY = -12;
            this.attackCooldown = 180; // 3 secondi
        } else {
            this.attackCooldown--;
        }

        // Collisione con il player (danno)
        if (this.collides(player)) {
            player.takeDamage(this.damage);
        }
    }

    collides(obj) {
        return (
            this.x < obj.x + obj.w &&
            this.x + this.w > obj.x &&
            this.y < obj.y + obj.h &&
            this.h + this.y > obj.y
        );
    }

    draw(ctx, camX) {
        const screenX = this.x - camX;

        // Corpo del boss
        ctx.fillStyle = "#5b2b82"; // viola scuro
        ctx.fillRect(screenX, this.y, this.w, this.h);

        // Occhi
        ctx.fillStyle = "white";
        ctx.fillRect(screenX + 20, this.y + 20, 20, 20);
        ctx.fillRect(screenX + 55, this.y + 20, 20, 20);

        // Pupille
        ctx.fillStyle = "red";
        ctx.fillRect(screenX + 28, this.y + 28, 10, 10);
        ctx.fillRect(screenX + 63, this.y + 28, 10, 10);

        // Barra della vita
        ctx.fillStyle = "black";
        ctx.fillRect(screenX, this.y - 10, this.w, 5);

        ctx.fillStyle = "red";
        ctx.fillRect(screenX, this.y - 10, (this.hp / this.maxHp) * this.w, 5);
    }
}
