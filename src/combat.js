// Driftwake - Combat System (Cannons, Projectiles, Damage)


import { createMaterial } from './engine.js';
import { COLORS } from './config.js';

const { enemy: eCol, particles } = COLORS;

export function createProjectiles(scene) {
  const ballMat = createMaterial(scene, '#222222', '#553300');
  const boomMat = createMaterial(scene, '#ffb347', '#ffb347');
  boomMat.disableLighting = true; boomMat.alpha = 0.9;
  
  const balls = [];
  const booms = [];
  
  return { balls, booms, ballMat, boomMat };
}

export function shoot(balls, scene, ballMat, x, y, z, tx, tz, mine) {
  let b = balls.find(q => !q.on);
  if (!b) {
    const m = BABYLON.MeshBuilder.CreateSphere('cb', { diameter: 0.6, segments: 6 }, scene);
    m.material = ballMat;
    b = { m, on: false };
    balls.push(b);
  }
  
  const D = Math.hypot(tx - x, tz - z);
  const T = Math.max(0.4, D / 30);
  
  b.on = true; b.mine = mine; b.m.setEnabled(true); b.m.position.set(x, y, z);
  b.vx = (tx - x) / T; b.vz = (tz - z) / T;
  b.vy = (1.2 - y) / T + 7 * T; b.life = T + 0.6;
  
  return b;
}

export function boom(booms, scene, boomMat, x, y, z) {
  let b = booms.find(q => q.l <= 0);
  if (!b) {
    const s = BABYLON.MeshBuilder.CreateSphere('bm', { diameter: 1, segments: 5 }, scene);
    s.material = boomMat;
    b = { m: s, l: 0 };
    booms.push(b);
  }
  b.l = 1; b.m.position.set(x, y, z); b.m.setEnabled(true);
}

export function tryFire(st, scene, balls, ballMat, lockCam, lockT, D, fireCd, up, sfx, waveT, spawnSmoke) {
  if (fireCd > 0 || !st.run) return { fireCd, waveT };
  
  const tg = lockCam && lockT && !lockT.dead ? lockT : null;
  const sr = Math.sin(st.h), cr = Math.cos(st.h), y = st.shipY + 1.35;
  
  if (tg) {
    const d = Math.hypot(tg.x - st.x, tg.z - st.z);
    let tx, tz;
    if (D.autoAim) { tx = tg.x + Math.sin(tg.h) * tg.sp * d / 30; tz = tg.z + Math.cos(tg.h) * tg.sp * d / 30; }
    else { tx = tg.x; tz = tg.z; }
    
    const rel = Math.atan2(Math.sin(Math.atan2(tg.x - st.x, tg.z - st.z) - st.h), Math.cos(Math.atan2(tg.x - st.x, tg.z - st.z) - st.h));
    const side = rel >= 0 ? 1 : -1;
    const spr = D.autoAim ? 2.2 : D.spread * 0.45;
    
    for (let i = -1; i <= 1; i++) {
      const along = i * 1.05;
      const gx = st.x + sr * along + cr * side * 1.25;
      const gz = st.z + cr * along - sr * side * 1.25;
      shoot(balls, scene, ballMat, gx, y, gz, tx + (Math.random() - 0.5) * spr, tz + (Math.random() - 0.5) * spr, true);
    }
  } else {
    const tx = st.x + sr * 42, tz = st.z + cr * 42;
    shoot(balls, scene, ballMat, st.x + sr * 2.2, y + 0.3, st.z + cr * 2.2, tx, tz, true);
  }
  
  sfx('cannon');
  
  // Cannon smoke
  if (spawnSmoke) spawnSmoke(st.x, st.shipY + 1.35, st.z);
  
  fireCd = 1.35 * Math.pow(0.8, up.cannon);
  waveT = 0.55;
  return { fireCd, waveT };
}

export function updateProjectiles(balls, booms, st, enemies, dt, t, waveFunc, boom, sfx, sfxHitEnemy, sfxHitPlayer, updHud, say, sunk, save, spawnSplinters, spawnFire, dev, spawnDmg) {
  balls.forEach(b => {
    if (!b.on) return;
    b.vy -= 14 * dt;
    const p = b.m.position;
    p.x += b.vx * dt; p.y += b.vy * dt; p.z += b.vz * dt;
    b.life -= dt;
    
    let hit = false;
    
    if (b.mine) {
      enemies.forEach(e => {
        if (!e.dead && !hit && Math.hypot(e.x - p.x, e.z - p.z) < (e.boss ? 5.5 : 3) && p.y < (e.boss ? 10 : 6) && p.y > -0.5) {
          hit = true; e.hp--; boom(booms, b.m.getScene(), b.m.material, p.x, p.y, p.z); sfxHitEnemy();
          const dir = new BABYLON.Vector3(e.x - p.x, 0, e.z - p.z); dir.normalize();
          spawnSplinters(p.x, p.y, p.z, dir);
          spawnFire(p.x, p.y + 1.2, p.z);
          
          if (spawnDmg) spawnDmg(p.x, p.y + 3, p.z, '1', '#ff4444');
          
          // Combo counter
          if (e.hp === 0) {
            st.combo++;
          } else {
            st.combo = 1;
          }
          
          if (e.hp <= 0) {
            e.dead = 25; st.kills++; st.gold += e.boss ? 80 : 15; st.waveT = 1.6; sfx('boom');
            say('Captain Mara', e.boss ? 'Warden sunk! +80 gold' : 'Raider down! +15 gold', 2600);
            updHud(); save();
          }
        }
      });
    } else if (Math.hypot(st.x - p.x, st.z - p.z) < 2.6 && p.y < 5.5 && p.y > -0.5) {
      hit = true; if (!dev.god) st.hp--; boom(booms, b.m.getScene(), b.m.material, p.x, p.y, p.z); sfxHitPlayer(); updHud();
      say('Captain Mara', 'Hull hit! Keep moving!', 1800); if (st.hp <= 0) sunk();
    }
    
    if (hit || p.y < waveFunc(p.x, p.z, t) - 0.3 || b.life < 0) {
      if (!hit && Math.hypot(p.x - st.x, p.z - st.z) < 45) sfx('splash');
      b.on = false; b.m.setEnabled(false);
    }
  });
  
  booms.forEach(b => {
    if (b.l > 0) {
      b.l -= dt * 2.2;
      const s = 1 + (1 - b.l) * 3;
      b.m.scaling.set(s, s, s);
      b.m.visibility = Math.max(0, b.l);
      if (b.l <= 0) b.m.setEnabled(false);
    }
  });
}
