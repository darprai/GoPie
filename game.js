// Aggiunta la funzione rgba mancante, necessaria per drawBG
function rgba(r, g, b, a) {
  return `rgba(${r},${g},${b},${a})`;
}

// Funzione di utilità per rectsOverlap (Assicurati che sia inclusa, es. in rects.js)
// window.rectsOverlap = (r1, r2) => { ... } 

const Game = (() => {
  const LEVELS = ['levels/level1.json','levels/level2.json','levels/level3.json']; 
  let engine, player, levels = [], cur = 0, camX = 0;
  let bossStarted = false;
  let endTriggered = false; // Stato per la conclusione del gioco

  async function loadAllLevels() {
    levels = [];
    for (let p of LEVELS) {
      const r = await fetch(p);
      if (!r.ok) throw new Error('Cannot load ' + p);
      levels.push(await r.json());
    }
  }

  function drawBG(ctx, camX) {
    if (!engine) return;
    
    // Disegno dell'immagine di sfondo 'icon-512.png' per la schermata di gioco
    if (window.icon512Sprite && window.icon512Sprite.complete) {
        // La variabile icon512Sprite non è stata definita in index.html, la definiamo qui
        if(!window.icon512Sprite.src) {
            window.icon512Sprite.src = 'assets/sprites/icon-512.png';
        }
        ctx.drawImage(window.icon512Sprite, 0, 0, engine.width, engine.height);
    } else {
        // Fallback Sfondo originale
        const g = ctx.createLinearGradient(0,0,0,engine.height);
        g.addColorStop(0,'#080816');
        g.addColorStop(1,'#0f1220');
        ctx.fillStyle = g;
        ctx.fillRect(0,0,engine.width,engine.height);
    }
    
  }

  async function _start(isNew=false) {
    try {
      await loadAllLevels();
    } catch(e) {
      alert('Errore caricamento livelli: ' + e.message);
      console.error(e);
      return;
    }

    engine = new Engine(document.getElementById('game'));
    // Assicurati che lo sprite icon-512 sia caricato se non lo è già in index.html
    if(!window.icon512Sprite) {
        window.icon512Sprite = new Image();
        window.icon512Sprite.src = 'assets/sprites/icon-512.png';
    }


    document.getElementById('menu').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    cur = isNew ? 0 : parseInt(localStorage.getItem('pie_level') || '0');
    if (cur < 0 || cur >= levels.length) cur = 0; 
    endTriggered = false;

    const start = levels[cur].playerStart || {x: 80, y: 300};
    player = new Player(start.x, start.y);
    camX = 0;
    bossStarted = false;
    BossFinal.reset();

    // play music
    playMusic(cur);

    engine.start(update, render);
  }

  function playMusic(levelIndex) {
      const bgmNormal = document.getElementById('bgm');
      const bgmFinal = document.getElementById('bgm_final');
      
      try {
          if (levelIndex === 2) { 
              bgmNormal.pause();
              bgmFinal.currentTime = 0;
              bgmFinal.play().catch(()=>{});
          } else {
              bgmFinal.pause();
              bgmNormal.currentTime = 0;
              bgmNormal.play().catch(()=>{});
          }
      } catch(e){}
  }


  function continueGame(){ _start(false); }

  function save() {
    localStorage.setItem('pie_level', String(cur));
    alert('Gioco salvato (livello ' + (cur+1) + ')');
  }

  function onPlayerHit() {
    if (cur === 2 && BossFinal.thrown < 50) { 
        // Se nel livello Boss, il colpo è gestito dalla logica di BossFinal.update.
        // Se il boss ha lanciato meno di 50 drink, non si deve morire per un drink
        return; 
    }
    
    // Gestione danno per Level 1 e 2 o Level 3 DOPO 50 drink
    if (player.hit()) {
        engine.stop();
        setTimeout(()=> startLevel(cur), 600);
    } else {
        // Game Over (Non richiesto, ma buona pratica)
        engine.stop();
        alert('Game Over! Riprova dal primo livello.');
        localStorage.setItem('pie_level', '0');
        document.getElementById('game').style.display = 'none';
        document.getElementById('menu').style.display = 'block';
    }
  }

  function onPlayerFell() {
      // Danno istantaneo / riavvio per caduta
      player.lives = 0; // Morte istantanea
      engine.stop();
      setTimeout(()=> startLevel(cur), 600);
  }

  function startLevel(n) {
    cur = n;
    playMusic(cur);
    const start = levels[cur].playerStart || {x: 80, y: 300};
    player = new Player(start.x, start.y);
    player.lives = 3; // Ricomincia il livello con 3 vite
    camX = 0;
    bossStarted = false;
    BossFinal.reset();
    engine.start(update, render);
  }
  
  function getCurLevelIndex() {
      return cur;
  }

  function update(dt) {
    const lvl = levels[cur];

    // Aggregare le piattaforme da entrambi i formati
    const allPlatforms = (lvl.platforms || []).map(p => 
        Array.isArray(p) ? { x: p[0], y: p[1], w: p[2], h: p[3], isPlatform: true } : { ...p, isPlatform: true }
    );

    // update player
    player.update(dt, { keys: engine.keys, touch: engine.touch }, allPlatforms);

    // camera
    if (cur !== 2) { // La telecamera segue solo in Level 1 e 2
        const margin = 300;
        const target = Math.min(
          Math.max(player.x - margin, 0),
          (lvl.length || 2000) - engine.width
        );
        camX += (target - camX) * Math.min(1, dt * 8);
    } else { // Level 3: statico
        camX = lvl.cameraX || 0; // Posizione fissa del boss
    }


    // 1. Collisioni Nemici standard (Drink, Hazard)
    (lvl.enemies || []).forEach((en, index) => {
      const en_w = en.w || 20;
      const en_h = en.h || 20;
      if (rectsOverlap({x:en.x, y:en.y, w:en_w, h:en_h}, {x:player.x, y:player.y, w:player.w, h:player.h})) {
        if (en.type === 'heart') {
            player.collectHeart();
            // Rimuovi il cuore raccolto dal livello
            lvl.enemies.splice(index, 1); 
        } else {
            onPlayerHit(); // Collisione con nemico / hazard
        }
      }
    });

    // 2. Collisioni Trappole Invisibili (Cat Mario Style)
    (lvl.invisible_traps || []).forEach(t => {
        if (t.effect === 'hazard' || t.type === 'drink' || t.type === 'fall_death') {
            if (rectsOverlap({x:t.x, y:t.y, w:t.w, h:t.h}, {x:player.x, y:player.y, w:player.w, h:player.h})) {
                onPlayerHit();
            }
        }
    });


    // Boss Trigger
    if (cur === 2 && !bossStarted) {
      // Level 3 Boss: Inizia subito
      BossFinal.start(lvl.boss.x, lvl.boss.y, lvl.boss);
      bossStarted = true;
    }

    // Boss Update (gestisce il lancio e le collisioni dei proiettili)
    BossFinal.update(dt, player, camX);
    
    // Collisione con Proiettili del Boss
    if (cur === 2) {
        BossFinal.projectiles.forEach((p, index) => {
            if (rectsOverlap(p, player)) {
                // Per il livello 3, il colpo con il drink riavvia il livello
                engine.stop();
                setTimeout(()=> startLevel(cur), 600);
                BossFinal.projectiles.splice(index, 1); 
            }
        });
    }

    // Condizione di Vittoria Boss
    if (cur === 2 && BossFinal.thrown >= 50 && !endTriggered) {
        engine.stop();
        endTriggered = true;
        // Tempo per il messaggio
        setTimeout(() => {
            document.getElementById('finalTitle').textContent = 'Pie diventa King';
            document.getElementById('game').style.display = 'none';
            document.getElementById('ending').style.display = 'block';
        }, 1000); 
    }

    // level end (Level 1 e 2)
    if (cur !== 2 && !endTriggered) {
        const endZone = lvl.endZone || { x: (lvl.length || 2000) - 200, y: 0, w: 50, h: engine.height };

        if (player.x > endZone.x) { // Superato il palo (endZone)
             endTriggered = true;
             engine.stop();
             // Passaggio alla sequenza finale del livello (Palo -> Macchina)
             setTimeout(() => startEndSequence(lvl), 500); 
        }
    }
  }
  
  function startEndSequence(lvl) {
        // Logica finta di fine livello (Palo -> Auto -> Ragazza)
        const palo = lvl.endPalo || { x: lvl.length - 200, y: 400, w: 40, h: 100 };
        const ragazza = lvl.endRagazza || { x: lvl.length, y: 400, w: 40, h: 60 };
        const macchina = lvl.endMacchina || { x: lvl.length + 50, y: 450, w: 100, h: 50 };
        
        // Simula lo spostamento automatico
        player.x = palo.x; // Pie salta sul palo
        player.y = palo.y - player.h;
        player.vx = player.speed;
        
        const autoDrive = (dt) => {
            // Animazione Pie
            player.animTimer += dt;
            if (player.animTimer > 0.1) {
                player.frame = (player.frame + 1) % player.maxFrames;
                player.animTimer = 0;
            }
            
            player.x += player.vx * dt;
            camX += player.vx * dt; // Telecamera segue
            
            // Renderiza la sequenza
            render(engine.ctx);
            
            if (player.x < macchina.x + 100) { // Continua finché non raggiunge un punto oltre la macchina
                requestAnimationFrame(() => autoDrive(engine.delta));
            } else {
                // Fine Sequenza: Passa al livello successivo
                cur++;
                localStorage.setItem('pie_level', String(cur));
                startLevel(cur);
            }
        };

        // Riavvia il loop di gioco solo per la sequenza finale
        engine.start(() => { /* update vuoto */ }, (ctx) => {
            drawBG(ctx, camX);
            // Renderizza gli oggetti finali
            drawEndObjects(ctx, camX, palo, ragazza, macchina);
            player.draw(ctx, camX);
        });
        
        // Inizia l'animazione di guida (uso un loop separato per la sequenza)
        autoDrive(engine.delta);
  }
  
  function drawEndObjects(ctx, camX, palo, ragazza, macchina) {
        // Palo (Rettangolo con riferimento a palo.png)
        if (window.paloSprite.complete) {
            ctx.drawImage(window.paloSprite, Math.round(palo.x - camX), Math.round(palo.y), palo.w, palo.h);
        } else {
            ctx.fillStyle = '#6d3b00'; 
            ctx.fillRect(Math.round(palo.x - camX), Math.round(palo.y), palo.w, palo.h);
        }

        // Ragazza (Rettangolo con riferimento a ragazza.png)
        if (window.ragazzaSprite.complete) {
            ctx.drawImage(window.ragazzaSprite, Math.round(ragazza.x - camX), Math.round(ragazza.y), ragazza.w, ragazza.h);
        } else {
            ctx.fillStyle = '#ff69b4'; 
            ctx.fillRect(Math.round(ragazza.x - camX), Math.round(ragazza.y), ragazza.w, ragazza.h);
        }

        // Macchina (Rettangolo con riferimento a macchina.png)
        if (window.macchinaSprite.complete) {
            ctx.drawImage(window.macchinaSprite, Math.round(macchina.x - camX), Math.round(macchina.y), macchina.w, macchina.h);
        } else {
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(Math.round(macchina.x - camX), Math.round(macchina.y), macchina.w, macchina.h);
        }
  }


  function render(ctx) {
    drawBG(ctx, camX);
    const lvl = levels[cur];

    // platforms
    (lvl.platforms || []).forEach(p => {
      let x, y, w, h, spriteName;
      
      if(Array.isArray(p)) {
        [x, y, w, h] = p;
        ctx.fillStyle = '#3a3a3a'; 
        ctx.fillRect(Math.round(x-camX), Math.round(y), w, h);
      } else if (typeof p === 'object') {
        ({ x, y, w, h, sprite: spriteName } = p);
        
        let sprite = null;
        if (spriteName === 'djdisc' && window.djDiscSprite.complete) sprite = window.djDiscSprite;
        if (spriteName === 'disco' && window.discoBallSprite.complete) sprite = window.discoBallSprite;

        if (sprite) {
            ctx.drawImage(sprite, Math.round(x - camX), Math.round(y), w, h);
        } else {
            ctx.fillStyle = '#FF00FF'; 
            ctx.fillRect(Math.round(x - camX), Math.round(y), w, h);
        }
      }
    });

    // enemies (inclusi i cuori)
    (lvl.enemies || []).forEach(e => {
        let x = e.x, y = e.y, w = e.w || 20, h = e.h || 20;

        if (e.type === 'heart') {
             if (window.heartSprite.complete) {
                ctx.drawImage(window.heartSprite, Math.round(x - camX), Math.round(y), w, h);
            } else {
                ctx.fillStyle = '#FFC0CB'; // Fallback Cuore
                ctx.fillRect(Math.round(x-camX), Math.round(y), w, h);
            }
        } else if (e.type === 'drink' || e.type === 'drink_mobile') {
            if (window.drinkEnemySprite.complete) {
                ctx.drawImage(window.drinkEnemySprite, Math.round(x - camX), Math.round(y), w, h);
            } else {
                ctx.fillStyle = '#00FFFF'; // Fallback per Drink
                ctx.fillRect(Math.round(x-camX), Math.round(y), w, h);
            }
        } else {
            // Nemici Hazard/vecchi
            ctx.fillStyle = '#d9a300';
            ctx.fillRect(Math.round(x-camX), Math.round(y), w, h);
        }
    });

    // Trappole Visibili (per debug/identificazione)
    (lvl.invisible_traps || []).forEach(t => {
        if (!t.invisible && t.type !== 'fall_death') {
            ctx.fillStyle = '#6d071a'; // Colore per le trappole visibili
            ctx.fillRect(Math.round(t.x-camX), Math.round(t.y), t.w, t.h);
        }
    });
    
    // boss (Golruk)
    BossFinal.render(ctx, camX);

    // player
    player.draw(ctx, camX);

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = '22px Arial';
    // Vite
    ctx.fillText('Lives: ' + player.lives, 12, 28);
    // Punteggio
    ctx.fillText('Score: ' + player.score, 12, 54); 
    
    if (cur === 2) {
      // Contatore specifico per il boss
      const thrownCount = BossFinal.thrown;
      ctx.fillStyle = thrownCount >= 50 ? '#1ee0b8' : '#fff';
      ctx.fillText('Drinks to dodge: ' + Math.max(0, 50 - thrownCount), 12, 80);
      
      // Messaggio di vittoria
      if (thrownCount >= 50) {
           ctx.font = '40px Impact';
           ctx.textAlign = 'center';
           ctx.fillStyle = '#FFD700';
           ctx.fillText('Pie diventa King!', engine.width / 2, engine.height / 2);
           ctx.textAlign = 'left';
      }
    }
  }

  return {
    startNew: ()=> _start(true),
    continue: ()=> continueGame(),
    save,
    onPlayerHit,
    onPlayerFell,
    getCurLevelIndex,
    _start
  };
})();

window.Game = Game;
