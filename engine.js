class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.keys = {};
    this.touch = { left: false, right: false, jump: false };
    this.delta = 0;
    this._last = performance.now();

    // keyboard
    window.addEventListener('keydown', e => { this.keys[e.key] = true; });
    window.addEventListener('keyup',   e => { this.keys[e.key] = false; });

    // simple touch controls: left half, right half, tap to jump
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = t.clientX - rect.left;
      if (x < rect.width * 0.33) this.touch.left = true;
      else if (x > rect.width * 0.66) this.touch.right = true;
      else this.touch.jump = true;
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
      this.touch.left = false; this.touch.right = false; this.touch.jump = false;
    });

    window.engine = this; // global
  }

  start(updateFn, renderFn) {
    const loop = (now) => {
      this.delta = Math.min(0.05, (now - this._last) / 1000); // clamp dt
      this._last = now;
      updateFn(this.delta);
      renderFn(this.ctx);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
  }
}
