// Langit Biru — island terrain, sea, sky, clouds, runway and scenery (v2).
// Golden-hour tropical island: a smoking volcano on the highest peak, a
// lighthouse with a sweeping beam, a waterfall, sea cliffs, a harbour with
// moving boats, 500 instanced trees, houses with lit windows, and a rope
// bridge between two offshore islets.
//
// groundHeight() is the single source of truth for the flight model — its
// maths are unchanged from v1. Every landmark is placed ON it, never by
// changing it. The sun disc itself lives in weather.js (buildWeather),
// so buildSky here only paints the golden-hour gradient dome.

import { fractalNoise, clamp, smoothstep, lerp } from './noise.js';

export const ISLAND_RADIUS = 520;
export const SEA_LEVEL = 0;
export const RUNWAY_POS = { x: 40, z: 150 };
export const RUNWAY_HEADING = -0.35;

// Height of the ground at a world (x, z). The flight model and the mesh
// both call this one function, so collisions always match what you see.
// DO NOT CHANGE the maths below: runway, rings and the plane depend on it.
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

// ---- landmark search (all read groundHeight, none change it) ----

let _peak = null;
function islandPeak() {
  if (_peak) return _peak;
  let best = { x: 260, z: -180, h: -1 };
  for (let x = 120; x <= 400; x += 8) {
    for (let z = -340; z <= -60; z += 8) {
      const h = groundHeight(x, z);
      if (h > best.h) best = { x, z, h };
    }
  }
  _peak = best;
  return best;
}

let _falls = null;
function waterfallSpot() {
  if (_falls) return _falls;
  let best = { x: 240, z: -160, slope: -1, h: 0 };
  for (let x = 140; x <= 380; x += 10) {
    for (let z = -320; z <= -80; z += 10) {
      const h = groundHeight(x, z);
      if (h < 24) continue;
      const slope = Math.abs(groundHeight(x + 6, z) - h) + Math.abs(groundHeight(x, z + 6) - h);
      if (slope > best.slope) best = { x, z, slope, h };
    }
  }
  // Downhill direction from the local gradient.
  const gx = groundHeight(best.x + 6, best.z) - groundHeight(best.x - 6, best.z);
  const gz = groundHeight(best.x, best.z + 6) - groundHeight(best.x, best.z - 6);
  const len = Math.hypot(gx, gz) || 1;
  best.downX = -gx / len;
  best.downZ = -gz / len;
  _falls = best;
  return best;
}

// ---- procedural canvas textures (zero external requests) ----

function makeGroundTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  // Fine sand-coloured grain.
  for (let i = 0; i < 5200; i++) {
    const shade = 205 + Math.floor(Math.random() * 50);
    g.fillStyle = 'rgba(' + shade + ',' + shade + ',' + (shade - 12) + ',0.35)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  // Grass flecks and darker earth patches for a richer read from the air.
  for (let i = 0; i < 420; i++) {
    g.fillStyle = 'rgba(110,140,80,0.12)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 6, 4);
  }
  for (let i = 0; i < 180; i++) {
    g.fillStyle = 'rgba(90,80,70,0.14)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 4, 4);
  }
  for (let i = 0; i < 120; i++) {
    g.fillStyle = 'rgba(200,170,110,0.16)';
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

function makePuffTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function makeFallTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 256);
  for (let i = 0; i < 26; i++) {
    const x = 4 + Math.random() * 56;
    const w = 2 + Math.random() * 4;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(1, 'rgba(210,235,255,0.75)');
    g.fillStyle = grad;
    g.fillRect(x, 0, w, 256);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ---- terrain mesh ----

function paintTerrainColors(geometry) {
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const sand = [0.88, 0.79, 0.55];
  const wetSand = [0.62, 0.52, 0.36];
  const grass = [0.30, 0.52, 0.24];
  const jungle = [0.16, 0.38, 0.16];
  const grassDry = [0.55, 0.6, 0.28];
  const rock = [0.45, 0.42, 0.4];
  const ash = [0.23, 0.21, 0.2];
  const snow = [0.94, 0.95, 0.97];
  const peak = islandPeak();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Slope from a small finite difference of the height function.
    const slope = Math.abs(groundHeight(x + 4, z) - y) + Math.abs(groundHeight(x, z + 4) - y);
    const steep = clamp(slope / 7, 0, 1);
    let r, g, b;
    if (y < 1.4) {
      // Wet sand band right at the waterline.
      const t = smoothstep(0.2, 1.4, y);
      r = lerp(wetSand[0], sand[0], t);
      g = lerp(wetSand[1], sand[1], t);
      b = lerp(wetSand[2], sand[2], t);
    } else if (y < 2.6) {
      [r, g, b] = sand;
    } else if (y < 16) {
      const t = smoothstep(2.6, 16, y);
      const n = fractalNoise(x * 0.05, z * 0.05, 2);
      const jungleMask = fractalNoise(x * 0.018 + 9, z * 0.018 + 3, 2);
      r = lerp(lerp(sand[0], grass[0], t), grassDry[0], n * 0.45);
      g = lerp(lerp(sand[1], grass[1], t), grassDry[1], n * 0.45);
      b = lerp(lerp(sand[2], grass[2], t), grassDry[2], n * 0.45);
      // Dark jungle patches in the lowlands.
      const jm = smoothstep(0.55, 0.75, jungleMask);
      r = lerp(r, jungle[0], jm * 0.7);
      g = lerp(g, jungle[1], jm * 0.7);
      b = lerp(b, jungle[2], jm * 0.7);
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
    // Volcanic ash darkens the ground around the crater.
    const ashMask = 1 - smoothstep(45, 95, Math.hypot(x - peak.x, z - peak.z));
    r = lerp(r, ash[0], ashMask * 0.85);
    g = lerp(g, ash[1], ashMask * 0.85);
    b = lerp(b, ash[2], ashMask * 0.85);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

export function buildTerrain(scene) {
  const size = 1500;
  const seg = 160;
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
    color: 0x14607f,
    specular: 0xffc98a,
    shininess: 160,
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
  // Golden-hour gradient dome. The sun disc + glow live in weather.js
  // (buildWeather) so the sky never shows two suns.
  const geo = new THREE.SphereGeometry(2400, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x2e4a7a) },
      mid: { value: new THREE.Color(0xff9e66) },
      low: { value: new THREE.Color(0xffd9a0) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low; void main(){ float h = normalize(vP).y; vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.65, h)) : mix(low, mid, smoothstep(-0.08, 0.12, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  const dome = new THREE.Mesh(geo, mat);
  scene.add(dome);
  return dome;
}

export function buildClouds(scene) {
  const tex = makeCloudTexture();
  const group = new THREE.Group();
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: 0xffe3c2,
      transparent: true,
      opacity: 0.55 + Math.random() * 0.3,
      depthWrite: false,
    });
    const s = new THREE.Sprite(mat);
    const angle = Math.random() * Math.PI * 2;
    const radius = 150 + Math.random() * 900;
    s.position.set(Math.cos(angle) * radius, 120 + Math.random() * 140, Math.sin(angle) * radius);
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

  // PAPI-style approach lights: two red, two white beside the threshold.
  const papiColors = [0xff2a1a, 0xff2a1a, 0xffffff, 0xffffff];
  for (let i = 0; i < 4; i++) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.9, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x222222, emissive: papiColors[i], emissiveIntensity: 2.2 })
    );
    const px = RUNWAY_POS.x + Math.cos(RUNWAY_HEADING) * (16 + i * 3.2) + Math.sin(RUNWAY_HEADING) * -92;
    const pz = RUNWAY_POS.z - Math.sin(RUNWAY_HEADING) * (16 + i * 3.2) + Math.cos(RUNWAY_HEADING) * -92;
    lamp.position.set(px, groundHeight(px, pz) + 0.7, pz);
    group.add(lamp);
  }

  // White edge lights along the strip.
  const lightGeo = new THREE.SphereGeometry(0.45, 8, 8);
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2b0, emissiveIntensity: 1.4 });
  for (let side of [-1, 1]) {
    for (let d = -100; d <= 100; d += 25) {
      const lamp = new THREE.Mesh(lightGeo, lightMat);
      const px = RUNWAY_POS.x + Math.sin(RUNWAY_HEADING) * d + Math.cos(RUNWAY_HEADING) * side * 14;
      const pz = RUNWAY_POS.z + Math.cos(RUNWAY_HEADING) * d - Math.sin(RUNWAY_HEADING) * side * 14;
      lamp.position.set(px, groundHeight(px, pz) + 0.6, pz);
      group.add(lamp);
    }
  }
  scene.add(group);
  return { group, sock, stripY: y };
}

