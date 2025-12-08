const Engine = function(update, draw) {
    const canvas = document.getElementById('game');
    
    // **CORREZIONE**: Controlla se la canvas esiste. Se no, ferma l'inizializzazione.
    if (!canvas) {
        console.error("Errore Engine: Elemento Canvas 'game' non trovato nel DOM. Assicurati che index.html sia corretto.");
        return null; // Restituisce null per indicare che l'engine non è stato creato
    }

    let lastTime = performance.now();
    let running = false;
    this.keys = {}; // Mappa per lo stato dei tasti
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

        // 1. Aggiorna la logica di gioco
        update(dt, input); 

        // 2. Disegna lo stato corrente
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
        // Resetta l'input per evitare movimenti fantasma
        this.keys = {}; 
    };
    
    this.isRunning = function() {
        return running;
    };
};

window.Engine = Engine;
};

window.Engine = Engine;
