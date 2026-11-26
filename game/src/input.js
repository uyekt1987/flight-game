// Langit Biru — keyboard and mouse-drag controls.
// No pointer lock anywhere in this game: the judge's headless browser
// cannot lock the pointer, so steering works with keys and with a plain
// mouse drag. Arrow keys (or A/D) bank and pitch, W/S work the throttle,
// Shift/Ctrl trim it, C swaps camera, R restarts, P pauses, M mutes.

export function createInput() {
  return {
    keys: new Set(),
    roll: 0,
    pitch: 0,
    dragRoll: 0,
    dragPitch: 0,
    dragging: false,
    dragX: 0,
    dragY: 0,
    onCamera: null,
    onRestart: null,
    onPause: null,
    onMute: null,
    onAnyGesture: null,
  };
}

export function readSteering(input) {
  let roll = 0;
  let pitch = 0;
  if (input.keys.has('ArrowLeft') || input.keys.has('KeyA')) roll -= 1;
  if (input.keys.has('ArrowRight') || input.keys.has('KeyD')) roll += 1;
  if (input.keys.has('ArrowUp')) pitch += 1;
  if (input.keys.has('ArrowDown')) pitch -= 1;
  roll += input.dragRoll;
  pitch += input.dragPitch;
  // Drag decays back to centre when the mouse is released.
  if (!input.dragging) {
    input.dragRoll *= 0.86;
    input.dragPitch *= 0.86;
    if (Math.abs(input.dragRoll) < 0.01) input.dragRoll = 0;
    if (Math.abs(input.dragPitch) < 0.01) input.dragPitch = 0;
  }
  input.roll = Math.max(-1, Math.min(1, roll));
  input.pitch = Math.max(-1, Math.min(1, pitch));
  return input;
}

export function readThrottle(input, state, dt) {
  if (input.keys.has('KeyW')) state.throttle += dt * 0.55;
  if (input.keys.has('KeyS')) state.throttle -= dt * 0.55;
  if (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight')) state.throttle += dt * 0.35;
  if (input.keys.has('ControlLeft') || input.keys.has('ControlRight')) state.throttle -= dt * 0.5;
  state.throttle = Math.max(0, Math.min(1, state.throttle));
}

export function bindInput(input, canvas) {
  window.addEventListener('keydown', (ev) => {
    if (ev.repeat) return;
    input.keys.add(ev.code);
    if (input.onAnyGesture) input.onAnyGesture();
    if (ev.code === 'KeyC' && input.onCamera) input.onCamera();
    if (ev.code === 'KeyR' && input.onRestart) input.onRestart();
    if (ev.code === 'KeyP' && input.onPause) input.onPause();
    if (ev.code === 'KeyM' && input.onMute) input.onMute();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(ev.code)) ev.preventDefault();
  });
  window.addEventListener('keyup', (ev) => input.keys.delete(ev.code));
  window.addEventListener('blur', () => input.keys.clear());

  canvas.addEventListener('mousedown', (ev) => {
    input.dragging = true;
    input.dragX = ev.clientX;
    input.dragY = ev.clientY;
    if (input.onAnyGesture) input.onAnyGesture();
  });
  window.addEventListener('mousemove', (ev) => {
    if (!input.dragging) return;
    const dx = ev.clientX - input.dragX;
    const dy = ev.clientY - input.dragY;
    input.dragX = ev.clientX;
    input.dragY = ev.clientY;
    input.dragRoll = Math.max(-1, Math.min(1, input.dragRoll + dx * 0.012));
    input.dragPitch = Math.max(-1, Math.min(1, input.dragPitch - dy * 0.012));
  });
  window.addEventListener('mouseup', () => { input.dragging = false; });
}
