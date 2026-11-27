// Langit Biru — entry point: renderer, cameras, game loop and states.
// The island scene is alive behind the title screen from the first frame:
// an orbiting camera shows the runway, the town and the sea before the
// player clicks MULAI TERBANG. Chase and cockpit cameras follow the
// plane; the timer, lives and ring mission run while playing.
// Golden-hour weather, drifting clouds, birds and wind come from the
// weather system; the wind pushes the plane and is shown on the HUD.

import { buildTerrain, buildSea, buildSky, buildClouds, buildRunway, buildScenery, buildLights, groundHeight, RUNWAY_POS } from './terrain.js';
import { buildWeather, updateWeather, buildBirds, updateBirds } from './weather.js';
import { buildPlane, createFlightState, resetFlight, stepFlight, applyPlaneTransform } from './plane.js';
import { buildRings, createMission, resetMission, checkRing, updateRings, currentRing } from './rings.js';
import { createInput, bindInput, readSteering, readThrottle } from './input.js';
import { createEngineSound, startEngineSound, updateEngineSound, toggleMute, playRingChime } from './audio.js';
import { buildHud, buildCockpitPanel, buildOverlays, showToast, updateHud, updateCockpitPanel, updateRingArrow } from './hud.js';
import { parseShot, applyShot, markShotReady } from './shots.js';

const GAME_SECONDS = 150;
const START_LIVES = 3;
// Landing bonus: within this distance (m) of the runway centre, slow and
// on the ground, after all 8 rings — a perfect landing ends the mission.
const LANDING_RADIUS = 45;
const LANDING_MAX_SPEED = 12;
const LANDING_BONUS = 1000;

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc4d9ea, 420, 1750);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 5200);
camera.position.set(180, 90, 420);

buildLights(scene);
buildSky(scene);
buildTerrain(scene);
const sea = buildSea(scene);
const clouds = buildClouds(scene);
const runway = buildRunway(scene);
buildScenery(scene);
const weather = buildWeather(scene);
const birds = buildBirds(scene);
const plane = buildPlane(scene);
const rings = buildRings(scene);

const game = {
  state: 'title',
  flight: createFlightState(),
  mission: createMission(),
  timeLeft: GAME_SECONDS,
  lives: START_LIVES,
  cameraMode: 'chase',
  input: createInput(),
  sound: createEngineSound(),
  shot: parseShot(),
  shotFrames: 0,
};

buildHud();
buildCockpitPanel();
const overlays = buildOverlays(startGame);

function startGame() {
  startEngineSound(game.sound);
  resetFlight(game.flight);
  resetMission(game.mission);
  game.timeLeft = GAME_SECONDS;
  game.lives = START_LIVES;
  game.state = 'playing';
  overlays.title.classList.add('hidden');
  overlays.end.classList.add('hidden');
  showToast('Terbang! Lewati ring emas pertama.', 2400);
}

function endGame(title, text) {
  game.state = 'over';
  document.getElementById('end-title').textContent = title;
  document.getElementById('end-text').textContent = text;
  document.getElementById('end-score').textContent = String(game.mission.score);
  overlays.end.classList.remove('hidden');
}

function crashPlane() {
  game.lives -= 1;
  showToast(game.lives > 0 ? 'Tabrakan! Nyawa tersisa ' + game.lives : 'Tabrakan!', 2000);
  if (game.lives <= 0) {
    endGame('PESAWAT JATUH', 'Semua nyawa habis. Skor kamu ' + game.mission.score + ' poin.');
    return;
  }
  resetFlight(game.flight);
  game.flight.throttle = 0.55;
}

