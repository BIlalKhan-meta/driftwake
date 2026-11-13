// Driftwake - World Generation (Islands, Treasure, Foam)


import { createMaterial, flat } from './engine.js';
import { GAME_CONFIG, COLORS, CAPTAIN_LINES } from './config.js';
import { wave } from './water.js';

const { SEA_SIZE, ISLAND_COUNT, TOTAL_CHESTS } = GAME_CONFIG;
const { water: wCol, particles } = COLORS;

export function createIslands(scene, rnd) {
  const sand = createMaterial(scene, wCol.shallow); // #f2d9a0 equivalent
  const grass = createMaterial(scene, '#4f9d5d');
  const trunk = createMaterial(scene, '#8a5a35');
  const leaf = createMaterial(scene, '#2f7d4f');
  
  const islands = [];
  const foamMat = createMaterial(scene, particles.foam, particles.foam);
  foamMat.disableLighting = true;
  foamMat.alpha = 0.55;
  foamMat.backFaceCulling = false;
  
  for (let n = 0; islands.length < ISLAND_COUNT && n < 400; n++) {
    const x = (rnd() - 0.5) * 320;
    const z = (rnd() - 0.5) * 320;
    const r = 7 + rnd() * 8;
    
    if (Math.hypot(x, z) < 40 + r) continue;
    if (islands.some(o => Math.hypot(o.x - x, o.z - z) < o.r + r + 22)) continue;
    
    islands.push({ x, z, r });
    
    // Sand base
    const s = flat(BABYLON.MeshBuilder.CreateSphere('i', { diameter: r * 2, segments: 7 }, scene));
    s.material = sand; s.scaling.y = 0.3; s.position.set(x, -0.2, z);
    
    // Grass top
    const g = flat(BABYLON.MeshBuilder.CreateSphere('g', { diameter: r * 1.3, segments: 6 }, scene));
    g.material = grass; g.scaling.y = 0.3; g.position.set(x, r * 0.12, z);
    
    // Trees
    const trees = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < trees; k++) {
      const a = rnd() * 6.28;
      const d = rnd() * r * 0.45;
      const tx = x + Math.cos(a) * d;
      const tz = z + Math.sin(a) * d;
      const th = 3 + rnd() * 2;
      
      const tr = BABYLON.MeshBuilder.CreateCylinder('t', { diameterTop: 0.3, diameterBottom: 0.5, height: th, tessellation: 6 }, scene);
      tr.material = trunk; tr.position.set(tx, r * 0.3 + th / 2 - 0.4, tz);
      
      const lf = flat(BABYLON.MeshBuilder.CreateSphere('l', { diameter: 3.2, segments: 5 }, scene));
      lf.material = leaf; lf.scaling.y = 0.4; lf.position.set(tx, r * 0.3 + th - 0.2, tz);
    }
    
    // Foam ring
    const f = BABYLON.MeshBuilder.CreateTorus('f', { diameter: r * 2.05, thickness: 0.7, tessellation: 28 }, scene);
    f.material = foamMat; f.scaling.y = 0.15; f.position.set(x, 0.3, z);
    islands[islands.length - 1].foam = f;
  }
  
  return islands;
}

export function updateIslandFoam(islands, t, waveFunc) {
  islands.forEach((i, n) => {
    const hh = waveFunc(i.x, i.z, t);
    const rel = (hh + 0.2) / (0.3 * i.r);
    const f = Math.sqrt(Math.max(0.05, 1 - rel * rel)) * (1 + Math.sin(t * 1.5 + n) * 0.02);
    i.foam.position.y = hh + 0.25;
    i.foam.scaling.x = f;
    i.foam.scaling.z = f;
  });
}

export function spawnChests(scene, rnd, islands, existingChests = []) {
  // Dispose old
  existingChests.forEach(c => c.node.dispose());
  
  const chestMat = createMaterial(scene, '#b5651d');
  const beamMat = createMaterial(scene, '#ffc857', '#ffc857');
  beamMat.disableLighting = true;
  beamMat.alpha = 0.35;
  beamMat.fogEnabled = false;
  
  const chests = [];
  while (chests.length < TOTAL_CHESTS) {
    const x = (rnd() - 0.5) * 300;
    const z = (rnd() - 0.5) * 300;
    
    if (Math.hypot(x, z) < 25) continue;
    if (islands.some(i => Math.hypot(i.x - x, i.z - z) < i.r + 5)) continue;
    if (chests.some(c => Math.hypot(c.x - x, c.z - z) < 25)) continue;
    
    const node = new BABYLON.TransformNode('c', scene);
    const b = flat(BABYLON.MeshBuilder.CreateBox('b', { width: 1.1, height: 0.6, depth: 0.7 }, scene));
    b.material = chestMat; b.position.set(0, 0, 0); b.parent = node;
    
    const lid = flat(BABYLON.MeshBuilder.CreateBox('lid', { width: 1.15, height: 0.25, depth: 0.75 }, scene));
    lid.material = beamMat; lid.position.set(0, 0.42, 0); lid.parent = node;
    
    const beam = flat(BABYLON.MeshBuilder.CreateCylinder('beam', { diameter: 0.6, height: 16, tessellation: 8 }, scene));
    beam.material = beamMat; beam.position.set(0, 8, 0); beam.isPickable = false; beam.parent = node;
    
    chests.push({ x, z, node, ph: rnd() * 6 });
  }
  
  return chests;
}

export function updateChests(chests, st, waveFunc, t, dt, say, sfx, updHud, save, onWin, onScore) {
  let near = null, nd = 1e9;
  if (!chests || !chests.length) return { near, nd };

  for (let idx = chests.length - 1; idx >= 0; idx--) {
    const c = chests[idx];
    c.node.position.set(c.x, waveFunc(c.x, c.z, t) + 0.5 + Math.sin(t * 2 + c.ph) * 0.1, c.z);
    c.node.rotation.y += dt * 0.8;
    
    const d = Math.hypot(c.x - st.x, c.z - st.z);
    if (d < nd) { nd = d; near = c; }
    
    if (st.run && !st.won && d < 3.4) {
      c.node.dispose();
      chests.splice(idx, 1);
      st.got++;
      st.gold += 10;
      updHud();
      if (onScore) onScore(st.got);
      sfx('coin');
      save();
      say('Captain Mara', CAPTAIN_LINES[st.got % CAPTAIN_LINES.length], 2600);
      if (st.got >= TOTAL_CHESTS) onWin();
      else st.waveT = 1.6;
    }
  }
  
  return { near, nd };
}