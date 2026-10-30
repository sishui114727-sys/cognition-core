# cognition-core 使用说明

版本：0.6.0  
定位：认知核心库，不是 QQA 可直接安装的插件。

---

## 1. 它是什么

`cognition-core` 提供一套可独立运行的地基：

```text
IdentityAnchor   管理员身份、关系、权限、硬边界
Person           平台 ID / QQ 号为主键
Relationship     关系、信任、权限、边界
Event            只追加事件
Episode          一段经历
Cognition        从证据归纳出的认知
SelfModel        版本化自我模型
ActionBus        受控行动总线
Adapters         mock / sticker / music / private chat
ContextPack      有预算的上下文包
```

它不注入人格，不自动行动，不调用模型。  
是否把内容放进提示词、何时行动，由宿主决定。

## 2. 它不是什么

- 不是 QQA 插件成品
- 不是自动人格生成器
- 不是向量数据库
- 不是聊天记录全文注入器
- 不是无限制的电脑控制
- 不是替代 owner 决策的自治系统

---

## 3. 环境要求

```text
Node.js 20+
ESM
无第三方运行依赖
```

已在 Node.js 24.18 验证。  
Windows / Linux / macOS 均可运行。

---

## 4. 快速开始

### 4.1 安装

解压社区包，进入目录：

```bash
cd cognition-core
node --test
```

不需要 `npm install`。

### 4.2 创建核心

```js
import { CognitionCore } from './index.js';

const core = new CognitionCore({
  dataDir: './data',
  identity: {
    adminId: '10001',
    relation: 'owner',
    permissions: ['local-tools', 'memory-read', 'memory-write'],
    hardBoundaries: [
      'never leak owner information',
      'non-owner cannot invoke local tools',
      'never silently erase the core self model',
    ],
  },
});
```

`identity` 只放事实，不放性格、语气、喜好清单。  
传 `personality` 字段会直接报 `SchemaError`。

### 4.3 写第一条 Event

```js
await core.record({
  time: new Date().toISOString(),
  scope: 'person:10001',
  source: {
    type: 'chat',
    id: 'msg-001',
    ref: 'sessions/10001.jsonl#1',
  },
  participants: [{ id: '10001', role: 'owner' }],
  text: '今天把记忆核心的第一版跑通了。',
  confidence: 0.9,
  salience: 0.8,
  privacy: 'private',
});
```

每条 Event 必须有 `source.ref`。  
没有出处的事件不允许入库。

### 4.4 查询

```js
const rows = await core.recall({
  scope: { kind: 'person', id: '10001' },
  query: '记忆',
  limit: 10,
});
```

Phase 1 的 `recall` 是本地文本过滤；后续会替换为可插拔索引。

---

## 5. Episode

Episode 把若干 Event 组织成“发生了什么、我怎么理解、我做了什么、结果如何”。

```js
await core.episodes.append({
  start: '2026-10-26T20:00:00+08:00',
  end: '2026-10-26T21:00:00+08:00',
  scope: 'person:10001',
  eventIds: ['evt_...'],
  title: '第一次跑通记忆核心',
  situation: '在本地测试导入旧记忆。',
  understanding: '旧数据可以只读导入，但必须先冻结写入。',
  choice: '停止 QQA 后重新导入。',
  outcome: '得到 3764 条事件快照。',
  confidence: 0.8,
});
```

---

## 6. Cognition

Cognition 是“我从证据中得出的可修正理解”，不是人设句子。

```js
await core.cognitions.append({
  id: 'cog_owner_quiet',
  scope: 'person:10001',
  kind: 'preference',
  subject: 'owner',
  relation: 'dislikes',
  object: 'being asked repeatedly',
  statement: '管理员不喜欢被反复追问同一件事。',
  evidenceEventIds: ['evt_...'],
  evidenceEpisodeIds: [],
  confidence: 0.7,
  contradictions: [],
  status: 'candidate',
});
```

