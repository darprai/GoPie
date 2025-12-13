// engine.js (AGGIORNATO: Logica di Input Unificata)

const Engine = (function() {
    let lastTime = 0;
    let running = false;
    let input = {}; // Gestisce sia input da tastiera che da touch
    
    // Rimuoviamo gli ascoltatori generici touchStart/touchEnd qui. 
    // Verranno gestiti in game.js e nell'HTML direttamente sui DIV/BOTTONI specifici.
    
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
        // Mappatura Tasti per il gioco
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'Space') {
             input[e.key] = true;
        }
    }

    function handleKeyUp(e) {
        // Mappatura Tasti per il gioco
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'Space') {
            input[e.key] = false;
        }
    }

    // Inizializzazione degli ascoltatori TASTIERA
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Inizializza l'Engine nel contesto globale
    window.Game.setEngine({ start, stop }); 
    
    return {
        start: start,
        stop: stop,
        getInput: () => input,
        // *** NUOVO: Funzione per iniettare l'input da Touch (chiamata dall'HTML) ***
        setInputState: (key, isPressed) => {
             input[key] = isPressed;
        }
    };
})();

// L'Engine viene avviato solo quando l'utente preme "Nuova Partita"
