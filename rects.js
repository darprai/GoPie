// Utilità per la verifica di collisione tra rettangoli (oggetti con x, y, w, h)
function rectsOverlap(r1, r2) {
  return r1.x < r2.x + r2.w &&
         r1.x + r1.w > r2.x &&
         r1.y < r2.y + r2.h &&
         r1.y + r1.h > r2.y;
}

window.rectsOverlap = rectsOverlap; 
