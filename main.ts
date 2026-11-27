// Langit Biru v2 — entry for the make.fun best flight game bounty.
// This program hands the game in: it copies this repository's game/ and
// screenshots/ folders into the output directory and writes the dossier
// the judge reads, using the kit's own library. Run it as:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
//
// Before anything is copied it checks the entry is complete: all four
// screenshots must be present and no bigger than 256 KiB each, and the
// v2 weather module (game/src/weather.js) must exist. A missing or
// oversized file stops the run with a clear error instead of handing
// the judge an entry it would refuse.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_SCREENSHOT_BYTES = 262144;

// The four screenshots the dossier allows: every one must be present
// and fit the scorer's 256 KiB cap, checked here before copying.
const shotDir = join(here, 'screenshots');
const shots = existsSync(shotDir) ? readdirSync(shotDir) : [];
if (shots.length !== 4) {
  throw new Error(`expected 4 screenshots in screenshots/, found ${shots.length}`);
}
for (const shot of shots) {
  const size = statSync(join(shotDir, shot)).size;
  if (size > MAX_SCREENSHOT_BYTES) {
    throw new Error(`screenshot ${shot} is ${size} bytes, over the 256 KiB cap`);
  }
}

// The v2 weather system (golden-hour wind gusts) lives in this module;
// the game cannot run without it, so refuse an entry that lacks it.
if (!existsSync(join(here, 'game', 'src', 'weather.js'))) {
  throw new Error('missing game/src/weather.js — the v2 weather module is required');
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotDir, join(out, 'screenshots'), { recursive: true });

// Count what was actually copied, so the run log shows the entry's size.
function countFiles(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    total += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return total;
}
const gameFiles = countFiles(join(out, 'game'));
const shotFiles = countFiles(join(out, 'screenshots'));
console.log(`Langit Biru v2: copied ${gameFiles} game files + ${shotFiles} screenshots to ${out}`);

// The scorer's own caps: only text_max_bytes shapes the bytes; the rest
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in game/ or 48 MiB of game files in
// all, or a path under game/ over 1000 bytes; game/ counts beside the
// output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log(`Langit Biru v2: dossier written to ${join(out, 'dossier.json')}`);
