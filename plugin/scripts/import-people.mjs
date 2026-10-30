import path from 'node:path';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { EventStore } from '../src/store.js';
import { PersonStore, RelationshipStore } from '../src/people.js';

function arg(name, fallback = '') {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const memoryRoot = path.resolve(arg('--memory-dir', ''));
const dataDir = path.resolve(arg('--data-dir', ''));
const ownerId = String(arg('--owner-id', '')).trim();
if (!memoryRoot || !dataDir) {
  console.error('usage: node scripts/import-people.mjs --memory-dir <QQA data/memory> --data-dir <cognition core data> [--owner-id <QQ>]');
  process.exit(2);
}

function scopeFromDir(name) {
  const m = /^(group|private)_(.+)$/.exec(name);
  if (!m) return null;
  return m[1] === 'group'
    ? { kind: 'group', id: m[2] }
    : { kind: 'person', id: m[2] };
}

async function listPersonFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === 'backups') continue;
      const scope = scopeFromDir(entry.name);
      if (!scope) continue;
      for (const file of await readdir(path.join(dir, entry.name), { withFileTypes: true })) {
        if (!file.isFile() || !file.name.endsWith('.json') || file.name === '_meta.json') continue;
        out.push({ file: path.join(dir, entry.name, file.name), scope, chatKey: `${scope.kind}:${scope.id}` });
      }
    }
  }
  return out;
}

const files = await listPersonFiles(memoryRoot);
const people = new Map();
for (const item of files) {
  let data;
  try {
    data = JSON.parse(await readFile(item.file, 'utf8'));
  } catch {
    continue;
  }
  const uid = String(data?.userId || path.basename(item.file, '.json')).trim();
  if (!uid) continue;
  const person = people.get(uid) || { id: uid, name: '', chats: new Map(), impressions: [], updatedAt: 0 };
  if (data?.name) person.name = String(data.name);
  person.updatedAt = Math.max(person.updatedAt, Number(data?.updatedAt) || 0);
  const rows = Array.isArray(data?.impressions) ? data.impressions : [];
  person.chats.set(item.chatKey, (person.chats.get(item.chatKey) || 0) + rows.length);
  for (const impression of rows) {
    const text = String(impression?.content || '').trim();
    if (!text) continue;
    person.impressions.push({
      text,
      createdAt: Number(impression?.createdAt) || Number(data?.updatedAt) || Date.now(),
      chatKey: item.chatKey,
      scope: item.scope,
      ref: item.file,
    });
  }
  people.set(uid, person);
}

const events = new EventStore({ dataDir });
const existingEventIds = new Set((await events.readAll()).map((event) => event.id));
const personStore = new PersonStore({ dataDir });
const relationshipStore = new RelationshipStore({ dataDir });
let personCount = 0;
let relationshipCount = 0;
let impressionCount = 0;
const personIndex = {};

for (const [uid, person] of people) {
  const isOwner = ownerId && String(ownerId) === String(uid);
  await personStore.append({
    id: uid,
    platform: 'qq',
    displayName: person.name || undefined,
    isOwner,
    metadata: {
      impressionCount: person.impressions.length,
      chatKeys: [...person.chats.keys()],
    },
  });
  personCount += 1;
  await relationshipStore.append({
    id: `rel:qq:${uid}`,
    personId: uid,
    role: isOwner ? 'admin' : 'known',
    trust: isOwner ? 1 : 0.5,
    permissions: isOwner ? ['local-tools', 'memory-read', 'memory-write'] : [],
    boundaries: [],
    metadata: {
      chatKeys: [...person.chats.keys()],
      impressionCount: person.impressions.length,
      lastUpdatedAt: person.updatedAt || undefined,
    },
  });
  relationshipCount += 1;
  personIndex[uid] = person.impressions.map((impression) => ({
    text: impression.text,
    chatKey: impression.chatKey,
    scope: impression.scope,
    at: impression.createdAt,
  }));
  for (const impression of person.impressions) {
    const id = `legacy:impression:${uid}:${impression.createdAt}:${createHash('sha1').update(impression.text).digest('hex').slice(0, 12)}`;
    if (existingEventIds.has(id)) continue;
    existingEventIds.add(id);
    await events.append({
      id,
      time: impression.createdAt,
      scope: impression.scope,
      source: {
        type: 'legacy-impression',
        id: `${person.chats.size}:${uid}`,
        ref: `${impression.ref}#${id}`,
      },
      participants: [{ id: uid, role: 'subject' }],
      text: impression.text,
      confidence: 0.4,
      salience: 0.55,
      privacy: impression.scope.kind === 'group' ? 'group' : 'private',
      metadata: { personId: uid, chatKey: impression.chatKey },
    });
    impressionCount += 1;
  }
}

await events.close();
await personStore.close();
await relationshipStore.close();
await mkdir(dataDir, { recursive: true });
await writeFile(path.join(dataDir, 'person-cards.json'), `${JSON.stringify({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  people: personIndex,
}, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  files: files.length,
  people: personCount,
  relationships: relationshipCount,
  impressions: impressionCount,
}, null, 2));
