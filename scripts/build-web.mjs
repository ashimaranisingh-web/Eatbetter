// Copies the web app into www/ for Capacitor. The site itself still runs
// straight from the repo root (GitHub / file://), so nothing moves.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const FILES = ['index.html', 'shell.css', 'config.js', 'analytics.js', 'sync.js', 'native.js', 'store.js', 'health.js', 'reminders.js', 'planner.js', 'challenges.js', 'app.js', 'onboarding.js', 'profile.js', 'assistant.js', 'meals.js', 'daymode.js', 'fooddb.js', 'foodlog.js', 'offindia.js'];

// Browser builds of PostHog and Supabase, refreshed from node_modules into
// vendor/ (committed, so the website works without a build) and www/.
const VENDOR = {
  'vendor/posthog.js': 'node_modules/posthog-js/dist/array.full.no-external.js',
  'vendor/supabase.js': 'node_modules/@supabase/supabase-js/dist/umd/supabase.js',
};
mkdirSync('vendor', { recursive: true });
for (const [to, from] of Object.entries(VENDOR)) cpSync(from, to);

rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const f of FILES) cpSync(f, `www/${f}`);
cpSync('vendor', 'www/vendor', { recursive: true });

// Capacitor's JS runtime (registerPlugin etc.) — app build only.
cpSync('node_modules/@capacitor/core/dist/capacitor.js', 'www/capacitor.js');
const html = readFileSync('www/index.html', 'utf8');
if (!html.includes('<script src="store.js">')) throw new Error('store.js tag not found in index.html');
writeFileSync('www/index.html', html.replace('<script src="store.js">', '<script src="capacitor.js"></script>\n<script src="store.js">'));

console.log(`Copied ${FILES.length + 1} files and vendor/ to www/`);
