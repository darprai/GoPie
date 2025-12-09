// Engine.js (Definitivo con Fixed Timestep e Touch Input Mobile)

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
    this.keys = {}; // Mappa i tasti attivi
    let gameLoop;
    const input = this.keys; 
    
    // --- GESTIONE INPUT DESKTOP (TASTIERA) ---

    document.addEventListener('keydown', (e) => {
        if (!running) return;
        this.keys[e.key] = true;
    });

    document.addEventListener('keyup', (e) => {
        if (!running) return;
        this.keys[e.key] = false;
    });

    // --- GESTIONE INPUT MOBILE (TOUCH) ---
    
    // Mappa le aree del touch sullo schermo ai tasti virtuali
    const handleTouch = (e, isStart) => {
        if (!running) return;
        e.preventDefault(); 

        // Rimuovi tutti i vecchi input touch
        this.keys.ArrowLeft = false;
        this.keys.ArrowRight = false;
        this.keys.ArrowUp = false;
        this.keys.Space = false;

        if (isStart) {
            // Analizza tutti i punti touch attivi
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                const x = touch.clientX;
                const y = touch.clientY;
                const width = canvas.clientWidth;
                const height = canvas.clientHeight;
                
                // Area di salto (in alto a destra)
                if (x > width * 0.75 && y < height * 0.7) {
                     this.keys.ArrowUp = true;
                     this.keys.Space = true; // Rende il salto più accessibile
                } 
                // Area Sinistra (25% a sinistra)
                else if (x < width * 0.25) {
                    this.keys.ArrowLeft = true;
                } 
                // Area Destra (25% a destra)
                else if (x > width * 0.75) {
                    this.keys.ArrowRight = true;
                } 
                // Area Salto/Azione (in basso a destra, se ArrowUp non è stato premuto)
                else if (x > width * 0.5 && y > height * 0.5) {
                    this.keys.Space = true;
                }
            }
        }
    };
    
    // Aggiungi i listener touch al canvas
    canvas.addEventListener('touchstart', (e) => handleTouch(e, true), false);
    canvas.addEventListener('touchmove', (e) => handleTouch(e, true), false); // Muovi il dito
    canvas.addEventListener('touchend', (e) => handleTouch(e, false), false);

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
}; 

window.Engine = Engine;
