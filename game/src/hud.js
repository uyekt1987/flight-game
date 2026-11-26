// Langit Biru — the HUD, cockpit instruments and screen overlays.
// All readouts are plain DOM over the 3D canvas: altitude, speed and a
// compass heading tape, throttle bar, score, rings left, timer and lives,
// plus a glowing instrument panel (artificial horizon, altimeter and
// airspeed) that only shows in cockpit view, and a ring-direction arrow.

export function buildHud() {
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML =
    '<div class="hud-top">' +
      '<div class="hud-box"><span class="hud-label">SKOR</span><span id="hud-score" class="hud-value">0</span></div>' +
      '<div class="hud-box"><span class="hud-label">RING</span><span id="hud-rings" class="hud-value">0 / 8</span></div>' +
      '<div class="hud-box"><span class="hud-label">WAKTU</span><span id="hud-time" class="hud-value">2:30</span></div>' +
      '<div class="hud-box"><span class="hud-label">NYAWA</span><span id="hud-lives" class="hud-value lives">&#10084;&#10084;&#10084;</span></div>' +
    '</div>' +
    '<div class="hud-left">' +
      '<div class="hud-box"><span class="hud-label">KETINGGIAN</span><span id="hud-alt" class="hud-value">0 m</span></div>' +
      '<div class="hud-box"><span class="hud-label">KECEPATAN</span><span id="hud-speed" class="hud-value">0 km/j</span></div>' +
      '<div class="hud-box"><span class="hud-label">ARAH</span><span id="hud-heading" class="hud-value">000&deg;</span></div>' +
      '<div class="hud-box"><span class="hud-label">THROTTLE</span><div class="throttle-track"><div id="hud-throttle" class="throttle-fill"></div></div></div>' +
    '</div>' +
    '<div id="hud-compass" class="hud-compass"><div id="hud-compass-tape" class="compass-tape"></div><div class="compass-needle">&#9650;</div></div>' +
    '<div id="hud-arrow" class="ring-arrow">&#10148;</div>' +
    '<div id="hud-arrow-dist" class="ring-dist">0 m</div>' +
    '<div id="hud-toast" class="hud-toast"></div>' +
    '<div id="hud-camera" class="hud-camera">KAMERA: CHASE &nbsp;·&nbsp; [C] ganti &nbsp;·&nbsp; [P] jeda &nbsp;·&nbsp; [M] suara</div>';
  document.body.appendChild(hud);
  return hud;
}

export function buildCockpitPanel() {
  const panel = document.createElement('div');
  panel.id = 'cockpit';
  panel.innerHTML =
    '<div class="panel">' +
      '<div class="gauge horizon"><div id="horizon-disc" class="horizon-disc"><div class="horizon-sky"></div><div class="horizon-ground"></div><div class="horizon-line"></div></div><div class="gauge-label">HORIZON</div></div>' +
      '<div class="gauge"><div class="dial"><div id="alt-needle" class="needle"></div><div class="dial-center"></div></div><div class="gauge-label">ALT <span id="alt-read">0</span> m</div></div>' +
      '<div class="gauge"><div class="dial"><div id="speed-needle" class="needle"></div><div class="dial-center"></div></div><div class="gauge-label">KEC <span id="speed-read">0</span></div></div>' +
      '<div class="gauge small"><div class="gauge-label">BENSIN</div><div class="fuel-track"><div id="fuel-fill" class="fuel-fill"></div></div><div class="gauge-label">RING <span id="ring-read">1</span>/8</div></div>' +
    '</div>';
  document.body.appendChild(panel);
  return panel;
}

export function buildOverlays(onStart) {
  const title = document.createElement('div');
  title.id = 'title-screen';
  title.innerHTML =
    '<div class="title-card">' +
      '<h1>LANGIT BIRU</h1>' +
      '<p class="title-sub">Terbang di atas kepulauan &middot; lewati semua ring emas</p>' +
      '<p class="title-rules">Terbang melewati <b>8 ring emas</b> sebelum waktu habis.<br>' +
      'Tiap ring <b>+500 poin</b>, satu putaran penuh <b>+2000 bonus</b>.<br>' +
      'Jangan menabrak gunung atau laut &mdash; kamu punya <b>3 nyawa</b>.</p>' +
      '<button id="start-btn" type="button">MULAI TERBANG</button>' +
      '<p class="title-keys">Panah / A D &mdash; belok &amp; naik-turun &nbsp;·&nbsp; W / S &mdash; throttle<br>' +
      'Seret mouse &mdash; kemudi &nbsp;·&nbsp; C &mdash; kamera &nbsp;·&nbsp; P &mdash; jeda &nbsp;·&nbsp; R &mdash; ulang</p>' +
    '</div>';
  document.body.appendChild(title);
  title.querySelector('#start-btn').addEventListener('click', onStart);

  const end = document.createElement('div');
  end.id = 'end-screen';
  end.className = 'hidden';
  end.innerHTML =
    '<div class="title-card">' +
      '<h1 id="end-title">WAKTU HABIS</h1>' +
      '<p id="end-text" class="title-sub"></p>' +
      '<p class="title-rules">Skor akhir: <b id="end-score">0</b></p>' +
      '<button id="again-btn" type="button">TERBANG LAGI</button>' +
      '<p class="title-keys">atau tekan R</p>' +
    '</div>';
  document.body.appendChild(end);
  end.querySelector('#again-btn').addEventListener('click', onStart);
  return { title, end };
}

