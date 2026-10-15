// 飲料工場ラインの3Dシーン（実写風の背景写真の代わり）。three.js で描き、ブラウザで静止画にする。
// センサ配置は技術的に正しく作る：コンベアの片側に投光・受光一体のセンサ、反対側の同じ高さに反射板。どちらもボトル下部の高さ。
// 人物は描かない（人物は実際の社員の写真を使う想定）。
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {BokehPass} from 'three/examples/jsm/postprocessing/BokehPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';

const W = 1920;
const H = 1080;
const shot = new URLSearchParams(location.search).get('shot') || 'factory-line';

const renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#cfd6dd');
scene.fog = new THREE.Fog('#cfd6dd', 6, 22);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// ───── 材質
const steel = new THREE.MeshStandardMaterial({color: '#c9cdd2', metalness: 1, roughness: 0.22});
const steelBrushed = new THREE.MeshStandardMaterial({color: '#b8bdc3', metalness: 0.95, roughness: 0.38});
const belt = new THREE.MeshStandardMaterial({color: '#4b525b', metalness: 0.1, roughness: 0.55});
const floor = new THREE.MeshStandardMaterial({color: '#8d969f', metalness: 0.1, roughness: 0.18});
const wall = new THREE.MeshStandardMaterial({color: '#dfe4e9', roughness: 0.9});
const blackPlastic = new THREE.MeshStandardMaterial({color: '#1b1d20', metalness: 0.2, roughness: 0.45});
const lens = new THREE.MeshPhysicalMaterial({color: '#0a0c10', metalness: 0, roughness: 0.05, clearcoat: 1});
const pet = new THREE.MeshPhysicalMaterial({color: '#ffffff', metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.004, ior: 1.57, transparent: true, opacity: 1, specularIntensity: 1});
const water = new THREE.MeshPhysicalMaterial({color: '#e7f3fa', metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.06, ior: 1.33, attenuationColor: new THREE.Color('#cfe6f2'), attenuationDistance: 0.6});
const cap = new THREE.MeshStandardMaterial({color: '#f4f6f8', roughness: 0.4});
const redLed = new THREE.MeshStandardMaterial({color: '#ff2030', emissive: '#ff2030', emissiveIntensity: 3});
const greenLed = new THREE.MeshStandardMaterial({color: '#38d36a', emissive: '#38d36a', emissiveIntensity: 2.5});
const orangeLed = new THREE.MeshStandardMaterial({color: '#ffb020', emissive: '#ffb020', emissiveIntensity: 2.5});

// 反射板（プリズム状の模様）
const reflTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#7a0c12';
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16)
    for (let x = 0; x < 256; x += 16) {
      const o = (y / 16) % 2 ? 8 : 0;
      g.fillStyle = (x + y) % 32 ? '#c21d27' : '#e8323c';
      g.beginPath();
      g.moveTo(x + o, y);
      g.lineTo(x + o + 8, y + 8);
      g.lineTo(x + o, y + 16);
      g.lineTo(x + o - 8, y + 8);
      g.fill();
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const reflector = new THREE.MeshPhysicalMaterial({map: reflTex, metalness: 0.2, roughness: 0.15, clearcoat: 1});

// ───── 寸法（m）。コンベアは x 方向、手前が +z
const TOP = 0.86; // ベルト上面の高さ
const BW = 0.11; // ベルト幅（ボトル1列）
const LEN = 9;
const R = 0.033; // ボトル半径（500mL）
const BH = 0.205;
const DETECT = 0.03; // 検出高さ：ボトル下部（底から約3cm）

const add = (m: THREE.Object3D) => (scene.add(m), m);
const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return add(m);
};
const rod = (len: number, r: number, mat: THREE.Material, x: number, y: number, z: number, axis: 'x' | 'y' | 'z') => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24), mat);
  if (axis === 'x') m.rotation.z = Math.PI / 2;
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return add(m);
};

// 床・壁
const fl = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floor);
fl.rotation.x = -Math.PI / 2;
fl.receiveShadow = true;
add(fl);
const wl = new THREE.Mesh(new THREE.PlaneGeometry(40, 8), wall);
wl.position.set(0, 4, -4.5);
add(wl);

