// La funzione rectsOverlap è definita qui per completezza, ma si affida al file rects.js
const rectsOverlap = (r1, r2) => {
    return r1.x < r2.x + r2.w &&
           r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h &&
           r1.y + r1.h > r2.y;
};


const Game = (function() {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const menuDiv = document.getElementById('menu');
    const gameContainer = document.getElementById('game-container');
    const bgm = document.getElementById('bgm');
    const bgmFinal = document.getElementById('bgm_final');

    let player;
    let currentLevelIndex = 0;
    let levels = [];
    let currentLevel;
    let cameraX = 0;
    let gameEngine;

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
                console.log("Livelli caricati con successo!");
            })
            .catch(error => {
                console.error("Errore nel caricamento di un file JSON del livello:", error);
                alert("Errore caricamento livelli: Controlla la console e i percorsi in 'levels/'.");
                // Questo errore è critico e ferma l'avvio
            });
    }

    function loadLevel(index) {
        if (!levels[index]) {
            console.error(`Livello ${index} non trovato.`);
            return;
        }

        currentLevelIndex = index;
        currentLevel = levels[index];
        
        // Inizializza il giocatore
        if (!player) {
            player = new Player(currentLevel.playerStart.x, currentLevel.playerStart.y);
        } else {
            // Se esiste, resettalo
            player.reset(currentLevel.playerStart.x, currentLevel.playerStart.y);
        }
        
        cameraX = 0;
        
        // Setup Boss (Livello 3)
        if (currentLevelIndex === 2 && window.BossFinal) {
             window.BossFinal.reset();
             const config = currentLevel.boss;
             window.BossFinal.start(config.x, config.y, config); 
        }
    }

    // --- Logica di Gioco (Update) ---

    function update(dt, input) {
        if (!currentLevel || !player) return;

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
                if (rectsOverlap(player, enemy)) {
                    if (enemy.type === 'drink') {
                        if (player.hit()) {
                            player.x = Math.max(0, player.x - 50); 
                        } else {
                            Game.onPlayerDied();
                            return true; 
                        }
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
                 if (trap.type === 'fall_death' && rectsOverlap(player, trap)) {
                     Game.onPlayerFell(); 
                     return; 
                 }
             }
         }
    }
    
    function handleBossCollisions() {
        if (!window.BossFinal || !window.BossFinal.active) return;
        
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
                    return true; 
                }
                return false; 
            }
            return true; 
        });
    }


    // --- Logica di Disegno (Render) ---

    function draw() {
        if (!currentLevel) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#87CEEB"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

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
            
            if (e.type === 'drink' && window.drinkEnemySprite && window.drinkEnemySprite.complete) {
                ctx.drawImage(window.drinkEnemySprite, x, y, e.w, e.h);
            } else if (e.type === 'heart' && window.heartSprite && window.heartSprite.complete) {
                ctx.drawImage(window.heartSprite, x, y, e.w, e.h);
            }
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
    
    function renderBossHUD() {
        if (!window.BossFinal || !currentLevel.boss) return;
        
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


    // --- Controllo Flusso di Gioco ---

    function startNew() {
        // Nascondi Menu, Mostra Canvas
        menuDiv.style.display = 'none';
        gameContainer.style.display = 'block';

        // Avvia Musica
        bgm.loop = true;
        bgm.play().catch(e => console.log("Errore riproduzione BGM:", e));

        currentLevelIndex = 0; 
        loadLevel(currentLevelIndex);
        
        // Avvia il Game Engine
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
                // Passaggio al livello Boss
                bgm.pause();
                bgmFinal.loop = true;
                bgmFinal.play().catch(e => console.log("Errore riproduzione BGM Finale:", e));
            }
            
            loadLevel(currentLevelIndex);
            
        } else {
            // Fine dei livelli (dovrebbe avvenire solo se il Level 3 non chiama endGameWin)
            gameEngine.stop();
            bgm.pause();
            bgmFinal.pause();
            window.Ending.showLossScreen("Fine dei livelli.");
        }
    }
    
    function endGameWin() {
        gameEngine.stop();
        bgm.pause();
        bgmFinal.pause();
        window.Ending.showWinScreen("Pie diventa King!", player.score); 
    }

    function onPlayerFell() {
         player.lives = 0;
         Game.onPlayerDied();
    }
    
    function onPlayerDied() {
        gameEngine.stop();
        
        if (player.lives <= 0) {
            // Game Over
            player.reset(currentLevel.playerStart.x, currentLevel.playerStart.y);
            
            setTimeout(() => {
                gameContainer.style.display = 'none';
                menuDiv.style.display = 'flex';
                bgm.pause();
                bgmFinal.pause();
            }, 1000);
        } else {
             // Ricarica il livello corrente e riavvia il loop
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
    
    // Carica i livelli non appena la finestra è pronta (dopo aver caricato gli sprite in index.html)
    window.onload = loadLevels;

    return {
        startNew: startNew,
        continue: continueGame,
        save: saveGame,
        nextLevel: nextLevel,
        endGameWin: endGameWin,
        onPlayerDied: onPlayerDied,
        onPlayerFell: onPlayerFell,
        // ... (altre funzioni esposte)
    };
})();

window.Game = Game;
