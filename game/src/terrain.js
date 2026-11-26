// Langit Biru — island terrain, sea, sky, clouds, runway and scenery.
// The island is a heightfield: rolling hills from fractal noise, a radial
// falloff into the sea, a flat beach shelf for the runway, and a rocky
// mountain ridge on the far side. Terrain colours are painted per vertex
// from height and slope: sand, grass, rock, snow.

import { fractalNoise, clamp, smoothstep, lerp } from './noise.js';

export const ISLAND_RADIUS = 520;
export const SEA_LEVEL = 0;
export const RUNWAY_POS = { x: 40, z: 150 };
export const RUNWAY_HEADING = -0.35;

// Height of the ground at a world (x, z). The flight model and the mesh
// both call this one function, so collisions always match what you see.
export function groundHeight(x, z) {
  const dist = Math.hypot(x, z);
  const falloff = 1 - smoothstep(ISLAND_RADIUS * 0.72, ISLAND_RADIUS * 1.05, dist);
  let h = fractalNoise(x * 0.006 + 11.3, z * 0.006 + 7.1, 4);
  h = Math.pow(h, 1.6) * 46;
  // Rocky ridge to the north-east for a recognisable mountain backdrop.
  const ridge = fractalNoise(x * 0.012 + 3.7, z * 0.012 + 9.2, 3);
  const ridgeMask = smoothstep(120, 320, x) * smoothstep(60, 260, -z);
  h += Math.pow(ridge, 2.2) * 62 * ridgeMask;
  h *= falloff;
  // Flatten a shelf around the runway so takeoffs and landings are fair,
  // plus a flat corridor along the takeoff path to the southern beach,
  // so a fresh takeoff never meets a hill before it can climb.
  const runwayDist = Math.hypot(x - RUNWAY_POS.x, z - RUNWAY_POS.z);
  const flat = 1 - smoothstep(55, 130, runwayDist);
  const axisX = Math.sin(RUNWAY_HEADING);
  const axisZ = Math.cos(RUNWAY_HEADING);
  const along = (x - RUNWAY_POS.x) * axisX + (z - RUNWAY_POS.z) * axisZ;
  const across = Math.abs((x - RUNWAY_POS.x) * axisZ - (z - RUNWAY_POS.z) * axisX);
  const corridor = (1 - smoothstep(55, 95, across)) * (1 - smoothstep(220, 320, along)) * smoothstep(-140, -60, along);
  h = lerp(h, 2.4, Math.max(flat, corridor));
  // Beaches dip gently into the sea at the island edge.
  if (dist > ISLAND_RADIUS * 0.86) h = lerp(h, -1.5, smoothstep(ISLAND_RADIUS * 0.86, ISLAND_RADIUS, dist));
  return h;
}

function makeGroundTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  // Speckle gives the terrain a fine grain up close instead of flat colour.
  for (let i = 0; i < 5200; i++) {
    const shade = 205 + Math.floor(Math.random() * 50);
    g.fillStyle = 'rgba(' + shade + ',' + shade + ',' + (shade - 12) + ',0.35)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  for (let i = 0; i < 260; i++) {
    g.fillStyle = 'rgba(120,140,90,0.10)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 5, 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(48, 48);
  return tex;
}

function makeWaveTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    g.beginPath();
    const y = Math.random() * 128;
    g.moveTo(0, y);
    for (let x = 0; x <= 128; x += 16) g.lineTo(x, y + Math.sin(x * 0.2 + i) * 4);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  return tex;
}

function makeCloudTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 128);
  for (let i = 0; i < 22; i++) {
    const x = 30 + Math.random() * 196;
    const y = 45 + Math.random() * 40;
    const r = 18 + Math.random() * 30;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return new THREE.CanvasTexture(c);
}

function makeRunwayTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#33373d';
  g.fillRect(0, 0, 256, 512);
  g.fillStyle = '#3d4148';
  for (let i = 0; i < 900; i++) g.fillRect(Math.random() * 256, Math.random() * 512, 2, 2);
  // Centre dashes.
  g.fillStyle = '#f5f5e8';
  for (let y = 16; y < 512; y += 48) g.fillRect(124, y, 8, 26);
  // Threshold bars at both ends.
  for (let y of [10, 486]) {
    for (let x = 28; x < 228; x += 28) g.fillRect(x, y, 16, 14);
  }
  // Runway numbers.
  g.fillStyle = '#f5f5e8';
  g.font = 'bold 44px sans-serif';
  g.textAlign = 'center';
  g.fillText('09', 128, 90);
  g.save();
  g.translate(128, 440);
  g.rotate(Math.PI);
  g.fillText('27', 0, 0);
  g.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

