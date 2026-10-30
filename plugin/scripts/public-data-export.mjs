import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const CONSENT_VERSION = 'public-data-v1';

function arg(name, fallback = '') {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const dataDir = path.resolve(arg('--data-dir', ''));
const outFile = path.resolve(arg('--out', 'public-data.json'));
const consent = arg('--consent', '');
const k = Math.max(3, Number(arg('--k', '5')) || 5);
const dryRun = process.argv.includes('--dry-run');

if (!dataDir || consent !== CONSENT_VERSION) {
  console.error(`usage: node scripts/public-data-export.mjs --data-dir <core data> --out <file> --consent ${CONSENT_VERSION}`);
  process.exit(2);
}

async function readJsonl(file) {
  try {
    const text = await readFile(file, 'utf8');
    return text.split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

function bump(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function publishable(map) {
  const out = {};
  let suppressed = 0;
  for (const [key, count] of Object.entries(map).sort(([a], [b]) => a.localeCompare(b))) {
    if (count >= k) out[key] = count;
    else suppressed += 1;
  }
  return { values: out, suppressed };
}

const [events, cognitions, actions, models] = await Promise.all([
  readJsonl(path.join(dataDir, 'events.jsonl')),
  readJsonl(path.join(dataDir, 'cognitions.jsonl')),
  readJsonl(path.join(dataDir, 'action-log.jsonl')),
  readJsonl(path.join(dataDir, 'self-model-versions.jsonl')),
]);
const persons = await readJsonl(path.join(dataDir, 'persons.jsonl'));
const relationships = await readJsonl(path.join(dataDir, 'relationships.jsonl'));
const uniquePersonIds = new Set(persons.map((person) => person.id));
const uniqueRelationshipIds = new Set(relationships.map((row) => row.id));

const eventSources = {};
const eventScopes = {};
const eventPrivacy = {};
for (const event of events) {
  bump(eventSources, String(event?.source?.type || 'unknown'));
  bump(eventScopes, String(event?.scope?.kind || 'unknown'));
  bump(eventPrivacy, String(event?.privacy || 'unknown'));
}

const cognitionStates = {};
for (const cognition of cognitions) bump(cognitionStates, String(cognition?.status || 'unknown'));

const actionCells = {};
for (const action of actions) {
  const key = [action?.action || 'unknown', action?.feature || 'none', action?.allowed === true ? 'allowed' : 'denied'].join('|');
  bump(actionCells, key);
}

const times = events.map((event) => Date.parse(event?.time)).filter(Number.isFinite);
const days = times.length ? Math.max(1, Math.ceil((Math.max(...times) - Math.min(...times)) / 86400000)) : 0;

let appVersion = '';
try {
  appVersion = JSON.parse((await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8')).replace(/^\uFEFF/, '')).version;
} catch { /* optional */ }

const source = publishable(eventSources);
const scope = publishable(eventScopes);
const privacy = publishable(eventPrivacy);
const cognition = publishable(cognitionStates);
const action = publishable(actionCells);

const report = {
  schemaVersion: 1,
  consentVersion: CONSENT_VERSION,
  generatedAt: new Date().toISOString().slice(0, 10),
  appVersion,
  kThreshold: k,
  totals: {
    events: events.length,
    actions: actions.length,
    cognitions: cognitions.length,
    persons: uniquePersonIds.size,
    relationships: uniqueRelationshipIds.size,
    activeDays: days,
    selfModelVersions: models.length,
  },
  distributions: {
    eventSources: source.values,
    eventScopeKinds: scope.values,
    eventPrivacy: privacy.values,
    cognitionStates: cognition.values,
    actionCells: action.values,
  },
  suppressedCells: source.suppressed + scope.suppressed + privacy.suppressed + cognition.suppressed + action.suppressed,
  note: 'Aggregate counts only. No message text, names, QQ IDs, chat keys, URLs, or model narratives are included.',
};

const json = `${JSON.stringify(report, null, 2)}\n`;
if (dryRun) {
  process.stdout.write(json);
} else {
  await writeFile(outFile, json, 'utf8');
  console.log(`wrote ${outFile}`);
}

