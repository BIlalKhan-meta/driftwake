// Driftwake - World Generation (Islands, Treasure, Foam)


import { createMaterial, flat } from './engine.js';
import { GAME_CONFIG, COLORS, CAPTAIN_LINES } from './config.js';
import { wave } from './water.js';

const { SEA_SIZE, ISLAND_COUNT, TOTAL_CHESTS } = GAME_CONFIG;
const { water: wCol } = COLORS;

export function createIslands(scene, rnd) {
  // Materials with lighting enabled (natural day/night response)
  const sandMat = createMaterial(scene, '#f2d9a0'); // Sand color
  const grassMat = createMaterial(scene, '#4f9d5d'); // Green grass
  const trunkMat = createMaterial(scene, '#8a5a35'); // Tree trunks
  const leafMat = createMaterial(scene, '#2f7d4f'); // Tree leaves
  
  const islands = [];
  
  for (let n = 0; islands.length < ISLAND_COUNT && n < 400; n++) {
    const x = (rnd() - 0.5) * 320;
    const z = (rnd() - 0.5) * 320;
    const r = 7 + rnd() * 8;
    
    if (Math.hypot(x, z) < 40 + r) continue;
    if (islands.some(o => Math.hypot(o.x - x, o.z - z) < o.r + r + 22)) continue;
    
    islands.push({ x, z, r });
    
    // Island base - sand sitting in water
    const s = flat(BABYLON.MeshBuilder.CreateSphere('i', { diameter: r * 2, segments: 8 }, scene));
    s.material = sandMat; s.scaling.y = 0.3; s.position.set(x, -0.2, z);
    
    // Grass top - green
    const g = flat(BABYLON.MeshBuilder.CreateSphere('g', { diameter: r * 1.4, segments: 7 }, scene));
    g.material = grassMat; g.scaling.y = 0.35; g.position.set(x, r * 0.15, z);
    
    // Trees
    const trees = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < trees; k++) {
      const a = rnd() * 6.28;
      const d = rnd() * r * 0.45;
      const tx = x + Math.cos(a) * d;
      const tz = z + Math.sin(a) * d;
      const th = 3 + rnd() * 2;
      
      const tr = BABYLON.MeshBuilder.CreateCylinder('t', { diameterTop: 0.3, diameterBottom: 0.5, height: th, tessellation: 6 }, scene);
      tr.material = trunkMat; tr.position.set(tx, r * 0.35 + th / 2 - 0.4, tz);
      
      const lf = flat(BABYLON.MeshBuilder.CreateSphere('l', { diameter: 3.4, segments: 6 }, scene));
      lf.material = leafMat; lf.scaling.y = 0.45; lf.position.set(tx, r * 0.4 + th - 0.3, tz);
    }
    
    // Subtle shallow water around island base - prevents floating look without Saturn rings
    const shallowWater = BABYLON.MeshBuilder.CreateDisc('sw', { radius: r * 1.35, tessellation: 16 }, scene);
    shallowWater.material = createMaterial(scene, '#012240', '#012240');
    shallowWater.material.disableLighting = true;
    shallowWater.material.alpha = 0.4;
    shallowWater.rotation.x = Math.PI / 2;
    shallowWater.position.set(x, -0.1, z);
    shallowWater.isPickable = false;
  }
  
  return islands;
}

export function updateIslandFoam(islands, t, waveFunc) {
  // No foam rings - islands sit directly in water
}

export function spawnChests(scene, rnd, islands, existingChests = []) {
  // Dispose old
  existingChests.forEach(c => c.node.dispose());
  
  const chestMat = createMaterial(scene, '#b5651d');
  chestMat.disableLighting = true;
  const beamMat = createMaterial(scene, '#ffc857', '#ffc857');
  beamMat.disableLighting = true;
  beamMat.alpha = 0.2; // Reduced shine
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
    
    const beam = flat(BABYLON.MeshBuilder.CreateCylinder('beam', { diameter: 0.5, height: 14, tessellation: 8 }, scene));
    beam.material = beamMat; beam.position.set(0, 7, 0); beam.isPickable = false; beam.parent = node;
    
    chests.push({ x, z, node, ph: rnd() * 6 });
  }
  
  return chests;
}

export function updateChests(chests, st, waveFunc, t, dt, say, sfx, updHud, save, onWin, onScore, onQuestProgress, spawnSparkles) {
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
      
      // Quest progress for treasure
      if (spawnSparkles) spawnSparkles(c.x, waveFunc(c.x, c.z, t) + 0.5, c.z);
      if (onQuestProgress) onQuestProgress('treasure', 1);
      
      if (st.got >= TOTAL_CHESTS) onWin();
      else st.waveT = 1.6;
    }
  }
  
  return { near, nd };
}
