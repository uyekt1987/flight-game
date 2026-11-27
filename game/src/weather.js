// Langit Biru — golden-hour weather: low warm sun, drifting cloud layers,
// a distant storm cell with fine rain and lightning, slow wind gusts,
// and circling bird flocks. All procedural, zero external requests.
//
// API (agreed with the main.js wiring agent):
//   buildWeather(scene) -> { group, sunLight, sunDisc, clouds, storm, wind }
//   updateWeather(w, dt, time) -> void   (sets w.wind in -1..1)
//   buildBirds(scene)   -> { group, birds }
//   updateBirds(b, dt, time) -> void

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,248,220,1)');
  grad.addColorStop(0.3, 'rgba(255,214,120,0.95)');
  grad.addColorStop(0.65, 'rgba(255,160,80,0.35)');
  grad.addColorStop(1, 'rgba(255,150,70,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
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

export function buildWeather(scene) {
  const group = new THREE.Group();
  const glowTex = makeGlowTexture();
  const cloudTex = makeCloudTexture();

  // Sun light: reuse the directional light buildLights already placed in
  // the scene if there is one, so the scene never ends up with two suns.
  let sunLight = null;
  for (const child of scene.children) {
    if (child.isDirectionalLight) { sunLight = child; break; }
  }
  if (!sunLight) {
    sunLight = new THREE.DirectionalLight(0xffb36b, 1.5);
    sunLight.position.set(-420, 190, -300);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left = -420;
    sunLight.shadow.camera.right = 420;
    sunLight.shadow.camera.top = 420;
    sunLight.shadow.camera.bottom = -420;
    sunLight.shadow.camera.near = 50;
    sunLight.shadow.camera.far = 1400;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);
    scene.add(sunLight.target);
  }
  sunLight.color.setHex(0xffb36b);
  sunLight.position.set(-420, 190, -300);

  // Low sun disc on the western horizon + a wide warm glow around it.
  const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true, opacity: 1, depthWrite: false, fog: false,
  }));
  sunDisc.position.set(-1500, 150, -750);
  sunDisc.scale.set(480, 480, 1);
  group.add(sunDisc);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true, opacity: 0.45, depthWrite: false, fog: false,
  }));
  glow.position.copy(sunDisc.position);
  glow.scale.set(1150, 1150, 1);
  group.add(glow);

  // Two cloud layers: thin high cirrus + low warm cumulus, all drifting.
  const clouds = [];
  for (let i = 0; i < 8; i++) {
    const mat = new THREE.SpriteMaterial({
      map: cloudTex, color: 0xffd9c0, transparent: true,
      opacity: 0.3 + Math.random() * 0.15, depthWrite: false,
    });
    const s = new THREE.Sprite(mat);
    const a = Math.random() * Math.PI * 2;
    const r = 200 + Math.random() * 900;
    s.position.set(Math.cos(a) * r, 320 + Math.random() * 70, Math.sin(a) * r);
    const w = 420 + Math.random() * 260;
    s.scale.set(w, w * 0.1, 1);
    s.userData.drift = 0.8 + Math.random() * 0.8;
    s.userData.baseY = s.position.y;
    group.add(s);
    clouds.push(s);
  }
  for (let i = 0; i < 10; i++) {
    const mat = new THREE.SpriteMaterial({
      map: cloudTex, color: 0xffc9a0, transparent: true,
      opacity: 0.6 + Math.random() * 0.2, depthWrite: false,
    });
    const s = new THREE.Sprite(mat);
    const a = Math.random() * Math.PI * 2;
    const r = 180 + Math.random() * 800;
    s.position.set(Math.cos(a) * r, 150 + Math.random() * 80, Math.sin(a) * r);
    const w = 200 + Math.random() * 160;
    s.scale.set(w, w * 0.4, 1);
    s.userData.drift = 1.4 + Math.random() * 1.2;
    s.userData.baseY = s.position.y;
    group.add(s);
    clouds.push(s);
  }

  // One distant storm cell: dark cloud puffs, fine rain lines below,
  // and a lightning flash sprite that blinks at random.
  const stormGroup = new THREE.Group();
  stormGroup.position.set(-950, 210, 850);
  for (let i = 0; i < 4; i++) {
    const mat = new THREE.SpriteMaterial({
      map: cloudTex, color: 0x55556a, transparent: true,
      opacity: 0.8 + Math.random() * 0.15, depthWrite: false,
    });
    const s = new THREE.Sprite(mat);
    s.position.set((Math.random() - 0.5) * 260, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 120);
    s.scale.set(240 + Math.random() * 140, 110 + Math.random() * 50, 1);
    stormGroup.add(s);
  }
  const dropCount = 90;
  const rainPos = new Float32Array(dropCount * 6);
  const drops = [];
  for (let i = 0; i < dropCount; i++) {
    drops.push({
      x: (Math.random() - 0.5) * 300,
      y: Math.random() * 130,
      z: (Math.random() - 0.5) * 140,
      speed: 55 + Math.random() * 30,
    });
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({
    color: 0xaac4d8, transparent: true, opacity: 0.5,
  }));
  rain.position.y = -60;
  rain.frustumCulled = false;
  stormGroup.add(rain);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xdfe8ff, transparent: true, opacity: 0, depthWrite: false, fog: false,
  }));
  flash.position.set(0, -10, 0);
  flash.scale.set(320, 320, 1);
  stormGroup.add(flash);
  group.add(stormGroup);
  const storm = { group: stormGroup, rain, drops, flash, flashT: 0 };

  scene.add(group);
  return { group, sunLight, sunDisc, clouds, storm, wind: 0, glow };
}

