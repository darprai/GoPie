let engine, player, currentLevel=0, levels=[];

async function loadLevels(){
    for(let i=1;i<=3;i++){
        let res=await fetch(`levels/level${i}.json`);
        levels.push(await res.json());
    }
}

function startGame(){
    document.getElementById('menu').style.display='none';
    document.getElementById('game').style.display='block';
    player=new Player(50,0);
    currentLevel=0;
    engine=new Engine(document.getElementById('game'));
    engine.start(update,draw);
}

function update(delta){
    player.update(engine.keys, levels[currentLevel].platforms);
    if(player.x>=levels[currentLevel].endX){
        currentLevel++;
        if(currentLevel>=levels.length){
            endGame();
        } else {
            player.x=50; player.y=0;
        }
    }
}

function draw(ctx){
    ctx.clearRect(0,0,engine.width,engine.height);
    ctx.fillStyle='#444';
    for(let p of levels[currentLevel].platforms){
        ctx.fillRect(...p);
    }
    player.draw(ctx);
}

function endGame(){
    document.getElementById('game').style.display='none';
    document.getElementById('ending').style.display='block';
}
