// Langit Biru — the player aircraft, built from primitives.
// A cheerful yellow prop plane: rounded fuselage, glass canopy with a
// pilot silhouette, swept wings, tail fins, a spinning propeller with a
// translucent blur disc, double-blink strobe nav lights, fixed gear with
// a tail wheel, and the "PK-LBR" registration on both fuselage sides.
// The flight model is arcade: throttle sets speed, pitch and roll steer,
// banked turns pull the nose around, and the nose always points where
// the plane is going. Wind pushes the plane sideways while airborne.

import { groundHeight, RUNWAY_POS, RUNWAY_HEADING } from './terrain.js';
import { clamp } from './noise.js';

export const TAKEOFF_POS = {
  x: RUNWAY_POS.x,
  y: groundHeight(RUNWAY_POS.x, RUNWAY_POS.z) + 2.2,
  z: RUNWAY_POS.z + 60,
};

// Registration decal, drawn on a canvas so the game needs no external
// textures: dark bold letters on a transparent background.
function makeRegistrationTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = '#1d2733';
  ctx.font = '900 82px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PK-LBR', 256, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

export function buildPlane(scene) {
  const plane = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xffb61e, roughness: 0.45, metalness: 0.25 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xfff3d6, roughness: 0.5, metalness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.6, metalness: 0.3 });
  const glass = new THREE.MeshPhongMaterial({ color: 0x9fd8ff, shininess: 180, specular: 0xffffff, transparent: true, opacity: 0.7 });

  // Fuselage: a tapered cylinder with a rounded nose and tail cone.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.72, 6.4, 14), yellow);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  plane.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.02, 14, 10), cream);
  nose.scale.set(1, 1, 1.15);
  nose.position.z = 3.3;
  nose.castShadow = true;
  plane.add(nose);
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.72, 2.4, 12), yellow);
  tailCone.rotation.x = -Math.PI / 2;
  tailCone.position.z = -4.3;
  tailCone.castShadow = true;
  plane.add(tailCone);

  // Belly stripe for a bit of livery: the theta band is centred on the
  // underside (after the x-rotation, theta 0 sits at -Y).
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 0.74, 6.0, 14, 1, true, -Math.PI * 0.35, Math.PI * 0.7),
    new THREE.MeshStandardMaterial({ color: 0xe23b2e, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide }));
  stripe.rotation.x = Math.PI / 2;
  plane.add(stripe);

  // Registration "PK-LBR" on both fuselage sides.
  const regTex = makeRegistrationTexture();
  const regMat = new THREE.MeshBasicMaterial({ map: regTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  for (const side of [-1, 1]) {
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), regMat);
    decal.position.set(side * 0.9, 0.05, 0.2);
    decal.rotation.y = side * Math.PI / 2;
    plane.add(decal);
  }

  // Glass canopy with the pilot's helmet and shoulders silhouetted in it.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), glass);
  canopy.scale.set(0.95, 0.85, 1.7);
  canopy.position.set(0, 0.85, 1.1);
  plane.add(canopy);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x27313d, roughness: 0.35, metalness: 0.4 }));
  helmet.position.set(0, 1.02, 1.15);
  plane.add(helmet);
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.32, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x27313d, roughness: 0.6 }));
  shoulders.position.set(0, 0.78, 1.1);
  plane.add(shoulders);

  // Main wings with red tips, and a small dihedral lift.
  const wingGeo = new THREE.BoxGeometry(5.4, 0.22, 1.7);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeo, yellow);
    wing.position.set(side * 3.1, -0.1, 0.5);
    wing.rotation.z = side * -0.07;
    wing.castShadow = true;
    plane.add(wing);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.24, 1.72), new THREE.MeshStandardMaterial({ color: 0xe23b2e, roughness: 0.5 }));
    tip.position.set(side * 5.9, -0.1 + side * 0.07 * -3.1 * -1, 0.5);
    tip.rotation.z = side * -0.07;
    tip.castShadow = true;
    plane.add(tip);
  }

  // Tail: horizontal stabiliser and vertical fin with a red flash.
  const stab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.18, 1.1), cream);
  stab.position.set(0, 0.15, -4.6);
  stab.castShadow = true;
  plane.add(stab);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.9, 1.5), yellow);
  fin.position.set(0, 1.0, -4.7);
  fin.rotation.x = 0.25;
  fin.castShadow = true;
  plane.add(fin);
  const flash = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.9, 0.7), new THREE.MeshStandardMaterial({ color: 0xe23b2e, roughness: 0.5 }));
  flash.position.set(0, 1.15, -4.85);
  flash.rotation.x = 0.25;
  plane.add(flash);

  // Propeller: spinner cone, three blades, and a translucent blur disc
  // that thickens with throttle so the spinning prop reads as a blur and
  // never blocks the cockpit view as a solid slab.
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.0, 10), dark);
  spinner.rotation.x = Math.PI / 2;
  spinner.position.z = 4.35;
  plane.add(spinner);
  const prop = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(0.34, 3.4, 0.12);
  // Blades are translucent so the spinning prop reads as a blur, and it
  // never blocks the cockpit view as a solid slab.
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0.55 });
  for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.rotation.z = a;
    blade.castShadow = true;
    prop.add(blade);
  }
  prop.position.z = 4.15;
  plane.add(prop);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.95, 32),
    new THREE.MeshBasicMaterial({ color: 0x1a1d22, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
  );
  disc.position.z = 4.2;
  plane.add(disc);

  // Nav lights: red port, green starboard, white tail — emissive so they
  // glow, and blinked as strobes in applyPlaneTransform.
  const navRedMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2.2 });
  const navRed = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), navRedMat);
  navRed.position.set(-5.85, -0.1, 0.5);
  plane.add(navRed);
  const navGreenMat = new THREE.MeshStandardMaterial({ color: 0x22ff66, emissive: 0x22ff66, emissiveIntensity: 2.2 });
  const navGreen = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), navGreenMat);
  navGreen.position.set(5.85, -0.1, 0.5);
  plane.add(navGreen);
  const navWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 });
  const navWhite = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), navWhiteMat);
  navWhite.position.set(0, 0.2, -5.5);
  plane.add(navWhite);

  // Fixed landing gear with little wheels, cream hubs and a tail wheel.
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), dark);
    strut.position.set(side * 0.85, -1.25, 1.4);
    plane.add(strut);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 12), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 0.85, -1.8, 1.4);
    wheel.castShadow = true;
    plane.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 10), cream);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(side * 0.85, -1.8, 1.4);
    plane.add(hub);
  }
  const tailStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 6), dark);
  tailStrut.position.set(0, -0.85, -4.4);
  plane.add(tailStrut);
  const tailWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 10), dark);
  tailWheel.rotation.z = Math.PI / 2;
  tailWheel.position.set(0, -1.2, -4.4);
  plane.add(tailWheel);

  scene.add(plane);
  return { group: plane, prop, disc, navRedMat, navGreenMat, navWhiteMat };
}

