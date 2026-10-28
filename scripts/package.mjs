#!/usr/bin/env node
// Builds the zip you upload to the Chrome Web Store: shipped files only, no
// tests, scripts or docs. Runs the no-network check first.
//
//   node scripts/package.mjs [--out dir]      (default dir: dist/)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHIPPED = ['manifest.json', 'popup.html', 'popup.css', 'popup.js', 'options.html', 'options.js', 'lib', 'data', 'icons'];

const outArg = process.argv.indexOf('--out');
const outDir = resolve(outArg > 0 ? process.argv[outArg + 1] : join(root, 'dist'));

execFileSync(process.execPath, [join(root, 'scripts/check-no-network.mjs')], { stdio: 'inherit' });

const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const referenced = [
  manifest.action?.default_popup,
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
].filter(Boolean);
const missing = [...SHIPPED, ...referenced].filter((f) => !existsSync(join(root, f)));
if (missing.length) throw new Error(`Missing files: ${missing.join(', ')}`);

mkdirSync(outDir, { recursive: true });
const zip = join(outDir, `random-address-${manifest.version}.zip`);
rmSync(zip, { force: true });
// -X drops extra file attributes so the zip is the same from run to run on one machine.
execFileSync('zip', ['-r', '-X', '-q', zip, ...SHIPPED], { cwd: root });
console.log(zip);
