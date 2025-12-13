// game.js (VERSIONE COMPLETA E CORRETTA - FIX BUG CUTSCENE)

const Game = (function() {
    const canvas = document.getElementById('game');
    const ctx = canvas ? canvas.getContext('2d') : null;
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
    let engine = null; // Riferimento all'Engine LOCALE
    
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
        // Aggiungo un piccolo controllo per mostrare il messaggio di caricamento
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
                newBtn.disabled = false; // Rimuovi qui il disabled se ha successo
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
        
        // Logica Audio
        if (currentLevelIndex === 2 && window.BossFinal) {
            window.BossFinal.reset();
            const config = currentLevel.boss;
            window.BossFinal.start(config.x, config.y, config);
             if (musicNormal) musicNormal.pause();
             if (musicFinal) musicFinal.play();
        } else {
             if (musicFinal) musicFinal.pause();
             // Solo riproduci se è la prima volta (per evitare l'errore Promise)
             if (musicNormal) {
                 musicNormal.currentTime = 0;
                 // Esegui play solo dopo interazione utente (gestito dalla funzione startGame in index.html)
                 // Se non parte, è ok, verrà riprodotto al primo click.
                 musicNormal.play().catch(e => { /*console.warn("Riproduzione audio fallita:", e);*/ });
             }
        }
        
        return !!player;
    }
    
    function nextLevel() {
        // Se siamo al Level 3 (index 2), abbiamo vinto!
        if (currentLevelIndex === 2) {
            onGameWin();
            return;
        }

        isTransitioning = true;
        
        // Simula la transizione (es. fade out/in, qui usiamo un semplice ritardo)
        // L'engine si ferma (update, draw) e si riavvia dopo
        if (engine) engine.stop(); 
        
        setTimeout(() => {
            currentLevelIndex++;
            if (currentLevelIndex < levels.length) {
                loadLevel(currentLevelIndex, true); // Mantieni il punteggio
                isTransitioning = false;
                if (engine) engine.start(); 
            }
        }, 1000); // 1 secondo di transizione
    }


    // ************************************************************
    // GESTIONE FINE GIOCO / VITTORIA
    // ************************************************************
    
    function onGameWin() {
        if (engine) engine.stop();
        if (musicNormal) musicNormal.pause();
        if (musicFinal) musicFinal.pause();

        menuDiv.style.display = 'none';
        endingScreen.style.display = 'flex';
        
        // Se abbiamo finito il Level 3
        if (currentLevelIndex === 2) {
             endingTitle.textContent = "Pie diventa King!";
             winImage.style.display = 'block'; // Mostra l'immagine di vittoria
        } else {
             // Se chiami endGameWin in altri livelli, torna al menu base
             endingTitle.textContent = "Partita Terminata";
             winImage.style.display = 'none';
        }
        
        endingScore.textContent = `Punti: ${player ? player.score : 0}`;
    }

    function onPlayerDied() {
        if (player.lives > 0) {
            player.lives--;
            // Ricarica il livello corrente mantenendo il punteggio e le vite
            loadLevel(currentLevelIndex, true); 
        } else {
             // Se muore e non ha vite, finisce la partita
             onGameOver(); 
        }
    }
    
    function onGameOver() {
        if (engine) engine.stop();
        if (musicNormal) musicNormal.pause();
        if (musicFinal) musicFinal.pause();
        
        menuDiv.style.display = 'none';
        endingScreen.style.display = 'flex';
        endingTitle.textContent = "Game Over";
        endingScore.textContent = `Punti totali: ${player ? player.score : 0}`;
        winImage.style.display = 'none';
    }


    // ************************************************************
    // GESTIONE CUTSCENE (INIZIO E AGGIORNAMENTO)
    // ************************************************************

    function startCutscene(trigger) {
        if (isCutsceneActive || isTransitioning) return;
        
        isCutsceneActive = true;
        cutsceneTime = 0;
        if (engine) engine.stop(); // Ferma il loop principale, poi lo riavvia per la cutscene
        
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
        
        // Ri-avvia il loop del motore solo per il Draw/Update della Cutscene
        if (engine) engine.start();
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
            // L'engine rimane attivo (lo si ferma solo nella transizione nextLevel)
            Game.nextLevel(); // Transizione al livello successivo
        }
    }

    // ************************************************************
    // FUNZIONE UPDATE
    // ************************************************************

    function update(dt, input) {
        // Ora il controllo dell'engine è ridondante perché update viene chiamato DA engine
        if (!currentLevel || !player || isTransitioning) return; 

        if (isCutsceneActive) {
            updateCutscene(dt);
            return;
        }
        
        player.update(dt, input, currentLevel.platforms, currentLevel.enemies, removeEnemy); // Passiamo removeEnemy

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
                // Controllo per evitare un loop infinito di avvio cutscene
                if (!isCutsceneActive) {
                    player.canMove = false;
                    startCutscene(triggerPlatform);
                }
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
            // Logica EndZone (solo se il boss è stato sconfitto)
             if (window.BossFinal && !window.BossFinal.active) {
                Game.onGameWin();
             }
        }
        
        // Verifica se il player esce dalla mappa (Game Over)
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
        
        // LOGICA DI VITTORIA (Se il boss ha finito di sparare)
        if (window.BossFinal.thrown >= currentLevel.boss.projectiles) {
             // Il boss viene disattivato in BossFinal.update, qui si innesca la vittoria
             if (!window.BossFinal.active) {
                Game.onGameWin(); 
             }
             return;
        }
        
        // LOGICA DI SCONFITTA/MORTE (Collisione Proiettile)
        let playerHit = false;

        if (Array.isArray(window.BossFinal.projectiles)) {
            window.BossFinal.projectiles = window.BossFinal.projectiles.filter(p => {
                if (window.rectsOverlap(player, p)) {
                    playerHit = true;
                    return false; 
                }
                return true;
            });
        }
        
        if (playerHit) {
            Game.onPlayerDied();
        }
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
        // FIX: Controlla che le variabili globali esistano prima di accedere a .complete
        if (!window.ragazzaSprite || !window.ragazzaSprite.complete || 
            !window.macchinaSprite || !window.macchinaSprite.complete) {
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
        if (ragazzaWorldX - camX < canvas.width && ragazzaWorldX - camX > -ragazzaW) {  
             ctx.drawImage(window.ragazzaSprite, Math.round(ragazzaWorldX - camX), ragazzaY, ragazzaW, ragazzaH);
        }
        
        // 3. Disegna Pie (solo se visibile)
        if (pieWorldX - camX < canvas.width && pieWorldX - camX > -player.w) {  
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
        if (!player || !ctx) return;
        // Punteggio (Score)
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Punti: ${player.score}`, 10, 25);

        // Vite (Lives)
        ctx.textAlign = 'right';
        ctx.fillText(`Vite: ${player.lives}`, canvas.width - 10, 25);

    }
    
    function renderBossHUD() {
        if (!window.BossFinal || !currentLevel.boss || !ctx) return;
        
        const thrown = window.BossFinal.thrown;
        const max = currentLevel.boss.projectiles;
        const progress = thrown / max;
        
        const barW = canvas.width / 3;
        const barH = 15;
        const x = canvas.width - barW - 20;
        const y = 50; // Spostata leggermente sotto l'HUD standard
        
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
        if (!engine || !engine.setInputState) return; // Controlla il riferimento locale 'engine'
        
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
                keyToMap = 'Space'; 
                break;
            default:
                return;
        }
        
        // Inietta lo stato nel sistema di input dell'Engine
        engine.setInputState(keyToMap, isPressed);
    }
    
    // Inizializza il gioco caricando i livelli e mostra il menu
    function init() {
           menuDiv.style.display = 'flex';
           loadLevels().then(success => {
               const newBtn = document.getElementById('newBtn');
               if (success) {
                   newBtn.textContent = 'Inizia Partita';
                   newBtn.disabled = false;
               } else {
                   // I messaggi di errore sono gestiti da loadLevels
               }
           });
    }

    // Avvia una nuova partita
    function startNew() {
           // L'errore veniva generato qui se engine era null. 
           // Dobbiamo assicurarci che Game.setEngine sia stato chiamato da engine.js
           if (levels.length > 0 && engine) { 
               menuDiv.style.display = 'none';
               endingScreen.style.display = 'none';
               loadLevel(0, false); // Ricarica il livello 0 e resetta TUTTO
               
               // Assicurati che l'Engine non stia già girando (e riavvialo)
               engine.stop(); 
               engine.start(); 
           } else {
               console.error("Livelli non caricati o Engine non inizializzato. Impossibile iniziare.");
               const loadingMessage = document.getElementById('loading-message');
               loadingMessage.style.display = 'block';
               loadingMessage.textContent = 'ERRORE: Engine non collegato. Ricarica la pagina.';
           }
    }
    
    // *** FUNZIONE CRITICA: Viene chiamata da engine.js per stabilire la comunicazione ***
    function setEngine(engineAPI) {
        engine = engineAPI;
        console.log("Engine API collegato a Game.");
        
        // Mostra suggerimenti input mobile se l'Engine è stato collegato (e il gioco è mobile)
        if (engine && ('ontouchstart' in window || navigator.maxTouchPoints)) {
             document.getElementById('hint-text').style.display = 'none'; // Nascondi suggerimento tastiera
        } else {
             document.getElementById('hint-text').style.display = 'block'; // Mostra suggerimento tastiera
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
        setEngine: setEngine // ESPORRE LA FUNZIONE QUI
    };
})();

// Espone l'oggetto Game globalmente
window.Game = Game;