// コンベア（ステンレスのフレーム・ベルト・ガイドレール）
const conveyor = (z: number, len = LEN, x0 = 0) => {
  box(len, 0.02, BW, belt, x0, TOP - 0.01, z);
  box(len, 0.09, 0.02, steel, x0, TOP - 0.05, z + BW / 2 + 0.01);
  box(len, 0.09, 0.02, steel, x0, TOP - 0.05, z - BW / 2 - 0.01);
  // ガイドレール（ボトルの胴の高さ。下部は空けて、センサの光が通るようにする）
  for (const side of [1, -1]) {
    for (const h of [0.085, 0.15]) rod(len, 0.006, steel, x0, TOP + h, z + side * (R + 0.01), 'x');
    for (let x = -len / 2 + 0.3; x < len / 2; x += 0.9) {
      rod(0.2, 0.006, steelBrushed, x0 + x, TOP + 0.08, z + side * (R + 0.045), 'y');
      rod(0.035, 0.005, steelBrushed, x0 + x, TOP + 0.15, z + side * (R + 0.028), 'z');
      rod(0.035, 0.005, steelBrushed, x0 + x, TOP + 0.085, z + side * (R + 0.028), 'z');
    }
  }
  for (let x = -len / 2 + 0.2; x < len / 2; x += 1.2) {
    for (const side of [1, -1]) box(0.04, TOP - 0.1, 0.04, steelBrushed, x0 + x, (TOP - 0.1) / 2, z + side * 0.09);
    box(0.04, 0.03, 0.22, steelBrushed, x0 + x, 0.25, z);
  }
};

// PETボトル（500mL）
const bottleGeo = (() => {
  const p: THREE.Vector2[] = [];
  const pts: [number, number][] = [
    [0.0, 0.0], [0.018, 0.0], [0.026, 0.004], [0.031, 0.012], [R, 0.022], [R, 0.06], [R - 0.002, 0.07], [R, 0.08], [R, 0.135], [0.03, 0.15],
    [0.022, 0.168], [0.0135, 0.182], [0.012, 0.186], [0.012, 0.19], [0.0145, 0.191], [0.0145, 0.193], [0.012, 0.194], [0.012, BH - 0.0],
  ];
  for (const [r, y] of pts) p.push(new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(p, 64);
})();
const waterGeo = (() => {
  const p: THREE.Vector2[] = [];
  const pts: [number, number][] = [[0, 0.003], [0.017, 0.003], [0.025, 0.006], [0.03, 0.013], [R - 0.0015, 0.022], [R - 0.0015, 0.135], [0.029, 0.148], [0, 0.148]];
  for (const [r, y] of pts) p.push(new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(p, 48);
})();
const bottle = (x: number, z: number, tilt = 0, tiltZ = 0) => {
  const g = new THREE.Group();
  const b = new THREE.Mesh(bottleGeo, pet);
  const w = new THREE.Mesh(waterGeo, water);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.018, 32), cap);
  c.position.y = BH + 0.007;
  b.castShadow = true;
  c.castShadow = true;
  g.add(w, b, c);
  g.position.set(x, TOP, z);
  g.rotation.z = tilt;
  g.rotation.x = tiltZ;
  return add(g);
};

// 光電センサ（投光・受光一体）。face は光を出す向き（+1：奥へ、-1：手前へ）
const sensor = (x: number, z: number, face: 1 | -1) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.034), blackPlastic);
  body.castShadow = true;
  const l = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.03, 0.002), lens);
  l.position.set(0, -0.004, (-face * 0.034) / 2 - -face * 0.001);
  l.position.z = face * 0.0175;
  const led1 = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.003, 0.004), redLed);
  led1.position.set(-0.004, 0.026, -face * 0.008);
  const led2 = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.003, 0.004), greenLed);
  led2.position.set(0.004, 0.026, -face * 0.008);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.06, 12), blackPlastic);
  cable.position.set(0, -0.055, -face * 0.012);
  g.add(body, l, led1, led2, cable);
  // 取付金具（L字・ステンレス）
  const br = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.05), steelBrushed);
  br.position.set(0, -0.027, -face * 0.02);
  g.add(br);
  g.position.set(x, TOP + DETECT, z);
  return add(g);
};
const reflectorAt = (x: number, z: number) => {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.008), blackPlastic);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.032, 0.042), reflector);
  face.position.z = 0.0045;
  const br = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.04), steelBrushed);
  br.position.set(0, -0.027, -0.02);
  g.add(frame, face, br);
  g.position.set(x, TOP + DETECT, z);
  return add(g);
};

