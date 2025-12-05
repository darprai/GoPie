class Engine{
    constructor(canvas){
        this.canvas=canvas;
        this.ctx=canvas.getContext('2d');
        this.width=canvas.width;
        this.height=canvas.height;
        this.keys={};
        window.addEventListener('keydown',e=>{this.keys[e.key]=true});
        window.addEventListener('keyup',e=>{this.keys[e.key]=false});
        this.delta=0; this.last=0;
    }
    start(update,draw){
        const loop=(time)=>{
            this.delta=(time-this.last)/1000;
            this.last=time;
            update(this.delta);
            draw(this.ctx);
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}