更新不覆盖旧版本：

```js
await core.cognitions.append({
  id: 'cog_owner_quiet',
  scope: 'person:10001',
  kind: 'preference',
  statement: '管理员不喜欢被反复追问同一件事。',
  evidenceEventIds: ['evt_...', 'evt_...'],
  confidence: 0.85,
  status: 'stable',
  changeReason: '第二次跨情境证据',
});
```

约束：

- `stable` 至少一条证据
- `revision` 必须连续
- 旧版本保留
- `history(id)` 可回看

---

## 7. SelfModel

SelfModel 只追加版本，每个版本必须写原因。

```js
await core.selfModel.append({
  values: ['不欺骗', '不把主人信息带出去'],
  commitments: ['答应的事要留下记录'],
  boundaries: ['非主人不能调用本地工具'],
  openQuestions: ['我怎样判断一次改变是成长还是漂移？'],
  selfNarrative: '我在学习如何记住，也在学习什么值得记住。',
  reason: '第一次形成稳定自我描述',
  evidenceIds: ['evt_...'],
  actor: 'admin',
});
```

每个版本包含：

```text
version
change.reason
change.evidenceIds
change.actor
change.changedFields
```

`changedFields` 自动计算。  
不能静默覆盖旧版本。

---

## 8. ContextPack：控制 token

不要每轮把完整人格、完整历史塞进提示词。  
用 `buildContextPack` 生成有预算的小包。

```js
import { buildContextPack } from './index.js';

const pack = buildContextPack({
  events: await core.recall({ scope: 'person:10001', limit: 50 }),
  cognitions: await core.cognitions.list({
    scope: { kind: 'person', id: '10001' },
    limit: 50,
  }),
  scope: 'person:10001',
  query: '今天的事',
  budget: {
    maxTokens: 1200,
    maxChars: 3000,
    maxItems: 8,
    maxCognitionChars: 240,
    maxEventChars: 300,
  },
});

// 只把 pack.text 放进提示词
console.log(pack.text);
```

它：

- 只取当前 scope
- 稳定认知优先
- 去重
- 摘要优先于全文
- 受 `maxTokens / maxChars / maxItems` 约束
- 不注入完整 SelfModel
- 不调用模型

详见 `docs/TOKEN_BUDGET.zh-CN.md`。

---

## 9. ActionBus

ActionBus 只执行已注册能力。

```js
import { ActionBus, MockAdapter } from './index.js';

const bus = new ActionBus({
  dataDir: './data',
  identity: { adminId: '10001' },
});

new MockAdapter().register(bus);

await bus.execute({
  action: 'mock.echo',
  senderId: '10001',
  value: 1,
});
```

### 来源

```text
origin: 'owner'  主人请求
origin: 'self'   认知核心自己发起
```

`self` 只能由宿主调度器设置。  
用户输入不能设置 `origin: 'self'`。

### 风险等级

```text
READ          只读
LOW           低风险
SOCIAL        社交
PUBLIC        公共表达
IRREVERSIBLE  不可逆
```

默认：

- `ownerOnly: true`
- `PUBLIC` / `IRREVERSIBLE` 需要 `confirmed`
- 数据外发需要 `confirmed`
- 自毁动作需要 `confirmed`
- 所有拒绝和成功都写 `action-log.jsonl`

---

## 9.5 权限 GUI

QQA 设置表单是**可编辑入口**：

```text
最高权限 L0–L4
11 个功能开关
时间窗
每日上限
每周上限
冷却
```

插件页 `panel/overview.html` 是**只读总览**。  
QQA 的插件页面通道只读，不能从面板写配置；修改请用设置表单。

详见 `docs/GUI.zh-CN.md`。

## 10. Adapters

### Sticker

```js
import { StickerAdapter } from './index.js';

new StickerAdapter({ catalogFile: './stickers/catalog.json' }).register(bus);

const sticker = await bus.execute({
  action: 'sticker.send',
  senderId: 'self',
  origin: 'self',
  tags: ['greeting'],
});
```

