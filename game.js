// game.js (Versione Finale con Correzioni Logiche e Percorsi Asset/Livelli)

const Game = (function() {
    const canvas = document.getElementById('game');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const menuDiv = document.getElementById('menu');
    const gameContainer = document.getElementById('game-container');
    
    // VARIABILI AUDIO AGGIORNATE
    const musicNormal = document.getElementById('music_normal');
    const musicFinal = document.getElementById('music_final');
    
    // Variabile globale per lo sfondo del canvas
    window.backgroundSprite = new Image();
    window.backgroundSprite.src = 'assets/sprites/icon-512.png'; 

    let player; 
    let currentLevelIndex = 0;
    let levels = [];
    let currentLevel;
    let cameraX = 0;
    
    // VARIABILE PER GESTIRE LA SOVRAPPOSIZIONE E IL RIARMO
    let isTransitioning = false; 

    const PLATFORM_TYPE = {
        DISCO: "disco", DJDISC: "djdisc", PALO: "palo", MACCHINA: "macchina"
    };

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
                console.error("Errore CRITICO nel caricamento di un file JSON del livello.", error);
                const loadingMessage = document.getElementById('loading-message');
                loadingMessage.textContent = "ERRORE: Impossibile caricare i livelli (404/Network). Controlla la cartella 'levels/'.";
                loadingMessage.style.display = 'block'; 
                document.getElementById('newBtn').disabled = true;
                return false;
            });
    }

    function loadLevel(index, preserveScore = true) {
        if (!levels[index]) {
            console.error(`Livello ${index} non trovato.`);
            return false;
        }

        currentLevelIndex = index;
        
        // 1. Cloniamo il livello e salviamo i nemici originali per il riavvio
        const levelData = levels[index];
        currentLevel = JSON.parse(JSON.stringify(levelData));
        // Aggiungiamo un campo per salvare lo stato originale dei nemici (utile per onPlayerDied)
        currentLevel.originalEnemies = JSON.parse(JSON.stringify(levelData.enemies || []));

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
                player.resetFull(startX, startY); // Resetta anche il punteggio
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


    function update(dt, input) {
        if (!currentLevel || !player || !window.engine || isTransitioning) return; 

        // CHIAMATA CORRETTA: DEVI PASSARE I NEMICI A player.update
        player.update(dt, input, currentLevel.platforms, currentLevel.enemies);
        
        if (currentLevelIndex === 2) {
            if (window.BossFinal && window.BossFinal.active) {
                window.BossFinal.update(dt, player, cameraX);
                handleBossCollisions(); 
            }
        }
        
        const targetX = player.x - canvas.width / 2 + player.w / 2;
        
        cameraX = Math.max(0, Math.min(targetX, currentLevel.length - canvas.width));
        
        if (currentLevel.length <= canvas.width) {
             cameraX = 0; 
        }

        const endZone = currentLevel.endZone;
        if (player.x + player.w > endZone.x && 
            player.x < endZone.x + endZone.w &&
            player.y + player.h > endZone.y && 
            player.y < endZone.y + endZone.h) {
            
            if (currentLevelIndex !== 2) {
                Game.nextLevel();
            }
        }

        // NON CHIAMARE handleCollisions QUI! 
        // La logica di collisione player/nemici è ora in player.update().
        // Chiama solo removeEnemy per rimuovere i cuori/nemici.
    }
    
    // ***************************************************************
    // FUNZIONE RICHIESTA DA player.js PER RIMUOVERE COLLEZIONABILI
    // ***************************************************************
    function removeEnemy(index) {
        if (currentLevel && currentLevel.enemies) {
            // Rimuove l'elemento dall'array enemies
            currentLevel.enemies.splice(index, 1);
        }
    }
    // ***************************************************************

    // La logica di collisione con nemici/cuori è gestita in player.js
    // Rimuoviamo la vecchia handleCollisions per evitare duplicati.
    
    function handleBossCollisions() {
        if (!window.BossFinal || !window.BossFinal.active || !window.rectsOverlap || !player) return;
        
        if (window.BossFinal.thrown >= currentLevel.boss.projectiles) {
             Game.endGameWin();
             return;
        }
        
        window.BossFinal.projectiles = window.BossFinal.projectiles.filter(p => {
            if (rectsOverlap(player, p)) {
                if (player.hit()) { // player.hit() ora chiama onPlayerDied
                    player.x = Math.max(0, player.x - 50); 
                }
                return false; 
            }
            return true; 
        });
    }

    function draw() {
        if (!currentLevel || !ctx || !player) return; 

        // 1. Disegna Sfondo
        if (window.backgroundSprite && window.backgroundSprite.complete) {
            ctx.drawImage(window.backgroundSprite, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = '#000000'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height); 
        }
        
        renderPlatforms(currentLevel.platforms, cameraX);
        
        player.draw(ctx, cameraX); 
        
        renderEnemies(currentLevel.enemies, cameraX);
        
        // Disegna EndZone
        const endZone = currentLevel.endZone;
        ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
        ctx.fillRect(Math.round(endZone.x - cameraX), endZone.y, endZone.w, endZone.h);
        
        if (currentLevelIndex === 2 && window.BossFinal && window.BossFinal.active) {
            window.BossFinal.render(ctx, cameraX);
            renderBossHUD(); 
        }
        
        // Il punteggio è disegnato in player.draw() in player.js, ma lo manteniamo qui
        // per consistenza con il resto dell'HUD del gioco.
        renderHUD(); 
    }
    
    // ... (renderPlatforms, renderEnemies, renderHUD, renderBossHUD, toggleFullScreen non modificati)
    // Li ho omessi per brevità, ma assumiamo che siano presenti nel file finale.

    function renderPlatforms(platforms, camX) {
         // ... (Logica omessa, non modificata)
         if (!ctx) return;
         for (let p of platforms) {
             const x = Math.round(p[0] - camX);
             const y = Math.round(p[1]);
             const w = p[2];
             const h = p[3];
             const type = p[4]; 
             let spriteToUse = null;
             // ... logica sprite ...
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
         // ... (Logica omessa, non modificata)
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
         // ... (Logica omessa, non modificata)
         if (!ctx || !player) return; 
         ctx.fillStyle = 'white';
         ctx.font = '24px Arial';
         ctx.fillText(`PUNTEGGIO: ${player.score}`, 10, 30);
    }
    
    function renderBossHUD() {
        // ... (Logica omessa, non modificata)
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
         // ... (Logica omessa, non modificata)
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
         // ... (Logica omessa, non modificata)
         const newBtn = document.getElementById('newBtn');
         const loadingMessage = document.getElementById('loading-message');
         const hintText = document.getElementById('hint-text');

         loadingMessage.style.display = 'none'; 
         hintText.style.display = 'none'; 

         newBtn.disabled = true;
         newBtn.textContent = "Caricamento risorse in corso..."; 
         
         const spritesToLoad = [
             window.playerSprite, window.runSprite, window.heartSprite, 
             window.drinkEnemySprite, window.discoBallSprite, window.djDiscSprite, 
             window.paloSprite, window.macchinaSprite, window.bossSprite,
             window.backgroundSprite
         ];
         
         const spritePromises = spritesToLoad.map(sprite => {
             return new Promise((resolve, reject) => {
                 if (sprite.complete) {
                     resolve();
                 } else {
                     sprite.onload = resolve;
                     sprite.onerror = () => {
                         reject(`Errore nel caricamento della sprite: ${sprite.src}`);
                     };
                 }
             });
         });

         Promise.all(spritePromises)
             .then(() => loadLevels())
             .then(success => {
                 if (success) {
                     newBtn.textContent = "Nuova Partita";
                     newBtn.disabled = false;
                     hintText.style.display = 'block'; 
                 } 
             })
             .catch(error => {
                  console.error("Errore critico durante il caricamento delle risorse (Sprite/Livelli):", error);
                  loadingMessage.textContent = `Errore critico di caricamento. Verifica i percorsi: ${error}`;
                  loadingMessage.style.display = 'block'; 
                  newBtn.disabled = true;
             });
    }

    function startNew(e) {
         // ... (Logica omessa, non modificata)
         if(e) e.preventDefault(); 
         
         if (!levels.length || !window.engine) { 
             return;
         }
         
         toggleFullScreen(); 
         
         const playerLoaded = loadLevel(0, false); 

         if (!playerLoaded) {
             return;
         }

         menuDiv.style.display = 'none';
         gameContainer.style.display = 'block';

         if (musicNormal) {
             musicNormal.loop = true;
             musicNormal.play().catch(e => console.log("Audio BGM bloccato:", e));
         }
         
         window.engine.start(); 
    }
    
    function nextLevel() {
        // ... (Logica omessa, non modificata)
        currentLevelIndex++;
        
        if (currentLevelIndex < levels.length) {
            if (currentLevelIndex === 2) {
                if (musicNormal) musicNormal.pause();
                if (musicFinal) {
                    musicFinal.loop = true;
                    musicFinal.play().catch(e => console.log("Errore riproduzione BGM Finale:", e));
                }
            }
            
            loadLevel(currentLevelIndex, true); 
            
        } else {
            window.engine.stop();
            if (musicNormal) musicNormal.pause();
            if (musicFinal) musicFinal.pause();
            window.Ending.showLossScreen("Fine dei livelli (hai finito il contenuto).");
        }
    }
    
    function endGameWin() {
        // ... (Logica omessa, non modificata)
        if (window.engine) window.engine.stop();
        if (musicNormal) musicNormal.pause();
        if (musicFinal) musicFinal.pause();
        if (player) window.Ending.showWinScreen("Pie diventa King!", player.score); 
    }

    // ***************************************************************
    // FUNZIONE CHIAMATA ALLA MORTE DEL GIOCATORE (da player.js)
    // ***************************************************************
    function onPlayerDied() {
        if (isTransitioning) return;
        isTransitioning = true; // Impedisce chiamate multiple
        
        if (window.engine) window.engine.stop(); 
        
        setTimeout(() => {
            
            // 1. Ripristina i nemici originali per il riavvio del livello
            if (currentLevel.originalEnemies) {
                 currentLevel.enemies = JSON.parse(JSON.stringify(currentLevel.originalEnemies));
            }
            
            // 2. Ricarica il livello (mantenendo il punteggio)
            loadLevel(currentLevelIndex, true); 
            
            // 3. Gestione Audio
            if (currentLevelIndex === 2) {
                if (musicNormal) musicNormal.pause();
                if (musicFinal) musicFinal.play().catch(e => console.log("Errore riproduzione BGM Finale:", e));
            } else {
                if (musicFinal) musicFinal.pause();
                if (musicNormal) musicNormal.play().catch(e => console.log("Errore riproduzione BGM:", e));
            }
            
            menuDiv.style.display = 'none';
            gameContainer.style.display = 'block';

            if (window.engine) window.engine.start();
            isTransitioning = false;
        }, 500); // 500ms di pausa per percepire la morte
    }
    // ***************************************************************
    
    function setEngine(engine) {
        window.engine = engine; 
    }
    
    return {
        startNew: startNew,
        nextLevel: nextLevel,
        endGameWin: endGameWin,
        onPlayerDied: onPlayerDied,
        init: init, 
        update: update, 
        draw: draw, 
        setEngine: setEngine, 
        getCurLevelIndex: () => currentLevelIndex,
        removeEnemy: removeEnemy, // Rende la funzione accessibile globalmente
        player: () => player // Utile per il debug
    };
})();

window.Game = Game;
