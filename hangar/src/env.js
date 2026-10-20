// Sovereign Hangar — hangar environment: floor, walls, lights, atmosphere

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { makeConcreteTexture } from "./lib.js";

export function buildEnvironment(scene, renderer, opts) {
  const { isMobile } = opts;

  scene.background = new THREE.Color(0x04060a);
  scene.fog = new THREE.FogExp2(0x04060a, 0.052);

  // Image-based lighting for PBR materials (bundled, generated at runtime).
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.035);
  scene.environment = envRT.texture;
  pmrem.dispose();

  // ---- Floor: polished concrete over a soft reflector -------------------
  const floorGroup = new THREE.Group();
  floorGroup.name = "floor";

  let reflector = null;
  if (!isMobile) {
    // Low-res planar mirror under a semi-opaque concrete skin = believable
    // soft reflection without post-processing. Disabled on mobile GPUs.
    reflector = new Reflector(new THREE.CircleGeometry(9, 48), {
      textureWidth: 1024,
      textureHeight: 1024,
      color: 0x4a525a,
      clipBias: 0.003
    });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = 0.001;
    floorGroup.add(reflector);
  }

  const concrete = makeConcreteTexture();
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x191d22,
    roughness: 0.38,
    metalness: 0.12,
    envMapIntensity: 0.5,
    roughnessMap: concrete
  });
  if (reflector) floorMat.transparent = true, floorMat.opacity = 0.8;

  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 48), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = reflector ? 0.012 : 0.002;
  floor.receiveShadow = !isMobile;
  floor.name = "floor-surface";
  floorGroup.add(floor);

  // Faint cyan light pool around the pedestal (fakes spill cheaply)
  const spillCanvas = document.createElement("canvas");
  spillCanvas.width = spillCanvas.height = 256;
  const sctx = spillCanvas.getContext("2d");
  const grad = sctx.createRadialGradient(128, 128, 6, 128, 128, 128);
  grad.addColorStop(0, "rgba(70,200,230,0.34)");
  grad.addColorStop(0.5, "rgba(40,120,150,0.10)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 256, 256);
  const spillTex = new THREE.CanvasTexture(spillCanvas);
  const spill = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 6.4),
    new THREE.MeshBasicMaterial({
      map: spillTex, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.9
    })
  );
  spill.rotation.x = -Math.PI / 2;
  spill.position.y = 0.02;
  floorGroup.add(spill);

  scene.add(floorGroup);

  // ---- Walls: near-black hangar shell fading into fog -------------------
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x0a0d11,
    roughness: 0.92,
    metalness: 0.05,
    side: THREE.BackSide,
    envMapIntensity: 0.12
  });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 9, 40, 1, true), wallMat);
  shell.position.y = 4.5;
  scene.add(shell);

  // Ceiling: flat BackSide disc. Visible from below, culled from above,
  // so it can never occlude downward sightlines to the exhibit.
  const ceiling = new THREE.Mesh(new THREE.CircleGeometry(13, 40), wallMat);
  ceiling.rotation.x = -Math.PI / 2; // normal faces up; BackSide shows underside
  ceiling.position.y = 8.4;
  scene.add(ceiling);

  // Structural ribs for depth (barely visible in fog)
  const ribMat = new THREE.MeshStandardMaterial({
    color: 0x11151a, roughness: 0.8, metalness: 0.4, envMapIntensity: 0.15
  });
  for (let i = 0; i < 8; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.28, 9, 0.28), ribMat);
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    rib.position.set(Math.cos(a) * 12.2, 4.5, Math.sin(a) * 12.2);
    scene.add(rib);
  }

  // ---- Lighting rig ------------------------------------------------------
  const key = new THREE.SpotLight(0xf2f7ff, 4.3, 0, 0.55, 0.9, 0);
  key.position.set(0.6, 7.6, 1.4);
  key.target.position.set(0, 0.8, 0);
  if (!isMobile) {
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.radius = 4;
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 14;
  }
  scene.add(key, key.target);

  const rimCyan = new THREE.DirectionalLight(0x35e0ff, 1.05);
  rimCyan.position.set(-4.2, 2.4, -4.6);
  scene.add(rimCyan);

  const amberAccent = new THREE.DirectionalLight(0xff9a4d, 0.42);
  amberAccent.position.set(4.6, 1.7, 3.6);
  scene.add(amberAccent);

  const hemi = new THREE.HemisphereLight(0x2a3742, 0x05070a, 0.62);
  scene.add(hemi);

  const underGlow = new THREE.PointLight(0x2fd8ff, 2.3, 5.2, 1.5);
  underGlow.position.set(0, 0.62, 0);
  scene.add(underGlow);

  // Soft front fill so the pedestal chamfer facets catch light
  const fill = new THREE.SpotLight(0xdfe9f2, 1.9, 0, 0.7, 0.95, 0);
  fill.position.set(3.4, 3.4, 4.6);
  fill.target.position.set(0, 0.35, 0);
  scene.add(fill, fill.target);

  return { dispose() { envRT.dispose(); concrete.dispose(); spillTex.dispose(); } };
}
