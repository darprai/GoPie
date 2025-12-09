// Engine.js (Definitivo con Fixed Timestep)

const Engine = function(update, draw) {
    const canvas = document.getElementById('game');
    
    if (!canvas) {
        console.error("Errore Engine: Elemento Canvas 'game' non trovato nel DOM.");
        return null; 
    }

    const MAX_FRAME_TIME = 0.25; // Massima durata di frame da processare (250ms)
    const STEP = 1 / 120; // Passo fisso per la fisica: 120 aggiornamenti al secondo (circa 8.3ms)

    let lastTime = performance.now();
    let accumulator = 0; // Accumulatore per il tempo non processato
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
        
        // 1. Calcola il delta time e limita l'accumulo in caso di pause/lag estremo
        let dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        dt = Math.min(dt, MAX_FRAME_TIME); // Evita la "spiral of death"
        
        // Aggiunge il tempo trascorso all'accumulatore
        accumulator += dt;

        // 2. AGGIORNAMENTO A PASSI FISSI (RISOLUZIONE TUNNELING)
        // Processa il gioco in passi fissi finché c'è tempo nell'accumulatore
        while (accumulator >= STEP) {
            // Chiama la funzione update del gioco con il passo fisso (STEP)
            update(STEP, input); 
            accumulator -= STEP;
        }

        // 3. Disegno
        draw(); 

        gameLoop = requestAnimationFrame(loop);
    };

    this.start = function() {
        if (running) return;
        running = true;
        lastTime = performance.now();
        accumulator = 0; // Azzera l'accumulatore all'avvio
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
