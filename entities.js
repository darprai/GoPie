class Player{
    constructor(x,y){
        this.x=x; this.y=y;
        this.width=40; this.height=60;
        this.vx=0; this.vy=0; this.onGround=false;
    }
    update(keys,platforms){
        const speed=300;
        const jump=600;
        if(keys['ArrowLeft']) this.vx=-speed;
        else if(keys['ArrowRight']) this.vx=speed;
        else this.vx=0;
        this.vy+=1500*delta;
        this.x+=this.vx*delta;
        this.y+=this.vy*delta;
        this.onGround=false;
        for(let p of platforms){
            if(this.x+this.width>p[0] && this.x<p[0]+p[2] &&
               this.y+this.height>p[1] && this.y+this.height<p[1]+p[3]){
                this.y=p[1]-this.height;
                this.vy=0;
                this.onGround=true;
            }
        }
        if(keys['ArrowUp'] && this.onGround) this.vy=-jump;
    }
    draw(ctx){
        ctx.fillStyle='yellow';
        ctx.fillRect(this.x,this.y,this.width,this.height);
    }
}
