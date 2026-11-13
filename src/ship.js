// Driftwake - Ship Entity & Controller


import { createMaterial, flat, enableShadows } from './engine.js';
import { COLORS } from './config.js';

export function createShip(scene, shadowGenerator = null) {
  const ship = new BABYLON.TransformNode('ship', scene);
  const body = new BABYLON.TransformNode('body', scene);
  body.parent = ship;
  
  const { wood, deck, cloth, red, gold } = COLORS.ship;
  const woodMat = createMaterial(scene, wood);
  const deckMat = createMaterial(scene, deck);
  const clothMat = createMaterial(scene, cloth);
  const redMat = createMaterial(scene, red);
  const goldMat = createMaterial(scene, gold, '#6b4b00');
  const ironMat = createMaterial(scene, '#2a2a2e');
  
  // Hull
  const hull = flat(BABYLON.MeshBuilder.CreateBox('hull', { width: 2.2, height: 0.9, depth: 4.4 }, scene));
  hull.material = woodMat; hull.position.set(0, 0.45, -0.2); hull.parent = body;
  if (shadowGenerator) enableShadows(hull, shadowGenerator);
  
  // Bow
  const bow = flat(BABYLON.MeshBuilder.CreateBox('bow', { width: 1.55, height: 0.9, depth: 1.55 }, scene));
  bow.material = woodMat; bow.position.set(0, 0.45, 2.0); bow.rotation.y = Math.PI / 4; bow.parent = body;
  
  // Deck
  const deckMesh = flat(BABYLON.MeshBuilder.CreateBox('deck', { width: 1.9, height: 0.1, depth: 4.2 }, scene));
  deckMesh.material = deckMat; deckMesh.position.set(0, 0.92, -0.2); deckMesh.parent = body;
  
  // Mast
  const mast = flat(BABYLON.MeshBuilder.CreateCylinder('mast', { diameter: 0.2, height: 5.2 }, scene));
  mast.material = woodMat; mast.position.set(0, 3.4, 0.2); mast.parent = body;
  
  // Sail
  const sail = flat(BABYLON.MeshBuilder.CreateBox('sail', { width: 3.2, height: 2.8, depth: 0.06 }, scene));
  sail.material = clothMat; sail.position.set(0, 3.6, 0.35); sail.parent = body;
  
  // Mark on sail
  const mark = flat(BABYLON.MeshBuilder.CreateDisc('mark', { radius: 0.55, tessellation: 24 }, scene));
  mark.material = redMat; mark.position.set(0, 3.6, 0.3); mark.parent = body;
  
  // Flag
  const flag = flat(BABYLON.MeshBuilder.CreateBox('flag', { width: 0.9, height: 0.45, depth: 0.05 }, scene));
  flag.material = redMat; flag.position.set(0.5, 5.7, 0.2); flag.parent = body;
  
  // Stern
  const stern = flat(BABYLON.MeshBuilder.CreateBox('stern', { width: 1.6, height: 0.7, depth: 0.9 }, scene));
  stern.material = woodMat; stern.position.set(0, 1.3, -2.2); stern.parent = body;
  
  // Port & starboard guns
  [-1, 1].forEach(side => {
    for (let i = -1; i <= 1; i++) {
      const gun = flat(BABYLON.MeshBuilder.CreateCylinder('gun', { diameter: 0.22, height: 0.9, tessellation: 8 }, scene));
      gun.material = ironMat;
      gun.position.set(side * 1.15, 1.05, i * 1.05);
      gun.rotation.z = side * Math.PI / 2;
      gun.parent = body;
    }
  });
  
  return { ship, body };
}

export function updateShipBuoyancy(body, shipX, shipZ, shipH, waveFunc, t) {
  const cr = Math.cos(shipH), sr = Math.sin(shipH);
  
  const hB = waveFunc(shipX + sr * 2.4, shipZ + cr * 2.4, t);
  const hS = waveFunc(shipX - sr * 2.4, shipZ - cr * 2.4, t);
  const hR = waveFunc(shipX + cr * 1.1, shipZ - sr * 1.1, t);
  const hL = waveFunc(shipX - cr * 1.1, shipZ + sr * 1.1, t);
  
  body.rotation.x = -Math.atan2(hB - hS, 4.8) * 1.3;
  body.rotation.z = Math.atan2(hR - hL, 2.2) * 1.3;
}