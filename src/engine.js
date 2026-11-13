// Driftwake - Engine & Scene Setup

import { GAME_CONFIG, COLORS } from './config.js';

export function createEngine(canvas) {
  const engine = new BABYLON.Engine(canvas, true, { adaptToDeviceRatio: true });
  const scene = new BABYLON.Scene(engine);
  
  const skyColor = BABYLON.Color3.FromHexString('#9fd8e0');
  scene.clearColor = skyColor.toColor4();
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogColor = skyColor;
  scene.fogDensity = 0.011;
  
  const camera = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0, 8, -16), scene);
  camera.minZ = 0.5;
  camera.maxZ = 500;
  
  const hemi = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0.3, 1, 0.2), scene);
  hemi.groundColor = new BABYLON.Color3(0.25, 0.4, 0.45);
  hemi.intensity = 0.4;
  hemi.specular = new BABYLON.Color3(0.3, 0.4, 0.5);
  
  const sun = new BABYLON.DirectionalLight('d', new BABYLON.Vector3(-0.5, -1, -0.3), scene);
  sun.intensity = 0.65;
  sun.specular = new BABYLON.Color3(1, 0.95, 0.8);
  
  const lamp = new BABYLON.PointLight('lamp', new BABYLON.Vector3(0, 3.2, -1.6), scene);
  lamp.diffuse = BABYLON.Color3.FromHexString('#ffc857');
  lamp.range = 32;
  lamp.intensity = 0;
  
  // Enable shadows
  const shadowGenerator = new BABYLON.ShadowGenerator(2048, sun);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurScale = 2;
  shadowGenerator.darkness = 0.4;
  
  return { 
    engine, 
    scene, 
    camera, 
    hemi, 
    sun, 
    lamp, 
    skyColor,
    shadowGenerator
  };
}

export function createMaterial(scene, hex, emissiveHex = null) {
  const m = new BABYLON.StandardMaterial('m', scene);
  m.diffuseColor = BABYLON.Color3.FromHexString(hex);
  m.specularColor = BABYLON.Color3.Black();
  m.specularPower = 32;
  if (emissiveHex) m.emissiveColor = BABYLON.Color3.FromHexString(emissiveHex);
  return m;
}

export function createPBRMaterial(scene, hex, options = {}) {
  const m = new BABYLON.PBRMaterial('pbr', scene);
  m.albedoColor = BABYLON.Color3.FromHexString(hex);
  m.metallic = options.metallic ?? 0.0;
  m.roughness = options.roughness ?? 0.8;
  m.environmentIntensity = options.envIntensity ?? 0.5;
  if (options.emissiveHex) {
    m.emissiveColor = BABYLON.Color3.FromHexString(options.emissiveHex);
  }
  return m;
}

export function flat(mesh) {
  mesh.convertToFlatShadedMesh();
  return mesh;
}

export function enableShadows(mesh, shadowGenerator) {
  if (shadowGenerator) {
    shadowGenerator.addShadowCaster(mesh, true);
    mesh.receiveShadows = true;
  }
}