function paintTerrainColors(geometry) {
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const sand = [0.86, 0.78, 0.55];
  const grass = [0.32, 0.55, 0.25];
  const grassDry = [0.55, 0.6, 0.28];
  const rock = [0.45, 0.42, 0.4];
  const snow = [0.94, 0.95, 0.97];
  const tmp = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Slope from a small finite difference of the height function.
    const slope = Math.abs(groundHeight(x + 4, z) - y) + Math.abs(groundHeight(x, z + 4) - y);
    const steep = clamp(slope / 7, 0, 1);
    let r, g, b;
    if (y < 2.6) {
      [r, g, b] = sand;
    } else if (y < 16) {
      const t = smoothstep(2.6, 16, y);
      const n = fractalNoise(x * 0.05, z * 0.05, 2);
      r = lerp(lerp(sand[0], grass[0], t), grassDry[0], n * 0.45);
      g = lerp(lerp(sand[1], grass[1], t), grassDry[1], n * 0.45);
      b = lerp(lerp(sand[2], grass[2], t), grassDry[2], n * 0.45);
    } else if (y < 38) {
      const n = fractalNoise(x * 0.05 + 4, z * 0.05, 2);
      r = lerp(grass[0], grassDry[0], n * 0.5);
      g = lerp(grass[1], grassDry[1], n * 0.5);
      b = lerp(grass[2], grassDry[2], n * 0.5);
    } else {
      const t = smoothstep(38, 62, y);
      r = lerp(rock[0], snow[0], t);
      g = lerp(rock[1], snow[1], t);
      b = lerp(rock[2], snow[2], t);
    }
    // Steep ground shows rock whatever its height.
    r = lerp(r, rock[0], steep * 0.7);
    g = lerp(g, rock[1], steep * 0.7);
    b = lerp(b, rock[2], steep * 0.7);
    tmp.set(r, g, b);
    colors[i * 3] = tmp.x;
    colors[i * 3 + 1] = tmp.y;
    colors[i * 3 + 2] = tmp.z;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

export function buildTerrain(scene) {
  const size = 1500;
  const seg = 150;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, groundHeight(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  paintTerrainColors(geo);
  const mat = new THREE.MeshStandardMaterial({
    map: makeGroundTexture(),
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

export function buildSea(scene) {
  const tex = makeWaveTexture();
  const mat = new THREE.MeshPhongMaterial({
    color: 0x1c6f9e,
    specular: 0x99ddff,
    shininess: 140,
    map: tex,
    transparent: true,
    opacity: 0.94,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(5200, 5200), mat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = SEA_LEVEL;
  sea.receiveShadow = true;
  scene.add(sea);
  return { mesh: sea, texture: tex };
}

export function buildSky(scene) {
  const geo = new THREE.SphereGeometry(2400, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x2f7fd0) },
      mid: { value: new THREE.Color(0x9cc8e8) },
      low: { value: new THREE.Color(0xf6e3b8) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low; void main(){ float h = normalize(vP).y; vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.65, h)) : mix(low, mid, smoothstep(-0.08, 0.12, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  const dome = new THREE.Mesh(geo, mat);
  scene.add(dome);

  // Sun disc high in the west, warm and bright.
  const sunCanvas = document.createElement('canvas');
  sunCanvas.width = 128;
  sunCanvas.height = 128;
  const sg = sunCanvas.getContext('2d');
  const grad = sg.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,246,200,1)');
  grad.addColorStop(0.35, 'rgba(255,214,120,0.9)');
  grad.addColorStop(1, 'rgba(255,200,90,0)');
  sg.fillStyle = grad;
  sg.fillRect(0, 0, 128, 128);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(sunCanvas),
    depthWrite: false,
    fog: false,
  }));
  sun.position.set(-1400, 520, -900);
  sun.scale.set(420, 420, 1);
  scene.add(sun);
  return dome;
}

export function buildClouds(scene) {
  const tex = makeCloudTexture();
  const group = new THREE.Group();
  const clouds = [];
  for (let i = 0; i < 30; i++) {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.75 + Math.random() * 0.2, depthWrite: false });
    const s = new THREE.Sprite(mat);
    const angle = Math.random() * Math.PI * 2;
    const radius = 150 + Math.random() * 900;
    s.position.set(Math.cos(angle) * radius, 130 + Math.random() * 110, Math.sin(angle) * radius);
    const w = 140 + Math.random() * 220;
    s.scale.set(w, w * 0.42, 1);
    s.userData.drift = 1.2 + Math.random() * 1.6;
    group.add(s);
    clouds.push(s);
  }
  scene.add(group);
  return clouds;
}

export function buildRunway(scene) {
  const group = new THREE.Group();
  const y = groundHeight(RUNWAY_POS.x, RUNWAY_POS.z) + 0.25;
  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 230),
    new THREE.MeshStandardMaterial({ map: makeRunwayTexture(), roughness: 0.9 })
  );
  strip.rotation.x = -Math.PI / 2;
  strip.rotation.z = RUNWAY_HEADING;
  strip.position.set(RUNWAY_POS.x, y, RUNWAY_POS.z);
  strip.receiveShadow = true;
  group.add(strip);

  // Windsock on a pole beside the threshold.
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.6 })
  );
  pole.position.set(RUNWAY_POS.x + 22, y + 6, RUNWAY_POS.z + 78);
  pole.castShadow = true;
  group.add(pole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 7, 10, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xff6a2a, side: THREE.DoubleSide, roughness: 0.7 })
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(RUNWAY_POS.x + 25.5, y + 11, RUNWAY_POS.z + 78);
  sock.castShadow = true;
  group.add(sock);

  // A few white edge lights along the strip.
  const lightGeo = new THREE.SphereGeometry(0.45, 8, 8);
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2b0, emissiveIntensity: 1.4 });
  for (let side of [-1, 1]) {
    for (let d = -100; d <= 100; d += 25) {
      const lamp = new THREE.Mesh(lightGeo, lightMat);
      const along = d;
      const px = RUNWAY_POS.x + Math.sin(RUNWAY_HEADING) * along + Math.cos(RUNWAY_HEADING) * side * 14;
      const pz = RUNWAY_POS.z + Math.cos(RUNWAY_HEADING) * along - Math.sin(RUNWAY_HEADING) * side * 14;
      lamp.position.set(px, groundHeight(px, pz) + 0.6, pz);
      group.add(lamp);
    }
  }
  scene.add(group);
  return { group, sock, stripY: y };
}

