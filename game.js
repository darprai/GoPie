// Funzione helper per i colori (necessaria per drawBG)
function rgba(r, g, b, a) {
  return `rgba(${r},${g},${b},${a})`;
}

const Game = (() => {
  const LEVELS = ['levels/level1.json','levels/level2.json','levels/level3.json']; 
  let engine, player, levels = [], cur = 0, camX = 0;
  let bossStarted = false;
  let endTriggered = false; 
  let endAnimation = null; 

  async function loadAllLevels() {
    levels = [];
    for (let p of LEVELS) {
      try {
        const r = await fetch(p);
        if (!r.ok) throw new Error('Cannot load level file: ' + p);
        levels.push(await r.json()); 
      } catch(e) {
          console.error(`Error loading JSON from ${p}:`, e);
          throw new Error(`Failed to parse level JSON from ${p}. Check for comments or syntax errors!`);
      }
    }
  }

  function drawBG(ctx, camX) {
    if (!engine) return;
    
    if (window.icon512Sprite && window.icon512Sprite.complete) {
        if(!window.icon552Sprite.src) {
            window.icon512Sprite.src = 'assets/sprites/icon-512.png';
        }
        ctx.drawImage(window.icon512Sprite, 0, 0, engine.width, engine.height);
    } else {
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
    
    // Mostra i controlli touch solo se non è un desktop
    if (!/Mobi|Android/i.test(navigator.userAgent)) {
        document.getElementById('mobile-controls').style.display = 'none';
    } else {
        document.getElementById('mobile-controls').style.display = 'flex';
    }


    document.getElementById('menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'block'; // Usiamo il nuovo contenitore
    document.getElementById('game').style.display = 'block';
    
    cur = isNew ? 0 : parseInt(localStorage.getItem('pie_level') || '0');
    if (cur < 0 || cur >= levels.length) cur = 0; 
    endTriggered = false;

    const start = levels[cur].playerStart || {x: 80, y: 300};
    player = new Player(start.x, start.y);
    camX = 0;
    bossStarted = false;
    BossFinal.reset();
    endAnimation = null; 

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
    
    if (player.hit()) {
        engine.stop();
        setTimeout(()=> startLevel(cur), 600);
    } else {
        // Game Over
        engine.stop();
        localStorage.setItem('pie_level', '0');
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('menu').style.display = 'block';
    }
  }

  function onPlayerFell() {
      // Se colpito/caduto riavvia il livello se ha vite
      if (player.hit()) {
        engine.stop();
        setTimeout(()=> startLevel(cur), 600);
      } else {
        // Game Over
        engine.stop();
        localStorage.setItem('pie_level', '0');
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('menu').style.display = 'block';
      }
  }

  function startLevel(n) {
    cur = n;
    if (cur >= levels.length) {
        // Schermata Finale solo dopo l'ultimo livello
        engine.stop();
        document.getElementById('finalTitle').textContent = 'Pie diventa King';
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('ending').style.display = 'block';
        window.showFinalScreen(); 
        return;
    }

    playMusic(cur);
    const start = levels[cur].playerStart || {x: 80, y: 300};
    player = new Player(start.x, start.y);
    player.lives = player.lives > 0 ? player.lives : 3; 
    camX = 0;
    bossStarted = false;
    BossFinal.reset();
    endAnimation = null;
    endTriggered = false;
    engine.start(update, render);
  }
  
  function getCurLevelIndex() {
      return cur;
  }

  function update(dt) {
    const lvl = levels[cur];
    
    if (endAnimation) {
        endAnimation.update(dt);
        return; 
    }

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
            onPlayerHit(); 
        }
      }
    });

    // 2. Collisioni Trappole Invisibili
    (lvl.invisible_traps || []).forEach(t => {
        if (t.effect === 'hazard' || t.type === 'drink' || t.type === 'fall_death') {
            if (rectsOverlap({x:t.x, y:t.y, w:t.w, h:t.h}, {x:player.x, y:player.y, w:player.w, h:player.h})) {
                if (t.type === 'fall_death') {
                    onPlayerFell(); 
                } else {
                    onPlayerHit();
                }
            }
        }
    });

    // Boss Trigger, Update e Vittoria (solo Level 3)
    if (cur === 2) {
        if (!bossStarted) {
          BossFinal.start(lvl.boss.x, lvl.boss.y, lvl.boss);
          bossStarted = true;
        }
        BossFinal.update(dt, player, camX);
        
        BossFinal.projectiles.forEach((p, index) => {
            if (rectsOverlap(p, player)) {
                onPlayerHit(); 
                BossFinal.projectiles.splice(index, 1); 
            }
        });

        if (BossFinal.thrown >= 50 && !endTriggered) {
            engine.stop();
            endTriggered = true;
            setTimeout(() => {
                document.getElementById('finalTitle').textContent = 'Pie diventa King';
                document.getElementById('game-container').style.display = 'none';
                document.getElementById('ending').style.display = 'block';
                window.showFinalScreen();
            }, 1000); 
        }
    }


    // level end (Level 1 e 2): CONTROLLO COLLISIONE CON IL PALO
    if (cur !== 2 && !endTriggered) {
        const palo = lvl.endZone;

        if (palo && rectsOverlap(palo, player)) { 
             endTriggered = true;
             engine.stop();
             setTimeout(() => startEndSequence(lvl), 500); 
        }
    }
  }

  // --- LOGICA ANIMAZIONE FINALE ---

  function startEndSequence(lvl) {
    const Palo = lvl.endZone;
    const Ragazza = { x: Palo.x + 50, y: Palo.y, w: 50, h: 60 };
    const Macchina = { x: Palo.x + 100, y: Palo.y + 10, w: 100, h: 60 };
    
    player.x = Palo.x - 40;
    player.y = Palo.y - player.h;
    
    engine.keys = {}; 
    
    endAnimation = {
        state: 0, 
        timer: 0,
        ragazzaX: Ragazza.x,
        macchinaX: Macchina.x,
        
        update: function(dt) {
            this.timer += dt;
            
            if (this.state === 0 && this.timer > 0.5) {
                this.state = 1;
                this.timer = 0;
            } else if (this.state === 1) {
                // Ragazza cammina verso la Macchina
                this.ragazzaX += 50 * dt; 
                if (this.ragazzaX >= Macchina.x - 20) { 
                    this.ragazzaX = Macchina.x - 20; // Si ferma all'ingresso
                    this.state = 2;
                    this.timer = 0;
                }
            } else if (this.state === 2 && this.timer > 1.0) {
                // Macchina si muove via
                this.macchinaX += 300 * dt; 
                if (this.macchinaX > camX + engine.width + 100) { 
                    this.state = 3;
                    this.timer = 0;
                }
            } else if (this.state === 3) {
                // Transizione al livello successivo
                endAnimation = null;
                endTriggered = false;
                startLevel(cur + 1);
            }
        },
        
        draw: function(ctx, camX) {
            // 1. Palo
            if (window.paloSprite.complete) {
                ctx.drawImage(window.paloSprite, Math.round(Palo.x - camX), Math.round(Palo.y - 120), Palo.w, 120 + 60); 
            }
            
            // 2. Ragazza
            if (this.state >= 1 && this.state <= 2) {
                if (window.ragazzaSprite.complete) {
                    ctx.drawImage(window.ragazzaSprite, Math.round(this.ragazzaX - camX), Math.round(Ragazza.y - Ragazza.h), Ragazza.w, Ragazza.h);
                }
            }
            
            // 3. Macchina
            if (this.state >= 1) {
                if (window.macchinaSprite.complete) {
                    ctx.drawImage(window.macchinaSprite, Math.round(this.macchinaX - camX), Math.round(Macchina.y - 60), Macchina.w + 50, Macchina.h + 20); 
                }
            }
            
            // 4. Player (visibile fino allo stato 2, poi scompare nella macchina)
            if (this.state < 2) {
                player.draw(ctx, camX); 
            }
            
            // Messaggio
            if (this.state < 3) {
                ctx.font = '30px Impact';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#FFD700';
                ctx.fillText('Livello ' + (cur + 1) + ' Completato!', engine.width / 2, 50);
                ctx.textAlign = 'left';
            }
        }
    };
    engine.start(update, render); 
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

    
    if (!endAnimation) {
        // Disegna la End Zone (Palo)
        if (cur !== 2) {
            const Palo = lvl.endZone;
            if (Palo && window.paloSprite.complete) {
                ctx.drawImage(window.paloSprite, Math.round(Palo.x - camX), Math.round(Palo.y - 120), Palo.w, 120 + 60);
            } else if (Palo) {
                ctx.fillStyle = '#654321';
                ctx.fillRect(Math.round(Palo.x - camX), Math.round(Palo.y), Palo.w, Palo.h);
            }
        }
        
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
    } else {
        // Se l'animazione è attiva, la disegniamo sopra tutto
        endAnimation.draw(ctx, camX);
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
