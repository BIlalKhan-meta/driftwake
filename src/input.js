// Driftwake - Input Handling

export function createInput() {
  const keys = {};
  const held = {};
  let lockCam = true;
  
  const keyMap = {
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    KeyW: 'sail', ArrowUp: 'sail',
    Space: 'boost',
    KeyS: 'brake', ArrowDown: 'brake',
    KeyF: 'fire',
    KeyL: 'lock',
    KeyQ: 'orbitLeft',
    KeyE: 'orbitRight',
  };
  
  function onKeyDown(e) {
    keys[e.code] = true;
    if (e.code === 'KeyL' && !e.repeat) {
      lockCam = !lockCam;
    }
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  }
  
  function onKeyUp(e) {
    keys[e.code] = false;
  }
  
  function bindButton(id, action) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('pointerdown', e => { e.preventDefault(); held[action] = true; btn.classList.add('on'); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => 
      btn.addEventListener(ev, () => { held[action] = false; btn.classList.remove('on'); })
    );
  }
  
  function setup(canvas, callbacks) {
    // Keyboard
    addEventListener('keydown', onKeyDown);
    addEventListener('keyup', onKeyUp);
    
    // Touch buttons
    bindButton('bl', 'left');
    bindButton('br', 'right');
    bindButton('bf', 'sail');
    bindButton('bb', 'boost');
    bindButton('bfire', 'fire');
    bindButton('blk', 'lock');
    
    // Pointer drag for camera orbit
    const ptr = new Map(); let pinch = 0;
    canvas.addEventListener('pointerdown', e => {
      canvas.setPointerCapture(e.pointerId);
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      callbacks.onPointerDown?.();
    });
    
    canvas.addEventListener('pointermove', e => {
      const p = ptr.get(e.pointerId); if (!p) return;
      if (ptr.size === 1) {
        callbacks.onOrbit?.((e.clientX - p.x) * 0.006, -(e.clientY - p.y) * 0.005);
      }
      p.x = e.clientX; p.y = e.clientY;
      if (ptr.size === 2) {
        const [a, b] = [...ptr.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) callbacks.onZoom?.(pinch / d);
        pinch = d;
      }
      callbacks.onPointerDown?.();
    });
    
    ['pointerup', 'pointercancel'].forEach(n => 
      canvas.addEventListener(n, e => { ptr.delete(e.pointerId); pinch = 0; })
    );
    
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      callbacks.onZoom?.(1 + e.deltaY * 0.001);
    }, { passive: false });
    
    // Escape / Pause
    addEventListener('keydown', e => {
      if (e.code === 'Escape' && !e.repeat) {
        callbacks.onEscape?.();
      }
    });
    
    return { keys, held, lockCam, getLockCam: () => lockCam, setLockCam: v => lockCam = v };
  }
  
  return { setup };
}