export function buildScenery(scene) {
  const group = new THREE.Group();
  const treeSpots = [];
  let guard = 0;
  while (treeSpots.length < 320 && guard < 6000) {
    guard++;
    const x = (Math.random() - 0.5) * 1000;
    const z = (Math.random() - 0.5) * 1000;
    const h = groundHeight(x, z);
    if (h < 4 || h > 34) continue;
    if (Math.hypot(x - RUNWAY_POS.x, z - RUNWAY_POS.z) < 95) continue;
    treeSpots.push({ x, z, h, s: 0.8 + Math.random() * 0.9 });
  }
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 3.2, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 });
  const leafGeo = new THREE.ConeGeometry(2.6, 7.5, 7);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeSpots.length);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, treeSpots.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  treeSpots.forEach((t, i) => {
    e.set(0, Math.random() * Math.PI * 2, 0);
    q.setFromEuler(e);
    sc.set(t.s, t.s, t.s);
    v.set(t.x, t.h + 1.6 * t.s, t.z);
    m.compose(v, q, sc);
    trunks.setMatrixAt(i, m);
    v.set(t.x, t.h + (3.2 + 3.4) * t.s, t.z);
    m.compose(v, q, sc);
    leaves.setMatrixAt(i, m);
  });
  trunks.castShadow = true;
  leaves.castShadow = true;
  group.add(trunks);
  group.add(leaves);

  // Small harbour town near the runway: houses with pitched roofs.
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf2e8d5, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xc65a3a, roughness: 0.8 });
  const wallMat2 = new THREE.MeshStandardMaterial({ color: 0xdfe9f2, roughness: 0.85 });
  const houseSpots = [
    [86, 96, 0.4], [104, 112, -0.3], [72, 122, 1.1], [118, 84, 0.9],
    [62, 78, -0.6], [132, 128, 0.2], [96, 150, 1.5], [48, 108, 0.0],
  ];
  for (const [hx, hz, rot] of houseSpots) {
    const hy = groundHeight(hx, hz);
    const house = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(9, 5.5, 8), Math.random() > 0.5 ? wallMat : wallMat2);
    walls.position.y = 2.75;
    walls.castShadow = true;
    walls.receiveShadow = true;
    house.add(walls);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.8, 3.6, 4), roofMat);
    roof.position.y = 7.3;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);
    house.position.set(hx, hy, hz);
    house.rotation.y = rot;
    group.add(house);
  }
  scene.add(group);
  return group;
}

export function buildLights(scene) {
  const hemi = new THREE.HemisphereLight(0xbfdfff, 0x5d7a4a, 0.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1cf, 1.35);
  sun.position.set(-320, 420, -260);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -420;
  sun.shadow.camera.right = 420;
  sun.shadow.camera.top = 420;
  sun.shadow.camera.bottom = -420;
  sun.shadow.camera.near = 50;
  sun.shadow.camera.far = 1400;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);
  return { hemi, sun };
}
