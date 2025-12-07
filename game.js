// Aggiunta la funzione rgba mancante, necessaria per drawBG
function rgba(r, g, b, a) {
  return `rgba(${r},${g},${b},${a})`;
}

const Game = (() => {
  const LEVELS = ['levels/level1.json','levels/level2.json','levels/level3.json']; 
  let engine, player, levels = [], cur = 0, camX = 0;
  let bossStarted = false;
  let endTriggered = false; 

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
        return; 
    }
    
    // Gestione danno: riavvio automatico se ha ancora vite
    if (player.hit()) {
        engine.stop();
        setTimeout(()=> startLevel(cur), 600);
    } else {
        // Game Over: Ritorno automatico al menu e reset del salvataggio
        engine.stop();
        localStorage.setItem('pie_level', '0');
        document.getElementById('game').style.display = 'none';
        document.getElementById('menu').style.display = 'block';
    }
  }

  function onPlayerFell() {
      // Danno istantaneo / riavvio per caduta
      player.lives = 0; // Morte istantanea
      engine.stop();
      // Gestisce il Game Over o riavvio dal livello 0
      setTimeout(()=> {
          if (player.lives <= 0) {
              localStorage.setItem('pie_level', '0');
              document.getElementById('game').style.display = 'none';
              document.getElementById('menu').style.display = 'block';
          } else {
              startLevel(cur);
          }
      }, 600);
  }

  function startLevel(n) {
    cur = n;
    playMusic(cur);
    const start = levels[cur].playerStart || {x: 80, y: 300};
    player = new Player(start.x, start.y);
    player.lives = player.lives > 0 ? player.lives : 3; // Mantieni vite se riavvii, altrimenti 3
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

    const allPlatforms = (lvl.platforms || []).map(p => 
        Array.isArray(p) ? { x: p[0], y: p[1], w: p[2], h: p[3], isPlatform: true } : { ...p, isPlatform: true }
    );

    player.update(dt, { keys: engine.keys, touch: engine.touch }, allPlatforms);

    if (cur !== 2) { 
        const margin = 300;
        const target = Math.min(
          Math.max(player.x - margin, 0),
          (lvl.length || 2000) - engine.width
        );
        camX += (target - camX) * Math.min(1, dt * 8);
    } else { 
        camX = lvl.cameraX || 0; 
    }


    // 1. Collisioni Nemici standard (Drink, Hazard, Cuori)
    (lvl.enemies || []).forEach((en, index) => {
      const en_w = en.w || 20;
      const en_h = en.h || 20;
      if (rectsOverlap({x:en.x, y:en.y, w:en_w, h:en_h}, {x:player.x, y:player.y, w:player.w, h:player.h})) {
        if (en.type === 'heart') {
            player.collectHeart();
            lvl.enemies.splice(index, 1); 
        } else {
            onPlayerHit(); // Collisione con nemico / drink
        }
      }
    });

    // 2. Collisioni Trappole Invisibili
    (lvl.invisible_traps || []).forEach(t => {
        if (t.effect === 'hazard' || t.type === 'drink' || t.type === 'fall_death') {
            if (rectsOverlap({x:t.x, y:t.y, w:t.w, h:t.h}, {x:player.x, y:player.y, w:player.w, h:player.h})) {
                if (t.type === 'fall_death') {
                    onPlayerFell(); // Morte istantanea se cadi nel buco
                } else {
                    onPlayerHit();
                }
            }
        }
    });


    // Boss Trigger
    if (cur === 2 && !bossStarted) {
      BossFinal.start(lvl.boss.x, lvl.boss.y, lvl.boss);
      bossStarted = true;
    }

    // Boss Update (gestisce il lancio e le collisioni dei proiettili)
    BossFinal.update(dt, player, camX);
    
    // Collisione con Proiettili del Boss (solo Level 3)
    if (cur === 2) {
        BossFinal.projectiles.forEach((p, index) => {
            if (rectsOverlap(p, player)) {
                // Per il livello 3, il colpo con il drink riavvia il livello (morte istantanea)
                onPlayerHit(); 
                BossFinal.projectiles.splice(index, 1); 
            }
        });
    }

    // Condizione di Vittoria Boss
    if (cur === 2 && BossFinal.thrown >= 50 && !endTriggered) {
        engine.stop();
        endTriggered = true;
        setTimeout(() => {
            document.getElementById('finalTitle').textContent = 'Pie diventa King';
            document.getElementById('game').style.display = 'none';
            document.getElementById('ending').style.display = 'block';
            window.showFinalScreen(); // Chiama la funzione in ending.js per l'immagine
        }, 1000); 
    }

    // level end (Level 1 e 2)
    if (cur !== 2 && !endTriggered) {
        const endZone = lvl.endZone || { x: (lvl.length || 2000) - 200, y: 0, w: 50, h: engine.height };

        if (player.x > endZone.x) { 
             endTriggered = true;
             engine.stop();
             setTimeout(() => startEndSequence(lvl), 500); 
        }
    }
  }

  // Funzioni drawEndObjects e startEndSequence (omesse per brevità, sono state fornite in precedenza e sono corrette)
  function drawEndObjects(ctx, camX, palo, ragazza, macchina) {
    // ... Implementazione
  }
  function startEndSequence(lvl) {
    // ... Implementazione
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
                ctx.fillStyle = '#FFC0CB'; 
                ctx.fillRect(Math.round(x-camX), Math.round(y), w, h);
            }
        } else if (e.type === 'drink' || e.type === 'drink_mobile') {
            if (window.drinkEnemySprite.complete) {
                ctx.drawImage(window.drinkEnemySprite, Math.round(x - camX), Math.round(y), w, h);
            } else {
                ctx.fillStyle = '#00FFFF'; 
                ctx.fillRect(Math.round(x-camX), Math.round(y), w, h);
            }
        } else {
            ctx.fillStyle = '#d9a300';
            ctx.fillRect(Math.round(x-camX), Math.round(y), w, h);
        }
    });

    // Trappole Visibili 
    (lvl.invisible_traps || []).forEach(t => {
        if (!t.invisible && t.type !== 'fall_death') {
            ctx.fillStyle = '#6d071a'; 
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
    ctx.fillText('Lives: ' + player.lives, 12, 28);
    ctx.fillText('Score: ' + player.score, 12, 54); 
    
    if (cur === 2) {
      const thrownCount = BossFinal.thrown;
      ctx.fillStyle = thrownCount >= 50 ? '#1ee0b8' : '#fff';
      ctx.fillText('Drinks to dodge: ' + Math.max(0, 50 - thrownCount), 12, 80);
      
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
