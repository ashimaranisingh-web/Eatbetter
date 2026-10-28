// Copies the web app into www/ for Capacitor. The site itself still runs
// straight from the repo root (GitHub / file://), so nothing moves.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const FILES = ['index.html', 'shell.css', 'store.js', 'health.js', 'reminders.js', 'planner.js', 'app.js', 'onboarding.js', 'profile.js', 'assistant.js'];

rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const f of FILES) cpSync(f, `www/${f}`);

// Capacitor's JS runtime (registerPlugin etc.) — app build only.
cpSync('node_modules/@capacitor/core/dist/capacitor.js', 'www/capacitor.js');
const html = readFileSync('www/index.html', 'utf8');
if (!html.includes('<script src="store.js">')) throw new Error('store.js tag not found in index.html');
writeFileSync('www/index.html', html.replace('<script src="store.js">', '<script src="capacitor.js"></script>\n<script src="store.js">'));

console.log(`Copied ${FILES.length + 1} files to www/`);