game.input.onCamera = () => {
  game.cameraMode = game.cameraMode === 'chase' ? 'cockpit' : 'chase';
  showToast(game.cameraMode === 'cockpit' ? 'Kamera kokpit' : 'Kamera chase', 900);
};
game.input.onRestart = () => { if (game.state !== 'title') startGame(); };
game.input.onPause = () => {
  if (game.state === 'playing') { game.state = 'paused'; showToast('Jeda — tekan P untuk lanjut', 1600); }
  else if (game.state === 'paused') { game.state = 'playing'; }
};
game.input.onMute = () => {
  const muted = toggleMute(game.sound);
  showToast(muted ? 'Suara mati' : 'Suara nyala', 900);
};
game.input.onAnyGesture = () => startEngineSound(game.sound);
bindInput(game.input, canvas);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Chase camera: behind and above the plane, eased so it never snaps.
const chaseOffset = new THREE.Vector3();
const chaseTarget = new THREE.Vector3();
function updateChaseCamera(dt) {
  const f = game.flight;
  const back = new THREE.Vector3(Math.sin(f.heading), 0, Math.cos(f.heading)).multiplyScalar(-22);
  chaseOffset.set(f.pos.x + back.x, f.pos.y + 6.5, f.pos.z + back.z);
  chaseTarget.lerp(chaseOffset, Math.min(1, dt * 5));
  camera.position.copy(chaseTarget);
  const look = new THREE.Vector3(f.pos.x, f.pos.y + 1, f.pos.z)
    .addScaledVector(new THREE.Vector3(Math.sin(f.heading), 0, Math.cos(f.heading)), 26);
  camera.lookAt(look);
  camera.rotation.z += f.roll * 0.12;
}

// Cockpit camera: at the pilot's seat, just above the nose so the
// propeller disc stays below the view and the terrain ahead is clear.
function updateCockpitCamera() {
  const f = game.flight;
  const forward = new THREE.Vector3(Math.sin(f.heading), 0, Math.cos(f.heading));
  const eye = f.pos.clone().addScaledVector(forward, 2.0);
  eye.y += 2.0;
  camera.position.copy(eye);
  const look = f.pos.clone().addScaledVector(forward, 40);
  look.y += Math.sin(f.pitch) * 18 - 1.0;
  camera.up.set(Math.sin(f.roll), Math.cos(f.roll), 0);
  camera.lookAt(look);
  camera.up.set(0, 1, 0);
}

// Slow orbit around the runway while the title screen is up.
function updateTitleCamera(time) {
  const a = time * 0.045;
  camera.position.set(Math.sin(a) * 260, 95 + Math.sin(time * 0.1) * 12, Math.cos(a) * 260);
  camera.lookAt(40, 12, 120);
}

let lastTime = performance.now();
let shotApplied = false;
let simAcc = 0;
const SIM_STEP = 1 / 60;