// 背景の設備（充填機・ステンレスの筐体・配管・タンク）
const backdrop = () => {
  for (let i = -4; i <= 4; i++) {
    box(1.4, 1.9, 0.8, i % 2 ? steelBrushed : new THREE.MeshStandardMaterial({color: '#5d6874', metalness: 0.4, roughness: 0.4}), i * 1.8, 0.95, -2.6);
    box(1.2, 0.5, 0.02, new THREE.MeshPhysicalMaterial({color: '#cfe0ea', transmission: 0.6, roughness: 0.1}), i * 1.8, 1.4, -2.19);
  }
  for (const x of [-6, -3.5, 4.5, 7]) {
    rod(2.6, 0.45, steel, x, 1.3, -3.6, 'y');
  }
  rod(20, 0.05, steel, 0, 2.6, -2.2, 'x');
  rod(20, 0.035, steel, 0, 2.75, -2.25, 'x');
  // 天井の照明
  for (let x = -8; x <= 8; x += 2.2) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.2), new THREE.MeshStandardMaterial({color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 2}));
    lamp.position.set(x, 3.6, -0.5);
    add(lamp);
  }
};

// 制御盤（PLC）
const plcPanel = () => {
  box(1.2, 1.8, 0.4, new THREE.MeshStandardMaterial({color: '#dfe3e7', metalness: 0.3, roughness: 0.5}), 0, 0.9, -0.2);
  box(1.08, 1.66, 0.02, new THREE.MeshStandardMaterial({color: '#f3f5f7', roughness: 0.7}), 0, 0.92, 0.0);
  // DINレールとモジュール
  for (const [y, n] of [[1.45, 10], [1.05, 8]] as [number, number][]) {
    box(0.96, 0.035, 0.01, steelBrushed, 0, y, 0.02);
    for (let i = 0; i < n; i++) {
      const x = -0.44 + i * 0.075;
      box(0.065, 0.12, 0.08, new THREE.MeshStandardMaterial({color: i === 0 ? '#2b2f35' : '#e7e9ec', roughness: 0.5}), x, y, 0.06);
      for (let k = 0; k < 4; k++) box(0.006, 0.006, 0.004, [greenLed, orangeLed, greenLed, redLed][(i + k) % 4 === 3 && i % 3 ? 1 : (i + k) % 3 === 0 ? 0 : 2], x - 0.02 + k * 0.013, y + 0.04, 0.101);
    }
    box(0.98, 0.06, 0.06, new THREE.MeshStandardMaterial({color: '#9aa3ad', roughness: 0.6}), 0, y - 0.13, 0.04);
  }
  for (let i = 0; i < 12; i++) box(0.012, 0.25, 0.012, new THREE.MeshStandardMaterial({color: ['#2a62c9', '#e3c341', '#c93a2a'][i % 3], roughness: 0.6}), -0.4 + i * 0.07, 0.62, 0.05);
  box(0.3, 0.2, 0.04, blackPlastic, 0.75, 1.3, 0.05);
};

// ───── ライト
const hemi = new THREE.HemisphereLight('#ffffff', '#7d8792', 0.35);
scene.environmentIntensity = 1.25;
add(hemi);
const key = new THREE.DirectionalLight('#fff8ee', 2.6);
key.position.set(-2, 6, 4);
key.castShadow = true;
key.shadow.mapSize.set(4096, 4096);
key.shadow.camera.left = -4;
key.shadow.camera.right = 4;
key.shadow.camera.top = 3;
key.shadow.camera.bottom = -3;
key.shadow.radius = 6;
key.shadow.bias = -0.0004;
add(key);

const camera = new THREE.PerspectiveCamera(30, W / H, 0.01, 60);

// ───── 撮影ごとの配置
const rowBottles = (z: number, spacing = 0.085, from = -4.2, to = 4.2, jitter = 0) => {
  for (let x = from, i = 0; x < to; x += spacing, i++) {
    const j = jitter ? Math.sin(i * 12.9898) * jitter : 0;
    bottle(x + j, z);
  }
};

