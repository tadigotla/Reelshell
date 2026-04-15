#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MODULE_ORDER = [
  'dom.js',
  'state.js',
  'output.js',
  'history.js',
  'themes.js',
  'fs.js',
  'persist.js',
  'dvr.js',
  'autocomplete.js',
  'commands.js',
  'boot.js',
  'main.js',
];

const TEMPLATE_PATH = join(__dirname, 'terminal.template.html');
const SRC_DIR       = join(__dirname, 'src');
const OUTPUT_PATH   = join(__dirname, 'terminal.html');
const PLACEHOLDER   = '<script id="app"></script>';

const template = readFileSync(TEMPLATE_PATH, 'utf8');

if (!template.includes(PLACEHOLDER)) {
  console.error(`build.mjs: placeholder '${PLACEHOLDER}' not found in ${TEMPLATE_PATH}`);
  process.exit(1);
}

const modules = MODULE_ORDER.map((name) => {
  const body = readFileSync(join(SRC_DIR, name), 'utf8').replace(/\s+$/, '');
  return { name, body, bytes: body.length };
});

const concatenated = modules
  .map(({ name, body }) => `/* \u2500\u2500 ${name} \u2500\u2500 */\n${body}`)
  .join('\n\n');

const scriptBlock = `<script>\n${concatenated}\n</script>`;
const output = template.replace(PLACEHOLDER, () => scriptBlock);

writeFileSync(OUTPUT_PATH, output);

const totalBytes = Buffer.byteLength(output, 'utf8');
console.log(`build.mjs → terminal.html`);
console.log(`  total:    ${totalBytes.toLocaleString()} bytes`);
console.log(`  modules:  ${modules.length}`);
for (const { name, bytes } of modules) {
  const pad = ' '.repeat(Math.max(0, 16 - name.length));
  console.log(`    ${name}${pad}${bytes.toLocaleString()} bytes`);
}
