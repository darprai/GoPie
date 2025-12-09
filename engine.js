// engine.js (Ottimizzato: Fixed Timestep, Input Keyboard/Simulated)

const Engine = function(update, draw) {
    const canvas = document.getElementById('game');
    
    if (!canvas) {
        console.error("Errore Engine: Elemento Canvas 'game' non trovato nel DOM.");
        return null; 
    }

    const MAX_FRAME_TIME = 0.25; 
    const STEP = 1 / 120; 

    let lastTime = performance.now();
    let accumulator = 0; 
    let running = false;
    this.keys = {}; // Mappa i tasti attivi (ArrowLeft, ArrowRight, Space, ArrowUp)
    let gameLoop;
    const input = this.keys; 
    
    // --- GESTIONE INPUT (TASTIERA) ---
    // Questi listener gestiscono sia la tastiera fisica (Desktop) sia l'input simulato dai controlli touch (Mobile)

    document.addEventListener('keydown', (e) => {
        if (!running) return;
        this.keys[e.key] = true;
    });

    document.addEventListener('keyup', (e) => {
        if (!running) return;
        this.keys[e.key] = false;
    });

    // NOTA: I listener Touch sono stati spostati nell'index.html per il binding diretto ai tasti virtuali.

    // --- LOOP DI GIOCO ---

    const loop = (currentTime) => {
        if (!running) return;
        
        let dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        dt = Math.min(dt, MAX_FRAME_TIME); 
        
        accumulator += dt;

        while (accumulator >= STEP) {
            update(STEP, input); 
            accumulator -= STEP;
        }

        draw(); 

        gameLoop = requestAnimationFrame(loop);
    };

    this.start = function() {
        if (running) return;
        running = true;
        lastTime = performance.now();
        accumulator = 0; 
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
    
    this.setKey = function(key, state) {
        this.keys[key] = state;
    };
}; 

window.Engine = Engine;
