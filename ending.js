document.getElementById('finalInput').addEventListener('change',function(e){
    const file=e.target.files[0];
    const reader=new FileReader();
    reader.onload=function(ev){
        let img=new Image();
        img.src=ev.target.result;
        document.getElementById('finalImage').innerHTML='';
        document.getElementById('finalImage').appendChild(img);
    };
    reader.readAsDataURL(file);
});

document.getElementById('restartBtn').addEventListener('click',()=>{
    document.getElementById('ending').style.display='none';
    document.getElementById('menu').style.display='block';
});
