const Game = (() => {
  const LEVELS = ['levels/level1.json','levels/level2.json','levels/level3.json'];
  let engine, player, levels = [], cur = 0, camX = 0, bossStarted = false;

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
    g.addColorStop(0,'#080816'); g.addColorStop(1,'#0f1220');
    ctx.fillStyle = g; ctx.fillRect(0,0,engine.width,engine.height);
    for (let i=0;i<6;i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.02*(6-i)})`;
      ctx.beginPath();
      ctx.arc(engine.width/2 - (camX*0.02)%500 + i*120, 120 + (i%2)*20, 200 - i*24, 0, Math.PI*2);
      ctx.fill();
    }
  }

  async function _start(isNew=false) {
    try { await loadAllLevels(); } 
    catch(e){ alert('Errore caricamento livelli: ' + e.message); return; }

    engine = new Engine(document.getElementById('game'));
    document.getElementById('menu').style.display='none';
    document.getElementById('game').style.display='block';
    cur = isNew ? 0 : parseInt(localStorage.getItem('pie_level') || '0');
    const start = levels[cur].playerStart || {x: 80, y: 300};
    player = new Player(start.x, start.y);
    camX = 0; bossStarted = false; BossFinal.reset();

    try {
      if (cur===2) {
        document.getElementById('bgm').pause();
        const bgmFinal = document.getElementById('bgm_final'); bgmFinal.currentTime=0; bgmFinal.play().catch(()=>{});
      } else {
        document.getElementById('bgm_final').pause();
        const bgm = document.getElementById('bgm'); bgm.currentTime=0; bgm.play().catch(()=>{});
      }
    } catch(e){}

    engine.start(update, render);
  }

  function continueGame(){ _start(false); }

  function save() {
    localStorage.setItem('pie_level', String(cur));
    alert('Gioco salvato (livello ' + (cur+1) + ')');
  }

  function onPlayerHit() { engine.stop(); setTimeout(()=> startLevel(cur), 600); }

  function startLevel(n) {
    cur=n;
    const start=levels[cur].playerStart||{x:80,y:300};
    player=new Player(start.x,start.y);
    camX=0; bossStarted=false; BossFinal.reset();
    engine.start(update, render);
  }

  function update(dt) {
    player.update(dt,{keys:engine.keys,touch:engine.touch},levels[cur].platforms||[]);
    const margin=300;
    const target=Math.min(Math.max(player.x-margin,0),(levels[cur].length||2000)-engine.width);
    camX+=(target-camX)*Math.min(1,dt*8);

    const lvl=levels[cur];
    (lvl.enemies||[]).forEach(en=>{
      if(rectsOverlap({x:en.x,y:en.y,w:20,h:20},{x:player.x,y:player.y,w:player.w,h:player.h})) onPlayerHit();
    });

    if(cur===2 && !bossStarted && lvl.boss && player.x > (lvl.boss.triggerX ?? (levels[cur].length - 800))) {
      BossFinal.start(lvl.boss.x,lvl.boss.y);
      bossStarted=true;
    }

    BossFinal.update(dt,player,camX);

    if(player.x > (lvl.endX ?? (levels[cur].length - 200))) {
      engine.stop();
      if(cur===levels.length-1){
        setTimeout(()=> {
          document.getElementById('game').style.display='none';
          document.getElementById('ending').style.display='block';
        },300);
      } else {
        cur++; localStorage.setItem('pie_level',String(cur)); startLevel(cur);
      }
    }
  }

  function render(ctx) {
    drawBG(ctx,camX);
    ctx.fillStyle='#3a3a3a'; (levels[cur].platforms||[]).forEach(p=>ctx.fillRect(Math.round(p[0]-camX),Math.round(p[1]),p[2],p[3]));
    (levels[cur].decorations||[]).forEach(d=>{ctx.fillStyle='#ff6b9a'; ctx.fillRect(Math.round(d.x-camX),Math.round(d.y),16,16);});
    (levels[cur].enemies||[]).forEach(e=>{ctx.fillStyle='#d9a300'; ctx.fillRect(Math.round(e.x-camX),Math.round(e.y),20,20);});
    BossFinal.render(ctx,camX);
    player.draw(ctx,camX);
    ctx.fillStyle='#fff'; ctx.font='18px Arial';
    ctx.fillText('Level '+(cur+1)+' / '+LEVELS.length,12,22);
    ctx.fillText('X: '+Math.round(player.x),12,44);
    if(cur===2 && BossFinal.active) ctx.fillText('Drinks thrown: '+BossFinal.thrown+' (active: '+BossFinal.projectiles.length+')',12,70);
  }

  return { startNew:()=>_start(true), continue:()=>continueGame(), save, onPlayerHit, _start };
})();
