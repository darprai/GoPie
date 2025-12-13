// engine.js (VERSIONE DEFINITIVA E ROBUSTA)

const Engine = (function() {
    let lastTime = 0;
    let running = false;
    let input = {}; // Gestisce sia input da tastiera che da touch
    
    function loop(time) {
        if (!running) return;

        // Calcola il delta time (dt) in secondi, limitato a 0.05 per stabilità
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
    
    
    // API pubbliche dell'Engine
    const EngineAPI = {
        start: start,
        stop: stop,
        getInput: () => input,
        // Permette a Game.js (e ai controller touch) di iniettare lo stato input
        setInputState: (key, isPressed) => {
             input[key] = isPressed;
        }
    };
    
    // Espone l'Engine globalmente
    window.Engine = EngineAPI;

    // 🚀 BLOCCO DI COLLEGAMENTO ESSENZIALE
    // Chiama Game.setEngine() per stabilire la comunicazione bidirezionale.
    // Questo viene eseguito immediatamente dopo la definizione di window.Engine.
    if (window.Game && window.Game.setEngine) {
        window.Game.setEngine(EngineAPI);
    }

    return EngineAPI;

})();
