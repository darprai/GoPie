const Engine = function(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.running = false;
    this.lastTime = 0;
    this.keys = {}; // Oggetto per tenere traccia dei tasti premuti (inclusi i virtuali)

    const KEY_MAP = {
        32: 'Space',  // Spacebar
        37: 'ArrowLeft',
        39: 'ArrowRight',
        38: 'ArrowUp'
    };

    const keyDownHandler = (e) => {
        const key = KEY_MAP[e.keyCode];
        if (key && !this.keys[key]) {
            this.keys[key] = true;
            // Prevenire lo scroll del browser con Spacebar e Frecce
            if (key === 'Space' || key.startsWith('Arrow')) {
                e.preventDefault();
            }
        }
    };

    const keyUpHandler = (e) => {
        const key = KEY_MAP[e.keyCode];
        if (key) {
            this.keys[key] = false;
        }
    };

    this.start = function(update, render) {
        this.update = update;
        this.render = render;
        this.running = true;
        this.lastTime = performance.now();
        window.engine = this; // Rende l'istanza accessibile a Player.js e Game.js
        
        document.addEventListener('keydown', keyDownHandler, false);
        document.addEventListener('keyup', keyUpHandler, false);
        
        requestAnimationFrame(this.loop.bind(this));
    };

    this.stop = function() {
        this.running = false;
        document.removeEventListener('keydown', keyDownHandler, false);
        document.removeEventListener('keyup', keyUpHandler, false);
    };

    this.loop = function(currentTime) {
        if (!this.running) return;

        const dt = Math.min(100, currentTime - this.lastTime) / 1000; // Tempo in secondi, max 100ms
        this.lastTime = currentTime;

        this.update(dt);
        this.render(this.ctx);

        requestAnimationFrame(this.loop.bind(this));
    };
};
