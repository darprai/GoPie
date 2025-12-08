const Engine = function(update, draw) {
    const canvas = document.getElementById('game');
    
    // Controllo di sicurezza: se il canvas non è trovato, l'Engine non viene creato.
    if (!canvas) {
        console.error("Errore Engine: Elemento Canvas 'game' non trovato nel DOM.");
        return null; 
    }

    let lastTime = performance.now();
    let running = false;
    this.keys = {}; // Mappa per lo stato dei tasti (Input)
    let gameLoop;
    const input = this.keys; 

    // Gestione Input (Tastiera)
    document.addEventListener('keydown', (e) => {
        if (!running) return;
        this.keys[e.key] = true;
    });

    document.addEventListener('keyup', (e) => {
        this.keys[e.key] = false;
    });

    // Funzione principale del loop
    const loop = (currentTime) => {
        if (!running) return;

        // Calcola Delta Time (dt) in secondi
        const dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        // 1. Aggiorna la logica di gioco (chiama Game.update)
        update(dt, input); 

        // 2. Disegna lo stato corrente (chiama Game.draw)
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