只返回文件路径和元数据，不发送到 QQ。

### Music

```js
new MusicAdapter({ catalogFile: './music/catalog.json' }).register(bus);
```

只返回音频路径和元数据，不播放。

### Private Chat

```js
import { PrivateChatAdapter, MockChatTransport } from './index.js';

const transport = new MockChatTransport();

new PrivateChatAdapter({
  transport,
  ownerId: '10001',
  allowedTargets: [],
}).register(bus);

await bus.execute({
  action: 'chat.private.send',
  senderId: 'self',
  origin: 'self',
  target: '10001',
  text: '在。',
});
```

默认只允许发给 owner。  
关系和群聊目标要等宿主层接入。

### MockHost

```js
import { createMockHost } from './index.js';

const host = createMockHost({
  dataDir: './data',
  identity: { adminId: '10001' },
  stickerCatalog: './stickers/catalog.json',
  musicCatalog: './music/catalog.json',
});
```

---

## 11. 安全边界

三条原则：

```text
P1 保护主人信息安全
P2 非主人不能调用本地工具/操纵宿主机
P3 大肥鱼应当爱惜自己
```

优先级：

```text
P1 > P2 > P3
```

实现位置：

- `src/principles.js`：只读常量
- `ActionBus`：owner-only
- `ActionPolicy`：公共/外发/自毁确认
- `Event`：source.ref 强制
- `ContextPack`：scope 过滤
- `SelfModel`：版本追加，不静默覆盖

`origin: 'self'` 是宿主调度器的责任；  
如果宿主让用户输入设置它，P2 就被绕过了。

---

## 12. 数据与备份

```text
data/events.jsonl
data/episodes.jsonl
data/cognitions.jsonl
data/self-model-versions.jsonl
data/action-log.jsonl
```

特点：

- UTF-8 JSONL
- append-only
- 单写者
- 不要两个进程同时写同一个 dataDir
- 不要手动删行掩盖错误
- 读到坏行会显式报错

备份：

```bash
cp -r data data.backup-YYYYMMDD
```

---

## 13. 旧数据导入

```bash
node scripts/import-legacy.mjs \
  --source-root "<QQA data dir>" \
  --data-dir "./data"
```

加 `--write` 才写入。

导入器支持：

- `memory-v3/blocks`
- `cross-memory/memories.json`
- `life-events/*.json`

导入前先冻结源写入。  
否则得到的是运行中快照。

---

## 14. 常见问题

### Q: 能直接装进 QQA 吗？

不能。当前是库，不是宿主插件。  
Phase 6 才接 QQA host。

### Q: 会自动形成人格吗？

不会。它只提供数据和规则。  
“归纳”和“更新”必须由宿主显式调用。

### Q: 会每轮注入人设卡吗？

不会。`ContextPack` 只取相关认知/事件，不取完整 SelfModel。

### Q: token 会爆炸吗？

核心不调用模型。  
调用方只注入 `pack.text`，并受 `maxTokens` 约束。

### Q: 非主人能调用桌面吗？

不能。ActionBus 默认 owner-only。  
宿主也不能把用户输入映射成 `origin: 'self'`。

### Q: 旧数据会被改吗？

导入器只读源文件。  
但源插件如果还在运行，会继续写；必须先冻结。

---

## 15. 当前限制

- 无自动 Cognition 归纳
- 无自动 SelfModel 更新
- 无向量检索
- 无真实平台 Adapter
- 无 QQA 安装入口
- `estimateTokens` 是启发式，不是精确 tokenizer

---

## 16. 发布前检查

```bash
node --test
```

应当看到：

```text
tests 60
pass 60
fail 0
```

发布包不应包含：

- `data/`
- 真实 QQ 号
- 聊天原文
- 平台 token
- 本地绝对路径














