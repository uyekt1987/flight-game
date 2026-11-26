// Langit Biru — golden target rings and the mission flow.
// Eight rings float over the island in a loop: beach, harbour, mountain
// pass, ridge and back to the runway. Fly through the glowing ring to
// score; the next ring lights up and the HUD arrow points at it.
// Clearing all eight pays a bonus and lays out a fresh course.

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

export const RING_RADIUS = 15;

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
  const rings = COURSE.map((spot) => {
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
    return { mesh, glow, base: mesh.position.clone(), material: mesh.material };
  });
  scene.add(group);
  return { group, rings };
}

export function createMission() {
  return { index: 0, score: 0, ringsCleared: 0, laps: 0, bonus: 0 };
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
}

// Check the plane against the active ring. Returns the points earned
// this call (0 when the ring was not crossed).
export function checkRing(mission, rings, planePos) {
  const ring = currentRing(mission, rings);
  const d = planePos.distanceTo(ring.base);
  if (d > RING_RADIUS * 0.95) return 0;
  mission.ringsCleared++;
  mission.index++;
  let points = 500;
  if (mission.index % rings.rings.length === 0) {
    mission.laps++;
    mission.bonus += 2000;
    points += 2000;
  }
  mission.score += points;
  return points;
}

// Highlight the active ring and animate it; passed rings stay dim.
export function updateRings(rings, mission, time, planePos) {
  rings.rings.forEach((ring, i) => {
    const active = i === mission.index % rings.rings.length;
    const passed = i < mission.index % rings.rings.length;
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
}
