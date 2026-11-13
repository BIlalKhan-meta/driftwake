// Driftwake - Enemies (Raiders, Iron Warden)


import { createMaterial, flat } from './engine.js';
import { COLORS, DIFFICULTY } from './config.js';
import { wave } from './water.js';

const { enemy: eCol, particles } = COLORS;

export function createEnemy(scene, scale = 1) {
  const n = new BABYLON.TransformNode('e', scene);
  const b = new BABYLON.TransformNode('eb', scene);
  b.parent = n;
  
  const eHull = createMaterial(scene, eCol.hull);
  const eDark = createMaterial(scene, eCol.dark);
  const eSail = createMaterial(scene, eCol.sail);
  
  const h = flat(BABYLON.MeshBuilder.CreateBox('h', { width: 2.4, height: 1, depth: 4.6 }, scene));
  h.material = eHull; h.position.set(0, 0.5, -0.2); h.parent = b;
  
  const bw = flat(BABYLON.MeshBuilder.CreateBox('bw', { width: 1.7, height: 1, depth: 1.7 }, scene));
  bw.material = eHull; bw.position.set(0, 0.5, 2.1); bw.rotation.y = Math.PI / 4; bw.parent = b;
  
  const m = flat(BABYLON.MeshBuilder.CreateCylinder('m', { diameter: 0.2, height: 5 }, scene));
  m.material = eDark; m.position.set(0, 3.3, 0.2); m.parent = b;
  
  const s = flat(BABYLON.MeshBuilder.CreateBox('s', { width: 3.2, height: 2.6, depth: 0.06 }, scene));
  s.material = eSail; s.position.set(0, 3.5, 0.35); s.parent = b;
  
  const f = flat(BABYLON.MeshBuilder.CreateBox('f', { width: 0.9, height: 0.45, depth: 0.05 }, scene));
  f.material = eDark; f.position.set(0.5, 5.6, 0.2); f.parent = b;
  
  const cn = flat(BABYLON.MeshBuilder.CreateBox('cn', { width: 0.5, height: 0.4, depth: 1 }, scene));
  cn.material = eDark; cn.position.set(0, 1.2, 1.2); cn.parent = b;
  
  n.scaling.setAll(scale);
  return { n, b };
}

export function createEnemies(scene, D) {
  const enemies = [];
  
  // 3 regular raiders
  for (let k = 0; k < 3; k++) {
    const e = createEnemy(scene);
    e.flank = k % 2 ? 1 : -1;
    e.hp = e.max = 3;
    e.dead = 0; e.sp = 0; e.cd = 2.5; e.h = Math.random() * 6.28; e.weave = 0;
    e.b.position.y = 0; e.b.rotation.z = 0;
    e.n.setEnabled(true);
    enemies.push(e);
  }
  
  // Iron Warden (boss)
  const boss = createEnemy(scene, 2);
  boss.flank = 1;
  boss.hp = boss.max = 12;
  boss.dead = 1e9; // not spawned yet
  boss.boss = true;
  boss.next = D.bossNext;
  boss.n.setEnabled(false);
  enemies.push(boss);
  
  return enemies;
}

export function placeEnemy(e, st, islands, D) {
  let placed = false;
  for (let n = 0; n < 30; n++) {
    const a = Math.random() * 6.28;
    const d = 70 + Math.random() * 50;
    const x = st.x + Math.cos(a) * d;
    const z = st.z + Math.sin(a) * d;
    if (!islands.some(i => Math.hypot(i.x - x, i.z - z) < i.r + 6)) {
      e.x = x; e.z = z; placed = true; break;
    }
  }
  if (!placed) {
    const a = Math.random() * 6.28;
    e.x = st.x + Math.cos(a) * 90;
    e.z = st.z + Math.sin(a) * 90;
  }
  e.hp = e.max || 3; e.dead = 0; e.sp = 0; e.cd = 2.5; e.h = Math.random() * 6.28; e.weave = 0;
  e.b.position.y = 0; e.b.rotation.z = 0; e.n.setEnabled(true);
  e.n.position.set(e.x, 0.1, e.z);
}

