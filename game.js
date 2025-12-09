// game.js (Versione definitiva con logica di caricamento ottimizzata)

const Game = (function() {
    // Variabili e riferimenti agli elementi DOM
    const canvas = document.getElementById('game');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const menuDiv = document.getElementById('menu');
    const gameContainer = document.getElementById('game-container');
    const bgm = document.getElementById('bgm');
    const bgmFinal = document.getElementById('bgm_final');

    let player; 
    let currentLevelIndex = 0;
    let levels = [];
    let currentLevel;
    let cameraX = 0;
    
    const PLATFORM_TYPE = {
        DISCO: "disco", DJDISC: "djdisc", PALO: "palo", MACCHINA: "macchina"
    };

    // --- Gestione Livelli ---

    function loadLevels() {
        // La funzione di caricamento dei livelli rimane la stessa,
        // garantendo che i file JSON siano stati caricati prima di abilitare 'Nuova Partita'.
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
                console.error("Errore CRITICO nel caricamento di un file JSON del livello. Verifica il percorso 'levels/*.json'.", error);
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
        
        // Inizializzazione del Player O reset della posizione
        if (!player && window.Player) { 
            player = new window.Player(currentLevel.playerStart.x, currentLevel.playerStart.y);
        } else if (player) {
            player.reset(currentLevel.playerStart.x, currentLevel.playerStart.y);
        }
        
        cameraX = 0;
        
        if (currentLevelIndex === 2 && window.BossFinal) {
             window.BossFinal.reset();
             const config = currentLevel.boss;
             window.BossFinal.start(config.x, config.y, config); 
        }
        
        // Ritorna true se il player è stato creato o resettato con successo
        return !!player;
    }

    // --- Logica di Gioco (Update/Draw/Collisioni) ---
    
    function update(dt, input) {
        if (!currentLevel || !player || !window.engine) return; 

        player.update(dt, input, currentLevel.platforms);
        
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
        if (!player) return; // Controllo extra
        if (currentLevel.enemies) {
            currentLevel.enemies = currentLevel.enemies.filter(enemy => {
                if (window.rectsOverlap && rectsOverlap(player, enemy)) {
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
                 if (window.rectsOverlap && trap.type === 'fall_death' && rectsOverlap(player, trap)) {
                     Game.onPlayerFell(); 
                     return; 
                 }
             }
          }
    }
    
    function handleBossCollisions() {
        if (!window.BossFinal || !window.BossFinal.active || !window.rectsOverlap || !player) return; // Controllo extra player
        
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
        // CONTROLLO DI SICUREZZA ESSENZIALE PER EVITARE IL CRASH
        // La riga 150 (approssimativa) sarà player.draw(ctx, cameraX);
        if (!currentLevel || !ctx || !player) return; 

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
    
    // Funzioni di Rendering (omesse per brevità, sono identiche alla versione precedente)
    function renderPlatforms(platforms, camX) {
        if (!ctx) return;
        // (codice di rendering delle piattaforme...)
    }
    
    function renderEnemies(enemies, camX) {
        if (!enemies || !ctx) return;
        // (codice di rendering dei nemici...)
    }

    function renderHUD() {
        if (!ctx || !player) return; 
        // (codice di rendering dell'HUD...)
    }
    
    function renderBossHUD() {
        if (!window.BossFinal || !currentLevel.boss || !ctx) return;
        // (codice di rendering dell'HUD del Boss...)
    }
    
    function toggleFullScreen() {
        const doc = window.document;
        const docEl = doc.documentElement;
        // (codice per il fullscreen...)
    }
    
    // Funzioni di Controllo Gioco
    function init() {
        const newBtn = document.getElementById('newBtn');
        const loadingMessage = document.getElementById('loading-message');
        const hintText = document.getElementById('hint-text');

        loadingMessage.style.display = 'none'; 
        hintText.style.display = 'none'; 

        newBtn.disabled = true;
        newBtn.textContent = "Caricamento in corso..."; 

        // Carica i livelli (asincrono)
        loadLevels()
            .then(success => {
                if (success) {
                    newBtn.textContent = "Nuova Partita";
                    newBtn.disabled = false;
                } else {
                    newBtn.textContent = "Errore di Caricamento (vedi console)";
                    loadingMessage.textContent = "Errore CRITICO nel caricamento dei livelli. Controlla la console Rete!";
                    loadingMessage.style.display = 'block'; 
                    newBtn.disabled = true;
                }
            });
    }

    function startNew() {
        if (!levels.length || !window.engine) { 
            alert("Il gioco non è pronto o l'Engine non è stato inizializzato. Controlla la console.");
            return;
        }
        
        toggleFullScreen(); 
        
        // 🔑 PUNTO CRITICO RISOLTO: Creiamo il player ORA prima di avviare l'engine.
        const playerLoaded = loadLevel(0); 

        if (!playerLoaded) {
             console.error("Impossibile avviare il gioco: Il player non è stato inizializzato.");
             return;
        }

        menuDiv.style.display = 'none';
        gameContainer.style.display = 'block';

        bgm.loop = true;
        bgm.play().catch(e => console.log("Errore riproduzione BGM:", e));
        
        window.engine.start(); // L'Engine parte DOPO che player è stato creato
    }
    
    function nextLevel() {
        currentLevelIndex++;
        
        if (currentLevelIndex < levels.length) {
            if (currentLevelIndex === 2) {
                bgm.pause();
                bgmFinal.loop = true;
                bgmFinal.play().catch(e => console.log("Errore riproduzione BGM Finale:", e));
            }
            
            // Si assicura che il player venga resettato nel nuovo livello prima che il loop continui
            loadLevel(currentLevelIndex);
            
        } else {
            window.engine.stop();
            bgm.pause();
            bgmFinal.pause();
            window.Ending.showLossScreen("Fine dei livelli.");
        }
    }
    
    function endGameWin() {
        if (window.engine) window.engine.stop();
        bgm.pause();
        bgmFinal.pause();
        if (player) window.Ending.showWinScreen("Pie diventa King!", player.score); 
    }

    function onPlayerFell() {
          if (player) player.lives = 0;
          Game.onPlayerDied();
    }
    
    function onPlayerDied() {
        if (window.engine) window.engine.stop(); 
        
        if (!player || player.lives <= 0) {
            setTimeout(() => {
                
                // Si assicura che il player sia resettato
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

                if (window.engine) window.engine.start();
            }, 1500); 
            
        } else {
              loadLevel(currentLevelIndex);
              if (window.engine) window.engine.start(); 
        }
    }
    
    function continueGame() {
        alert("Funzione Continua non implementata. Avvio una Nuova Partita.");
        startNew();
    }
    
    function saveGame() {
        alert("Funzione Salva non implementata.");
    }

    function setEngine(engine) {
        window.engine = engine; 
    }
    
    return {
        startNew: startNew,
        continue: continueGame,
        save: saveGame,
        nextLevel: nextLevel,
        endGameWin: endGameWin,
        onPlayerDied: onPlayerDied,
        onPlayerFell: onPlayerFell,
        init: init, 
        update: update, 
        draw: draw,     
        setEngine: setEngine, 
        getCurLevelIndex: () => currentLevelIndex,
    };
})();

window.Game = Game;
