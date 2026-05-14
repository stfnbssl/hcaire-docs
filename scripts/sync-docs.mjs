#!/usr/bin/env node
// sync-docs — orchestratore della generazione automatica della documentazione.
//
// Cosa fa:
//   1. Verifica che `../hcaire/server/` esista (TypeDoc legge da sibling).
//   2. Esegue TypeDoc con `typedoc.json` → output in `static/typedoc/`.
//   3. Verifica che `static/openapi.yaml` esista (warning se mancante).
//   4. Stampa un riepilogo.
//
// Esecuzione:
//   npm run sync-docs
//
// Note:
//   - `static/typedoc/` è gitignored. Va rigenerato dopo ogni clone.
//   - In CI conviene fare checkout di entrambi i repo (hcaire-docs + hcaire)
//     come sibling prima di invocare questo script.

import { spawnSync } from 'node:child_process';
import { existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const SIBLING_APP = resolve(ROOT, '..', 'hcaire');

function header(title) {
  console.log('');
  console.log(`━━━ ${title} ━━━`);
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

function warn(msg) {
  console.warn(`⚠ ${msg}`);
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
}

function countFilesRecursive(dir) {
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) count += countFilesRecursive(p);
    else count += 1;
  }
  return count;
}

function dirSizeMB(dir) {
  if (!existsSync(dir)) return 0;
  let bytes = 0;
  function walk(d) {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else bytes += st.size;
    }
  }
  walk(dir);
  return (bytes / 1024 / 1024).toFixed(1);
}

// ─── 1. sibling check ───────────────────────────────────────────────────────

header('Sibling check');

const appServerSrc = resolve(SIBLING_APP, 'server', 'src');
if (!existsSync(appServerSrc)) {
  fail(`hcaire non trovato come sibling: atteso ${appServerSrc}`);
  console.error('   Assicurati che hcaire/ e hcaire-docs/ siano cartelle sorelle.');
  process.exit(1);
}
ok(`hcaire trovato in ${SIBLING_APP}`);

// ─── 2. TypeDoc ─────────────────────────────────────────────────────────────

header('TypeDoc');

const typedocConfig = resolve(ROOT, 'typedoc.json');
if (!existsSync(typedocConfig)) {
  fail(`typedoc.json mancante in ${ROOT}`);
  process.exit(1);
}
ok('typedoc.json presente');

const typedocOut = resolve(ROOT, 'static', 'typedoc');

console.log('  Generazione in corso (può richiedere 30-60s)...');
const result = spawnSync('npx', ['typedoc'], {
  cwd: ROOT,
  shell: process.platform === 'win32',
  stdio: ['ignore', 'pipe', 'pipe'],
  encoding: 'utf-8',
});

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  fail(`TypeDoc terminato con exit code ${result.status}`);
} else {
  // TypeDoc emette warning su stderr ma su stdout c'è il summary
  const lines = (result.stdout || '').split('\n').filter(Boolean);
  const summary = lines[lines.length - 1] || '';
  if (existsSync(typedocOut)) {
    const fileCount = countFilesRecursive(typedocOut);
    const sizeMB = dirSizeMB(typedocOut);
    ok(`TypeDoc generato — ${fileCount} file, ${sizeMB} MB`);
    if (summary.includes('warning')) {
      warn(`  ${summary.trim()}`);
    }
  } else {
    fail('TypeDoc terminato OK ma static/typedoc/ non trovato');
  }
}

// ─── 3. OpenAPI ─────────────────────────────────────────────────────────────

header('OpenAPI');

const openapiPath = resolve(ROOT, 'static', 'openapi.yaml');
if (!existsSync(openapiPath)) {
  warn(`static/openapi.yaml mancante. Il viewer /api-reference/ non funzionerà.`);
  warn(`  → vedi docs/30-api/openapi.md per ricreare lo spec.`);
} else {
  const sizeKb = (statSync(openapiPath).size / 1024).toFixed(1);
  ok(`static/openapi.yaml presente (${sizeKb} KB)`);
}

// ─── 4. Riepilogo ───────────────────────────────────────────────────────────

header('Riepilogo');

if (process.exitCode === 1) {
  console.error('');
  console.error('Sync terminato con errori. Vedi sopra.');
  process.exit(1);
}

console.log('');
console.log('Sync completato. Prossimi passi:');
console.log('  • npm run start   → dev server con i nuovi artefatti');
console.log('  • npm run build   → build statico (TypeDoc + OpenAPI inclusi)');
