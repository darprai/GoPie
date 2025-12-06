const Game = (() => {
  const LEVELS = ['levels/level1.json','levels/level2.json','levels/level3.json'];
  let engine, player, levels = [], cur = 0, camX = 0, bossStarted = false;

  // -------------------------------
  // Caricamento livelli
  // -------------------------------
  async function loadAllLevels() {
    levels = [];
    for (let p of LEVELS) {
      const r = await fetch(p);
      if (!r.ok) throw new Error('Cannot load ' + p);
      levels.push(await r.json());
    }
  }

  // -------------------------------
  // Sfondo
  // -------------------------------
  function drawBG(ctx, camX) {
    if (!engine) return;
    const g = ctx.createLinearGradient(0,0,0,engine.height);
    g.addColorStop(0,'#080816'); g.addColorStop(1,'#0f1220');
    ctx.fillStyle = g; ctx.fillRect(0,0,engine.width,engine.height);
    for (let i=0;i<6;i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.02*(6-i)})`;
      ctx.beginPath();
      ctx.arc(engine.width/2 - (camX*0.02)%500 + i*120, 120 + (i%2)*20, 200 - i*24, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // -------------------------------
  // Helper per start del player
  // -------------------------------
  function getPlayerStart(level) {
    if (!level) return { x: 80, y: 300 };
    if (level.playerStart) return level.playerStart;
    return { x: 80, y: 300 };
  }

  // -------------------------------
  // Avvio gioco
  // -------------------------------
  async function _start(isNew=false) {
    try {
      await loadAllLevels();
    } catch(e){
      alert('Errore caricamento livelli: ' + e.message);
      return;
    }

    engine = new Engine(document.getElementById('game'));
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game').style.display = 'block';

    cur = isNew ? 0 : parseInt(localStorage.getItem('pie_level') || '0');
    if (cur < 0 || cur >= levels.length) cur = 0;

    const start = getPlayerStart(levels[cur]);

    // Controllo Player
    if (typeof Player !== "function") {
      alert("Errore: Player non definito! Controlla entities.js");
      return;
    }
    player = new Player(start.x, start.y);

    if (!playerSprite.complete) {
      console.warn("Player sprite non caricato: verrà usato il rettangolo colorato.");
    }

    camX = 0;
    bossStarted = false;
    if (typeof BossFinal !== "undefined" && BossFinal.reset) {
      BossFinal.reset();
    }

    // Riproduzione musica
    try {
      if (cur === 2) {
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
    } catch(e) {
      console.warn("Errore riproduzione musica:", e);
    }

    engine.start(update, render);
  }

  // -------------------------------
  // Continua partita
  // -------------------------------
  function continueGame(){ _start(false); }

  // -------------------------------
  // Salvataggio
  // -------------------------------
  function save() {
    localStorage.setItem('pie_level', String(cur));
    alert('Gioco salvato (livello ' + (cur+1) + ')');
  }

  // -------------------------------
  // Player colpito
  // -------------------------------
  function onPlayerHit() {
    engine.stop();
    setTimeout(()=> startLevel(cur), 600);
  }

  // -------------------------------
  // Start di un livello
  // -------------------------------
  function startLevel(n) {
    cur = n;
    const start = getPlayerStart(levels[cur]);
    player = new Player(start.x, start.y);
    camX = 0;
    bossStarted = false;
    if (typeof BossFinal !== "undefined" && BossFinal.reset) BossFinal.reset();
    engine.start(update, render);
  }

  // -------------------------------
  // Update
  // -------------------------------
  function update(dt) {
    player.update(dt, { keys: engine.keys, touch: engine.touch }, levels[cur].platforms || []);

    // camera
    const margin = 300;
    const target = Math.min(Math.max(player.x - margin, 0), (levels[cur].length || 2000) - engine.width);
    camX += (target - camX) * Math.min(1, dt*8);

    const lvl = levels[cur];

    // collisioni nemici
    (lvl.enemies || []).forEach(en => {
      if (rectsOverlap({x:en.x, y:en.y, w:20, h:20}, {x:player.x, y:player.y, w:player.w, h:player.h})) {
        onPlayerHit();
      }
    });

    // boss trigger
    if (cur === 2 && !bossStarted && lvl.boss && player.x > (lvl.boss.triggerX ?? (levels[cur].length - 800))) {
      BossFinal.start(lvl.boss.x, lvl.boss.y);
      bossStarted = true;
    }

    if (typeof BossFinal !== "undefined") {
      BossFinal.update(dt, player, camX);
    }

    // fine livello
    if (player.x > (lvl.endX ?? (levels[cur].length - 200))) {
      engine.stop();
      if (cur === levels.length - 1) {
        setTimeout(()=> {
          document.getElementById('game').style.display='none';
          document.getElementById('ending').style.display='block';
        }, 300);
      } else {
        cur++;
        localStorage.setItem('pie_level', String(cur));
        startLevel(cur);
      }
    }
  }

  // -------------------------------
  // Render
  // -------------------------------
  function render(ctx) {
    drawBG(ctx, camX);

    // piattaforme
    ctx.fillStyle = '#3a3a3a';
    (levels[cur].platforms || []).forEach(p => ctx.fillRect(Math.round(p[0]-camX), Math.round(p[1]), p[2], p[3]));

    // decorazioni
    (levels[cur].decorations || []).forEach(d => {
      ctx.fillStyle = '#ff6b9a';
      ctx.fillRect(Math.round(d.x-camX), Math.round(d.y), 16, 16);
    });

    // nemici
    (levels[cur].enemies || []).forEach(e => {
      ctx.fillStyle = '#d9a300';
      ctx.fillRect(Math.round(e.x-camX), Math.round(e.y), 20, 20);
    });

    // boss
    if (typeof BossFinal !== "undefined") BossFinal.render(ctx, camX);

    // player
    player.draw(ctx, camX);

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.fillText('Level ' + (cur+1) + ' / ' + LEVELS.length, 12, 22);
    ctx.fillText('X: ' + Math.round(player.x), 12, 44);
    if (cur === 2 && typeof BossFinal !== "undefined" && BossFinal.active) {
      ctx.fillText('Drinks thrown: ' + BossFinal.thrown + ' (active: ' + BossFinal.projectiles.length + ')', 12, 70);
    }
  }

  return {
    startNew: ()=>_start(true),
    continue: ()=>continueGame(),
    save,
    onPlayerHit,
    _start
  };
})();
