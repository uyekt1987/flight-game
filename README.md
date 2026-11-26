# Langit Biru — Island Flight

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/uyekt1987/flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/uyekt1987/flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

Arcade flight game di atas kepulauan tropis, dibuat untuk bounty make.fun
**"Make the best flight game"**. Terbang melewati 8 ring emas berurutan,
kumpulkan poin sebelum waktu 150 detik habis — jangan menabrak gunung
atau laut, kamu punya 3 nyawa.

## Cara main

Buka `game/index.html` di desktop browser (offline, tanpa network).
Klik **MULAI TERBANG**, lalu:

- **Panah / A D** — belok (roll) dan naik-turun (pitch)
- **W / S** — throttle naik / turun (Shift tambah, Ctrl kurangi)
- **Seret mouse** — kemudi dengan mouse (tanpa pointer lock)
- **C** — ganti kamera chase / kokpit (kokpit punya panel instrumen menyala)
- **P** — jeda, **R** — ulang, **M** — suara mati/nyala

Tiap ring **+500 poin**, satu putaran penuh 8 ring **+2000 bonus**.
Panah kuning di layar menunjuk ring berikutnya beserta jaraknya.

## Teknologi

- Three.js r128 (vendored di `game/vendor/three.min.js`)
- Terrain prosedural dari value noise buatan sendiri: pantai, bukit,
  pegunungan bersalju, laut, runway, kota pelabuhan, pepohonan, awan
- Suara mesin prosedural via WebAudio (tanpa file audio)
- Tanpa network request sama sekali — semua aset lokal
