// Driftwake - Water System (Sea mesh + custom shader)


import { GAME_CONFIG, COLORS } from './config.js';

const { SEA_SIZE, SEA_DIVISIONS } = GAME_CONFIG;
const CELL = SEA_SIZE / SEA_DIVISIONS;

export function createWater(scene, camera, skyColor, fogDensity) {
  // Base mesh
  const sea = BABYLON.MeshBuilder.CreateGround('sea', {
    width: SEA_SIZE,
    height: SEA_SIZE,
    subdivisions: SEA_DIVISIONS,
    updatable: true,
  }, scene);
  
  // Simple immediate material (visible while shader compiles)
  const simpleMat = new BABYLON.StandardMaterial('seaSimple', scene);
  simpleMat.diffuseColor = new BABYLON.Color3(0.2, 0.65, 0.8);
  simpleMat.specularColor = BABYLON.Color3.Black();
  simpleMat.backFaceCulling = false;
  sea.material = simpleMat;
  
  // Custom shader material
  const seaMat = new BABYLON.ShaderMaterial('seaM', scene, 'sea', {
    attributes: ['position', 'normal'],
    uniforms: ['world', 'worldViewProjection', 'time', 'camPos', 'fogCol', 'fogD', 'dayK', 'ripplePos', 'rippleTime'],
  });
  
  seaMat.setColor3('fogCol', skyColor);
  seaMat.setFloat('fogD', fogDensity);
  seaMat.setFloat('time', 0);
  seaMat.setFloat('dayK', 1);
  seaMat.setVector3('camPos', camera.position);
  seaMat.setVector3('ripplePos', new BABYLON.Vector3(0, 0, 0));
  seaMat.setFloat('rippleTime', 0);
  
  // Swap when compiled, with fallback timeout
  seaMat.onCompiled = () => {
    if (sea.material === simpleMat) sea.material = seaMat;
  };
  setTimeout(() => {
    if (sea.material === simpleMat) sea.material = seaMat;
  }, 500);
  
  // Vertex data for wave deformation
  const positions = sea.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  const basePositions = positions.slice();
  const indices = sea.getIndices();
  const normals = sea.getVerticesData(BABYLON.VertexBuffer.NormalKind);
  
  return { sea, seaMat, positions, basePositions, indices, normals, CELL };
}

// Wave function - matches original exactly
export function wave(x, z, t) {
  const place = Math.sin(x * 0.03) * Math.cos(z * 0.03);
  return Math.sin(x * 0.09 + t * 0.55) * (0.6 + place * 0.45) +
         Math.sin(z * 0.11 + t * 0.45) * (0.5 + place * 0.35) +
         Math.sin((x + z) * 0.055 + t * 0.35) * 0.4 +
         Math.sin(x * 0.35 + z * 0.3 + t * 1.4) * 0.08 +
         Math.sin(x * 0.16 - z * 0.13 + t * 0.72) * 0.28;
}

export function updateWater(sea, seaMat, positions, basePositions, indices, normals, CELL, camera, shipX, shipZ, t) {
  // Recenter sea grid under ship
  const cx = Math.round(shipX / CELL) * CELL;
  const cz = Math.round(shipZ / CELL) * CELL;
  sea.position.set(cx, 0, cz);
  
  seaMat.setFloat('time', t);
  seaMat.setVector3('camPos', camera.position);
  seaMat.setVector3('ripplePos', new BABYLON.Vector3(shipX, 0, shipZ));
  seaMat.setFloat('rippleTime', t);
  
  // Deform vertices
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 1] = wave(basePositions[i] + cx, basePositions[i + 2] + cz, t);
  }
  
  BABYLON.VertexData.ComputeNormals(positions, indices, normals);
  sea.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
  sea.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
}