export function updateEnemies(enemies, st, islands, D, dt, t, kills, boom, sfx, say, updHud, save) {
  enemies.forEach((e, idx) => {
    if (e.boss && e.dead > 1e8) {
      if (kills >= e.next) {
        e.dead = 0; placeEnemy(e, st, islands, D);
        say('Captain Mara', 'The Iron Warden! Focus fire!', 3500);
      }
      return;
    }
    
    if (e.dead > 0) {
      e.dead -= dt;
      if (e.dead > 22) {
        e.b.position.y -= dt * 1.6;
        e.b.rotation.z += dt * 0.6;
      } else {
        e.n.setEnabled(false);
      }
      if (e.dead <= 0) {
        if (e.boss) { e.dead = 1e9; e.next = kills + D.bossNext; }
        else placeEnemy(e, st, islands, D);
      }
      return;
    }
    
    const dx = st.x - e.x, dz = st.z - e.z;
    const d = Math.hypot(dx, dz);
    
    if (st.run && !st.won && d < D.aggro) {
      const toP = Math.atan2(dx, dz);
      const flank = e.flank || 1;
      const ideal = e.boss ? (D.ideal + (st.diffKey === 'dread' ? 4 : 8)) : D.ideal;
      
      let want = toP;
      if (e.boss && st.diffKey === 'dread') {
        if (d > ideal + 6) want = toP;
        else if (d < ideal - 5) want = toP + flank * 1.2;
        else want = toP + flank * 0.55;
      } else if (d > ideal + 10) want = toP + flank * 0.28;
      else if (d < ideal - 7) want = toP + flank * 1.45;
      else want = toP + flank * (Math.PI / 2 * 0.92);
      
      if (st.diffKey !== 'soft') {
        e.weave += dt * (st.diffKey === 'dread' ? 2.8 : 1.4);
        want += Math.sin(e.weave) * flank * (st.diffKey === 'dread' ? 0.32 : 0.22);
      }
      
      // Island avoidance
      for (const i of islands) {
        const ix = e.x - i.x, iz = e.z - i.z, id = Math.hypot(ix, iz), safe = i.r + 12;
        if (id < safe && id > 0.1) {
          const away = Math.atan2(ix, iz), w = 1 - id / safe;
          want = want * (1 - w * 0.85) + away * w * 0.85;
        }
      }
      
      const turn = D.turn * (e.boss ? D.bossTurn : 1);
      const chase = D.chase * (e.boss ? D.bossChase : 1);
      
      const df = Math.atan2(Math.sin(want - e.h), Math.cos(want - e.h));
      e.h += Math.max(-2.1, Math.min(2.1, df)) * dt * turn;
      
      const tgtSp = d > ideal + 6 ? chase : (d < ideal - 8 ? chase * 0.6 : D.orbit * (e.boss && st.diffKey === 'dread' ? 1.35 : 1));
      e.sp += (tgtSp - e.sp) * Math.min(1, dt * (e.boss && st.diffKey === 'dread' ? 2.6 : 1.8));
      
      e.cd -= dt;
      const fireR = e.boss ? ideal + (st.diffKey === 'dread' ? 28 : 18) : ideal + 12;
      
      let lx, lz;
      if (D.autoAim) {
        const leadT = (d / 30) * D.lead;
        lx = st.x + Math.sin(st.h) * st.sp * leadT;
        lz = st.z + Math.cos(st.h) * st.sp * leadT;
      } else {
        lx = st.x; lz = st.z;
      }
      
      const aim = Math.atan2(lx - e.x, lz - e.z);
      const aimErr = Math.abs(Math.atan2(Math.sin(aim - e.h), Math.cos(aim - e.h)));
      const aimOk = D.autoAim ? aimErr < (st.diffKey === 'soft' ? 1.3 : 0.55) : aimErr < (e.boss ? 0.95 : 0.75);
      
      if (d < fireR && e.cd <= 0 && aimOk) {
        e.cd = (e.boss ? D.fire * D.bossFire : D.fire) + Math.random() * (D.autoAim ? 1.1 : 0.55);
        const spr = D.spread * (e.boss ? 1.25 : 1);
        const shots = e.boss ? D.bossShots : 1;
        for (let q = 0; q < shots; q++) {
          // This will be handled by combat system - just return the shot data
          e._pendingShots = e._pendingShots || [];
          e._pendingShots.push({ x: e.x, y: e.boss ? 5 : 3, z: e.z, tx: lx + (Math.random() - 0.5) * spr, tz: lz + (Math.random() - 0.5) * spr });
        }
        if (d < 80) sfx('cannon');
      }
    } else {
      e.sp *= 0.98;
    }
    
    e.x += Math.sin(e.h) * e.sp * dt;
    e.z += Math.cos(e.h) * e.sp * dt;
    
    for (const i of islands) {
      const ix = e.x - i.x, iz = e.z - i.z, id = Math.hypot(ix, iz), lim = i.r * 0.95 + 2;
      if (id < lim) { e.x = i.x + ix / id * lim; e.z = i.z + iz / id * lim; }
    }
    
    e.n.position.set(e.x, wave(e.x, e.z, t) + 0.1, e.z);
    e.n.rotation.y = e.h;
    e.b.rotation.z = Math.sin(t + idx) * 0.05;
  });
}