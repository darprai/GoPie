// game.js (Versione Finale con Logica Cutscene Palo/Macchina per Level 1 E Level 2)

const Game = (function() {
    const canvas = document.getElementById('game');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const menuDiv = document.getElementById('menu');
    const gameContainer = document.getElementById('game-container');
    
    // VARIABILI AUDIO
    const musicNormal = document.getElementById('music_normal');
    const musicFinal = document.getElementById('music_final');
    
    // ************************************************************
    // DEFINIZIONE GLOBALE DI TUTTE LE SPRITE (Necessario per Promise.all)
    // ************************************************************
    
    // Player & Items
    window.playerSprite = new Image(); window.playerSprite.src = 'assets/sprites/pie.png'; 
    window.runSprite = new Image(); window.runSprite.src = 'assets/sprites/run.png';
    window.heartSprite = new Image(); window.heartSprite.src = 'assets/sprites/heart.png';
    window.drinkEnemySprite = new Image(); window.drinkEnemySprite.src = 'assets/sprites/drink.png';
    window.backgroundSprite = new Image(); window.backgroundSprite.src = 'assets/sprites/icon-512.png'; 
    
    // Piattaforme/Trigger
    window.discoBallSprite = new Image(); window.discoBallSprite.src = 'assets/sprites/disco.png';
    window.djDiscSprite = new Image(); window.djDiscSprite.src = 'assets/sprites/djdisc.png';
    window.paloSprite = new Image(); window.paloSprite.src = 'assets/sprites/palo.png';
    window.macchinaSprite = new Image(); window.macchinaSprite.src = 'assets/sprites/macchina.png';
    
    // Cutscene & Boss
    window.ragazzaSprite = new Image(); window.ragazzaSprite.src = 'assets/sprites/ragazza.png';
    window.bossSprite = new Image(); window.bossSprite.src = 'assets/sprites/golruk.png'; 
    // ************************************************************

    let player; 
    let currentLevelIndex = 0;
    let levels = [];
    let currentLevel;
    let cameraX = 0;
    
    let isTransitioning = false; 
    
    // VARIABILI CUTSCENE
    let isCutsceneActive = false;
    let cutsceneTime = 0;         
    const CUTSCENE_DURATION = 3.0;
    
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

    // ************************************************************
    // GESTIONE CUTSCENE (INIZIO E AGGIORNAMENTO)
    // ************************************************************

    function startCutscene(trigger) { 
        isCutsceneActive = true;
        cutsceneTime = 0;
        window.engine.stop(); 
        
        if (musicNormal) musicNormal.pause();
        
        if (trigger) {
            // Posiziona il giocatore vicino al trigger
            player.x = trigger[0] + trigger[2] / 2; 
        }
        player.vy = 0;
        player.vx = 0;
        player.isJumping = false;
        player.isGrounded = true;
        player.facingRight = true; 
        player.isHit = false; 

        window.engine.start(); 
    }
    
    function updateCutscene(dt) {
        cutsceneTime += dt;
        
        // Blocca la telecamera sull'area del trigger per la cutscene
        let camTargetX = 0;
        
        // Ipotizziamo che la cutscene si svolga nell'area del palo/trigger per entrambi i livelli
        // Palo Level 1 è a 3750 (dalle tue json)
        if (currentLevelIndex === 0) {
            camTargetX = 3750 - canvas.width / 2;
        // Palo Level 2 è a 5650 (dal level2.json aggiornato)
        } else if (currentLevelIndex === 1) { 
            camTargetX = 5650 - canvas.width / 2; 
        }
        
        cameraX = Math.max(0, Math.min(camTargetX, currentLevel.length - canvas.width));

        if (cutsceneTime >= CUTSCENE_DURATION) {
            isCutsceneActive = false;
            window.engine.stop(); 
            Game.nextLevel();
        }
    }

    // ************************************************************
    // FUNZIONE UPDATE
    // ************************************************************

    function update(dt, input) {
        if (!currentLevel || !player || !window.engine || isTransitioning) return; 

        if (isCutsceneActive) {
            updateCutscene(dt); 
            return;
        } 
        
        player.update(dt, input, currentLevel.platforms, currentLevel.enemies);

        // ********* CONTROLLO COLLISIONE CON IL PALO *********
        let triggerPlatform = null;
        
        // Cerca il PALO sia nel Livello 0 che nel Livello 1 (il Livello 2 è indice 1)
        if (currentLevelIndex === 0 || currentLevelIndex === 1) { 
            triggerPlatform = currentLevel.platforms.find(p => p[4] === PLATFORM_TYPE.PALO);
        }
        // Il controllo per MACCHINA non serve più se si usa solo PALO come trigger di transizione
        // ****************************************************************

        if (triggerPlatform && window.rectsOverlap) {
            const triggerRect = { x: triggerPlatform[0], y: triggerPlatform[1], w: triggerPlatform[2], h: triggerPlatform[3] };
            if (window.rectsOverlap(player, triggerRect)) {
                startCutscene(triggerPlatform); 
                return; 
            }
        }
        
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

        // Controllo EndZone (Solo Level 3 Boss)
        const endZone = currentLevel.endZone;
        if (endZone && currentLevelIndex === 2 && player.x + player.w > endZone.x && 
            player.x < endZone.x + endZone.w &&
            player.y + player.h > endZone.y && 
            player.y < endZone.y + endZone.h) {
            
            Game.endGameWin();
        }
    }
    
    function removeEnemy(index) {
        if (currentLevel && currentLevel.enemies) {
            currentLevel.enemies.splice(index, 1);
        }
    }

    function handleBossCollisions() {
        if (!window.BossFinal || !window.BossFinal.active || !window.rectsOverlap || !player) return;
        
        if (window.BossFinal.thrown >= currentLevel.boss.projectiles) {
             Game.endGameWin();
             return;
        }
        
        window.BossFinal.projectiles = window.BossFinal.projectiles.filter(p => {
            if (window.rectsOverlap(player, p)) {
                if (player.hit()) { 
                    player.x = Math.max(0, player.x - 50); 
                }
                return false; 
            }
            return true; 
        });
    }

    // ************************************************************
    // FUNZIONE DRAW E DISEGNO CUTSCENE
    // ************************************************************

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
        
        // Disegna Player SOLO se NON siamo nella Cutscene (altrimenti viene disegnato in drawCutscene)
        if (!isCutsceneActive) {
            player.draw(ctx, cameraX); 
        }
        
        renderEnemies(currentLevel.enemies, cameraX);
        
        // Disegna EndZone (Solo per Level 3 Boss)
        const endZone = currentLevel.endZone;
        if(currentLevelIndex === 2 && endZone) {
            ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
            ctx.fillRect(Math.round(endZone.x - cameraX), endZone.y, endZone.w, endZone.h);
        }
        
        if (currentLevelIndex === 2 && window.BossFinal && window.BossFinal.active) {
            window.BossFinal.render(ctx, cameraX);
            renderBossHUD(); 
        }
        
        // Disegna la Cutscene sopra gli oggetti di gioco
        if (isCutsceneActive) {
            drawCutscene(ctx, cameraX); 
        }
        
        renderHUD(); 
    }
    
    function drawCutscene(ctx, camX) {
        const t = cutsceneTime / CUTSCENE_DURATION;
        
        const ragazzaW = 30, ragazzaH = 50;
        const macchinaW = 100, macchinaH = 50;
        
        // Definiamo le coordinate del Palo e della Macchina in base al livello corrente
        let paloWorldX;
        let macchinaStartX;
        
        if (currentLevelIndex === 0) {
            // Coordinate Level 1
            paloWorldX = 3750;
            macchinaStartX = 3850;
        } else if (currentLevelIndex === 1) {
            // Coordinate Level 2 (Palo a 5650)
            paloWorldX = 5650;
            macchinaStartX = 5750; 
        } else {
            return; 
        }
        
        const ragazzaWorldX = paloWorldX + 20; 
        const ragazzaY = 500 - ragazzaH; 
        const macchinaY = 500 - macchinaH; 
        
        // 1. Disegna Ragazza
        if (t < 0.8) { 
            ctx.drawImage(window.ragazzaSprite, Math.round(ragazzaWorldX - camX), ragazzaY, ragazzaW, ragazzaH);
        }

        // 2. Macchina che parte
        let macchinaWorldX;
        if (t < 0.5) {
            macchinaWorldX = macchinaStartX; // Fissa
        } else {
            const t_drive = (t - 0.5) * 2; 
            const endMacchinaX = macchinaStartX + 250; 
            macchinaWorldX = macchinaStartX + (endMacchinaX - macchinaStartX) * t_drive;
        }
        ctx.drawImage(window.macchinaSprite, Math.round(macchinaWorldX - camX), macchinaY, macchinaW, macchinaH);
        
        // 3. Animazione di Pie che entra
        if (t < 0.5) {
            const entryX = macchinaStartX + 10;
            const targetX = paloWorldX + (entryX - paloWorldX) * (t * 2);
            player.x = targetX;
            player.draw(ctx, camX); 
        } 

        // Overlay finale (Fade out comune)
        if (t > 0.8) {
            const alpha = (t - 0.8) * 5; 
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
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
        ctx.textAlign = 'left'; 
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
           const hintText = document.getElementById('hint-text');

           loadingMessage.style.display = 'none'; 
           hintText.style.display = 'none'; 

           newBtn.disabled = true;
           newBtn.textContent = "Caricamento risorse in corso..."; 
           
           // Elenco completo delle sprite globali definite sopra
           const spritesToLoad = [
               window.playerSprite, window.runSprite, window.heartSprite, 
               window.drinkEnemySprite, window.discoBallSprite, window.djDiscSprite, 
               window.paloSprite, window.macchinaSprite, window.bossSprite,
               window.backgroundSprite, window.ragazzaSprite
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
        currentLevelIndex++;
        
        if (currentLevelIndex < levels.length) {
            if (currentLevelIndex === 2) {
                if (musicNormal) musicNormal.pause();
                if (musicFinal) {
                    musicFinal.loop = true;
                    musicFinal.play().catch(e => console.log("Errore riproduzione BGM Finale:", e));
                }
            } else {
                 // Assicurati che se torni al Livello 1, riparte la musica normale
                 if (musicFinal) musicFinal.pause();
                 if (musicNormal && currentLevelIndex === 1) musicNormal.play().catch(e => console.log("Errore riproduzione BGM Normale:", e));
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
        if (window.engine) window.engine.stop();
        if (musicNormal) musicNormal.pause();
        if (musicFinal) musicFinal.pause();
        if (player) window.Ending.showWinScreen("Pie diventa King!", player.score); 
    }

    function onPlayerDied() {
        if (isTransitioning) return;
        isTransitioning = true; 
        
        if (window.engine) window.engine.stop(); 
        
        setTimeout(() => {
            
            if (currentLevel.originalEnemies) {
                 currentLevel.enemies = JSON.parse(JSON.stringify(currentLevel.originalEnemies));
            }
            
            loadLevel(currentLevelIndex, true); 
            
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
        }, 500); 
    }
    
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
        removeEnemy: removeEnemy, 
        player: () => player, 
        isCutsceneActive: () => isCutsceneActive 
    };
})();

window.Game = Game;
