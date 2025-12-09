const Engine = function(update, draw) {
    const canvas = document.getElementById('game');
    
    // Controllo di sicurezza: se il canvas non è trovato, l'Engine non viene creato.
    if (!canvas) {
        console.error("Errore Engine: Elemento Canvas 'game' non trovato nel DOM. Assicurati che index.html sia corretto.");
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
        if (!running) return;
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

    // Metodo per avviare il loop di gioco
    this.start = function() {
        if (running) return;
        running = true;
        lastTime = performance.now();
        gameLoop = requestAnimationFrame(loop);
    };

    // Metodo per fermare il loop di gioco
    this.stop = function() {
        running = false;
        cancelAnimationFrame(gameLoop);
        // Resetta l'input per evitare movimenti fantasma
        this.keys = {}; 
    };
    
    // Metodo per verificare se il loop è attivo
    this.isRunning = function() {
        return running;
    };
    
}; // <--- La chiusura corretta del costruttore 'const Engine = function(...)'

window.Engine = Engine;