export function createFlightState() {
  return {
    pos: new THREE.Vector3(TAKEOFF_POS.x, TAKEOFF_POS.y, TAKEOFF_POS.z),
    heading: RUNWAY_HEADING,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0.55,
    onGround: true,
    crashed: false,
  };
}

export function resetFlight(state) {
  state.pos.set(TAKEOFF_POS.x, TAKEOFF_POS.y, TAKEOFF_POS.z);
  state.heading = RUNWAY_HEADING;
  state.pitch = 0;
  state.roll = 0;
  state.speed = 0;
  state.throttle = 0.55;
  state.onGround = true;
  state.crashed = false;
}

// One arcade flight step. Roll banks the turn, pitch trades speed for
// climb, throttle sets the target speed, and wind (-1..1) pushes the
// plane sideways while airborne. Returns 'crashed' when the plane hits
// ground or sea, otherwise 'flying'.
export function stepFlight(state, input, dt, wind) {
  const targetSpeed = 8 + state.throttle * 52;
  state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 1.1);
  if (state.speed < 4) state.speed = 4;

  const rollTarget = input.roll * 1.05;
  state.roll += (rollTarget - state.roll) * Math.min(1, dt * 3.2);
  const pitchTarget = input.pitch * 0.55;
  state.pitch += (pitchTarget - state.pitch) * Math.min(1, dt * 2.6);

  // A banked turn pulls the heading around; the pull grows with speed.
  const turnRate = -state.roll * 0.55 * clamp(state.speed / 40, 0.25, 1);
  state.heading += turnRate * dt;

  const lift = state.speed > 20 ? 1 : state.speed / 20;
  const climb = Math.sin(state.pitch) * state.speed * lift;
  const forward = new THREE.Vector3(
    Math.sin(state.heading),
    0,
    Math.cos(state.heading)
  );
  // Note: heading 0 points down +z; the runway heading is set to match.
  state.pos.addScaledVector(forward, Math.cos(state.pitch) * state.speed * dt);
  state.pos.y += climb * dt;

  // Wind shoves the plane sideways (perpendicular to the heading).
  const w = wind || 0;
  if (w !== 0 && !state.onGround) {
    state.pos.x += Math.cos(state.heading) * w * 4.5 * dt;
    state.pos.z += -Math.sin(state.heading) * w * 4.5 * dt;
  }

  // Gentle stall: too slow and too steep, the nose drops.
  if (state.speed < 18 && state.pitch > 0.25) state.pos.y -= (18 - state.speed) * dt * 0.6;

  const ground = groundHeight(state.pos.x, state.pos.z);
  const floor = Math.max(ground, 0) + 1.6;
  if (state.onGround) {
    // Rolling on the runway: pitch up past rotation speed to lift off.
    // Pitch is NOT zeroed here, so holding up builds rotation for takeoff.
    if (state.speed > 21 && state.pitch > 0.08) {
      state.onGround = false;
      state.pos.y = floor + 0.5;
    } else {
      state.pos.y = floor;
    }
  } else if (state.pos.y <= floor) {
    // Airborne and touching down: hard or nose-first is a crash,
    // a gentle descent is a landing.
    if (state.speed > 24 || state.pitch < -0.12) return 'crashed';
    state.pos.y = floor;
    state.onGround = true;
    state.pitch = 0;
  }
  if (state.pos.y > 420) state.pos.y = 420;
  const edge = 1150;
  if (Math.abs(state.pos.x) > edge) state.pos.x = Math.sign(state.pos.x) * edge;
  if (Math.abs(state.pos.z) > edge) state.pos.z = Math.sign(state.pos.z) * edge;
  return 'flying';
}

export function applyPlaneTransform(plane, state) {
  const g = plane.group;
  g.position.copy(state.pos);
  g.rotation.order = 'YXZ';
  g.rotation.y = state.heading;
  g.rotation.x = -state.pitch;
  g.rotation.z = state.roll;
  plane.prop.rotation.z += 0.55 + state.throttle * 1.6;

  // Strobe nav lights: red/green double-blink once a second, the white
  // tail strobe once every 1.5 s — they read clearly in screenshots.
  const t = performance.now() / 1000;
  const phase = t % 1;
  const strobe = (phase < 0.1 || (phase > 0.25 && phase < 0.35)) ? 2.6 : 0.12;
  plane.navRedMat.emissiveIntensity = strobe;
  plane.navGreenMat.emissiveIntensity = strobe;
  plane.navWhiteMat.emissiveIntensity = (t % 1.5) < 0.12 ? 2.6 : 0.12;

  // The prop blur disc thickens with throttle.
  plane.disc.material.opacity = 0.08 + state.throttle * 0.14;
}
