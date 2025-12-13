// engine.js (VERSIONE DEFINITIVA E ROBUSTA)

const Engine = (function() {
    let lastTime = 0;
    let running = false;
    let input = {}; // Gestisce sia input da tastiera che da touch
    
    // Non è necessario un riferimento esplicito a window.Game qui.
    
    function loop(time) {
        if (!running) return;

        const dt = Math.min(0.05, (time - lastTime) / 1000); 
        lastTime = time;

        // Esegui update e draw del Game, controllando se è caricato.
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
    
    // --- IL CODICE QUI SOTTO È STATO RILOCALIZZATO/MODIFICATO ---
    
    // API pubbliche dell'Engine
    const EngineAPI = {
        start: start,
        stop: stop,
        getInput: () => input,
        setInputState: (key, isPressed) => {
             input[key] = isPressed;
        }
    };
    
    // Aggiungi il collegamento a Game solo DOPO che Game è definito globalmente
    // Per un'integrazione pulita, dobbiamo assicurarci che Engine venga esposto globalmente
    // e che Game si colleghi ad esso quando Game viene eseguito (alla fine di game.js).
    
    // Espone l'Engine globalmente, ma senza auto-collegamento per evitare timing issues
    window.Engine = EngineAPI;

    // Ritorna l'API (non è strettamente necessario se usiamo window.Engine, ma è una buona pratica)
    return EngineAPI;

})();
