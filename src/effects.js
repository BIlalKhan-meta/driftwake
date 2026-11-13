// Driftwake - Visual Effects (Splashes, V-Wake, Splinters, Fire)


import { createMaterial } from './engine.js';
import { COLORS, GAME_CONFIG } from './config.js';
import { wave } from './water.js';

const { particles } = COLORS;

let splI = 0;
let fireI = 0;

export function createSplashSystem(scene) {
  const splashMat = createMaterial(scene, particles.splash, particles.splash);
  splashMat.disableLighting = true; splashMat.alpha = 0.65; splashMat.backFaceCulling = false;
  
  const splashes = [];
  for (let k = 0; k < 40; k++) {
    const d = BABYLON.MeshBuilder.CreateCylinder('sp', { diameterTop: 0, diameterBottom: 0.25, height: 0.4, tessellation: 6 }, scene);
    d.material = splashMat; d.scaling.set(0, 0, 0); d.visibility = 0; d.life = 0; d.vy = 0;
    splashes.push(d);
  }
  
  return { splashes, splashMat };
}

export function createVWakeSystem(scene) {
  const vfoamMat = createMaterial(scene, particles.vwake, particles.vwake);
  vfoamMat.disableLighting = true; vfoamMat.alpha = 0.4; vfoamMat.backFaceCulling = false;
  
  const vwake = [];
  for (let k = 0; k < 60; k++) {
    const f = BABYLON.MeshBuilder.CreateDisc('vw', { radius: 0.6, tessellation: 10 }, scene);
    f.material = vfoamMat; f.rotation.x = Math.PI / 2; f.scaling.set(0, 0, 0); f.visibility = 0; f.life = 0;
    vwake.push(f);
  }
  
  return { vwake, vfoamMat };
}

export function createSplinterSystem(scene) {
  const splinters = [];
  for (let k = 0; k < 60; k++) {
    const s = BABYLON.MeshBuilder.CreateBox('sp', { width: 0.12, height: 0.12, depth: 0.4 }, scene);
    s.material = createMaterial(scene, '#7b4a2b');
    s.scaling.set(0, 0, 0); s.visibility = 0; s.life = 0; s.v = new BABYLON.Vector3();
    splinters.push(s);
  }
  return splinters;
}

export function createFireSystem(scene) {
  const firePuffs = [];
  for (let k = 0; k < 40; k++) {
    const f = BABYLON.MeshBuilder.CreateSphere('fp', { diameter: 0.6, segments: 5 }, scene);
    f.material = createMaterial(scene, particles.fire.diffuse, particles.fire.emissive);
    f.material.disableLighting = true; f.material.alpha = 0;
    f.scaling.set(0, 0, 0); f.visibility = 0; f.life = 0; f.v = new BABYLON.Vector3();
    firePuffs.push(f);
  }
  return firePuffs;
}

export function updateSplashes(splashes, st, dt, t, waveFunc, splashI) {
  let nextI = splashI;
  let splashT = st.splashT - dt;
  
  if (splashT <= 0 && st.sp > 3) {
    splashT = 0.02;
    for (let n = 0; n < 2; n++) {
      const s = splashes[nextI++ % splashes.length];
      const ang = st.h + Math.PI + (Math.random() - 0.5) * 1.2;
      const dist = 0.6 + Math.random() * 1.2;
      const sx = st.x + Math.sin(ang) * dist;
      const sz = st.z + Math.cos(ang) * dist;
      s.life = 1; s.vy = 3 + Math.random() * 3; s.vx = (Math.random() - 0.5) * 2; s.vz = (Math.random() - 0.5) * 2;
      s.position.set(sx, waveFunc(sx, sz, t) + 0.05, sz);
      s.rotation.x = (Math.random() - 0.5) * 0.4; s.rotation.y = Math.random() * 6.28;
      s.scaling.set(0.6, 0.4, 0.6); s.visibility = 0.8;
    }
  }
  
  splashes.forEach(s => {
    if (s.life > 0) {
      s.life -= dt * 4;
      const p = 1 - s.life;
      s.scaling.set(0.6 * (1 - p * 0.5), (1 - p) * 1.6, 0.6 * (1 - p * 0.5));
      s.position.y += s.vy * dt; s.vy -= 12 * dt;
      s.position.x += s.vx * dt; s.position.z += s.vz * dt;
      s.visibility = Math.max(0, (1 - p * p)) * 0.7;
      s.rotation.x += dt * 3;
    } else { s.scaling.set(0, 0, 0); s.visibility = 0; }
  });
  
  return { splashT, nextI };
}

