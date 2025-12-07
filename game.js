// La funzione rectsOverlap è necessaria qui per le collisioni
// Presumibilmente definita in rects.js
const rectsOverlap = (r1, r2) => {
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

    const PLATFORM_TYPE = {
        DISCO: "disco",
        DJDISC: "djdisc",
        PALO: "palo",
        MACCHINA: "macchina"
    };

    // --- Gestione Livelli ---

    function loadLevels() {
        // Carichiamo level1.json, level2.json e level3.json (per i dati del boss)
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
                console.error("Errore nel caricamento di un file JSON del livello. Controlla la console per i dettagli sull'errore:", error);
                alert("Errore caricamento livelli: Failed to parse level JSON. Controlla la console.");
            });
    }

    function loadLevel(index) {
        if (!levels[index]) {
            console.error(`Livello ${index} non trovato.`);
            return;
        }

        currentLevelIndex = index;
        currentLevel = levels[index];
        
        if (!player) {
            player = new Player(currentLevel.playerStart.x, currentLevel.playerStart.y);
        } else {
            player.x = currentLevel.playerStart.x;
            player.y = currentLevel.playerStart.y;
            player.vx = 0;
            player.vy = 0;
        }
        
        cameraX = 0;
        
        // Reset del Boss quando si ricarica il Livello 3 (per la morte del giocatore)
        if (currentLevelIndex === 2) {
             window.BossFinal.reset();
        }
    }

    // --- Logica di Gioco (Update) ---

    function update(dt, input) {
        if (!currentLevel || !player) return;

        player.update(dt, input, currentLevel.platforms);

        // Update Boss solo nel Livello 3
        if (currentLevelIndex === 2 && window.BossFinal.active) {
            window.BossFinal.update(dt, player, cameraX);
            handleBossCollisions(); // Gestisce la logica di collisione/vittoria
        }
        
        const targetX = player.x - canvas.width / 2 + player.w / 2;
        cameraX = Math.max(0, Math.min(targetX, currentLevel.length - canvas.width));

        const endZone = currentLevel.endZone;
        if (player.x + player.w > endZone.x && 
            player.x < endZone.x + endZone.w &&
            player.y + player.h > endZone.y && 
            player.y < endZone.y + endZone.h) {
            
            Game.nextLevel();
        }

        handleCollisions();
    }
    
    function handleCollisions() {
        // ... (Logica collisione Nemici e Cuori qui) ...
        // [Lasciata omessa per brevità, ma mantenuta la tua logica precedente]
    }
    
    function handleBossCollisions() {
        // Controllo vittoria: 50 proiettili lanciati = Gioco Finito
        if (window.BossFinal.thrown >= currentLevel.boss.projectiles) {
             Game.endGameWin();
             return;
        }
        
        // Collisione con i proiettili del boss (Drink)
        window.BossFinal.projectiles = window.BossFinal.projectiles.filter(p => {
            if (rectsOverlap(player, p)) {
                
                // Colpito!
                if (player.hit()) {
                    // Sposta il giocatore indietro e rimuovi il proiettile
                    player.x = Math.max(0, player.x - 50);
                } else {
                    // Il giocatore è morto
                    Game.onPlayerDied();
                    return true; // Non rimuovere il proiettile, il reset lo farà
                }
                return false; // Rimuove il proiettile dopo la collisione (se il giocatore è vivo)
            }
            return true; // Conserva proiettile
        });
    }


    // --- Logica di Disegno (Render) ---

    function draw() {
        if (!currentLevel) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "#87CEEB"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        renderPlatforms(currentLevel.platforms, cameraX);

        player.draw(ctx, cameraX);
        
        renderEnemies(currentLevel.enemies, cameraX);

        const endZone = currentLevel.endZone;
        ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
        ctx.fillRect(Math.round(endZone.x - cameraX), endZone.y, endZone.w, endZone.h);

        // Disegna Boss e proiettili (Livello 3)
        if (currentLevelIndex === 2 && window.BossFinal.active) {
            window.BossFinal.render(ctx, cameraX);
            renderBossHUD(); 
        }

        renderHUD();
    }
    
    // Funzione di rendering della vita/progresso del Boss
    function renderBossHUD() {
        const thrown = window.BossFinal.thrown;
        const max = currentLevel.boss.projectiles;
        const progress = thrown / max;
        
        const barW = canvas.width - 40;
        const barH = 15;
        const x = 20;
        const y = 55;
        
        ctx.fillStyle = 'gray';
        ctx.fillRect(x, y, barW, barH);
        
        ctx.fillStyle = 'yellow';
        ctx.fillRect(x, y, barW * progress, barH);
        
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(`Schivate: ${thrown} / ${max}`, x, y + 12);
    }
    
    // ... (renderPlatforms, renderEnemies, renderHUD - Logica invariata) ...
    // [Lasciata omessa per brevità]


    // --- Controllo Flusso di Gioco ---

    function startNew() {
        menuDiv.style.display = 'none';
        gameContainer.style.display = 'block';

        bgm.loop = true;
        bgm.play().catch(e => console.log("Errore riproduzione BGM:", e));

        player = new Player(0, 0);
        
        currentLevelIndex = 0; 
        loadLevel(currentLevelIndex);
        
        if (gameEngine) {
            gameEngine.start();
        } else {
            gameEngine = new Engine(update, draw);
            window.engine = gameEngine; 
            gameEngine.start();
        }
    }
    
    function nextLevel() {
        currentLevelIndex++;
        
        if (currentLevelIndex < levels.length) {
            if (currentLevelIndex === 2) {
                bgm.pause();
                bgmFinal.loop = true;
                bgmFinal.play().catch(e => console.log("Errore riproduzione BGM Finale:", e));
                
                // Inizializza il BossFinal con i dati del JSON
                const config = currentLevel.boss;
                window.BossFinal.start(config.x, config.y, config); 
            }
            
            loadLevel(currentLevelIndex);
            
        } else {
            // Se si tenta di andare oltre l'ultimo livello senza endGameWin
            gameEngine.stop();
            bgm.pause();
            bgmFinal.pause();
            window.Ending.showLossScreen("Fine livelli non gestita.");
        }
    }

    // Aggiunto per la vittoria del boss
    function endGameWin() {
        gameEngine.stop();
        bgm.pause();
        bgmFinal.pause();
        // Presumibilmente showWinScreen mostra "Pie diventa King"
        window.Ending.showWinScreen("Pie diventa King!", player.score); 
    }
    
    function onPlayerFell() {
         player.lives = 0;
         Game.onPlayerDied();
    }
    
    function onPlayerDied() {
        gameEngine.stop();
        
        if (player.lives <= 0) {
            // ... (Logica Game Over) ...
        } else {
             loadLevel(currentLevelIndex);
             gameEngine.start();
        }
    }
    
    function getCurLevelIndex() {
        return currentLevelIndex;
    }
    
    function getCurLevelData() {
        return currentLevel;
    }


    window.onload = loadLevels;

    return {
        startNew: startNew,
        endGameWin: endGameWin, // <-- AGGIUNTO
        nextLevel: nextLevel,
        onPlayerDied: onPlayerDied,
        onPlayerFell: onPlayerFell,
        getCurLevelIndex: getCurLevelIndex,
        getCurLevelData: getCurLevelData
    };
})();

window.Game = Game;