if (shot === 'factory-line') {
  backdrop();
  conveyor(0);
  rowBottles(0, 0.09);
  sensor(0.6, 0.075, -1);
  reflectorAt(0.6, -0.075);
  camera.position.set(-1.25, 1.12, 0.62);
  camera.lookAt(1.2, 0.93, -0.05);
  camera.fov = 32;
} else if (shot === 'sensor-side') {
  backdrop();
  conveyor(0);
  rowBottles(0, 0.11, -3, 3);
  // 手前（+z）にセンサ：光は奥へ。奥（-z）に反射板：手前を向く
  sensor(0.0, BW / 2 + 0.035, -1);
  const r = reflectorAt(0.0, -BW / 2 - 0.03);
  r.rotation.y = 0;
  camera.position.set(0.32, TOP + 0.09, 0.42);
  camera.lookAt(0.02, TOP + 0.045, -0.02);
  camera.fov = 38;
} else if (shot === 'line-wobble') {
  backdrop();
  conveyor(0);
  const xs = [-1.2, -1.1, -0.98, -0.91, -0.84, -0.7, -0.52, -0.45, -0.38, -0.2, -0.05, 0.03, 0.1, 0.28, 0.42, 0.5, 0.66];
  xs.forEach((x, i) => bottle(x, (i % 3) * 0.004 - 0.004, (i % 4 === 1 ? 0.12 : i % 5 === 2 ? -0.09 : 0.02 * Math.sin(i)), i % 3 === 0 ? 0.05 : -0.03));
  sensor(-0.3, BW / 2 + 0.035, -1);
  reflectorAt(-0.3, -BW / 2 - 0.03);
  camera.position.set(0.55, TOP + 0.12, 0.62);
  camera.lookAt(-0.3, TOP + 0.08, 0);
  camera.fov = 36;
} else if (shot === 'demo-rig') {
  backdrop();
  conveyor(0, 3);
  rowBottles(0, 0.1, -1.45, 1.45);
  // 2台とも同じ側（手前）・同じ高さ。反射板はそれぞれの真向かい
  sensor(-0.2, BW / 2 + 0.035, -1);
  reflectorAt(-0.2, -BW / 2 - 0.03);
  sensor(0.15, BW / 2 + 0.035, -1);
  reflectorAt(0.15, -BW / 2 - 0.03);
  // ノートPC（画面は空白）
  const lap = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.015, 0.24), new THREE.MeshStandardMaterial({color: '#3a3f46', metalness: 0.6, roughness: 0.3}));
  const scr = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.01), new THREE.MeshStandardMaterial({color: '#3a3f46', metalness: 0.6, roughness: 0.3}));
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.19), new THREE.MeshStandardMaterial({color: '#dfe7ee', emissive: '#dfe7ee', emissiveIntensity: 0.6}));
  scr.position.set(0, 0.11, -0.12);
  scr.rotation.x = -0.25;
  disp.position.set(0, 0.11, -0.113);
  disp.rotation.x = -0.25;
  lap.add(base, scr, disp);
  lap.position.set(0.85, 1.0, 0.45);
  lap.rotation.y = -0.5;
  add(lap);
  box(0.6, 0.98, 0.5, steelBrushed, 0.85, 0.49, 0.45);
  camera.position.set(-0.75, TOP + 0.32, 0.95);
  camera.lookAt(0.05, TOP + 0.04, 0);
  camera.fov = 34;
} else if (shot === 'plc-panel') {
  scene.fog = new THREE.Fog('#e9edf1', 3, 12);
  backdrop();
  plcPanel();
  camera.position.set(0.35, 1.15, 1.6);
  camera.lookAt(0, 1.15, 0);
  camera.fov = 40;
} else if (shot === 'recount') {
  backdrop();
  conveyor(0);
  rowBottles(0, 0.075, -4.2, -0.6);
  // 止めたラインの横に、数え直すためのケースとボトル、記録用紙
  box(0.9, 0.86, 0.6, steelBrushed, 0.6, 0.43, 0.7);
  const crate = new THREE.MeshStandardMaterial({color: '#2e6fb6', roughness: 0.6});
  box(0.4, 0.12, 0.3, crate, 0.45, 0.92, 0.7);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const b = bottle(0.33 + i * 0.075, 0.62 + j * 0.075);
    b.position.y = 0.875;
  }
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.004, 0.3), new THREE.MeshStandardMaterial({color: '#fbfbf8', roughness: 0.9}));
  paper.position.set(0.88, 0.862, 0.72);
  paper.rotation.y = 0.2;
  add(paper);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.006, 0.32), new THREE.MeshStandardMaterial({color: '#7a5a3a', roughness: 0.7}));
  board.position.set(0.88, 0.859, 0.72);
  board.rotation.y = 0.2;
  add(board);
  camera.position.set(1.7, 1.55, 1.9);
  camera.lookAt(0.2, 0.9, 0.2);
  camera.fov = 34;
}
camera.updateProjectionMatrix();
const FOCUS: Record<string, [number, number]> = {'factory-line': [2.6, 0.006], 'sensor-side': [0.42, 0.02], 'line-wobble': [0.95, 0.012], 'demo-rig': [1.15, 0.01], 'plc-panel': [1.6, 0.006], recount: [2.2, 0.006]};
const [focus, aperture] = FOCUS[shot] ?? [2, 0.006];
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new BokehPass(scene, camera, {focus, aperture, maxblur: 0.012}));
composer.addPass(new OutputPass());
composer.render();
(window as unknown as {done: boolean}).done = true;