export function showToast(text, ms) {
  const toast = document.getElementById('hud-toast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), ms || 1800);
}

function headingDegrees(heading) {
  // Our heading 0 points down +z; convert to compass degrees (0 = north).
  let deg = (-heading * 180) / Math.PI;
  deg = ((deg % 360) + 360) % 360;
  return Math.round(deg);
}

const COMPASS_POINTS = ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL'];

export function updateHud(state, mission, timeLeft, lives, cameraMode, muted) {
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set('hud-score', String(mission.score));
  set('hud-rings', mission.ringsCleared + ' / 8');
  const t = Math.max(0, Math.ceil(timeLeft));
  set('hud-time', Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'));
  const livesEl = document.getElementById('hud-lives');
  if (livesEl) livesEl.textContent = '\u2764'.repeat(Math.max(0, lives)) + '\u00B7'.repeat(Math.max(0, 3 - lives));
  set('hud-alt', Math.max(0, Math.round(state.pos.y)) + ' m');
  set('hud-speed', Math.round(state.speed * 3.6) + ' km/j');
  set('hud-heading', String(headingDegrees(state.heading)).padStart(3, '0') + '\u00B0');
  const throttle = document.getElementById('hud-throttle');
  if (throttle) throttle.style.width = Math.round(state.throttle * 100) + '%';
  const tape = document.getElementById('hud-compass-tape');
  if (tape) {
    const deg = headingDegrees(state.heading);
    let html = '';
    for (let off = -60; off <= 60; off += 15) {
      const d = ((deg + off) % 360 + 360) % 360;
      const label = d % 45 === 0 ? COMPASS_POINTS[Math.round(d / 45) % 8] : String(d).padStart(3, '0');
      // Keep labels inside the tape: skip ones fully off-screen, and
      // clamp the rest so no label is cut by the tape's edges.
      let pos = 50 + off * 1.1;
      if (pos < 0 || pos > 100) continue;
      pos = Math.min(94, Math.max(6, pos));
      html += '<span style="left:' + pos + '%">' + label + '</span>';
    }
    tape.innerHTML = html;
  }
  const cam = document.getElementById('hud-camera');
  if (cam) cam.textContent = 'KAMERA: ' + (cameraMode === 'cockpit' ? 'COCKPIT' : 'CHASE') + '  \u00B7  [C] ganti  \u00B7  [P] jeda  \u00B7  [M] suara ' + (muted ? '(hening)' : '');
}

export function updateCockpitPanel(state, mission, timeLeft, cameraMode) {
  const panel = document.getElementById('cockpit');
  if (!panel) return;
  panel.classList.toggle('visible', cameraMode === 'cockpit');
  if (cameraMode !== 'cockpit') return;
  const disc = document.getElementById('horizon-disc');
  if (disc) {
    disc.style.transform = 'rotate(' + (state.roll * 57.3) + 'deg) translateY(' + (-state.pitch * 90) + 'px)';
  }
  const altNeedle = document.getElementById('alt-needle');
  if (altNeedle) altNeedle.style.transform = 'rotate(' + ((state.pos.y % 100) / 100 * 360 - 90) + 'deg)';
  const speedNeedle = document.getElementById('speed-needle');
  if (speedNeedle) speedNeedle.style.transform = 'rotate(' + (-120 + Math.min(1, state.speed / 60) * 240) + 'deg)';
  const altRead = document.getElementById('alt-read');
  if (altRead) altRead.textContent = String(Math.max(0, Math.round(state.pos.y)));
  const speedRead = document.getElementById('speed-read');
  if (speedRead) speedRead.textContent = String(Math.round(state.speed * 3.6));
  const fuel = document.getElementById('fuel-fill');
  if (fuel) fuel.style.width = Math.round(Math.max(0, timeLeft / 150) * 100) + '%';
  const ringRead = document.getElementById('ring-read');
  if (ringRead) ringRead.textContent = String((mission.index % 8) + 1);
}

// Point the on-screen arrow at the next ring and show its distance.
export function updateRingArrow(camera, ringPos, planePos) {
  const v = ringPos.clone().project(camera);
  const arrow = document.getElementById('hud-arrow');
  const dist = document.getElementById('hud-arrow-dist');
  if (!arrow || !dist) return;
  if (dist) dist.textContent = Math.round(planePos.distanceTo(ringPos)) + ' m';
  if (v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05) {
    arrow.classList.add('hidden');
    dist.classList.add('hidden');
    return;
  }
  arrow.classList.remove('hidden');
  dist.classList.remove('hidden');
  let angle;
  if (v.z >= 1) {
    angle = v.x >= 0 ? 90 : -90;
  } else {
    angle = Math.atan2(-v.y, v.x) * 180 / Math.PI;
  }
  arrow.style.left = '50%';
  arrow.style.top = '16%';
  arrow.style.transform = 'translate(-50%, -50%) rotate(' + angle + 'deg)';
}