export function updateWeather(w, dt, time) {
  // Slow wind gusts, -1..1, for the plane's drift and the windsock.
  w.wind = Math.max(-1, Math.min(1,
    Math.sin(time * 0.05) * 0.6 + Math.sin(time * 0.013 + 1.7) * 0.4));

  for (const c of w.clouds) {
    c.position.x += (c.userData.drift + w.wind * 3) * dt;
    if (c.position.x > 1200) c.position.x = -1200;
    if (c.position.x < -1200) c.position.x = 1200;
    c.position.y = c.userData.baseY + Math.sin(time * 0.05 + c.userData.drift * 4) * 3;
  }

  // Storm cell drifts slowly; rain falls and wraps.
  const st = w.storm;
  st.group.position.x += (1.0 + w.wind * 1.5) * dt;
  if (st.group.position.x > 1300) st.group.position.x = -1300;
  const pos = st.rain.geometry.attributes.position;
  for (let i = 0; i < st.drops.length; i++) {
    const d = st.drops[i];
    d.y -= d.speed * dt;
    if (d.y < 0) { d.y = 120 + Math.random() * 10; d.x = (Math.random() - 0.5) * 300; }
    pos.setXYZ(i * 2, d.x, d.y, d.z);
    pos.setXYZ(i * 2 + 1, d.x, d.y - 7, d.z);
  }
  pos.needsUpdate = true;
  // Lightning: rare random flash, fades over ~0.25 s.
  if (st.flashT <= 0 && Math.random() < dt * 0.12) st.flashT = 0.25;
  if (st.flashT > 0) {
    st.flashT -= dt;
    st.flash.material.opacity = Math.max(0, st.flashT / 0.25) * 0.85;
  } else {
    st.flash.material.opacity = 0;
  }

  // Sun breathing: barely-there intensity and glow pulse.
  w.sunLight.intensity = 1.45 + Math.sin(time * 0.02) * 0.06;
  const pulse = 1 + Math.sin(time * 0.3) * 0.012;
  w.sunDisc.scale.set(480 * pulse, 480 * pulse, 1);
  w.glow.scale.set(1150 * pulse, 1150 * pulse, 1);
}

export function buildBirds(scene) {
  const group = new THREE.Group();
  const birds = [];
  const wingGeo = new THREE.PlaneGeometry(1.9, 0.7);
  wingGeo.translate(0.95, 0, 0);
  const wingMat = new THREE.MeshBasicMaterial({ color: 0x2b2b33, side: THREE.DoubleSide });
  const bodyGeo = new THREE.ConeGeometry(0.18, 1.3, 5);
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0x2b2b33 });
  for (let i = 0; i < 9; i++) {
    const bird = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    bird.add(body);
    const wingL = new THREE.Group();
    const wingLm = new THREE.Mesh(wingGeo, wingMat);
    wingLm.rotation.x = -Math.PI / 2;
    wingL.add(wingLm);
    bird.add(wingL);
    const wingR = new THREE.Group();
    const wingRm = new THREE.Mesh(wingGeo, wingMat);
    wingRm.rotation.x = -Math.PI / 2;
    wingRm.rotation.y = Math.PI;
    wingR.add(wingRm);
    bird.add(wingR);
    bird.userData = {
      angle: (i / 9) * Math.PI * 2 + Math.random() * 0.5,
      radius: 180 + (i % 3) * 45 + Math.random() * 20,
      height: 70 + (i % 3) * 18 + Math.random() * 10,
      speed: 0.05 + Math.random() * 0.04,
      phase: Math.random() * Math.PI * 2,
      wingL,
      wingR,
    };
    group.add(bird);
    birds.push(bird);
  }
  scene.add(group);
  return { group, birds };
}

export function updateBirds(b, dt, time) {
  for (const bird of b.birds) {
    const u = bird.userData;
    u.angle += u.speed * dt;
    const a = u.angle;
    bird.position.set(
      Math.cos(a) * u.radius,
      u.height + Math.sin(time * 0.6 + u.phase) * 4,
      Math.sin(a) * u.radius
    );
    bird.rotation.y = -a;
    const flap = Math.sin(time * 7 + u.phase) * 0.55;
    u.wingL.rotation.z = flap;
    u.wingR.rotation.z = -flap;
  }
}
