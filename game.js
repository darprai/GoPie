// game.js (VERSIONE COMPLETA AGGIORNATA: Include gestione Input Touch e Logiche)

const Game = (function() {
    const canvas = document.getElementById('game');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const menuDiv = document.getElementById('menu');
    const gameContainer = document.getElementById('game-container');
    
    // VARIABILI AUDIO
    const musicNormal = document.getElementById('music_normal');
    const musicFinal = document.getElementById('music_final');
    
    // ************************************************************
    // DEFINIZIONE GLOBALE DI TUTTE LE SPRITE
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
    const CUTSCENE_DURATION = 5.0;
    let cutsceneTriggerPosition = { x: 0, y: 0, w: 0, h: 0 };
    let cutsceneGroundY = 540; 
    
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
        if (isCutsceneActive || isTransitioning) return;
        
        isCutsceneActive = true;
        cutsceneTime = 0;
        window.Engine.stop();
        
        if (musicNormal) musicNormal.pause();
        
        // Salviamo le coordinate del trigger
        cutsceneTriggerPosition = {
            x: trigger[0],
            y: trigger[1],
            w: trigger[2],
            h: trigger[3]
        };
        
        // CALCOLO DINAMICO DEL LIVELLO DEL TERRENO
        const groundPlatform = currentLevel.platforms.find(p => p[1] === 540); 
        if (groundPlatform) {
            cutsceneGroundY = groundPlatform[1]; // Y=540
        } else {
            cutsceneGroundY = 540; 
        }
        
        // Posiziona Pie vicino al palo (posizione iniziale)
        player.x = cutsceneTriggerPosition.x - player.w - 10;
        player.y = cutsceneGroundY - player.h; // Allinea Pie al terreno
        
        // Blocca il movimento del giocatore e imposta lo stato
        player.vy = 0;
        player.vx = 0;
        player.onGround = true;
        player.facingRight = true;
        player.canMove = false;
        
        window.Engine.start(); // Il loop deve continuare per animare la cutscene
    }
    
    function updateCutscene(dt) {
        cutsceneTime += dt;
        
        // Centra la telecamera sul trigger del palo
        const camTargetX = cutsceneTriggerPosition.x - canvas.width / 2 + cutsceneTriggerPosition.w / 2;
        
        // Movimento graduale della telecamera
        cameraX = cameraX + (camTargetX - cameraX) * 0.05;
        cameraX = Math.max(0, Math.min(cameraX, currentLevel.length - canvas.width));

        if (cutsceneTime >= CUTSCENE_DURATION) {
            isCutsceneActive = false;
            player.canMove = true;
            // Interrompi e riavvia il motore di gioco per ripristinare il dt e la logica normale
            window.Engine.stop();
            Game.nextLevel(); // Transizione al livello successivo
        }
    }

    // ************************************************************
    // FUNZIONE UPDATE
    // ************************************************************

    function update(dt, input) {
        if (!currentLevel || !player || !window.Engine || isTransitioning) return;

        if (isCutsceneActive) {
            updateCutscene(dt);
            return;
        }
        
        player.update(dt, input, currentLevel.platforms, currentLevel.enemies);

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

            // AUMENTO LA ZONA DI ATTIVAZIONE
            const TOLERANCE = 15; 
            
            const triggerRect = {
                x: originalX - TOLERANCE,
                y: originalY - TOLERANCE,
                w: originalW + 2 * TOLERANCE,
                h: originalH + 2 * TOLERANCE
            };

            // 1. ATTIVAZIONE CUTSCENE
            if (window.rectsOverlap && window.rectsOverlap(player, triggerRect)) {
                
                player.canMove = false;
                startCutscene(triggerPlatform);
                return;
            }
            
            // 2. OSTACOLO RIGIDO (usa il rettangolo originale per la fisica)
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
            Game.endGameWin();
        }
    }
    
    function removeEnemy(index) {
        if (currentLevel && currentLevel.enemies) {
            currentLevel.enemies.splice(index, 1);
        }
    }

    function handleBossCollisions() {
        if (!window.BossFinal || !window.rectsOverlap || !player) return;
        
        // LOGICA DI VITTORIA (Se il boss ha finito di sparare)
        if (window.BossFinal.thrown >= currentLevel.boss.projectiles) {
              Game.endGameWin();
              return;
        }
        
        // LOGICA DI SCONFITTA/MORTE (Collisione Proiettile)
        let playerHit = false;

        if (Array.isArray(window.BossFinal.projectiles)) {
            window.BossFinal.projectiles = window.BossFinal.projectiles.filter(p => {
                if (window.rectsOverlap(player, p)) {
                    // Il giocatore è stato colpito
                    playerHit = true;
                    // Rimuoviamo il proiettile
                    return false; 
                }
                return true;
            });
        }
        
        if (playerHit) {
            // Chiamiamo la funzione di morte (gestisce la transizione e il riavvio del livello)
            Game.onPlayerDied();
        }
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
        
        // Disegna Player SOLO se NON siamo nella Cutscene
        if (!isCutsceneActive) {
            player.draw(ctx, cameraX);
        }
        
        renderEnemies(currentLevel.enemies, cameraX);
        
        // Boss e HUD Boss
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
        if (!window.ragazzaSprite.complete || !window.macchinaSprite.complete) {
              return; 
        }
        
        const t = cutsceneTime / CUTSCENE_DURATION;
        
        // Costanti di dimensione e posizione
        const ragazzaW = 30, ragazzaH = 50;
        const macchinaW = 100, macchinaH = 50;
        const groundY = cutsceneGroundY; 
        
        // Posizioni X basate sul trigger (Palo)
        const paloWorldX = cutsceneTriggerPosition.x;
        const ragazzaStandX = paloWorldX + cutsceneTriggerPosition.w + 10; 
        const macchinaStartX = ragazzaStandX + ragazzaW + 10; 
        
        // Posizioni Y fisse
        const ragazzaY = groundY - ragazzaH; 
        const macchinaY = groundY - macchinaH; 
        
        // Punti di riferimento per l'animazione
        const pieStartX = paloWorldX - player.w - 10;
        const pieStopX = ragazzaStandX - player.w - 5; 
        const carEntryX = macchinaStartX + macchinaW / 2 - player.w / 2; 
        const carEndX = macchinaStartX + canvas.width;
        
        // Variabili animate
        let pieWorldX = pieStartX;
        let ragazzaWorldX = ragazzaStandX;
        let macchinaWorldX = macchinaStartX;
        
        // --- FASE 1: Pie si muove verso la Ragazza (0.0 < t <= 0.2) ---
        if (t <= 0.2) {
            const t_phase = t / 0.2;
            pieWorldX = pieStartX + (pieStopX - pieStartX) * t_phase;
            player.facingRight = true; 
            player.isMoving = true;
        } 
        
        // --- FASE 2: Pie e Ragazza salgono in Macchina (0.2 < t <= 0.4) ---
        else if (t <= 0.4) {
            const t_phase = (t - 0.2) / 0.2;
            player.isMoving = false; // Pie fermo
            
            // Pie si muove verso la macchina
            const pieMoveToCarX = pieStopX + (carEntryX - pieStopX) * t_phase;
            pieWorldX = pieMoveToCarX;

            // Ragazza si muove verso la macchina
            const ragazzaMoveToCarX = ragazzaStandX + (carEntryX - ragazzaStandX) * t_phase;
            ragazzaWorldX = ragazzaMoveToCarX;

            // Simula la scomparsa dei personaggi quando entrano (quando t_phase > 0.8)
            if (t_phase > 0.8) {
                pieWorldX = carEntryX + 1000;
                ragazzaWorldX = carEntryX + 1000;
            }
        }
        
        // --- FASE 3: La Macchina parte (0.4 < t <= 1.0) ---
        else {
            const t_phase = (t - 0.4) / 0.6;
            player.isMoving = false;
            
            // La macchina si sposta fuori dallo schermo
            macchinaWorldX = macchinaStartX + (carEndX - macchinaStartX) * t_phase;
            
            // Pie e Ragazza viaggiano con la macchina (mantengono le coordinate iniziali + offset)
            pieWorldX = carEntryX + (macchinaWorldX - macchinaStartX);
            ragazzaWorldX = carEntryX + (macchinaWorldX - macchinaStartX);
        }
        
        // 1. Disegna Macchina
        ctx.drawImage(window.macchinaSprite, Math.round(macchinaWorldX - camX), macchinaY, macchinaW, macchinaH);
        
        // 2. Disegna Ragazza (solo se visibile)
        if (ragazzaWorldX < canvas.width + camX) { 
            ctx.drawImage(window.ragazzaSprite, Math.round(ragazzaWorldX - camX), ragazzaY, ragazzaW, ragazzaH);
        }
        
        // 3. Disegna Pie (solo se visibile)
        if (pieWorldX < canvas.width + camX) { 
            // Aggiorna la posizione di Pie e disegnalo usando la sua draw()
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
                // La macchina è disegnata nella cutscene e non come piattaforma fissa
                continue;
            }

            if (spriteToUse) {
                ctx.drawImage(spriteToUse, x, y, w, h);
            } else {
                // Disegna rettangoli di fallback per le piattaforme normali o non riconosciute
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
        // Il punteggio è disegnato dal player.draw()
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

    // ************************************************************
    // GESTIONE INPUT TOUCH (Esposta globalmente)
    // ************************************************************
    function handleTouchInput(action, isPressed) {
        if (!window.Engine || !window.Engine.setInputState) return;
        
        // Mappa l'azione touch a un "tasto" gestito dal Player
        let keyToMap;
        switch (action) {
            case 'left':
                keyToMap = 'ArrowLeft';
                break;
            case 'right':
                keyToMap = 'ArrowRight';
                break;
            case 'jump':
                // Usiamo 'Space' come tasto unificato per il salto
                keyToMap = 'Space'; 
                break;
            default:
                return;
        }
        
        // Inietta lo stato nel sistema di input dell'Engine
        window.Engine.setInputState(keyToMap, isPressed);
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
        
        // Mostra suggerimenti solo su PC. Su mobile i controlli sono visibili
        if (window.innerWidth >= 960 && window.innerHeight >= 540) {
            hintText.style.display = 'block';
        } else {
            hintText.style.display = 'none';
        }

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
                        console.warn(`Attenzione: Impossibile caricare la sprite: ${sprite.src}. Continuo...`);
                        resolve();
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
                }
            })
            .catch(error => {
                console.error("Errore critico durante il caricamento delle risorse (Livelli):", error);
                loadingMessage.textContent = `Errore critico di caricamento. Verifica i file di livello: ${error}`;
                loadingMessage.style.display = 'block';
                newBtn.disabled = true;
            });
    }

    function startNew(e) {
        if(e) e.preventDefault();
        
        if (!levels.length || !window.Engine) {
            return;
        }
        
        // La funzione di avvio in index.html gestisce già il fullscreen
        
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
        
        window.Engine.start();
    }
    
    function nextLevel() {
        if (isTransitioning) return;
        isTransitioning = true;
        
        currentLevelIndex++;
        
        if (currentLevelIndex < levels.length) {
            if (currentLevelIndex === 2) {
                if (musicNormal) musicNormal.pause();
                if (musicFinal) {
                    musicFinal.loop = true;
                    musicFinal.play().catch(e => console.log("Errore riproduzione BGM Finale:", e));
                }
            } else {
                if (musicFinal) musicFinal.pause();
                if (musicNormal) musicNormal.play().catch(e => console.log("Errore riproduzione BGM Normale:", e));
            }
            
            loadLevel(currentLevelIndex, true);
            isTransitioning = false;
            
            if (window.Engine) window.Engine.start();
            
        } else {
            window.Engine.stop();
            if (musicNormal) musicNormal.pause();
            if (musicFinal) musicFinal.pause();
            window.Ending.showLossScreen("Fine dei livelli (hai finito il contenuto).");
            isTransitioning = false;
        }
    }
    
    function endGameWin() {
        if (window.Engine) window.Engine.stop();
        if (musicNormal) musicNormal.pause();
        if (musicFinal) musicFinal.pause();
        if (player) window.Ending.showWinScreen("Pie diventa King!", player.score);
    }

    function onPlayerDied() {
        if (isTransitioning) return;
        isTransitioning = true;
        
        // Pausa del ciclo di gioco per mostrare il momento della morte
        if (window.Engine) window.Engine.stop();
        
        // Piccolo timeout prima del riavvio
        setTimeout(() => {
            
            // Reimposta i nemici (gli ostacoli, non i proiettili)
            if (currentLevel.originalEnemies) {
                 currentLevel.enemies = JSON.parse(JSON.stringify(currentLevel.originalEnemies));
            }
            
            // Ricarica il livello corrente mantenendo il punteggio
            loadLevel(currentLevelIndex, true);
            
            // Gestione musica
            if (currentLevelIndex === 2) {
                if (musicNormal) musicNormal.pause();
                if (musicFinal) musicFinal.play().catch(e => console.log("Errore riproduzione BGM Finale:", e));
            } else {
                if (musicFinal) musicFinal.pause();
                if (musicNormal) musicNormal.play().catch(e => console.log("Errore riproduzione BGM:", e));
            }
            
            menuDiv.style.display = 'none';
            gameContainer.style.display = 'block';

            if (window.Engine) window.Engine.start();
            isTransitioning = false;
        }, 500);
    }
    
    function setEngine(engine) {
        window.Engine = engine; // Rende l'Engine accessibile globalmente come 'window.Engine'
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
        isCutsceneActive: () => isCutsceneActive,
        // *** NUOVA FUNZIONE ESPORTATA PER L'INPUT TOUCH ***
        handleTouchInput: handleTouchInput
    };
})();

window.Game = Game;
