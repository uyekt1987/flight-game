// Langit Biru — deterministic screenshot setups.
// ?shot=cover|cockpit|runway|ring places the plane and camera at a fixed
// spot with the title screen already dismissed, so screenshots are
// reproducible. The game signals readiness with window.__shotReady.

import { groundHeight } from './terrain.js';

export function parseShot() {
  const params = new URLSearchParams(window.location.search);
  return params.get('shot');
}

export function applyShot(game, name) {
  const s = game.flight;
  const mission = game.mission;
  if (name === 'cover') {
    // Banking chase view: coastline below, runway and the golden ring ahead.
    s.pos.set(180, 55, 330);
    s.heading = -2.48;
    s.pitch = -0.04;
    s.roll = -0.45;
    s.speed = 38;
    s.throttle = 0.7;
    s.onGround = false;
    game.cameraMode = 'chase';
    mission.index = 7;
    mission.score = 3500;
    mission.ringsCleared = 7;
  } else if (name === 'cockpit') {
    // Cockpit view: lit instruments, terrain and the first ring ahead.
    // Start ~205 m out so that, after the ~105 m the sim advances before
    // the screenshot, the ring sits ~100 m ahead as a full circle instead
    // of a giant arc filling half the frame.
    s.pos.set(-26, 55, 430);
    s.heading = -2.55;
    s.pitch = -0.02;
    s.roll = 0.06;
    s.speed = 36;
    s.throttle = 0.65;
    s.onGround = false;
    game.cameraMode = 'cockpit';
    mission.index = 0;
    mission.score = 0;
    mission.ringsCleared = 0;
  } else if (name === 'runway') {
    // Low pass down the runway over the harbour town, sea and mountains.
    s.pos.set(70, 22, 330);
    s.heading = 3.08;
    s.pitch = -0.03;
    s.roll = 0.22;
    s.speed = 34;
    s.throttle = 0.6;
    s.onGround = false;
    game.cameraMode = 'chase';
    mission.index = 7;
    mission.score = 3500;
    mission.ringsCleared = 7;
  } else if (name === 'ring') {
    // About to punch through the ring from close range, ring dead ahead.
    // The gap is wide enough that the plane is still approaching the ring
    // when the screenshot is taken.
    s.pos.set(-263, 46, 377);
    s.heading = 2.33;
    s.pitch = 0.0;
    s.roll = -0.12;
    s.speed = 40;
    s.throttle = 0.8;
    s.onGround = false;
    game.cameraMode = 'chase';
    mission.index = 0;
    mission.score = 0;
    mission.ringsCleared = 0;
  } else {
    return false;
  }
  // Keep the plane above the ground wherever the shot puts it.
  const floor = Math.max(groundHeight(s.pos.x, s.pos.z), 0) + 6;
  if (s.pos.y < floor) s.pos.y = floor;
  game.state = 'playing';
  game.timeLeft = 132;
  game.lives = 3;
  return true;
}

export function markShotReady() {
  window.__shotReady = true;
}
