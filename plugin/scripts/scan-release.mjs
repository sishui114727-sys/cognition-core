import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';

function arg(name, fallback = '') {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const root = path.resolve(arg('--dir', ''));
const ownerId = String(arg('--owner-id', '')).trim();
const allowContact = String(arg('--allow-email', '')).trim();
if (!root) {
  console.error('usage: node scripts/scan-release.mjs --dir <release-dir> [--owner-id <QQ>] [--allow-email <public-contact>]');
  process.exit(2);
}

const patterns = [
  /C:\\Users\\/i,
  /\/home\/[^/\s]+\//,
  /\/Users\/[^/\s]+\//,
  /SESSDATA\s*[=:]/i,
  /access_token\s*[=:]/i,
  /Authorization:\s*Bearer/i,
  /@qq\.com/i,
];
if (ownerId) patterns.push(new RegExp(ownerId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

const hits = [];
for (const file of await walk(root)) {
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch {
    continue;
  }
  const scanText = allowContact ? text.split(allowContact).join('<PUBLIC_CONTACT>') : text;
  for (const pattern of patterns) {
    if (pattern.test(scanText)) {
      hits.push({ file: path.relative(root, file), pattern: pattern.source });
      break;
    }
  }
}

const scanned = await walk(root);
// 空目录返回 ok 是最危险的假阴性：扫描器什么都没看却报告干净。
if (scanned.length === 0) {
  console.error(JSON.stringify({ ok: false, error: 'no files scanned', dir: root }, null, 2));
  process.exit(4);
}

if (hits.length) {
  console.error(JSON.stringify({ ok: false, hits }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, filesScanned: scanned.length, hits: 0 }));