export function updateVWake(vwake, st, dt, t, waveFunc, vwakeI) {
  let nextI = vwakeI;
  
  if (st.sp > 4) {
    const w = vwake[nextI++ % vwake.length];
    const side = nextI % 2 ? 1 : -1;
    w.life = 1;
    w.position.set(
      st.x - Math.sin(st.h) * 2.8 + Math.cos(st.h) * side * 1.2,
      waveFunc(st.x, st.z, t) + 0.08,
      st.z - Math.cos(st.h) * 2.8 - Math.sin(st.h) * side * 1.2
    );
    w.scaling.set(0.8, 0.8, 0.8); w.visibility = 0.5;
  }
  
  vwake.forEach(w => {
    if (w.life > 0) {
      w.life -= dt * 0.3;
      const p = 1 - w.life;
      w.scaling.set(0.8 + p * 2.5, 0.8 + p * 2.5, 0.8 + p * 2.5);
      w.visibility = Math.max(0, 1 - p) * w.life * 0.5;
      w.position.y = waveFunc(w.position.x, w.position.z, t) + 0.07;
    } else { w.visibility = 0; }
  });
  
  return nextI;
}

export function updateSplinters(splinters, dt) {
  splinters.forEach(s => {
    if (s.life > 0) {
      s.life -= dt * 2.5;
      if (s.life <= 0) { s.visibility = 0; s.scaling.set(0, 0, 0); return; }
      s.v.y -= 9.8 * dt; s.position.addInPlace(s.v.scale(dt));
      s.rotation.x += dt * 8; s.rotation.z += dt * 6;
      const p = 1 - s.life; s.scaling.set(0.5 * (1 - p), 0.5 * (1 - p), 0.5 * (1 - p)); s.visibility = s.life;
    }
  });
}

export function updateFirePuffs(firePuffs, dt) {
  firePuffs.forEach(f => {
    if (f.life > 0) {
      f.life -= dt * 1.8;
      if (f.life <= 0) { f.visibility = 0; f.scaling.set(0, 0, 0); return; }
      f.v.y += dt * 1.2; f.v.scaleInPlace(0.98); f.position.addInPlace(f.v.scale(dt));
      const p = 1 - f.life; f.scaling.set(0.4 + p, 0.4 + p, 0.4 + p); f.material.alpha = Math.max(0, f.life) * 0.5;
      f.rotation.y += dt * 2;
    }
  });
}

export function spawnSplinters(splinters, x, y, z, dir) {
  for (let n = 0; n < 6; n++) {
    const s = splinters[splI++ % splinters.length];
    s.life = 1; s.position.set(x, y, z);
    const spd = 2 + Math.random() * 3;
    s.v.set((dir.x + (Math.random() - 0.5) * 1.2) * spd, 3 + Math.random() * 4, (dir.z + (Math.random() - 0.5) * 1.2) * spd);
    s.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    s.scaling.set(0.5, 0.5, 0.5); s.visibility = 1;
  }
}

export function spawnFire(firePuffs, x, y, z) {
  for (let n = 0; n < 5; n++) {
    const f = firePuffs[fireI++ % firePuffs.length];
    f.life = 1; f.position.set(x, y, z);
    f.v.set((Math.random() - 0.5) * 0.8, 0.3 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8);
    f.scaling.set(0.3, 0.3, 0.3); f.material.alpha = 0.5; f.visibility = 1;
  }
}