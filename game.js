// game.js (file completo e aggiornato)

const Game = (function() {
    // Variabili e riferimenti agli elementi DOM
    const canvas = document.getElementById('game');
    const ctx = canvas ? canvas.getContext('2d') : null; // Gestione sicura del contesto
    const menuDiv = document.getElementById('menu');
    const gameContainer = document.getElementById('game-container');
    const bgm = document.getElementById('bgm');
    const bgmFinal = document.getElementById('bgm_final');

    let player;
    let currentLevelIndex = 0;
    let levels = [];
    let currentLevel;
    let cameraX = 0;
    let gameEngine = null; // Inizializzato a null

    const PLATFORM_TYPE = {
        DISCO: "disco", DJDISC: "djdisc", PALO: "palo", MACCHINA: "macchina"
    };

    // --- Gestione Livelli ---

    function loadLevels() {
        const levelPromises = [
            fetch('levels/level1.json').then(res => res.json()),
            fetch('levels/level2.json').then(res => res.json()),
            fetch('levels/level3.json').then(res => res.json()) 
        ];

        return Promise.all(levelPromises)
            .then(loadedLevels => {
                levels = loadedLevels;
                return true;
            })
            .catch(error => {
                console.error("Errore CRITICO nel caricamento di un file JSON del livello:", error);
                return false;
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
            // Assicurati che la classe Player sia definita prima (in player.js)
            player = new Player(currentLevel.playerStart.x, currentLevel.playerStart.y);
        } else {
            player.reset(currentLevel.playerStart.x, currentLevel.playerStart.y);
        }
        
        cameraX = 0;
        
        if (currentLevelIndex === 2 && window.BossFinal) {
             window.BossFinal.reset();
             const config = currentLevel.boss;
             window.BossFinal.start(config.x, config.y, config); 
        }
    }

    // --- Logica di Gioco (Update/Draw/Collisioni) ---
    
    function update(dt, input) {
        if (!currentLevel || !player) return;

        player.update(dt, input, currentLevel.platforms);
        // ... (resto della funzione update)
        
        if (currentLevelIndex === 2) {
            if (window.BossFinal && window.BossFinal.active) {
                window.BossFinal.update(dt, player, cameraX);
                handleBossCollisions(); 
            }
        }
        
        const targetX = player.x - canvas.width / 2 + player.w / 2;
        cameraX = Math.max(0, Math.min(targetX, currentLevel.length - canvas.width));

        const endZone = currentLevel.endZone;
        if (player.x + player.w > endZone.x && 
            player.x < endZone.x + endZone.w &&
            player.y + player.h > endZone.y && 
            player.y < endZone.y + endZone.h) {
            
            if (currentLevelIndex !== 2) {
                Game.nextLevel();
            }
        }

        handleCollisions();
    }
    
    function handleCollisions() {
        if (currentLevel.enemies) {
            currentLevel.enemies = currentLevel.enemies.filter(enemy => {
                if (rectsOverlap(player, enemy)) {
                    
                    if (enemy.type === 'drink') {
                        player.lives = 0; 
                        Game.onPlayerDied();
                        return false; 
                    }
                    
                    if (enemy.type === 'heart') {
                        player.collectHeart();
                        return false; 
                    }
                }
                return true; 
            });
        }
        
        if (currentLevel.invisible_traps) {
             for (let trap of currentLevel.invisible_traps) {
                 // Assicurati che rectsOverlap esista e sia caricata (in rects.js)
                 if (trap.type === 'fall_death' && rectsOverlap(player, trap)) {
                     Game.onPlayerFell(); 
                     return; 
                 }
             }
          }
    }
    
    function handleBossCollisions() {
        if (!window.BossFinal || !window.BossFinal.active) return;
        
        if (window.BossFinal.thrown >= currentLevel.boss.projectiles) {
             Game.endGameWin();
             return;
        }
        
        window.BossFinal.projectiles = window.BossFinal.projectiles.filter(p => {
            if (rectsOverlap(player, p)) {
                
                if (player.hit()) {
                    player.x = Math.max(0, player.x - 50);
                } else {
                    Game.onPlayerDied();
                }
                return false; 
            }
            return true; 
        });
    }

    function draw() {
        if (!currentLevel || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        renderPlatforms(currentLevel.platforms, cameraX);
        player.draw(ctx, cameraX);
        renderEnemies(currentLevel.enemies, cameraX);

        const endZone = currentLevel.endZone;
        ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
        ctx.fillRect(Math.round(endZone.x - cameraX), endZone.y, endZone.w, endZone.h);

        if (currentLevelIndex === 2 && window.BossFinal && window.BossFinal.active) {
            window.BossFinal.render(ctx, cameraX);
            renderBossHUD(); 
        }

        renderHUD();
    }
    
    function renderPlatforms(platforms, camX) {
        if (!ctx) return;
        for (let p of platforms) {
            const x = Math.round(p[0] - camX);
            const y = Math.round(p[1]);
            const w = p[2];
            const h = p[3];
            const type = p[4]; 

            if (type === PLATFORM_TYPE.DISCO && window.discoBallSprite && window.discoBallSprite.complete) {
                ctx.drawImage(window.discoBallSprite, x, y, w, h);
            } else if (type === PLATFORM_TYPE.DJDISC && window.djDiscSprite && window.djDiscSprite.complete) {
                ctx.drawImage(window.djDiscSprite, x, y, w, h);
            } else if (type === PLATFORM_TYPE.PALO && window.paloSprite && window.paloSprite.complete) {
                ctx.drawImage(window.paloSprite, x, y, w, h);
            } else if (type === PLATFORM_TYPE.MACCHINA && window.macchinaSprite && window.macchinaSprite.complete) {
                ctx.drawImage(window.macchinaSprite, x, y, w, h);
            } else {
                ctx.fillStyle = "#333333";
                ctx.fillRect(x, y, w, h);
            }
        }
    }
    
    function renderEnemies(enemies, camX) {
        if (!enemies || !ctx) return;
        for (let e of enemies) {
            const x = Math.round(e.x - camX);
            const y = Math.round(e.y);
            
            if (e.type === 'drink' && window.drinkEnemySprite && window.drinkEnemySprite.complete) {
                ctx.drawImage(window.drinkEnemySprite, x, y, e.w, e.h);
            } else if (e.type === 'heart' && window.heartSprite && window.heartSprite.complete) {
                ctx.drawImage(window.heartSprite, x, y, e.w, e.h);
            } else {
                 ctx.fillStyle = (e.type === 'drink') ? 'purple' : 'pink';
                 ctx.fillRect(x, y, e.w, e.h);
            }
        }
    }

    function renderHUD() {
        if (!ctx) return;
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(`Punteggio: ${player.score}`, 10, 30);
        
        const heartSize = 25;
        const spacing = 5;
        for (let i = 0; i < 3; i++) {
            const x = canvas.width - (i + 1) * (heartSize + spacing);
            const y = 10;
            if (i < player.lives && window.heartSprite && window.heartSprite.complete) {
                ctx.drawImage(window.heartSprite, x, y, heartSize, heartSize);
            } else {
                ctx.strokeStyle = 'red';
                ctx.strokeRect(x, y, heartSize, heartSize);
            }
        }
    }
    
    function renderBossHUD() {
        if (!window.BossFinal || !currentLevel.boss || !ctx) return;
        
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
    
    function toggleFullScreen() {
        const doc = window.document;
        const docEl = doc.documentElement;

        const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;

        if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
            requestFullScreen.call(docEl).catch(err => {
                console.warn("Impossibile attivare il fullscreen (richiede interazione utente):", err);
            });
        } 
    }
    
    function init() {
        const newBtn = document.getElementById('newBtn');
        const loadingMessage = document.getElementById('loading-message');

        loadingMessage.textContent = "Caricamento Livelli in corso...";
        newBtn.disabled = true;

        loadLevels()
            .then(success => {
                if (success) {
                    loadingMessage.textContent = "Livelli caricati! Premi Nuova Partita.";
                    newBtn.textContent = "Nuova Partita";
                    newBtn.disabled = false;
                } else {
                    loadingMessage.textContent = "Errore CRITICO nel caricamento dei livelli. Controlla la console!";
                    newBtn.textContent = "Errore";
                    newBtn.disabled = true;
                }
            });
    }

    function startNew() {
        // **CORREZIONE**: gameEngine non è più nullo solo se l'Engine è stato creato con successo
        if (!levels.length || !gameEngine) { 
            alert("Il gioco non è pronto o l'Engine non è stato inizializzato. Controlla la console.");
            return;
        }
        
        toggleFullScreen(); 
        
        menuDiv.style.display = 'none';
        gameContainer.style.display = 'block';

        bgm.loop = true;
        bgm.play().catch(e => console.log("Errore riproduzione BGM:", e));

        currentLevelIndex = 0; 
        loadLevel(currentLevelIndex);
        
        gameEngine.start();
    }
    
    function nextLevel() {
        currentLevelIndex++;
        
        if (currentLevelIndex < levels.length) {
            if (currentLevelIndex === 2) {
                bgm.pause();
                bgmFinal.loop = true;
                bgmFinal.play().catch(e => console.log("Errore riproduzione BGM Finale:", e));
            }
            
            loadLevel(currentLevelIndex);
            
        } else {
            // Assicurati che l'Ending sia caricato (in ending.js)
            gameEngine.stop();
            bgm.pause();
            bgmFinal.pause();
            window.Ending.showLossScreen("Fine dei livelli.");
        }
    }
    
    function endGameWin() {
        gameEngine.stop();
        bgm.pause();
        bgmFinal.pause();
        window.Ending.showWinScreen("Pie diventa King!", player.score); 
    }

    function onPlayerFell() {
          player.lives = 0;
          Game.onPlayerDied();
    }
    
    function onPlayerDied() {
        if (gameEngine) gameEngine.stop(); 
        
        if (player.lives <= 0) {
            setTimeout(() => {
                
                loadLevel(currentLevelIndex); 
                
                if (currentLevelIndex === 2) {
                    bgm.pause();
                    bgmFinal.play().catch(e => console.log("Errore riproduzione BGM Finale:", e));
                } else {
                    bgmFinal.pause();
                    bgm.play().catch(e => console.log("Errore riproduzione BGM:", e));
                }
                
                menuDiv.style.display = 'none';
                gameContainer.style.display = 'block';

                if (gameEngine) gameEngine.start();
            }, 1500); 
            
        } else {
              loadLevel(currentLevelIndex);
              if (gameEngine) gameEngine.start(); 
        }
    }
    
    function continueGame() {
        alert("Funzione Continua non implementata. Avvio una Nuova Partita.");
        startNew();
    }
    
    function saveGame() {
        alert("Funzione Salva non implementata.");
    }
    
    // **CORREZIONE**: ESPOSIZIONE DELLE FUNZIONI update E draw
    return {
        startNew: startNew,
        continue: continueGame,
        save: saveGame,
        nextLevel: nextLevel,
        endGameWin: endGameWin,
        onPlayerDied: onPlayerDied,
        onPlayerFell: onPlayerFell,
        init: init, 
        // 🔑 NUOVO: Esporre update e draw
        update: update, 
        draw: draw,
        getCurLevelIndex: () => currentLevelIndex,
    };
})();

// 🔑 CORREZIONE CHIAVE: Inizializzazione Engine. 
// L'engine è creato ORA. Le funzioni update e draw sono ora disponibili tramite Game.update/Game.draw.
const canvas = document.getElementById('game');
if (window.Engine && canvas && Game.update && Game.draw) {
    // Controlla che Engine esista e che le funzioni siano state esposte
    const engineInstance = new Engine(Game.update, Game.draw);
    if (engineInstance) {
        Game.gameEngine = engineInstance; // Assegnazione diretta al gameEngine interno al modulo Game
        window.engine = engineInstance;
    }
} else {
    // Questo warning apparirà se Engine.js non è caricato o se le funzioni non sono esposte
    console.warn("L'Engine non è stato inizializzato. Controlla che Engine.js sia caricato e che Game.update/Game.draw siano esposte.");
}

window.Game = Game;
