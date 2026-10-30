import path from 'node:path';
import { readFile, writeFile, copyFile } from 'node:fs/promises';

const dataDir = path.resolve(process.argv[process.argv.indexOf('--data-dir') + 1] || '');
if (!dataDir) {
  console.error('usage: node scripts/dedupe-events.mjs --data-dir <core data>');
  process.exit(2);
}

const file = path.join(dataDir, 'events.jsonl');
let text;
try {
  text = await readFile(file, 'utf8');
} catch {
  console.log('no events.jsonl');
  process.exit(0);
}

const seen = new Set();
const kept = [];
let dropped = 0;
for (const line of text.split(/\r?\n/)) {
  if (!line.trim()) continue;
  let row;
  try { row = JSON.parse(line); } catch { dropped += 1; continue; }
  const id = String(row?.id || '');
  if (!id || seen.has(id)) { dropped += 1; continue; }
  seen.add(id);
  kept.push(line);
}

await copyFile(file, `${file}.before-dedupe-${Date.now()}`);
await writeFile(file, `${kept.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ kept: kept.length, dropped }, null, 2));
