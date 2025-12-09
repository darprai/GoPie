// game.js (Versione Corretta: Sfondo, Respawn, Punteggio)

const Game = (function() {
    const canvas = document.getElementById('game');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const menuDiv = document.getElementById('menu');
    const gameContainer = document.getElementById('game-container');
    const bgm = document.getElementById('bgm');
    const bgmFinal = document.getElementById('bgm_final');
    
    // VARIABILE GLOBALE PER LO SFONDO DEL CANVAS
    window.backgroundSprite = new Image();
    window.backgroundSprite.src = 'assets/sprites/icon-512.png'; // Uso questa come sfondo del livello

    let player; 
    let currentLevelIndex = 0;
    let levels = [];
    let currentLevel;
    let cameraX = 0;
    
    const PLATFORM_TYPE = {
        DISCO: "disco", DJDISC: "djdisc", PALO: "palo", MACCHINA: "macchina"
    };

    // --- Logica Livelli (Identica) ---

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

    function loadLevel(index, preserveScore = true) {
        if (!levels[index]) {
            console.error(`Livello ${index} non trovato.`);
            return false;
        }

        currentLevelIndex = index;
        currentLevel = JSON.parse(JSON.stringify(levels[index]));
        
        if (!window.Player) {
            console.error("ERRORE: Player class (window.Player) non è definita.");
            return false;
        }
        
        const startX = currentLevel.playerStart.x;
        const startY = currentLevel.playerStart.y;
        
        if (!player) { 
            player = new window.Player(startX, startY); 
        } else {
            const currentScore = player.score;
            if (preserveScore) {
                player.reset(startX, startY); 
                player.score = currentScore;
            } else {
                player.resetFull(startX, startY);
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


    // --- Logica di Gioco (Update/Draw) ---

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

        // Condizione di fine livello
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
                }
                return false; 
            }
            return true; 
        });
    }

    function draw() {
        if (!currentLevel || !ctx || !player) return; 

        // Disegna Sfondo Fisso
        if (window.backgroundSprite && window.backgroundSprite.complete) {
            // Ripeti lo sfondo orizzontalmente se il livello è più lungo
            const pattern = ctx.createPattern(window.backgroundSprite, 'repeat');
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            // Fallback: Sfondo Nero se l'immagine manca (CORREZIONE per lo sfondo bianco)
            ctx.fillStyle = '#000000'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height); 
        }

        renderPlatforms(currentLevel.platforms, cameraX);
        
        player.draw(ctx, cameraX); 
        
        renderEnemies(currentLevel.enemies, cameraX);
        
        // Disegna EndZone (per debug)
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

            let spriteToUse = null;

            if (type === PLATFORM_TYPE.DISCO && window.discoBallSprite && window.discoBallSprite.complete) {
                spriteToUse = window.discoBallSprite;
            } else if (type === PLATFORM_TYPE.DJDISC && window.djDiscSprite && window.djDiscSprite.complete) {
                spriteToUse = window.djDiscSprite;
            } else if (type === PLATFORM_TYPE.PALO && window.paloSprite && window.paloSprite.complete) {
                spriteToUse = window.paloSprite;
            } else if (type === PLATFORM_TYPE.MACCHINA && window.macchinaSprite && window.macchinaSprite.complete) {
                spriteToUse = window.macchinaSprite;
            }

            if (spriteToUse) {
                ctx.drawImage(spriteToUse, x, y, w, h);
            } else {
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
        ctx.font = '24px Arial';
        ctx.fillText(`PUNTEGGIO: ${player.score}`, 10, 30);
    }
    
    function renderBossHUD() {
        if (!window.BossFinal || !currentLevel.boss || !ctx) return;
        
        const thrown = window.BossFinal.thrown;
        const max = currentLevel.boss.projectiles;
        const progress = thrown / max;
        
        const barW = canvas.width / 3;
        const barH = 15;
        const x = canvas.width - barW - 20;
        const y = 30;
        
        ctx.fillStyle = 'gray';
        ctx.fillRect(x, y, barW, barH);
        
        ctx.fillStyle = 'yellow';
        ctx.fillRect(x, y, barW * progress, barH);
        
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`BOSS: ${thrown} / ${max}`, canvas.width - 20, y - 5);
        ctx.textAlign = 'left'; // Reset
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
        
        // Precaricamento Sprite (incluso backgroundSprite)
        const spritePromises = [
            new Promise(resolve => window.playerSprite.onload = resolve),
            new Promise(resolve => window.runSprite.onload = resolve),
            new Promise(resolve => window.heartSprite.onload = resolve),
            new Promise(resolve => window.drinkEnemySprite.onload = resolve),
            new Promise(resolve => window.discoBallSprite.onload = resolve), 
            new Promise(resolve => window.djDiscSprite.onload = resolve), 
            new Promise(resolve => window.paloSprite.onload = resolve),
            new Promise(resolve => window.macchinaSprite.onload = resolve),
            new Promise(resolve => window.bossSprite.onload = resolve),
            new Promise(resolve => window.backgroundSprite.onload = resolve), // AGGIUNTO
        ];

        Promise.all(spritePromises)
            .then(() => loadLevels()) 
            .then(success => {
                if (success) {
                    newBtn.textContent = "Nuova Partita";
                    newBtn.disabled = false;
                    hintText.style.display = 'block'; 
                } else {
                    newBtn.textContent = "Errore di Caricamento (vedi console)";
                    loadingMessage.textContent = "Errore CRITICO nel caricamento dei livelli. Controlla la console Rete!";
                    loadingMessage.style.display = 'block'; 
                    newBtn.disabled = true;
                }
            })
            .catch(error => {
                 console.error("Errore nel caricamento delle SPRITE. Verifica i percorsi in index.html:", error);
                 loadingMessage.textContent = "Errore CRITICO nel caricamento di una o più sprite. Verifica i percorsi in index.html!";
                 loadingMessage.style.display = 'block'; 
                 newBtn.disabled = true;
            });
    }

    function startNew() {
        if (!levels.length || !window.engine) { 
            console.error("Il gioco non è pronto o l'Engine non è stato inizializzato.");
            return;
        }
        
        toggleFullScreen(); 
        
        // Nuova Partita: resetta il punteggio (preserveScore=false)
        const playerLoaded = loadLevel(0, false); 

        if (!playerLoaded) {
             console.error("Impossibile avviare il gioco: Il player non è stato inizializzato.");
             return;
        }

        menuDiv.style.display = 'none';
        gameContainer.style.display = 'block';

        bgm.loop = true;
        bgm.play().catch(e => console.log("Audio BGM bloccato dal browser:", e));
        
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
            
            loadLevel(currentLevelIndex, true); 
            
        } else {
            window.engine.stop();
            bgm.pause();
            bgmFinal.pause();
            window.Ending.showLossScreen("Fine dei livelli (hai finito il contenuto).");
        }
    }
    
    function endGameWin() {
        if (window.engine) window.engine.stop();
        bgm.pause();
        bgmFinal.pause();
        if (player) window.Ending.showWinScreen("Pie diventa King!", player.score); 
    }

    // Funzione chiamata quando si cade o si muore
    function onPlayerDied() {
        if (window.engine) window.engine.stop(); 
        
        // Piccolo ritardo per mostrare l'effetto prima del respawn
        setTimeout(() => {
            
            loadLevel(currentLevelIndex, true); 
            
            // Gestione Audio (si riavvia la musica corretta)
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
        }, 100); // Ridotto a 100ms per un respawn più veloce
    }
    
    function onPlayerFell() {
          Game.onPlayerDied();
    }
    
    function setEngine(engine) {
        window.engine = engine; 
    }
    
    return {
        startNew: startNew,
        continue: () => console.log("Continua non implementato"),
        save: () => console.log("Salva non implementato"),
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
