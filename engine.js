// Engine.js (Definitivo V3: Touch Input Ottimizzato)

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
    this.keys = {}; 
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
        // Non usare e.preventDefault() su touchstart/touchend per non bloccare i gesti di base
        
        // Rimuovi tutti i vecchi input touch
        this.keys.ArrowLeft = false;
        this.keys.ArrowRight = false;
        this.keys.Space = false;
        this.keys.ArrowUp = false;

        if (isStart && e.touches) {
            // Analizza tutti i punti touch attivi
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                const x = touch.clientX;
                const width = canvas.clientWidth;
                
                // Area Sinistra (33% a sinistra)
                if (x < width * 0.33) {
                    this.keys.ArrowLeft = true;
                } 
                // Area Destra (33% a destra)
                else if (x > width * 0.66) {
                    this.keys.ArrowRight = true;
                } 
                // Area Centrale (Salto/Azione)
                else {
                    this.keys.Space = true; 
                    this.keys.ArrowUp = true;
                }
            }
        }
        
        // Previene la selezione del testo, ma non lo scrolling del browser
        if (isStart) e.preventDefault();
    };
    
    // Aggiungi i listener touch al canvas
    canvas.addEventListener('touchstart', (e) => handleTouch(e, true), { passive: false });
    canvas.addEventListener('touchend', (e) => handleTouch(e, false), { passive: false });
    canvas.addEventListener('touchcancel', (e) => handleTouch(e, false), { passive: false }); // Aggiunto per robustezza

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
