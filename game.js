// game.js (file completo e aggiornato)

const Game = (function() {
    // Variabili e riferimenti agli elementi DOM
    const canvas = document.getElementById('game');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const menuDiv = document.getElementById('menu');
    const gameContainer = document.getElementById('game-container');
    const bgm = document.getElementById('bgm');
    const bgmFinal = document.getElementById('bgm_final');

    let player; // La variabile player è dichiarata qui
    let currentLevelIndex = 0;
    let levels = [];
    let currentLevel;
    let cameraX = 0;
    
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
        
        // Inizializzazione del Player o Reset della posizione
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
    }

    // --- Logica di Gioco (Update/Draw/Collisioni) ---
    
    function update(dt, input) {
        // CONTROLLO DI SICUREZZA 1: Assicurati che il player sia definito prima di aggiornarlo.
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
        if (!window.BossFinal || !window.BossFinal.active || !window.rectsOverlap) return;
        
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
        // CONTROLLO DI SICUREZZA 2: Assicurati che il player sia definito prima di disegnarlo.
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
    
    // Funzioni di Rendering
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
        if (!ctx || !player) return; 
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
    
    // Funzioni di Controllo Gioco
    function init() {
        const newBtn = document.getElementById('newBtn');
        const loadingMessage = document.getElementById('loading-message');
        const hintText = document.getElementById('hint-text');

        loadingMessage.style.display = 'none'; 
        hintText.style.display = 'none'; 

        newBtn.disabled = true;
        newBtn.textContent = "Caricamento in corso..."; 

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
        
        menuDiv.style.display = 'none';
        gameContainer.style.display = 'block';

        bgm.loop = true;
        bgm.play().catch(e => console.log("Errore riproduzione BGM:", e));

        currentLevelIndex = 0; 
        loadLevel(currentLevelIndex); 
        
        window.engine.start(); 
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
        window.Ending.showWinScreen("Pie diventa King!", player.score); 
    }

    function onPlayerFell() {
          player.lives = 0;
          Game.onPlayerDied();
    }
    
    function onPlayerDied() {
        if (window.engine) window.engine.stop(); 
        
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
