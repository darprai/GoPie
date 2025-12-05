const Game = (() => {
  const LEVELS = ['levels/level1.json','levels/level2.json','levels/level3.json'];
  let engine, player, levels = [], cur = 0, camX = 0;
  let bossStarted = false;

  async function loadAllLevels(){
    levels = [];
    for (let p of LEVELS){
      const r = await fetch(p);
      if (!r.ok) throw new Error('Cannot load ' + p);
      const json = await r.json();
      levels.push(json);
    }
  }

  function drawBG(ctx, camX){
    // simple parallax gradient
    const g = ctx.createLinearGradient(0,0,0,engine.height);
    g.addColorStop(0,'#080816'); g.addColorStop(1,'#0f1220');
    ctx.fillStyle = g; ctx.fillRect(0,0,engine.width,engine.height);
    // disco-like circles
    for (let i=0;i<6;i++){
      ctx.fillStyle = `rgba(255,255,255,${0.02*(6-i)})`;
      ctx.beginPath();
      ctx.arc( engine.width/2 - (camX*0.02)%500 + i*120, 120 + (i%2)*20, 200 - i*24, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function startNew(){
    Game._start(true);
  }

  async function _start(isNew=false){
    try {
      await loadAllLevels();
    } catch(e){
      alert('Errore caricamento livelli: ' + e.message);
      console.error(e);
      return;
    }
    engine = new Engine(document.getElementById('game'));
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    cur = isNew ? 0 : (parseInt(localStorage.getItem('pie_level')||'0'));
    if (cur < 0) cur = 0;
    player = new Player(levels[cur].playerStart ? levels[cur].playerStart.x : 80, levels[cur].playerStart ? levels[cur].playerStart.y : 300);
    camX = 0;
    bossStarted = false;
    BossFinal.reset();
    // play music if available
    try {
      const bgm = document.getElementById('bgm');
      if (cur === 2) { // final level
        document.getElementById('bgm').pause();
        document.getElementById('bgm_final').currentTime = 0;
        document.getElementById('bgm_final').play().catch(()=>{});
      } else {
        document.getElementById('bgm_final').pause();
        document.getElementById('bgm').currentTime = 0;
        document.getElementById('bgm').play().catch(()=>{});
      }
    } catch(e){}

    engine.start(update, render);
  }

  function continueGame(){ _start(false); }

  function save(){
    localStorage.setItem('pie_level', String(cur));
    alert('Gioco salvato (livello ' + (cur+1) + ')');
  }

  function onPlayerHit(){
    // reset current level
    engine.stop();
    setTimeout(()=> {
      startLevel(cur);
    }, 600);
  }

  function startLevel(n){
    cur = n;
    player = new Player(levels[cur].playerStart ? levels[cur].playerStart.x : 80, levels[cur].playerStart ? levels[cur].playerStart.y : 300);
    camX = 0;
    BossFinal.reset();
    bossStarted = false;
    engine.start(update, render);
  }

  function update(dt){
    // update player (engine provides keys and touch)
    player.update({ keys: engine.keys, touch: engine.touch }, levels[cur].platforms);
    // camera target
    const margin = 300;
    const target = Math.min(Math.max(player.x - margin, 0), (levels[cur].length || 2000) - engine.width);
    camX += (target - camX) * Math.min(1, dt * 8);

    // enemies: simple moving hazards (if present)
    const lvl = levels[cur];
    if (lvl.enemies && lvl.enemies.length){
      for (let en of lvl.enemies){
        // some enemies could be static decorative; here only check collisions
        if (rectsOverlap({x:en.x, y:en.y, w:20, h:20}, {x:player.x, y:player.y, w:player.w, h:player.h})){
          onPlayerHit();
          return;
        }
      }
    }

    // boss: start when player passes a threshold (for level 3)
    if (cur === 2 && !bossStarted){
      const bossCfg = lvl.boss;
      // if boss defined and player passes a trigger
      if (player.x > (bossCfg && bossCfg.triggerX ? bossCfg.triggerX : (levels[cur].length - 800))){
        BossFinal.start(bossCfg.x, bossCfg.y);
        bossStarted = true;
      }
    }
    // update boss projectiles
    BossFinal.update(dt, player, camX);

    // check level end (goal)
    if (player.x > (lvl.endX || (levels[cur].length - 200))){
      // if final level -> ending
      engine.stop();
      if (cur === levels.length -1){
        // show final screen
        setTimeout(()=> {
          document.getElementById('game').style.display = 'none';
          document.getElementById('ending').style.display = 'block';
        }, 300);
      } else {
        // next level
        cur++;
        // save progress
        localStorage.setItem('pie_level', String(cur));
        startLevel(cur);
      }
    }
  }

  function render(ctx){
    // clear and draw background
    drawBG(ctx, camX);

    // draw platforms
    ctx.fillStyle = '#3a3a3a';
    for (let p of levels[cur].platforms){
      ctx.fillRect(Math.round(p[0] - camX), Math.round(p[1]), p[2], p[3]);
    }

    // draw hearts/decorations if present
    if (levels[cur].decorations){
      for (let d of levels[cur].decorations){
        ctx.fillStyle = '#ff6b9a';
        ctx.fillRect(Math.round(d.x - camX), Math.round(d.y), 16, 16);
      }
    }

    // draw enemies
    if (levels[cur].enemies){
      for (let e of levels[cur].enemies){
        ctx.fillStyle = '#d9a300';
        ctx.fillRect(Math.round(e.x - camX), Math.round(e.y), 20,20);
      }
    }

    // boss render
    BossFinal.render(ctx, camX);

    // draw player
    player.draw(ctx, camX);

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.fillText('Level ' + (cur+1) + ' / ' + LEVELS.length, 12, 22);
    ctx.fillText('X: ' + Math.round(player.x), 12, 44);
    if (cur === 2 && BossFinal.active){
      ctx.fillText('Drinks thrown: ' + BossFinal.thrown + ' (active: ' + BossFinal.projectiles.length + ')', 12, 70);
    }
  }

  // public
  return {
    startNew: ()=> _start(true),
    continue: ()=> continueGame(),
    save: ()=> save(),
    onPlayerHit: ()=> onPlayerHit(),
    _start // only for internal testing
  };
})();
