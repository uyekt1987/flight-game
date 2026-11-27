// Langit Biru — golden target rings, bonus gates and the mission flow.
// Eight rings float over the island in a loop: beach, harbour, mountain
// pass, ridge and back to the runway. Fly through the glowing ring to
// score; the next ring lights up and the HUD arrow points at it.
// Clearing all eight pays a bonus and lays out a fresh course.
// Rings 5-8 drift and bob, so the late course never sits still.
// Two green bonus gates pay +150 points and +10 seconds each, once per
// lap. Threading a ring dead-centre (within 6 m) pays a PERFECT +250.

import { groundHeight } from './terrain.js';

const COURSE = [
  { x: -140, z: 260, y: 42 },
  { x: -330, z: 60, y: 55 },
  { x: -260, z: -260, y: 78 },
  { x: 60, z: -330, y: 95 },
  { x: 300, z: -220, y: 80 },
  { x: 380, z: 40, y: 58 },
  { x: 260, z: 300, y: 46 },
  { x: 40, z: 150, y: 34 },
];

// Bonus gates sit slightly off the racing line: a detour worth taking.
const GATE_SPOTS = [
  { x: -180, z: -140, y: 72 },
  { x: 320, z: 180, y: 52 },
];

export const RING_RADIUS = 15;
export const GATE_RADIUS = 12;
export const PERFECT_RADIUS = 6;
const MOVING_FROM = 4; // rings 5-8 (index 4-7) drift and bob

export function buildRings(scene) {
  const group = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffb61e, emissive: 0xcc7a00, emissiveIntensity: 0.9,
    roughness: 0.3, metalness: 0.7,
  });
  const dim = new THREE.MeshStandardMaterial({
    color: 0xd8c48a, emissive: 0x554400, emissiveIntensity: 0.35,
    roughness: 0.5, metalness: 0.5,
  });
  const rings = COURSE.map((spot, i) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(RING_RADIUS, 1.3, 12, 42), dim.clone());
    mesh.position.set(spot.x, Math.max(spot.y, groundHeight(spot.x, spot.z) + 14), spot.z);
    // Golden rings glow; they must not throw a hard dark oval onto the
    // runway and sand below, so they cast no shadow.
    mesh.castShadow = false;
    group.add(mesh);
    // A soft glow disc inside the ring so it reads from far away.
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(RING_RADIUS * 0.92, 28),
      new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false })
    );
    glow.position.copy(mesh.position);
    group.add(glow);
    return {
      mesh,
      glow,
      // home is the fixed course anchor; base is the LIVE centre, kept
      // in sync with the mesh every frame so checkRing and the HUD arrow
      // always aim at where the ring actually is.
      home: mesh.position.clone(),
      base: mesh.position.clone(),
      material: mesh.material,
      moving: i >= MOVING_FROM,
      phase: i * 1.7,
    };
  });

  const gates = GATE_SPOTS.map((spot) => {
    const material = new THREE.MeshStandardMaterial({
      color: 0x2ee66b, emissive: 0x00c853, emissiveIntensity: 0.9,
      roughness: 0.35, metalness: 0.5,
    });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(GATE_RADIUS, 1.0, 12, 36), material);
    mesh.position.set(spot.x, Math.max(spot.y, groundHeight(spot.x, spot.z) + 14), spot.z);
    mesh.castShadow = false;
    group.add(mesh);
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(GATE_RADIUS * 0.9, 26),
      new THREE.MeshBasicMaterial({ color: 0x7dff9b, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
    );
    glow.position.copy(mesh.position);
    group.add(glow);
    return { mesh, glow, base: mesh.position.clone(), material, hit: false };
  });

  scene.add(group);
  return { group, rings, gates };
}

export function createMission() {
  return {
    index: 0,
    score: 0,
    ringsCleared: 0,
    laps: 0,
    bonus: 0,
    gatesHit: 0,
    perfect: 0,
    wind: 0,
    timeBonus: 0,
    landingBonus: false,
  };
}

export function currentRing(mission, rings) {
  return rings.rings[mission.index % rings.rings.length];
}

