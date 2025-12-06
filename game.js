// Aggiunta la funzione rgba mancante, necessaria per drawBG
function rgba(r, g, b, a) {
  return `rgba(${r},${g},${b},${a})`;
}

const Game = (() => {
  // AGGIUNTO il nuovo livello 4
  const LEVELS = ['levels/level1.json','levels/level2.json','levels/level3.json', 'levels/level_catpie.json'];
  let engine, player, levels = [], cur = 0, camX = 0;
  let bossStarted = false;

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
    const g = ctx.createLinearGradient(0,0,0,engine.height);
    g.addColorStop(0,'#080816');
    g.addColorStop(1,'#0f1220');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,engine.width,engine.height);

    for (let i=0;i<6;i++) {
      ctx.fillStyle = rgba(255,255,255,0.02*(6-i));
      ctx.beginPath();
      ctx.arc(engine.width/2 - (camX*0.02)%500 + i*120, 120 + (i%2)*20, 200 - i*24, 0, Math.PI*2);
      ctx.fill();
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
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    cur = isNew ? 0 : parseInt(localStorage.getItem('pie_level') || '0');
    if (cur < 0) cur = 0;
    // Se il livello salvato è maggiore del massimo, riparti dal nuovo livello (index 3)
    if (cur >= levels.length) cur = levels.length - 1; 


    const start = levels[cur].playerStart || {x: 80, y: 300};
    player = new Player(start.x, start.y);
    camX = 0;
    bossStarted = false;
    BossFinal.reset();

    // play music
    try {
      if (cur === 2 || cur === 3) { // Controlla anche il nuovo livello (index 3)
        document.getElementById('bgm').pause();
        const bgmFinal = document.getElementById('bgm_final');
        bgmFinal.currentTime = 0;
        bgmFinal.play().catch(()=>{});
      } else {
        document.getElementById('bgm_final').pause();
        const bgm = document.getElementById('bgm');
        bgm.currentTime = 0;
        bgm.play().catch(()=>{});
      }
    } catch(e){}

    engine.start(update, render);
  }

  function continueGame(){ _start(false); }

  function save() {
    localStorage.setItem('pie_level', String(cur));
    alert('Gioco salvato (livello ' + (cur+1) + ')');
  }

  function onPlayerHit() {
    engine.stop();
    setTimeout(()=> startLevel(cur), 600);
  }

  function startLevel(n) {
    cur = n;
    const start = levels[cur].playerStart || {x: 80, y: 300};
    player = new Player(start.x, start.y);
    camX = 0;
    bossStarted = false;
    BossFinal.reset();
    engine.start(update, render);
  }

  function update(dt) {
    const lvl = levels[cur];

    // Aggregare le piattaforme da entrambi i formati (array e oggetto)
    const allPlatforms = (lvl.platforms || []).map(p => 
        Array.isArray(p) ? { x: p[0], y: p[1], w: p[2], h: p[3] } : p
    );

    // update player
    player.update(dt, { keys: engine.keys, touch: engine.touch }, allPlatforms);

    // camera
    const margin = 300;
    const target = Math.min(
      Math.max(player.x - margin, 0),
      (lvl.length || 2000) - engine.width
    );
    camX += (target - camX) * Math.min(1, dt * 8);


    // Nemici e Trappole Invisibili Collisioni
    
    // 1. Collisioni Nemici standard (Drink, Hazard)
    (lvl.enemies || []).forEach(en => {
      if (rectsOverlap({x:en.x, y:en.y, w:20, h:20}, {x:player.x, y:player.y, w:player.w, h:player.h})) {
        onPlayerHit();
      }
    });

    // 2. Collisioni Trappole Invisibili (Cat Mario Style)
    (lvl.invisible_traps || []).forEach(t => {
        // Ignoriamo le trappole se non sono un "hazard" (es. se t.effect non è definito)
        if (t.effect === 'hazard' || t.type === 'drink') {
            if (rectsOverlap({x:t.x, y:t.y, w:t.w, h:t.h}, {x:player.x, y:player.y, w:player.w, h:player.h})) {
                onPlayerHit();
            }
        }
    });


    // boss trigger
    if (cur === 2 && !bossStarted && lvl.boss && player.x > (lvl.boss.triggerX ?? (lvl.length || 2000) - 800)) {
      BossFinal.start(lvl.boss.x, lvl.boss.y, lvl.boss);
      bossStarted = true;
    }

    BossFinal.update(dt, player, camX);

    // level end
    if (player.x > (lvl.endX ?? (lvl.length || 2000) - 200)) {
      engine.stop();
      if (cur === levels.length - 1) {
        setTimeout(()=> {
          document.getElementById('game').style.display = 'none';
          document.getElementById('ending').style.display = 'block';
        }, 300);
      } else {
        cur++;
        localStorage.setItem('pie_level', String(cur));
        startLevel(cur);
      }
    }
  }

  function render(ctx) {
    drawBG(ctx, camX);
    const lvl = levels[cur];

    // platforms
    (lvl.platforms || []).forEach(p => {
      let x, y, w, h, spriteName;
      
      // Determina i parametri e lo sprite (vecchio array o nuovo oggetto)
      if(Array.isArray(p)) {
        [x, y, w, h] = p;
        ctx.fillStyle = '#3a3a3a'; // Colore predefinito per i livelli vecchi
        ctx.fillRect(Math.round(x-camX), Math.round(y), w, h);
      } else if (typeof p === 'object') {
        ({ x, y, w, h, sprite: spriteName } = p);
        
        let sprite = null;
        if (spriteName === 'djdisc' && window.djDiscSprite.complete) sprite = window.djDiscSprite;
        if (spriteName === 'disco' && window.discoBallSprite.complete) sprite = window.discoBallSprite;

        if (sprite) {
            ctx.drawImage(sprite, Math.round(x - camX), Math.round(y), w, h);
        } else {
            // Fallback: usa il colore predefinito
            ctx.fillStyle = '#FF00FF'; 
            ctx.fillRect(Math.round(x - camX), Math.round(y), w, h);
        }
      }
    });

    // decorations (simulazione)
    (lvl.decorations || []).forEach(d => {
      ctx.fillStyle = '#ff6b9a'; 
      ctx.fillRect(Math.round(d.x-camX), Math.round(d.y), 16, 16);
    });

    // enemies (simulazione)
    (lvl.enemies || []).forEach(e => {
        let x = e.x, y = e.y, w = e.w || 20, h = e.h || 20;

        if (e.type === 'drink' || e.type === 'drink_mobile') {
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

    // Trappole Visibili
    (lvl.invisible_traps || []).forEach(t => {
        if (!t.invisible) {
            ctx.fillStyle = '#6d071a'; // Colore per le trappole visibili
            ctx.fillRect(Math.round(t.x-camX), Math.round(t.y), t.w, t.h);
        }
    });
    
    // boss
    BossFinal.render(ctx, camX);

    // player
    player.draw(ctx, camX);

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.fillText('Level ' + (cur+1) + ' / ' + LEVELS.length, 12, 22);
    ctx.fillText('X: ' + Math.round(player.x), 12, 44);
    if (cur === 2 && BossFinal.active) {
      ctx.fillText('Drinks thrown: ' + BossFinal.thrown + ' (active: ' + BossFinal.projectiles.length + ')', 12, 70);
    }
  }

  return {
    startNew: ()=> _start(true),
    continue: ()=> continueGame(),
    save,
    onPlayerHit, 
    _start
  };
})();

window.Game = Game;