export function buildScenery(scene) {
  const group = new THREE.Group();
  const peak = islandPeak();
  const falls = waterfallSpot();

  // ---------- Volcano on the highest peak ----------
  // Frustum cone sunk into the peak; top kept below y = 116.
  const coneH = Math.min(30, 116 - peak.h);
  const volcano = new THREE.Group();
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(13, 58, coneH, 24, 1),
    new THREE.MeshStandardMaterial({ color: 0x3a3230, roughness: 1 })
  );
  cone.position.y = coneH / 2 - 2;
  cone.castShadow = true;
  cone.receiveShadow = true;
  volcano.add(cone);
  const craterY = coneH - 2;
  const crater = new THREE.Mesh(
    new THREE.CircleGeometry(12, 20),
    new THREE.MeshStandardMaterial({ color: 0x1c1512, roughness: 1 })
  );
  crater.rotation.x = -Math.PI / 2;
  crater.position.y = craterY + 0.2;
  volcano.add(crater);
  const lava = new THREE.Mesh(
    new THREE.CircleGeometry(7.5, 18),
    new THREE.MeshBasicMaterial({ color: 0xff7a2a })
  );
  lava.rotation.x = -Math.PI / 2;
  lava.position.y = craterY + 0.45;
  volcano.add(lava);
  const lavaGlow = new THREE.PointLight(0xff6a22, 1.4, 170, 2);
  lavaGlow.position.y = craterY + 8;
  volcano.add(lavaGlow);
  // Basalt boulders ringing the base.
  const boulderGeo = new THREE.DodecahedronGeometry(5, 0);
  const boulderMat = new THREE.MeshStandardMaterial({ color: 0x2e2825, roughness: 1 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    const b = new THREE.Mesh(boulderGeo, boulderMat);
    const bx = Math.cos(a) * 58;
    const bz = Math.sin(a) * 58;
    b.position.set(bx, 1.5, bz);
    b.scale.setScalar(0.7 + Math.random() * 0.9);
    b.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    b.castShadow = true;
    volcano.add(b);
  }
  volcano.position.set(peak.x, peak.h, peak.z);
  group.add(volcano);

  // Rising smoke: shader-driven points, animated by uTime which is fed
  // from onBeforeRender so no main-loop hook is needed.
  const smokeCount = 90;
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(smokeCount * 3), 3));
  const seeds = new Float32Array(smokeCount);
  for (let i = 0; i < smokeCount; i++) seeds[i] = Math.random();
  smokeGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const smokeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uMap: { value: makePuffTexture() } },
    vertexShader: [
      'attribute float aSeed;',
      'uniform float uTime;',
      'varying float vFade;',
      'void main(){',
      '  float cycle = fract(uTime * (0.045 + aSeed * 0.05) + aSeed * 7.13);',
      '  vec3 p = position;',
      '  p.y += cycle * 62.0;',
      '  p.x += cycle * 26.0 + sin(cycle * 7.0 + aSeed * 40.0) * (1.5 + cycle * 10.0);',
      '  p.z += cos(cycle * 5.0 + aSeed * 31.0) * (1.5 + cycle * 9.0);',
      '  vFade = (1.0 - cycle) * smoothstep(0.0, 0.10, cycle);',
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  gl_PointSize = (30.0 + cycle * 90.0) * (200.0 / max(1.0, -mv.z));',
      '  gl_Position = projectionMatrix * mv;',
      '}',
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D uMap;',
      'varying float vFade;',
      'void main(){',
      '  vec4 tex = texture2D(uMap, gl_PointCoord);',
      '  gl_FragColor = vec4(vec3(0.62, 0.58, 0.55), tex.a * vFade * 0.55);',
      '}',
    ].join('\n'),
  });
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  smoke.position.set(peak.x, peak.h + craterY + 2, peak.z);
  smoke.frustumCulled = false;
  smoke.onBeforeRender = () => { smokeMat.uniforms.uTime.value = performance.now() / 1000; };
  group.add(smoke);

  // ---------- Lighthouse on a south-west headland ----------
  let lightX = -380;
  let lightZ = 240;
  let lightH = groundHeight(lightX, lightZ);
  for (let a = 0; a < Math.PI * 2; a += 0.15) {
    const x = Math.cos(a) * 440;
    const z = Math.sin(a) * 440;
    const h = groundHeight(x, z);
    if (h > 1.5 && h < 7) { lightX = x; lightZ = z; lightH = h; break; }
  }
  const lighthouse = new THREE.Group();
  const towerMatW = new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.7 });
  const towerMatR = new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.7 });
  for (let i = 0; i < 4; i++) {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4 - i * 0.35, 3.8 - i * 0.35, 5, 12),
      i % 2 === 0 ? towerMatW : towerMatR
    );
    band.position.y = 2.5 + i * 5;
    band.castShadow = true;
    lighthouse.add(band);
  }
  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 3, 10),
    new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.4, metalness: 0.4 })
  );
  lampRoom.position.y = 21.5;
  lighthouse.add(lampRoom);
  const lampBulb = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 })
  );
  lampBulb.position.y = 21.5;
  lighthouse.add(lampBulb);
  const lampLight = new THREE.PointLight(0xffd27a, 1.6, 180, 2);
  lampLight.position.y = 22;
  lighthouse.add(lampLight);
  const roofCap = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 2.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x8a2a20, roughness: 0.8 })
  );
  roofCap.position.y = 24.2;
  lighthouse.add(roofCap);
  // Rotating double beam: two additive cones, apex at the lamp.
  const beamGroup = new THREE.Group();
  beamGroup.position.y = 21.5;
  const beamGeo = new THREE.ConeGeometry(9, 190, 12, 1, true);
  beamGeo.rotateZ(Math.PI / 2);
  beamGeo.translate(95, 0, 0);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffe9a8, transparent: true, opacity: 0.22,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const beam1 = new THREE.Mesh(beamGeo, beamMat);
  beam1.rotation.z = -0.05;
  const beam2 = new THREE.Mesh(beamGeo, beamMat);
  beam2.rotation.y = Math.PI;
  beam2.rotation.z = -0.05;
  beamGroup.add(beam1);
  beamGroup.add(beam2);
  lighthouse.add(beamGroup);
  lighthouse.position.set(lightX, lightH, lightZ);
  group.add(lighthouse);
  // The lamp bulb is a rendered object, so its onBeforeRender fires every
  // frame and can spin the beam without any main-loop hook.
  lampBulb.onBeforeRender = () => { beamGroup.rotation.y = performance.now() / 1000 * 0.45; };

  // ---------- Waterfall down the steepest ridge slope ----------
  const fallTex = makeFallTexture();
  const fallH = 24;
  const fallTopX = falls.x;
  const fallTopZ = falls.z;
  const fallBaseX = falls.x + falls.downX * 14;
  const fallBaseZ = falls.z + falls.downZ * 14;
  const fallBaseH = groundHeight(fallBaseX, fallBaseZ);
  const fall = new THREE.Mesh(
    new THREE.PlaneGeometry(7, fallH),
    new THREE.MeshBasicMaterial({ map: fallTex, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })
  );
  fall.position.set(
    (fallTopX + fallBaseX) / 2,
    (falls.h + fallBaseH) / 2 + fallH / 2 - 4,
    (fallTopZ + fallBaseZ) / 2
  );
  fall.rotation.y = Math.atan2(falls.downX, falls.downZ);
  fall.rotation.x = -0.12;
  fall.onBeforeRender = () => { fallTex.offset.y = -(performance.now() / 1000) * 0.35; };
  group.add(fall);
  const foam = new THREE.Mesh(
    new THREE.CircleGeometry(6, 16),
    new THREE.MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.8 })
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(fallBaseX, fallBaseH + 0.4, fallBaseZ);
  group.add(foam);
  const mist = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makePuffTexture(), color: 0xdceeff, transparent: true, opacity: 0.5, depthWrite: false,
  }));
  mist.position.set(fallBaseX, fallBaseH + 4, fallBaseZ);
  mist.scale.set(16, 10, 1);
  group.add(mist);

  // ---------- Sea cliffs around the island edge ----------
  const cliffMat = new THREE.MeshStandardMaterial({ color: 0x4a4642, roughness: 1 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    const cx = Math.cos(a) * 480;
    const cz = Math.sin(a) * 480;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(13 + Math.random() * 9, 0), cliffMat);
    rock.position.set(cx, groundHeight(cx, cz) + 3, cz);
    rock.scale.y = 1.7;
    rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    rock.castShadow = true;
    group.add(rock);
  }

  // ---------- Harbour: pier + 3 boats sailing slow circles ----------
  const harbour = new THREE.Group();
  const harbourCX = 430;
  const harbourCZ = 420;
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.9 });
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const px = 358 + (400 - 358) * t;
    const pz = 349 + (390 - 349) * t;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.35, 2.2), pierMat);
    plank.position.set(px, 1.3, pz);
    plank.rotation.y = Math.atan2(42, 41);
    plank.castShadow = true;
    harbour.add(plank);
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 1 })
    );
    post.position.set(px, 0, pz);
    harbour.add(post);
  }
  const boatDefs = [
    { radius: 48, speed: 0.045, phase: 0.0, hull: 0xe8e2d4, sail: 0xd94f3d },
    { radius: 62, speed: -0.035, phase: 2.1, hull: 0x3a6ea5, sail: 0xf2e8d5 },
    { radius: 76, speed: 0.03, phase: 4.2, hull: 0xe8e2d4, sail: 0x2e8b6a },
  ];
  const boats = [];
  for (const def of boatDefs) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.1, 6),
      new THREE.MeshStandardMaterial({ color: def.hull, roughness: 0.7 })
    );
    hull.position.y = 0.4;
    hull.castShadow = true;
    boat.add(hull);
    const bow = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 2.4, 4),
      new THREE.MeshStandardMaterial({ color: def.hull, roughness: 0.7 })
    );
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.4, 3.9);
    boat.add(bow);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 6.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 1 })
    );
    mast.position.y = 3.8;
    boat.add(mast);
    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 5, 1, 1),
      new THREE.MeshStandardMaterial({ color: def.sail, side: THREE.DoubleSide, roughness: 0.85 })
    );
    sail.position.set(0, 4.2, -0.6);
    sail.castShadow = true;
    boat.add(sail);
    boat.userData = { angle: Math.random() * Math.PI * 2, radius: def.radius, speed: def.speed, phase: def.phase };
    boat.userData.hull = hull;
    harbour.add(boat);
    boats.push(boat);
  }
  harbour.userData.last = performance.now();
  // The first hull is rendered every frame, so its onBeforeRender can
  // drive all three boats without any main-loop hook.
  boats[0].userData.hull.onBeforeRender = () => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - harbour.userData.last) / 1000);
    harbour.userData.last = now;
    const t = now / 1000;
    for (const b of boats) {
      b.userData.angle += dt * b.userData.speed;
      const a = b.userData.angle;
      b.position.set(
        harbourCX + Math.cos(a) * b.userData.radius,
        0.5 + Math.sin(t * 0.9 + b.userData.phase) * 0.25,
        harbourCZ + Math.sin(a) * b.userData.radius
      );
      b.rotation.y = -a;
      b.rotation.z = Math.sin(t * 0.7 + b.userData.phase) * 0.04;
    }
  };
  group.add(harbour);

  // ---------- 500 instanced trees (trunks + canopies), some palms ----------
  const treeSpots = [];
  let guard = 0;
  while (treeSpots.length < 500 && guard < 12000) {
    guard++;
    const x = (Math.random() - 0.5) * 1000;
    const z = (Math.random() - 0.5) * 1000;
    const h = groundHeight(x, z);
    if (h < 4 || h > 34) continue;
    if (Math.hypot(x - RUNWAY_POS.x, z - RUNWAY_POS.z) < 95) continue;
    if (Math.hypot(x - peak.x, z - peak.z) < 75) continue;
    if (Math.hypot(x - falls.x, z - falls.z) < 25) continue;
    treeSpots.push({ x, z, h, s: 0.8 + Math.random() * 0.9, palm: Math.random() < 0.12 });
  }
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 3.2, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 });
  const leafGeo = new THREE.ConeGeometry(2.6, 7.5, 7);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeSpots.length);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, treeSpots.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const col = new THREE.Color();
  treeSpots.forEach((t, i) => {
    const tilt = t.palm ? 0.14 : 0;
    const tiltDir = Math.random() * Math.PI * 2;
    e.set(Math.sin(tiltDir) * tilt, Math.random() * Math.PI * 2, Math.cos(tiltDir) * tilt);
    q.setFromEuler(e);
    const trunkS = t.palm ? t.s * 1.5 : t.s;
    sc.set(t.palm ? t.s * 0.7 : t.s, trunkS, t.palm ? t.s * 0.7 : t.s);
    v.set(t.x, t.h + 1.6 * trunkS, t.z);
    m.compose(v, q, sc);
    trunks.setMatrixAt(i, m);
    if (t.palm) {
      sc.set(t.s * 2.3, t.s * 0.55, t.s * 2.3);
      v.set(t.x, t.h + (3.2 * trunkS + 0.6) * 1, t.z);
    } else {
      sc.set(t.s, t.s, t.s);
      v.set(t.x, t.h + (3.2 + 3.4) * t.s, t.z);
    }
    m.compose(v, q, sc);
    leaves.setMatrixAt(i, m);
    if (t.palm) col.setHex(0x4caf50);
    else col.setHex(Math.random() < 0.5 ? 0x2e7d32 : 0x558b2f).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
    leaves.setColorAt(i, col);
  });
  trunks.castShadow = true;
  leaves.castShadow = true;
  if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  group.add(trunks);
  group.add(leaves);

  // ---------- Harbour town: houses with warm lit windows ----------
  const wallMats = [
    new THREE.MeshStandardMaterial({ color: 0xf2e8d5, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0xdfe9f2, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0xf6d9a8, roughness: 0.85 }),
  ];
  const roofMats = [
    new THREE.MeshStandardMaterial({ color: 0xc65a3a, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0x2e7d6b, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0xd98e32, roughness: 0.8 }),
  ];
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffc06a });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.9 });
  const houseSpots = [
    [86, 96, 0.4], [104, 112, -0.3], [72, 122, 1.1], [118, 84, 0.9],
    [62, 78, -0.6], [132, 128, 0.2], [96, 150, 1.5], [48, 108, 0.0],
    [150, 100, 0.7], [58, 140, -1.2], [120, 160, 2.2], [84, 66, 1.9],
  ];
  for (const [hx, hz, rot] of houseSpots) {
    const hy = groundHeight(hx, hz);
    const house = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(9, 5.5, 8), wallMats[Math.floor(Math.random() * wallMats.length)]);
    walls.position.y = 2.75;
    walls.castShadow = true;
    walls.receiveShadow = true;
    house.add(walls);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.8, 3.6, 4), roofMats[Math.floor(Math.random() * roofMats.length)]);
    roof.position.y = 7.3;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1, 2.4, 1), new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 1 }));
    chimney.position.set(2.6, 8.2, -1.5);
    house.add(chimney);
    for (const wx of [-2.4, 2.4]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5), windowMat);
      win.position.set(wx, 3.1, 4.02);
      house.add(win);
    }
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.8), doorMat);
    door.position.set(0, 1.4, 4.02);
    house.add(door);
    house.position.set(hx, hy, hz);
    house.rotation.y = rot;
    group.add(house);
  }
  // One warm glow over the town so the lit windows read at golden hour.
  const townGlow = new THREE.PointLight(0xffb46a, 0.7, 110, 2);
  townGlow.position.set(95, groundHeight(95, 115) + 14, 115);
  group.add(townGlow);

  // ---------- Two offshore islets joined by a rope bridge ----------
  const isletMat = new THREE.MeshStandardMaterial({ color: 0x9a8a68, roughness: 1 });
  const isletGeo = new THREE.SphereGeometry(55, 14, 10);
  const islet1 = new THREE.Mesh(isletGeo, isletMat);
  islet1.scale.set(1, 0.22, 1);
  islet1.position.set(610, -3, -320);
  islet1.receiveShadow = true;
  group.add(islet1);
  const islet2 = new THREE.Mesh(isletGeo, isletMat);
  islet2.scale.set(1, 0.22, 0.85);
  islet2.position.set(720, -3, -190);
  islet2.receiveShadow = true;
  group.add(islet2);
  const miniTreeMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 });
  for (const [ix, iz] of [[600, -330], [622, -308], [712, -200], [730, -178]]) {
    const mini = new THREE.Mesh(new THREE.ConeGeometry(4, 11, 7), miniTreeMat);
    mini.position.set(ix, 10, iz);
    mini.castShadow = true;
    group.add(mini);
  }
  const bridgeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(648, 8, -288),
    new THREE.Vector3(676, 13, -262),
    new THREE.Vector3(694, 8, -228),
  ]);
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x8a6d3b, roughness: 0.9 });
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const p = bridgeCurve.getPoint(t);
    const tan = bridgeCurve.getTangent(t);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 4.2), plankMat);
    plank.position.copy(p);
    plank.rotation.y = Math.atan2(tan.x, tan.z);
    plank.castShadow = true;
    group.add(plank);
  }
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 });
  for (const side of [-1, 1]) {
    const railPts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const p = bridgeCurve.getPoint(t);
      const tan = bridgeCurve.getTangent(t);
      const nx = -tan.z;
      const nz = tan.x;
      railPts.push(new THREE.Vector3(p.x + nx * side * 2.1, p.y + 1.6, p.z + nz * side * 2.1));
    }
    const rail = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), 12, 0.14, 5),
      ropeMat
    );
    group.add(rail);
  }

  scene.add(group);
  group.userData = { peak, volcano, smoke, lighthouse, beamGroup, harbour, boats, falls };
  return group;
}

export function buildLights(scene) {
  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x51683f, 0.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb36b, 1.5);
  sun.position.set(-420, 190, -300);
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