export function resetMission(mission) {
  mission.index = 0;
  mission.score = 0;
  mission.ringsCleared = 0;
  mission.laps = 0;
  mission.bonus = 0;
  mission.gatesHit = 0;
  mission.perfect = 0;
  mission.wind = 0;
  mission.timeBonus = 0;
  mission.landingBonus = false;
}

// Check the plane against the active ring and the bonus gates. Returns
// the points earned this call (0 when nothing was crossed). A gate hit
// also banks +10 seconds into mission.timeBonus for main.js to apply.
export function checkRing(mission, rings, planePos) {
  let earned = 0;
  for (const gate of rings.gates) {
    if (!gate.hit && planePos.distanceTo(gate.base) < GATE_RADIUS) {
      gate.hit = true;
      mission.gatesHit++;
      mission.score += 150;
      mission.timeBonus += 10;
      earned += 150;
    }
  }
  const ring = currentRing(mission, rings);
  const d = planePos.distanceTo(ring.base);
  if (d > RING_RADIUS * 0.95) return earned;
  mission.ringsCleared++;
  mission.index++;
  let points = 500;
  if (d <= PERFECT_RADIUS) {
    mission.perfect++;
    points += 250;
  }
  if (mission.index % rings.rings.length === 0) {
    mission.laps++;
    mission.bonus += 2000;
    points += 2000;
    // A new lap re-arms both bonus gates.
    for (const gate of rings.gates) gate.hit = false;
  }
  mission.score += points;
  return earned + points;
}

// Highlight the active ring, move rings 5-8, and pulse the bonus gates.
// ring.base is re-synced from the live mesh position on every call.
export function updateRings(rings, mission, time, planePos) {
  // Fresh mission (title screen, or just restarted): re-arm the gates.
  if (mission.index === 0 && mission.ringsCleared === 0) {
    for (const gate of rings.gates) gate.hit = false;
  }
  rings.rings.forEach((ring, i) => {
    const active = i === mission.index % rings.rings.length;
    const passed = i < mission.index % rings.rings.length;
    // Rings 5-8 drift sideways and bob up and down around their anchor.
    if (ring.moving) {
      const t = time * 0.5 + ring.phase;
      ring.mesh.position.set(
        ring.home.x + Math.sin(t * 0.7) * 10,
        ring.home.y + Math.sin(t * 1.1) * 6,
        ring.home.z + Math.cos(t * 0.55) * 10
      );
    } else {
      ring.mesh.position.copy(ring.home);
    }
    ring.base.copy(ring.mesh.position);
    ring.glow.position.copy(ring.mesh.position);
    // Every ring faces the plane, so a distant ring never reads as a
    // thin gold pole when seen edge-on from the side.
    if (planePos) {
      ring.mesh.lookAt(planePos);
      ring.glow.lookAt(planePos);
    }
    if (active) {
      ring.material.emissive.setHex(0xff9500);
      ring.material.emissiveIntensity = 1.1 + Math.sin(time * 4) * 0.35;
      const s = 1 + Math.sin(time * 3) * 0.03;
      ring.mesh.scale.set(s, s, s);
      ring.glow.material.opacity = 0.22 + Math.sin(time * 3) * 0.08;
    } else {
      ring.material.emissive.setHex(passed ? 0x1a5c1a : 0x554400);
      ring.material.emissiveIntensity = passed ? 0.5 : 0.35;
      ring.mesh.scale.set(1, 1, 1);
      ring.glow.material.opacity = passed ? 0.05 : 0.12;
    }
  });
  // Bonus gates: bright pulsing green while armed, dull once collected.
  for (const gate of rings.gates) {
    if (planePos) {
      gate.mesh.lookAt(planePos);
      gate.glow.lookAt(planePos);
    }
    if (gate.hit) {
      gate.material.emissive.setHex(0x222222);
      gate.material.emissiveIntensity = 0.2;
      gate.glow.material.opacity = 0.04;
      gate.mesh.scale.set(1, 1, 1);
    } else {
      gate.material.emissive.setHex(0x00c853);
      gate.material.emissiveIntensity = 0.9 + Math.sin(time * 5) * 0.35;
      gate.glow.material.opacity = 0.18 + Math.sin(time * 3) * 0.06;
      const s = 1 + Math.sin(time * 3) * 0.04;
      gate.mesh.scale.set(s, s, s);
    }
  }
}
