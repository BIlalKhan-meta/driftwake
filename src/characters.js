// Driftwake - Characters (Captain Mara, Pip, Old Tarn)


import { createMaterial, flat } from './engine.js';
import { COLORS } from './config.js';

function person(scene, opts, scale = 1) {
  const n = new BABYLON.TransformNode('p', scene);
  const { coat, skin, hat } = opts;
  
  const coatMat = createMaterial(scene, coat);
  const skinMat = createMaterial(scene, skin);
  const hatMat = createMaterial(scene, hat);
  const darkMat = createMaterial(scene, '#1a1a1a');
  
  const bd = flat(BABYLON.MeshBuilder.CreateCapsule('bd', { radius: 0.36, height: 1.5 }, scene));
  bd.material = coatMat; bd.position.set(0, 0.78, 0); bd.parent = n;
  
  const belt = flat(BABYLON.MeshBuilder.CreateCylinder('belt', { diameter: 0.76, height: 0.1, tessellation: 12 }, scene));
  belt.material = darkMat; belt.position.set(0, 0.6, 0); belt.parent = n;
  
  const hd = flat(BABYLON.MeshBuilder.CreateSphere('hd', { diameter: 0.62, segments: 8 }, scene));
  hd.material = skinMat; hd.position.set(0, 1.72, 0); hd.parent = n;
  
  const e1 = flat(BABYLON.MeshBuilder.CreateSphere('e1', { diameter: 0.09, segments: 4 }, scene));
  e1.material = darkMat; e1.position.set(-0.12, 1.76, 0.27); e1.parent = n;
  
  const e2 = flat(BABYLON.MeshBuilder.CreateSphere('e2', { diameter: 0.09, segments: 4 }, scene));
  e2.material = darkMat; e2.position.set(0.12, 1.76, 0.27); e2.parent = n;
  
  const brim = flat(BABYLON.MeshBuilder.CreateCylinder('brim', { diameter: 1, height: 0.05, tessellation: 14 }, scene));
  brim.material = hatMat; brim.position.set(0, 1.98, 0); brim.parent = n;
  
  const top = flat(BABYLON.MeshBuilder.CreateCylinder('top', { diameterTop: 0.42, diameterBottom: 0.56, height: 0.34, tessellation: 14 }, scene));
  top.material = hatMat; top.position.set(0, 2.16, 0); top.parent = n;
  
  const la = flat(BABYLON.MeshBuilder.CreateBox('la', { width: 0.15, height: 0.7, depth: 0.15 }, scene));
  la.material = coatMat; la.position.set(-0.43, 1.0, 0); la.parent = n;
  
  const arm = new BABYLON.TransformNode('arm', scene);
  arm.parent = n; arm.position.set(0.43, 1.3, 0);
  
  const ra = flat(BABYLON.MeshBuilder.CreateBox('ra', { width: 0.15, height: 0.7, depth: 0.15 }, scene));
  ra.material = coatMat; ra.position.set(0, -0.3, 0); ra.parent = arm;
  
  const hand = flat(BABYLON.MeshBuilder.CreateSphere('hand', { diameter: 0.17, segments: 4 }, scene));
  hand.material = skinMat; hand.position.set(0, -0.68, 0); hand.parent = arm;
  
  n.scaling.setAll(scale);
  return { n, arm };
}

export function createCaptain(scene, body) {
  const captain = person(scene, { coat: '#1d4e6b', skin: '#c68642', hat: '#e4572e' }, 0.85);
  captain.n.parent = body;
  captain.n.position.set(0, 0.97, -1.1);
  return captain;
}

export function createPip(scene) {
  const pip = new BABYLON.TransformNode('pip', scene);
  
  const body = flat(BABYLON.MeshBuilder.CreateSphere('pb', { diameter: 0.55, segments: 6 }, scene));
  body.material = createMaterial(scene, '#2ec4b6');
  body.scaling.z = 1.5; body.parent = pip;
  
  const head = flat(BABYLON.MeshBuilder.CreateSphere('ph', { diameter: 0.34, segments: 6 }, scene));
  head.material = createMaterial(scene, '#2ec4b6');
  head.position.set(0, 0.15, 0.42); head.parent = pip;
  
  const beak = flat(BABYLON.MeshBuilder.CreateCylinder('bk', { diameterTop: 0, diameterBottom: 0.14, height: 0.25, tessellation: 6 }, scene));
  beak.material = createMaterial(scene, '#ffc857', '#6b4b00');
  beak.position.set(0, 0.12, 0.65); beak.rotation.x = Math.PI / 2; beak.parent = pip;
  
  const tail = flat(BABYLON.MeshBuilder.CreateBox('tl', { width: 0.18, height: 0.04, depth: 0.45 }, scene));
  tail.material = createMaterial(scene, '#e4572e');
  tail.position.set(0, 0, -0.55); tail.parent = pip;
  
  const wingMat = createMaterial(scene, '#1f9e92');
  function mkWing(side) {
    const w = new BABYLON.TransformNode('w', scene);
    w.parent = pip; w.position.set(side * 0.18, 0.08, 0);
    const wg = flat(BABYLON.MeshBuilder.CreateBox('wg', { width: 0.8, height: 0.04, depth: 0.35 }, scene));
    wg.material = wingMat; wg.position.set(side * 0.4, 0, 0); wg.parent = w;
    return w;
  }
  
  const wingL = mkWing(-1);
  const wingR = mkWing(1);
  
  return { pip, wingL, wingR };
}

export function createTarn(scene, x, y, z) {
  const tarn = person(scene, { coat: '#d98e04', skin: '#8d5524', hat: '#e8d28a' }, 1.2);
  tarn.x = x;
  tarn.y = y;
  tarn.z = z;
  tarn.n.position.set(x, y, z);
  return tarn;
}

export function updateCharacters(captain, pip, tarn, shipX, shipZ, shipH, waveFunc, t, st, say) {
  const fx = st.fx || Math.sin(shipH);
  const fz = st.fz || Math.cos(shipH);
  const wy = waveFunc(shipX, shipZ, t);
  const dt = st.dt || 0;
  
  // Captain arm wave when collecting
  if (st.waveT > 0) st.waveT -= dt;
  captain.arm.rotation.z = st.waveT > 0 ? 2.5 + Math.sin(t * 12) * 0.35 : 0.15;
  
  // Pip circles ship
  pip.pipA += dt * 1.1;
  pip.pip.position.set(shipX + Math.cos(pip.pipA) * 7 + fx * 5, wy + 7 + Math.sin(t * 2) * 0.6, shipZ + Math.sin(pip.pipA) * 7 + fz * 5);
  pip.pip.rotation.y = Math.atan2(-Math.sin(pip.pipA), Math.cos(pip.pipA));
  pip.wingL.rotation.z = Math.sin(t * 16) * 0.7;
  pip.wingR.rotation.z = -pip.wingL.rotation.z;
  
  // Tarn waves from island
  tarn.n.rotation.y = Math.atan2(shipX - tarn.x, shipZ - tarn.z);
  tarn.arm.rotation.z = 2.5 + Math.sin(t * 6) * 0.4;
  
  // Tarn encounter trigger
  const td = Math.hypot(tarn.x - shipX, tarn.z - shipZ);
  if (td < 28 && !st.tarnSeen && st.run) {
    st.tarnSeen = true;
    say('Old Tarn', 'Ahoy, sailor! Follow the golden beams to the chests!', 4200);
  }
  if (td > 70) st.tarnSeen = false;
}