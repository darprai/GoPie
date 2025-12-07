// La funzione rectsOverlap è inclusa qui, anche se idealmente sarebbe in rects.js
// Si assume che rects.js sia caricato prima e definisca questa funzione globalmente.
const rectsOverlap = (r1, r2) => {
    // Si assume che r1 e r2 abbiano proprietà: x, y, w, h
    return r1.x < r2.x + r2.w &&
           r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h &&
           r1.y + r1.h > r2.y;
};


const Game = (function() {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const menuDiv = document.getElementById('menu');
    const gameContainer = document.getElementById('game-container');
    const endingDiv = document.getElementById('ending');
    const bgm = document.getElementById('bgm');
    const bgmFinal = document.getElementById('bgm_final');

    let player;
    let currentLevelIndex = 0;
    let levels = [];
    let currentLevel;
    let cameraX = 0;
    let gameEngine;

    // Costanti per i tipi di oggetti speciali
    const PLATFORM_TYPE = {
        DISCO: "disco",
        DJDISC: "djdisc",
        PALO: "palo",
        MACCHINA: "macchina"
    };

    // --- Gestione Livelli ---

    function loadLevels() {
        // Carica i JSON dei livelli dalla cartella 'levels/'
        const levelPromises = [
            fetch('levels/level1.json').then(res => res.json()),
            fetch('levels/level2.json').then(res => res.json()),
            fetch('levels/level3.json').then(res => res.json()) 
        ];

        return Promise.all(levelPromises)
            .then(loadedLevels => {
                levels = loadedLevels;
                console.log("Livelli caricati con successo!");
            })
            .catch(error => {
                console.error("Errore nel caricamento di un file JSON del livello:", error);
                alert("Errore caricamento livelli: Controlla la console e i percorsi in 'levels/'.");
            });
    }

    function loadLevel(index) {
        if (!levels[index]) {
            console.error(`Livello ${index} non trovato.`);
            return;
        }

        currentLevelIndex = index;
        currentLevel = levels[index];
        
        // Inizializza o riposiziona il giocatore
        if (!player) {
            // Si assume che la classe Player sia definita in player.js
            player = new Player(currentLevel.playerStart.x, currentLevel.playerStart.y);
        } else {
            player.x = currentLevel.playerStart.x;
            player.y = currentLevel.playerStart.y;
            player.vx = 0;
            player.vy = 0;
        }
        
        cameraX = 0;
        
        // Reset/inizializzazione del Boss (Livello 3)
        if (currentLevelIndex === 2 && window.BossFinal) {
             window.BossFinal.reset();
             // Riattivazione del boss in caso di riavvio del livello (dopo la morte)
             const config = currentLevel.boss;
             window.BossFinal.start(config.x, config.y, config); 
        }
    }

    // --- Logica di Gioco (Update) ---

    function update(dt, input) {
        if (!currentLevel || !player) return;

        // 1. Aggiornamento del Giocatore
        player.update(dt, input, currentLevel.platforms);

        // 2. Logica Specifica per il Livello Boss (Livello 3)
        if (currentLevelIndex === 2) {
            
            if (window.BossFinal && window.BossFinal.active) {
                // Aggiorna il boss (movimento, sparo, ecc.)
                window.BossFinal.update(dt, player, cameraX);
                // Gestisce la collisione Boss-Giocatore e la vittoria
                handleBossCollisions(); 
            }
        }
        
        // 3. Gestione della Telecamera
        const targetX = player.x - canvas.width / 2 + player.w / 2;
        cameraX = Math.max(0, Math.min(targetX, currentLevel.length - canvas.width));

        // 4. Gestione Transizioni di Livello (EndZone)
        const endZone = currentLevel.endZone;
        if (player.x + player.w > endZone.x && 
            player.x < endZone.x + endZone.w &&
            player.y + player.h > endZone.y && 
            player.y < endZone.y + endZone.h) {
            
            // L'EndZone attiva la transizione solo per i livelli normali
            if (currentLevelIndex !== 2) {
                Game.nextLevel();
            }
        }

        // 5. Gestione Collisioni Standard (Nemici/Trappole)
        handleCollisions();
    }
    
    function handleCollisions() {
        
        // 1. Collisioni Nemici (drink) e Cuori (heart)
        if (currentLevel.enemies) {
            currentLevel.enemies = currentLevel.enemies.filter(enemy => {
                if (rectsOverlap(player, enemy)) {
                    if (enemy.type === 'drink') {
                        if (player.hit()) {
                            player.x = Math.max(0, player.x - 50); 
                        } else {
                            Game.onPlayerDied();
                            return true; 
                        }
                        return false; // Rimuove il nemico
                    }
                    
                    if (enemy.type === 'heart') {
                        player.collectHeart();
                        return false; // Rimuove il cuore raccolto
                    }
                }
                return true; 
            });
        }
        
        // 2. Collisioni Trappole Invisibili (es. buco nella mappa)
        if (currentLevel.invisible_traps) {
             for (let trap
