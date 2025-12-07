const Game = (function() {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const menuDiv = document.getElementById('menu');
    const gameContainer = document.getElementById('game-container');
    const endingDiv = document.getElementById('ending');
    const bgm = document.getElementById('bgm');
    const bgmFinal = document.getElementById('bgm_final');

    let player;
    let currentLevelIndex = 0;
    let levels = [];
    let currentLevel;
    let cameraX = 0;
    let gameEngine;

    // Costanti per i tipi di oggetti speciali
    const PLATFORM_TYPE = {
        DISCO: "disco",
        DJDISC: "djdisc",
        PALO: "palo",
        MACCHINA: "macchina"
    };

    // --- Gestione Livelli ---

    function loadLevels() {
        // Funzione asincrona per caricare tutti i file JSON
        const levelPromises = [
            fetch('levels/level1.json').then(res => res.json()),
            fetch('levels/level2.json').then(res => res.json()),
            fetch('levels/level_final.json').then(res => res.json())
        ];

        return Promise.all(levelPromises)
            .then(loadedLevels => {
                levels = loadedLevels;
                console.log("Livelli caricati con successo!");
            })
            .catch(error => {
                // Cattura l'errore di parsing JSON e lo notifica all'utente
                console.error("Errore nel caricamento di un file JSON del livello:", error);
                alert("Errore caricamento livelli: Failed to parse level JSON from levels/levelX.json. Check the console for details on which file failed.");
            });
    }

    function loadLevel(index) {
        if (!levels[index]) {
            console.error(`Livello ${index} non trovato.`);
            return;
        }

        currentLevelIndex = index;
        currentLevel = levels[index];
        
        // Inizializza o resetta il giocatore
        if (!player) {
            player = new Player(currentLevel.playerStart.x, currentLevel.playerStart.y);
        } else {
            player.x = currentLevel.playerStart.x;
            player.y = currentLevel.playerStart.y;
            player.vx = 0;
            player.vy = 0;
        }
        
        cameraX = 0; // Resetta la telecamera
    }

    // --- Logica di Gioco (Update) ---

    function update(dt, input) {
        if (!currentLevel || !player) return;

        // 1. Aggiorna il giocatore
        player.update(dt, input, currentLevel.platforms);

        // 2. Aggiorna Boss (solo se Level Finale)
        if (currentLevelIndex === 2 && currentLevel.boss) {
            currentLevel.boss.update(dt, player);
        }

        // 3. Gestione della Telecamera
        const targetX = player.x - canvas.width / 2 + player.w / 2;
        cameraX = Math.max(0, Math.min(targetX, currentLevel.length - canvas.width));

        // 4. Controllo Fine Livello
        const endZone = currentLevel.endZone;
        if (player.x + player.w > endZone.x && 
            player.x < endZone.x + endZone.w &&
            player.y + player.h > endZone.y && 
            player.y < endZone.y + endZone.h) {
            
            Game.nextLevel();
        }

        // 5. Gestione Collisioni Nemici, Cuori e Trappole
        handleCollisions();
    }
    
    function handleCollisions() {
        // Collisioni con i nemici (drink) e cuori
        if (currentLevel.enemies) {
            currentLevel.enemies = currentLevel.enemies.filter(enemy => {
                if (rectsOverlap(player, enemy)) {
                    if (enemy.type === 'drink') {
                        if (player.hit()) {
                            player.x = Math.max(0, player.x - 50); 
                        } else {
                            Game.onPlayerDied();
                            return true; // Non rimuove il nemico se il giocatore muore, tornerà con il level reset
                        }
                        return false; // Rimuove il nemico dopo la collisione (se il giocatore è vivo)
                    }
                    
                    if (enemy.type === 'heart') {
                        player.collectHeart();
                        return false; // Rimuove il cuore raccolto
                    }
                }
                return true; // Conserva nemici e oggetti che non sono stati colpiti
            });
        }
        
        // Collisioni con le trappole (fall_death)
        if (currentLevel.invisible_traps) {
             for (let trap of currentLevel.invisible_traps) {
                 if (trap.type === 'fall_death' && rectsOverlap(player, trap)) {
                     Game.onPlayerFell();
                     return; 
                 }
             }
         }
    }


    // --- Logica di Disegno (Render) ---

    function draw() {
        if (!currentLevel) return;

        // Pulisci il Canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Sfondo del livello 
        ctx.fillStyle = "#87CEEB"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Disegna Piattaforme
        renderPlatforms(currentLevel.platforms, cameraX);

        // Disegna Giocatore
        player.draw(ctx, cameraX);
        
        // Disegna Nemici e Cuori (dopo il giocatore in modo che siano sopra)
        renderEnemies(currentLevel.enemies, cameraX);

        // Disegna Zona di Arrivo
        const endZone = currentLevel.endZone;
        ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
        ctx.fillRect(Math.round(endZone.x - cameraX), endZone.y, endZone.w, endZone.h);

        // Disegna HUD (Vite e Punteggio)
        renderHUD();
    }
    
    // FUNZIONE DI RENDERING PIATTAFORME AGGIORNATA
    function renderPlatforms(platforms, camX) {
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
                // Piattaforma standard
                ctx.fillStyle = "#333333";
                ctx.fillRect(x, y, w, h);
            }
        }
    }
    
    function renderEnemies(enemies, camX) {
        if (!enemies) return;
        for (let e of enemies) {
            const x = Math.round(e.x - camX);
            const y = Math.round(e.y);
            const w = e.w;
            const h = e.h;
            
            if (e.type === 'drink' && window.drinkEnemySprite && window.drinkEnemySprite.complete) {
                ctx.drawImage(window.drinkEnemySprite, x, y, w, h);
            } else if (e.type === 'heart' && window.heartSprite && window.heartSprite.complete) {
                ctx.drawImage(window.heartSprite, x, y, w, h);
            }
        }
        
        if (currentLevelIndex === 2 && currentLevel.boss) {
            currentLevel.boss.draw(ctx, camX);
        }
    }

    function renderHUD() {
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


    // --- Controllo Flusso di Gioco ---

    function startNew() {
        menuDiv.style.display = 'none';
        gameContainer.style.display = 'block';

        bgm.loop = true;
        bgm.play().catch(e => console.log("Errore riproduzione BGM:", e));

        player = new Player(0, 0);
        
        currentLevelIndex = 0; 
        loadLevel(currentLevelIndex);
        
        if (gameEngine) {
            gameEngine.start();
        } else {
            gameEngine = new Engine(update, draw);
            window.engine = gameEngine; 
            gameEngine.start();
        }
    }
    
    function nextLevel() {
        currentLevelIndex++;
        
        if (currentLevelIndex < levels.length) {
            if (currentLevelIndex === 2) {
                bgm.pause();
                bgmFinal.loop = true;
                bgmFinal.play().catch(e => console.log("Errore riproduzione BGM Finale:", e));
                // Assumendo che level_final.json abbia un oggetto bossStart
                currentLevel.boss = new BossFinal(currentLevel.playerStart.x, currentLevel.playerStart.y); 
            }
            
            loadLevel(currentLevelIndex);
            
        } else {
            gameEngine.stop();
            bgm.pause();
            bgmFinal.pause();
            window.Ending.showWinScreen(player.score);
        }
    }

    function onPlayerFell() {
         player.lives = 0;
         Game.onPlayerDied();
    }
    
    function onPlayerDied() {
        gameEngine.stop();
        
        if (player.lives <= 0) {
            player.reset(currentLevel.playerStart.x, currentLevel.playerStart.y);
            
            loadLevel(currentLevelIndex); 
            
            setTimeout(() => {
                gameContainer.style.display = 'none';
                menuDiv.style.display = 'flex';
                bgm.pause();
                bgmFinal.pause();
            }, 1000);
        } else {
             loadLevel(currentLevelIndex);
             gameEngine.start();
        }
    }
    
    function continueGame() {
        alert("Funzione Continua non implementata. Avvio una Nuova Partita.");
        startNew();
    }
    
    function saveGame() {
        alert("Funzione Salva non implementata.");
    }
    
    function getCurLevelIndex() {
        return currentLevelIndex;
    }


    window.onload = loadLevels;

    return {
        startNew: startNew,
        continue: continueGame,
        save: saveGame,
        nextLevel: nextLevel,
        onPlayerDied: onPlayerDied,
        onPlayerFell: onPlayerFell,
        getCurLevelIndex: getCurLevelIndex
    };
})();

window.Game = Game;
