import path from 'node:path';
import { CognitionCore } from '../src/core.js';
import { runConsolidation } from '../src/consolidation-pipeline.js';

function arg(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const dataDir = path.resolve(arg('--data-dir', ''));
const ownerArg = String(arg('--owner-id', '')).trim();
const apply = process.argv.includes('--apply');
if (!dataDir) {
  console.error('usage: node scripts/consolidate.mjs --data-dir <core data> [--owner-id <QQ>] [--apply]');
  console.error('默认 dry-run：只报告将要写入什么，不动任何文件。加 --apply 才真正写入。');
  process.exit(2);
}

const probe = new CognitionCore({ dataDir });
let ownerId = ownerArg;
if (!ownerId) {
  const owners = (await probe.people.list()).filter((person) => person.isOwner === true);
  if (owners.length === 1) ownerId = owners[0].id;
  await probe.people.close();
}
if (!ownerId) {
  console.error('找不到唯一的主人：请显式传 --owner-id，或先运行 scripts/bind-owner.mjs。');
  process.exit(2);
}

const core = new CognitionCore({ dataDir, identity: { adminId: ownerId, relation: 'owner' } });
try {
  const report = await runConsolidation({ core, dryRun: !apply });
  console.log(JSON.stringify({ dataDir, ownerId, applied: apply, report }, null, 2));
} finally {
  await core.people.close();
  await core.store.close();
  await core.episodes.close();
  await core.cognitions.close();
  await core.selfModel.close();
  await core.relationships.close();
}
