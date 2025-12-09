// game.js (Versione completa con caricamento delle sprite, percorsi corretti e piattaforme di fallback NERE)

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
    
    // VARIABILI GLOBALI PER LE SPRITE (saranno definite in init)

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
            return false;
        }

        currentLevelIndex = index;
        currentLevel = levels[index];
        
        if (!window.Player) {
            console.error("ERRORE: Player class (window.Player) non è definita. Controlla che player.js sia caricato correttamente.");
            return false;
        }
        
        // Inizializzazione del Player O reset della posizione
        if (!player) { 
            if (!currentLevel.playerStart || typeof currentLevel.playerStart.x === 'undefined') {
                 console.error("Dati del livello incompleti: manca playerStart.");
                 return false;
            }
            player = new window.Player(currentLevel.playerStart.x, currentLevel.playerStart.y); 
        } else {
             if (player.resetFull) {
                 player.resetFull(currentLevel.playerStart.x, currentLevel.playerStart.y);
             } else {
                 player.reset(currentLevel.playerStart.x, currentLevel.playerStart.y);
             }
        }
        
        cameraX = 0;
        
        if (currentLevelIndex === 2 && window.BossFinal) {
             window.BossFinal.reset();
             const config = currentLevel.boss;
             window.BossFinal.start(config.x, config.y, config); 
        }
        
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
        if (!player) return;
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
        if (!window.BossFinal || !window.BossFinal.active || !window.rectsOverlap || !player) return;
        
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

            if (type === PLATFORM_TYPE.DISCO && window.discoSprite && window.discoSprite.complete) {
                ctx.drawImage(window.discoSprite, x, y, w, h);
            } else if (type === PLATFORM_TYPE.DJDISC && window.djdiscSprite && window.djdiscSprite.complete) {
                ctx.drawImage(window.djdiscSprite, x, y, w, h);
            } else if (type === PLATFORM_TYPE.PALO && window.paloSprite && window.paloSprite.complete) {
                ctx.drawImage(window.paloSprite, x, y, w, h);
            } else if (type === PLATFORM_TYPE.MACCHINA && window.macchinaSprite && window.macchinaSprite.complete) {
                ctx.drawImage(window.macchinaSprite, x, y, w, h);
            } else {
                // FALLBACK: Piattaforma disegnata in nero
                ctx.fillStyle = "black"; 
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
        newBtn.textContent = "Caricamento risorse in corso..."; 
        
        // 🔑 CARICAMENTO DELLE SPRITE
        
        // Player Sprites
        window.playerSprite = new Image();
        window.playerSprite.src = 'assets/sprites/pie.png'; 
        
        window.runSprite = new Image();
        window.runSprite.src = 'assets/sprites/run.png'; 
        
        // Altre Sprites essenziali per il rendering e l'HUD
        window.heartSprite = new Image();
        window.heartSprite.src = 'assets/sprites/heart.png'; 
        
        window.drinkEnemySprite = new Image();
        window.drinkEnemySprite.src = 'assets/sprites/drink.png'; 
        
        // Platform Sprites
        window.discoSprite = new Image();
        window.discoSprite.src = 'assets/sprites/disco.png'; 
        
        window.djdiscSprite = new Image();
        window.djdiscSprite.src = 'assets/sprites/djdisc.png'; 

        window.paloSprite = new Image();
        window.paloSprite.src = 'assets/sprites/palo.png';

        window.macchinaSprite = new Image();
        window.macchinaSprite.src = 'assets/sprites/macchina.png';
        
        
        // Crea una Promise per attendere il caricamento di tutte le sprite
        const spritePromises = [
            new Promise(resolve => window.playerSprite.onload = resolve),
            new Promise(resolve => window.runSprite.onload = resolve),
            new Promise(resolve => window.heartSprite.onload = resolve),
            new Promise(resolve => window.drinkEnemySprite.onload = resolve),
            new Promise(resolve => window.discoSprite.onload = resolve),
            new Promise(resolve => window.djdiscSprite.onload = resolve),
            new Promise(resolve => window.paloSprite.onload = resolve),
            new Promise(resolve => window.macchinaSprite.onload = resolve),
        ];

        // 1. Attendi il caricamento di tutte le sprite
        Promise.all(spritePromises)
            .then(() => loadLevels()) // 2. Poi carica i livelli JSON
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
            })
            .catch(error => {
                 console.error("Errore nel caricamento delle SPRITE. Verifica i percorsi in game.js:", error);
                 loadingMessage.textContent = "Errore CRITICO nel caricamento di una o più sprite. Verifica i percorsi!";
                 loadingMessage.style.display = 'block'; 
                 newBtn.disabled = true;
            });
    }

    function startNew() {
        if (!levels.length || !window.engine) { 
            alert("Il gioco non è pronto o l'Engine non è stato inizializzato. Controlla la console.");
            return;
        }
        
        toggleFullScreen(); 
        
        const playerLoaded = loadLevel(0); 

        if (!playerLoaded) {
             console.error("Impossibile avviare il gioco: Il player non è stato inizializzato. Controlla player.js.");
             return;
        }

        menuDiv.style.display = 'none';
        gameContainer.style.display = 'block';

        bgm.loop = true;
        bgm.play().catch(e => console.log("Errore riproduzione BGM:", e));
        
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
