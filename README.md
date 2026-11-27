# Langit Biru — Island Flight

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/uyekt1987/flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/uyekt1987/flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

Arcade flight game di atas kepulauan tropis saat golden hour, dibuat
untuk bounty make.fun **"Make the best flight game"**. Terbang melewati
8 ring emas berurutan, kumpulkan poin sebelum waktu 150 detik habis —
jangan menabrak gunung atau laut, kamu punya 3 nyawa.

## Yang baru di v2

- **Golden hour** — matahari rendah di ufuk, langit jingga, dan bayangan
  panjang di seluruh pulau
- **Gunung berapi** — kawah berasap di pulau utara; asapnya mengepul dan
  jadi patokan navigasi dari jauh
- **Mercusuar bersorot** — sorot cahaya berputar di ujung pelabuhan,
  terlihat dari mana saja di pulau
- **Ring bergerak** — ring 5–8 melayang dan bergeser, tidak lagi diam
  di tempat
- **Gerbang bonus** — 2 gerbang hijau; tiap gerbang yang dilewati
  menambah **+10 detik** waktu terbang
- **Angin** — hembusan angin mendorong pesawat; arah dan kekuatannya
  tampil di indikator HUD
- **Kawanan burung** — burung-burung terbang melintasi langit pulau
- **Perahu bergerak** — perahu berlayar keluar-masuk pelabuhan
- **Pesawat lebih hidup** — lampu navigasi merah-hijau, baling-baling
  berputar, dan registrasi **PK-LBR** di badan pesawat
- **HUD kaca baru** — panel tembus pandang dengan dot progres misi
  yang menandai ring mana saja yang sudah dilewati

## Cara main

Buka `game/index.html` di desktop browser (offline, tanpa network).
Klik **MULAI TERBANG**, lalu:

- **Panah / A D** — belok (roll) dan naik-turun (pitch)
- **W / S** — throttle naik / turun (Shift tambah, Ctrl kurangi)
- **Seret mouse** — kemudi dengan mouse (tanpa pointer lock)
- **C** — ganti kamera chase / kokpit (kokpit punya panel instrumen menyala)
- **P** — jeda, **R** — ulang, **M** — suara mati/nyala

Tiap ring **+500 poin**, satu putaran penuh 8 ring **+2000 bonus**.
Gerbang bonus hijau menambah **+10 detik** tiap dilewati.
Panah kuning di layar menunjuk ring berikutnya beserta jaraknya.

## Teknologi

- Three.js r128 (vendored di `game/vendor/three.min.js`)
- Terrain prosedural dari value noise buatan sendiri: pantai, bukit,
  pegunungan bersalju, laut, runway, kota pelabuhan, pepohonan, awan
- Golden hour, cuaca, dan angin di `game/src/weather.js`
- Suara mesin prosedural via WebAudio (tanpa file audio)
- Tanpa network request sama sekali — semua aset lokal, 0 request eksternal

## Screenshot

4 screenshot 1280x720 di `screenshots/`: cover golden hour, kokpit,
runway, dan ring.
