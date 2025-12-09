const Engine = function(update, draw) {
    const canvas = document.getElementById('game');
    
    if (!canvas) {
        console.error("Errore Engine: Elemento Canvas 'game' non trovato nel DOM.");
        return null; 
    }

    let lastTime = performance.now();
    let running = false;
    this.keys = {}; 
    let gameLoop;
    const input = this.keys; 

    document.addEventListener('keydown', (e) => {
        if (!running) return;
        this.keys[e.key] = true;
    });

    document.addEventListener('keyup', (e) => {
        if (!running) return;
        this.keys[e.key] = false;
    });

    const loop = (currentTime) => {
        if (!running) return;
        const dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        update(dt, input); 
        draw();
        gameLoop = requestAnimationFrame(loop);
    };

    this.start = function() {
        if (running) return;
        running = true;
        lastTime = performance.now();
        gameLoop = requestAnimationFrame(loop);
    };

    this.stop = function() {
        running = false;
        cancelAnimationFrame(gameLoop);
        this.keys = {}; 
    };
    
    this.isRunning = function() {
        return running;
    };
    
}; 

window.Engine = Engine;
