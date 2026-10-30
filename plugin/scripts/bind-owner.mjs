import path from 'node:path';
import { PersonStore, RelationshipStore } from '../src/people.js';
import { SelfModelStore } from '../src/self-model.js';

function arg(name, fallback = '') {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const dataDir = path.resolve(arg('--data-dir', ''));
const ownerId = String(arg('--owner-id', '')).trim();
if (!dataDir || !ownerId) {
  console.error('usage: node scripts/bind-owner.mjs --data-dir <core data> --owner-id <QQ>');
  process.exit(2);
}

const people = new PersonStore({ dataDir });
const relationships = new RelationshipStore({ dataDir });
const selfModel = new SelfModelStore({ dataDir });

const existingPerson = await people.get(ownerId);
await people.upsert({
  id: ownerId,
  platform: 'qq',
  displayName: existingPerson?.displayName,
  isOwner: true,
  metadata: {
    ...(existingPerson?.metadata || {}),
    ownerBoundAt: new Date().toISOString(),
  },
});

const relId = `rel:qq:${ownerId}`;
const existingRel = await relationships.get(relId);
await relationships.upsert({
  id: relId,
  personId: ownerId,
  role: 'admin',
  trust: 1,
  permissions: ['local-tools', 'memory-read', 'memory-write', 'sticker-send'],
  boundaries: [
    'never leak owner information',
    'non-owner cannot invoke local tools',
    'never silently erase the core self model',
  ],
  metadata: {
    ...(existingRel?.metadata || {}),
    ownerBoundAt: new Date().toISOString(),
  },
});

let model = await selfModel.load();
if (!model) {
  model = await selfModel.append({
    values: ['不欺骗', '保护主人信息', '不把非主人当主人'],
    commitments: ['记住并尊重主人身份与关系', '不确定时先说明不确定'],
    boundaries: [
      '非主人不能调用本地工具',
      '不把私聊内容带进群聊',
      '不静默删除核心自我模型',
    ],
    openQuestions: [
      '我如何在不依赖人设卡的情况下形成稳定表达？',
      '哪些经历值得进入长期自我描述？',
    ],
    selfNarrative: '我正在从经历、关系和被纠正的过程中形成自己的判断，而不是从一张固定人设卡里读取自己。',
    reason: 'persona removed; owner relationship and minimal self model initialized',
    evidenceIds: [`owner-binding:${ownerId}`],
    actor: 'admin',
  });
}

await people.close();
await relationships.close();
await selfModel.close();
console.log(JSON.stringify({
  ownerBound: true,
  selfModelVersion: model.version,
  values: model.values.length,
  commitments: model.commitments.length,
  boundaries: model.boundaries.length,
  openQuestions: model.openQuestions.length,
}, null, 2));
