// engine.js (AGGIORNATO: Aggiunta gestione Touch Input)

const Engine = (function() {
    let lastTime = 0;
    let running = false;
    let input = {}; 
    
    function loop(time) {
        if (!running) return;

        const dt = Math.min(0.05, (time - lastTime) / 1000); 
        lastTime = time;

        if (window.Game && window.Game.update) {
            window.Game.update(dt, input);
        }
        
        if (window.Game && window.Game.draw) {
            window.Game.draw();
        }

        requestAnimationFrame(loop);
    }
    
    function start() {
        if (running) return;
        running = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }
    
    function stop() {
        running = false;
    }
    
    function handleKeyDown(e) {
        input[e.key] = true;
    }

    function handleKeyUp(e) {
        input[e.key] = false;
    }

    // --- NUOVA LOGICA TOUCH ---
    function handleTouchStart(e) {
        // Impedisce lo scrolling
        e.preventDefault(); 
        
        // Simula la pressione di un tasto per l'input (Esempio: Tocco = Spazio/Salto)
        // Questo dipende molto da come è strutturato il tuo input mobile. 
        // Se non hai un gamepad virtuale, potresti voler mappare il tocco a "salto".
        
        // Per semplicità, qui mappiamo il tocco sullo schermo al tasto 'Space' per il salto.
        // Se hai dei bottoni sullo schermo, devi mappare il tocco di quei bottoni.
        input['Space'] = true; 
    }

    function handleTouchEnd(e) {
        e.preventDefault();
        input['Space'] = false;
    }
    
    // Inizializzazione degli ascoltatori
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Aggiunta gestione Touch
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    
    // Inizializza l'Engine nel contesto globale
    window.Game.setEngine({ start, stop }); 
    
    return {
        start: start,
        stop: stop,
        getInput: () => input 
    };
})();

// L'Engine viene avviato solo quando l'utente preme "Nuova Partita"
