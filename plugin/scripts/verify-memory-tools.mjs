/**
 * 记忆三件套的真实验证：拿线上数据的只读副本，跑 timeline / observation / raw，
 * 检查输出是不是"能一路查到原话"。
 *
 * 用法：node scripts/verify-memory-tools.mjs [--core <线上 core 目录>] [--admin <主人 QQ>]
 * 不写线上任何文件：数据先复制到临时目录，面板快照写到临时目录。
 */
import { cp, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

// 主人 QQ 不写进仓库：默认占位，真实验证时用 --admin 传（或设 COG_ADMIN_ID）。
const ADMIN_ID = flag('--admin', process.env.COG_ADMIN_ID || '10001');

const LIVE_CORE = flag('--core', path.join(
  process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
  'Programs', 'QQ Agent', 'data', 'plugin-data', 'cognition-core', 'core',
));

const checks = [];
const check = (name, pass, detail = '') => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

const work = await mkdtemp(path.join(os.tmpdir(), 'cog-mem3-'));
const core = path.join(work, 'core');
const panelDir = path.join(work, 'panel');
await cp(LIVE_CORE, core, { recursive: true });
// 面板目录直接用仓库里的这一份：之前从 LIVE_CORE 往上推三层是错的，cp 一直静默失败。
await cp(path.join(import.meta.dirname, '..', 'panel'), panelDir, { recursive: true });

const mod = await import('../src/host.js');
const tools = new Map();
const logs = [];
const api = {
  config: () => ({
    adminId: ADMIN_ID,
    enabled: true,
    permissionLevel: 3,
    timeZone: 'Asia/Hong_Kong',
    recordDialogue: false,
    injectContextEnabled: true,
  }),
  registerTool: (def) => tools.set(def.id, def),
  storage: { set: () => {} },
  log: (...parts) => logs.push(parts.join(' ')),
  warn: (...parts) => logs.push(`WARN ${parts.join(' ')}`),
};

await mod.setup(api);
await mod.activate({ dataDir: core, panelDir });

const ownerCtx = { chatKey: `private:${ADMIN_ID}`, triggerSenderId: ADMIN_ID };
const run = async (id, input) => {
  const tool = tools.get(id);
  if (!tool) throw new Error(`missing tool ${id}`);
  return tool.execute(ownerCtx, input);
};

try {
  const timeline = await run('cognition_mem_timeline', { days: 3, limit: 12 });
  console.log('\n===== timeline（近 3 天，12 条） =====\n');
  console.log(timeline.content);
  check('timeline 有输出', Boolean(timeline.content && timeline.content !== '这段时间没有记忆。'));
  check('timeline 带 id 可深挖', /(cog_|ep_|dialogue:)/.test(timeline.content));
  check('timeline 分天聚合', timeline.metadata?.buckets?.length > 0, `buckets=${timeline.metadata?.buckets?.length}`);

  const list = await run('cognition_mem_observation', {});
  console.log('\n===== observation 列表 =====\n');
  console.log(list.content);
  const cogId = (list.content.match(/cog_[0-9a-f-]+/) || [])[0];
  check('observation 能列出条目', Boolean(cogId), cogId || 'none');

  const observation = await run('cognition_mem_observation', { id: cogId });
  console.log(`\n===== observation（${cogId}） =====\n`);
  console.log(observation.content);
  check('observation 含结论', /结论：/.test(observation.content));
  check('observation 含证据链', /证据：\d+ 条原话/.test(observation.content));
  check('observation 证据无缺失', (observation.metadata?.missingEvidence ?? []).length === 0,
    `missing=${(observation.metadata?.missingEvidence ?? []).length}`);

  const evId = (observation.content.match(/(?:dialogue:[^\s]+|evt_[0-9a-zA-Z-]+)/) || [])[0];
  check('observation 能拿到原话 id', Boolean(evId), evId || 'none');

  const raw = await run('cognition_mem_raw', { ids: evId });
  console.log(`\n===== raw（${evId}） =====\n`);
  console.log(raw.content);
  check('raw 含原文', /正文：|对话原文：/.test(raw.content));
  check('raw 与 observation 同源', raw.metadata?.found === 1);

  const denied = await tools.get('cognition_mem_raw')
    .execute({ chatKey: 'group:1', triggerSenderId: '111' }, { ids: evId });
  check('非主人被拒', denied.isError === true);

  const noSuch = await tools.get('cognition_mem_raw').execute(ownerCtx, { ids: 'evt_missing' });
  check('缺失 id 明确报错', noSuch.isError === true);
} finally {
  await mod.deactivate();
  await rm(work, { recursive: true, force: true });
}

const failed = checks.filter((row) => !row.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} 通过`);
if (failed.length) {
  console.log('失败项：');
  for (const row of failed) console.log(`- ${row.name} ${row.detail}`);
  process.exit(1);
}