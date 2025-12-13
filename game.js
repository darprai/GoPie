// game.js (VERSIONE ULTRA-SNELLA - Corretto per PWA/Audio)

const Game = (function() {
    const canvas = document.getElementById('game');
    const ctx = canvas ? canvas.getContext('2d') : null;
    
    // VARIABILI DOM MANTENUTE
    const menuDiv = document.getElementById('menu');
    const endingScreen = document.getElementById('ending-screen');
    const endingTitle = document.getElementById('ending-title');
    const endingScore = document.getElementById('ending-score');
    const winImage = document.getElementById('win-image');
    
    // VARIABILI AUDIO
    const musicNormal = document.getElementById('music_normal');
    const musicFinal = document.getElementById('music_final');
    
    // ************************************************************
    // DEFINIZIONE GLOBALE DI TUTTE LE SPRITE
    // ************************************************************
    
    let player;
    let currentLevelIndex = 0;
    let levels = [];
    let currentLevel;
    let cameraX = 0;
    
    let isTransitioning = false;
    let engine = null; 
    
    // VARIABILI CUTSCENE
    let isCutsceneActive = false;
    let cutsceneTime = 0;
    const CUTSCENE_DURATION = 5.0;
    let cutsceneTriggerPosition = { x: 0, y: 0, w: 0, h: 0 };
    let cutsceneGroundY = 540;  
    
    const PLATFORM_TYPE = {
        DISCO: "disco", DJDISC: "djdisc", PALO: "palo", MACCHINA: "macchina"
    };

    function loadLevels() {
        const loadingMessage = document.getElementById('loading-message');
        const newBtn = document.getElementById('newBtn');
        
        loadingMessage.style.display = 'block';
        loadingMessage.textContent = 'Caricamento livelli...';
        newBtn.disabled = true;

        const levelPromises = [
            fetch('levels/level1.json').then(res => res.json()),
            fetch('levels/level2.json').then(res => res.json()),
            fetch('levels/level3.json').then(res => res.json())
        ];

        return Promise.all(levelPromises)
            .then(loadedLevels => {
                levels = loadedLevels;
                loadingMessage.style.display = 'none';
                newBtn.disabled = false;
                // Nascondi suggerimenti tastiera/mobile se non è il menu principale
                if (!('ontouchstart' in window || navigator.maxTouchPoints)) {
                   document.getElementById('hint-text').style.display = 'block'; 
                }
                return true;
            })
            .catch(error => {
                console.error("Errore CRITICO nel caricamento di un file JSON del livello.", error);
                loadingMessage.textContent = "ERRORE: Impossibile caricare i livelli (404/Network). Controlla la cartella 'levels/'.";
                loadingMessage.style.display = 'block';
                newBtn.textContent = 'ERRORE CARICAMENTO';
                newBtn.disabled = true;
                return false;
            });
    }

    function loadLevel(index) { 
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
            // Riavvia il player da zero (niente vite/punti salvati)
            player.resetFull(startX, startY);
        }
        
        cameraX = 0;
        
        // Logica Audio (CORRETTA: musicNormal.play() è stato spostato in index.html > startGame)
        if (currentLevelIndex === 2 && window.BossFinal) {
            window.BossFinal.reset();
            const config = currentLevel.boss;
            window.BossFinal.start(config.x, config.y, config);
             if (musicNormal) musicNormal.pause();
             if (musicFinal) musicFinal.play().catch(e => {});
        } else {
             if (musicFinal) musicFinal.pause();
             if (musicNormal) {
                 musicNormal.currentTime = 0;
                 // NON CHIAMIAMO .play() QUI! Viene chiamato in index.html (startGame) dopo l'interazione utente
             }
        }
        
        return !!player;
    }
    
    function nextLevel() {
        if (currentLevelIndex === 2) {
            onGameWin(); 
            return;
        }

        isTransitioning = true;
        if (engine) engine.stop();  
        
        setTimeout(() => {
            currentLevelIndex++;
            if (currentLevelIndex < levels.length) {
                loadLevel(currentLevelIndex); 
                isTransitioning = false;
                if (engine) engine.start();  
            }
        }, 1000); 
    }


    // ************************************************************
    // GESTIONE FINE GIOCO / MORTE (SNELLE)
    // ************************************************************
    
    function onGameWin() {
        if (engine) engine.stop();
        if (musicNormal) musicNormal.pause();
        if (musicFinal) musicFinal.pause();

        menuDiv.style.display = 'none';
        endingScreen.style.display = 'flex';
        
        endingTitle.textContent = "Pie diventa King!";
        winImage.style.display = 'block'; 
        endingScore.textContent = `Partita completata. Clicca per ricominciare.`; 
    }

    function onPlayerDied() {
        if (engine) engine.stop();
        
        // Ricarica immediatamente il livello corrente in automatico
        isTransitioning = true;
        
        setTimeout(() => {
            loadLevel(currentLevelIndex); 
            isTransitioning = false;
            if (engine) engine.start();  
        }, 1000); 
    }
    
    function onGameOver() {
        onPlayerDied();
    }


    // ************************************************************
    // GESTIONE CUTSCENE (INIZIO E AGGIORNAMENTO)
    // ************************************************************

    function startCutscene(trigger) {
        if (isCutsceneActive || isTransitioning) return;
        
        isCutsceneActive = true;
        cutsceneTime = 0;
        if (engine) engine.stop();  
        
        if (musicNormal) musicNormal.pause();
        
        cutsceneTriggerPosition = {
            x: trigger[0], y: trigger[1], w: trigger[2], h: trigger[3]
        };
        
        const groundPlatform = currentLevel.platforms.find(p => p[1] === 540); 
        cutsceneGroundY = groundPlatform ? groundPlatform[1] : 540;
        
        // Posiziona Pie
        player.x = cutsceneTriggerPosition.x - player.w - 10;
        player.y = cutsceneGroundY - player.h;  
        
        player.vy = 0; player.vx = 0;
        player.onGround = true;
        player.facingRight = true;
        player.canMove = false;
        
        if (engine) engine.start();
    }
    
    function updateCutscene(dt) {
        cutsceneTime += dt;
        
        const camTargetX = cutsceneTriggerPosition.x - canvas.width / 2 + cutsceneTriggerPosition.w / 2;
        cameraX = cameraX + (camTargetX - cameraX) * 0.05;
        cameraX = Math.max(0, Math.min(cameraX, currentLevel.length - canvas.width));

        if (cutsceneTime >= CUTSCENE_DURATION) {
            isCutsceneActive = false;
            player.canMove = true;
            Game.nextLevel(); 
        }
    }

    // ************************************************************
    // FUNZIONE UPDATE
    // ************************************************************

    function update(dt, input) {
        if (!currentLevel || !player || isTransitioning) return; 

        if (isCutsceneActive) {
            updateCutscene(dt);
            return;
        }
        
        player.update(dt, input, currentLevel.platforms, currentLevel.enemies, removeEnemy); 

        // ********* CONTROLLO COLLISIONE CON IL PALO (Trigger Cutscene) *********
        
        let triggerPlatform = null;
        
        if (currentLevelIndex === 0 || currentLevelIndex === 1) {  
            triggerPlatform = currentLevel.platforms.find(p => p[4] === PLATFORM_TYPE.PALO);
        }

        if (triggerPlatform) {
            const originalX = triggerPlatform[0];
            const originalY = triggerPlatform[1];
            const originalW = triggerPlatform[2];
            const originalH = triggerPlatform[3];

            const TOLERANCE = 15;  
            
            const triggerRect = {
                x: originalX - TOLERANCE, y: originalY - TOLERANCE,
                w: originalW + 2 * TOLERANCE, h: originalH + 2 * TOLERANCE
            };

            // 1. ATTIVAZIONE CUTSCENE
            if (window.rectsOverlap && window.rectsOverlap(player, triggerRect)) {
                if (!isCutsceneActive) {
                    player.canMove = false;
                    startCutscene(triggerPlatform);
                }
                return;
            }
            
            // 2. OSTACOLO RIGIDO (per evitare di attraversare il palo)
            const rigidRect = { x: originalX, y: originalY, w: originalW, h: originalH };
            if (window.rectsOverlap && window.rectsOverlap(player, rigidRect) && player.vx > 0) {
                 player.x = rigidRect.x - player.w;
                 player.vx = 0;
            }
        }
        // ****************************************************************

        
        if (currentLevelIndex === 2) {
            if (window.BossFinal && window.BossFinal.active) {
                window.BossFinal.update(dt, player, cameraX);
                handleBossCollisions(); 
            }
        }
        
        // Gestione standard della telecamera
        const targetX = player.x - canvas.width / 2 + player.w / 2;
        cameraX = Math.max(0, Math.min(targetX, currentLevel.length - canvas.width));
        
        if (currentLevel.length <= canvas.width) {
             cameraX = 0;
        }

        // Controllo EndZone (Solo Level 3 Boss)
        const endZone = currentLevel.endZone;
        if (endZone && currentLevelIndex === 2 && window.rectsOverlap(player, endZone)) {
             if (window.BossFinal && !window.BossFinal.active) {
                 Game.onGameWin();
             }
        }
        
        // Verifica se il player esce dalla mappa (Morte/Riavvio)
        if (player.y > canvas.height + 50) {
             Game.onPlayerDied(); 
        }
    }
    
    function removeEnemy(index) {
        if (currentLevel && currentLevel.enemies && index >= 0 && index < currentLevel.enemies.length) {
            currentLevel.enemies.splice(index, 1);
        }
    }

    function handleBossCollisions() {
        if (!window.BossFinal || !window.rectsOverlap || !player || !window.BossFinal.projectiles) return;
        
        // LOGICA DI VITTORIA (Boss sconfitto)
        if (window.BossFinal.thrown >= currentLevel.boss.projectiles) {
             if (!window.BossFinal.active) { 
                 Game.onGameWin(); 
             }
             return;
        }
        
        // LOGICA DI MORTE (Collisione Proiettile)
        let playerHit = false;

        if (Array.isArray(window.BossFinal.projectiles)) {
            // Filtra i proiettili, eliminando quelli che colpiscono il player
            window.BossFinal.projectiles = window.BossFinal.projectiles.filter(p => {
                if (window.rectsOverlap(player, p)) {
                    playerHit = true;
                    return false; // Rimuovi il proiettile
                }
                return true; // Mantieni il proiettile
            });
        }
        
        if (playerHit) {
            Game.onPlayerDied(); 
        }
    }

    // ************************************************************
    // FUNZIONI RENDER HUD
    // ************************************************************
    function renderBossHUD() {
        if (!ctx || currentLevelIndex !== 2 || !window.BossFinal || !window.BossFinal.active) return;

        const total = currentLevel.boss.projectiles; 
        const thrown = window.BossFinal.thrown; 
        const remaining = total - thrown;

        const w = 300;
        const h = 30;
        const x = (canvas.width / 2) - (w / 2);
        const y = 10;

        // Sfondo della barra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, w, h);

        // Barra di progresso
        const progressWidth = (remaining / total) * w;
        ctx.fillStyle = remaining > 0 ? '#ff4d4d' : '#4dff4d'; 
        ctx.fillRect(x, y, progressWidth, h);

        // Testo
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.fillText(`BOSS: ${remaining}/${total} rimanenti`, x + w / 2, y + 20);
    }
    
    // ************************************************************
    // FUNZIONE DRAW
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
        
        if (!isCutsceneActive) {
            player.draw(ctx, cameraX);
        }
        
        renderEnemies(currentLevel.enemies, cameraX);
        
        if (currentLevelIndex === 2 && window.BossFinal && window.BossFinal.active) {
            window.BossFinal.render(ctx, cameraX);
        }
        
        if (isCutsceneActive) {
            drawCutscene(ctx, cameraX);
        }
        
        // Disegna l'HUD del Boss
        renderBossHUD();
    }
    
    function drawCutscene(ctx, camX) {
        if (!window.ragazzaSprite || !window.ragazzaSprite.complete || 
            !window.macchinaSprite || !window.macchinaSprite.complete) {
             return; 
        }
        
        const t = cutsceneTime / CUTSCENE_DURATION;
        
        const ragazzaW = 30, ragazzaH = 50;
        const macchinaW = 100, macchinaH = 50;
        const groundY = cutsceneGroundY; 
        
        const paloWorldX = cutsceneTriggerPosition.x;
        const ragazzaStandX = paloWorldX + cutsceneTriggerPosition.w + 10; 
        const macchinaStartX = ragazzaStandX + ragazzaW + 10; 
        
        const ragazzaY = groundY - ragazzaH; 
        const macchinaY = groundY - macchinaH; 
        
        const pieStartX = paloWorldX - player.w - 10;
        const pieStopX = ragazzaStandX - player.w - 5; 
        const carEntryX = macchinaStartX + macchinaW / 2 - player.w / 2; 
        const carEndX = macchinaStartX + canvas.width;
        
        let pieWorldX = pieStartX;
        let ragazzaWorldX = ragazzaStandX;
        let macchinaWorldX = macchinaStartX;
        
        // --- FASE 1: Pie si muove (0.0 < t <= 0.2) ---
        if (t <= 0.2) {
            const t_phase = t / 0.2;
            pieWorldX = pieStartX + (pieStopX - pieStartX) * t_phase;
            player.facingRight = true; player.isMoving = true;
        } 
        
        // --- FASE 2: Pie e Ragazza salgono in Macchina (0.2 < t <= 0.4) ---
        else if (t <= 0.4) {
            const t_phase = (t - 0.2) / 0.2;
            player.isMoving = false;
            
            const pieMoveToCarX = pieStopX + (carEntryX - pieStopX) * t_phase;
            pieWorldX = pieMoveToCarX;

            const ragazzaMoveToCarX = ragazzaStandX + (carEntryX - ragazzaStandX) * t_phase;
            ragazzaWorldX = ragazzaMoveToCarX;

            if (t_phase > 0.8) {
                 pieWorldX = carEntryX + 1000;
                 ragazzaWorldX = carEntryX + 1000;
            }
        }
        
        // --- FASE 3: La Macchina parte (0.4 < t <= 1.0) ---
        else {
            const t_phase = (t - 0.4) / 0.6;
            player.isMoving = false;
            
            macchinaWorldX = macchinaStartX + (carEndX - macchinaStartX) * t_phase;
            
            // Pie e Ragazza viaggiano con la macchina
            pieWorldX = carEntryX + (macchinaWorldX - macchinaStartX);
            ragazzaWorldX = carEntryX + (macchinaWorldX - macchinaStartX);
        }
        
        // Disegna Macchina
        ctx.drawImage(window.macchinaSprite, Math.round(macchinaWorldX - camX), macchinaY, macchinaW, macchinaH);
        
        // Disegna Ragazza
        if (ragazzaWorldX - camX < canvas.width && ragazzaWorldX - camX > -ragazzaW) {  
             ctx.drawImage(window.ragazzaSprite, Math.round(ragazzaWorldX - camX), ragazzaY, ragazzaW, ragazzaH);
        }
        
        // Disegna Pie
        if (pieWorldX - camX < canvas.width && pieWorldX - camX > -player.w) {  
            player.x = pieWorldX;
            player.y = groundY - player.h;
            player.draw(ctx, camX);
        }
        
        // Overlay finale (Fade out)
        if (t > 0.8) {
            const alpha = (t - 0.8) * 5;
            ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, alpha)})`;
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
                 continue; 
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

    // ************************************************************
    // GESTIONE INPUT TOUCH (Esposta globalmente)
    // ************************************************************
    function handleTouchInput(action, isPressed) {
        if (!engine || !engine.setInputState) return; 
        
        let keyToMap;
        switch (action) {
            case 'left': keyToMap = 'ArrowLeft'; break;
            case 'right': keyToMap = 'ArrowRight'; break;
            case 'jump': keyToMap = 'Space'; break;
            default: return;
        }
        
        engine.setInputState(keyToMap, isPressed);
    }
    
    function init() {
        menuDiv.style.display = 'flex';
        loadLevels().then(success => {
            const newBtn = document.getElementById('newBtn');
            if (success) {
                if (engine) {
                    newBtn.textContent = 'Inizia Partita';
                    newBtn.disabled = false;
                }
            }
        });
    }

    function startNew() {
        if (levels.length > 0 && engine) { 
            menuDiv.style.display = 'none';
            endingScreen.style.display = 'none'; 
            loadLevel(0); 
            
            engine.stop(); 
            engine.start(); 
        } else {
            console.error("Livelli non caricati o Engine non inizializzato. Impossibile iniziare.");
            const loadingMessage = document.getElementById('loading-message');
            loadingMessage.style.display = 'block';
            loadingMessage.textContent = 'ERRORE: Engine non collegato o livelli mancanti.';
        }
    }
    
    function setEngine(engineAPI) {
        engine = engineAPI;
        console.log("Engine API collegato a Game.");
        
        if (engine && ('ontouchstart' in window || navigator.maxTouchPoints)) {
             document.getElementById('hint-text').style.display = 'none'; 
        } else {
             document.getElementById('hint-text').style.display = 'block';
        }
    }

    // API pubbliche
    return {
        init: init,
        startNew: startNew,
        update: update,
        draw: draw,
        nextLevel: nextLevel,
        onPlayerDied: onPlayerDied,
        onGameWin: onGameWin,
        removeEnemy: removeEnemy,
        handleTouchInput: handleTouchInput,
        getCurrentLevelIndex: () => currentLevelIndex,
        isCutsceneActive: () => isCutsceneActive,
        setEngine: setEngine
    };
})();

// Espone l'oggetto Game globalmente
window.Game = Game;