// One fixed physics step, so the game runs at real speed even when the
// renderer is slow (software rendering in headless Chrome, for example).
function stepGame(fixedDt) {
  readSteering(game.input);
  readThrottle(game.input, game.flight, fixedDt);
  const result = stepFlight(game.flight, game.input, fixedDt, game.mission.wind);
  game.timeLeft -= fixedDt;
  const perfectBefore = game.mission.perfect;
  const earned = checkRing(game.mission, rings, game.flight.pos);
  // A bonus gate banks +10 s into mission.timeBonus; apply it here.
  if (game.mission.timeBonus > 0) {
    game.timeLeft = Math.min(GAME_SECONDS + 30, game.timeLeft + game.mission.timeBonus);
    game.mission.timeBonus = 0;
    playRingChime(game.sound);
    showToast('GERBANG BONUS! +10 detik & +150 poin', 2200);
  } else if (game.mission.perfect > perfectBefore) {
    playRingChime(game.sound);
    showToast('SEMPURNA! +250 poin', 1800);
  } else if (earned > 0) {
    playRingChime(game.sound);
    showToast(earned >= 2000 ? 'PUTARAN SELESAI! +' + earned + ' poin' : 'Ring! +' + earned + ' poin', 1600);
  }
  // Perfect landing: all 8 rings done, then touch down slow on the
  // runway centre — +1000 and the mission ends in glory.
  if (game.mission.ringsCleared >= 8 && !game.mission.landingBonus
      && game.flight.onGround && game.flight.speed < LANDING_MAX_SPEED) {
    const dx = game.flight.pos.x - RUNWAY_POS.x;
    const dz = game.flight.pos.z - RUNWAY_POS.z;
    if (Math.hypot(dx, dz) < LANDING_RADIUS) {
      game.mission.landingBonus = true;
      game.mission.score += LANDING_BONUS;
      game.mission.bonus += LANDING_BONUS;
      endGame('MISI SELESAI!', 'Semua 8 ring dilewati + PENDARATAN SEMPURNA di runway (+1000). Skor kamu ' + game.mission.score + ' poin.');
      return;
    }
  }
  if (result === 'crashed') crashPlane();
  if (game.timeLeft <= 0) {
    game.timeLeft = 0;
    if (game.mission.ringsCleared >= 8) {
      endGame('MISI SELESAI!', 'Semua 8 ring dilewati. Skor kamu ' + game.mission.score + ' poin.');
    } else {
      endGame('WAKTU HABIS', 'Kamu melewati ' + game.mission.ringsCleared + ' dari 8 ring. Skor ' + game.mission.score + ' poin.');
    }
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.25, (now - lastTime) / 1000);
  lastTime = now;
  const time = now / 1000;

  // Clouds drift and the sea shimmers whether or not anyone is flying.
  for (const c of clouds) {
    c.position.x += c.userData.drift * dt;
    if (c.position.x > 1100) c.position.x = -1100;
  }
  sea.texture.offset.x += dt * 0.004;
  sea.texture.offset.y += dt * 0.0025;
  runway.sock.rotation.y = time * 0.7;

  // Golden-hour weather and birds run in every state, even the title.
  updateWeather(weather, dt, time);
  updateBirds(birds, dt, time);
  game.mission.wind = weather.wind || 0;

  if (!shotApplied && game.shot) {
    shotApplied = true;
    if (applyShot(game, game.shot)) {
      overlays.title.classList.add('hidden');
      overlays.end.classList.add('hidden');
    }
  }

  if (game.state === 'title') {
    updateTitleCamera(time);
    // The plane sits parked on the runway under the title card.
    game.flight.pos.set(40, groundHeight(40, 210) + 2.2, 210);
    game.flight.heading = -0.35;
    applyPlaneTransform(plane, game.flight);
  } else if (game.state === 'playing') {
    simAcc += dt;
    let steps = 0;
    while (simAcc >= SIM_STEP && steps < 15) {
      stepGame(SIM_STEP);
      simAcc -= SIM_STEP;
      steps++;
      if (game.state !== 'playing') break;
    }
    if (simAcc > SIM_STEP * 15) simAcc = 0;
    applyPlaneTransform(plane, game.flight);
    updateEngineSound(game.sound, game.flight.throttle, game.flight.speed, true);
    if (game.cameraMode === 'cockpit') updateCockpitCamera();
    else updateChaseCamera(dt);
  } else if (game.state === 'paused') {
    updateEngineSound(game.sound, 0, 0, false);
  } else {
    // Game over: keep the last view, plane parked where it stopped.
    updateEngineSound(game.sound, 0, 0, false);
  }

  updateRings(rings, game.mission, time, game.flight.pos);
  if (game.state === 'playing' || game.state === 'paused') {
    updateHud(game.flight, game.mission, game.timeLeft, game.lives, game.cameraMode, game.sound.muted);
    updateCockpitPanel(game.flight, game.mission, game.timeLeft, game.cameraMode);
    updateRingArrow(camera, currentRing(game.mission, rings).base, game.flight.pos);
  }

  renderer.render(scene, camera);

  if (game.shot && !window.__shotReady) {
    game.shotFrames++;
    if (game.shotFrames >= 8) markShotReady();
  }
}

requestAnimationFrame(animate);

// Debug/verification handle: lets a test read position, speed and lives.
window.__game = game;
