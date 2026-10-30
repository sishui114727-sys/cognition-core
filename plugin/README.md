# cognition-core

社区版认知核心。

可以作为 QQA 插件安装，但还不替代旧记忆插件，也不自动注入人格。  
它提供**认知与自我模型的地基**，通过只读工具和受控 ActionBus 暴露能力。

## 当前阶段

```text
Phase 1  事件地基       完成
Phase 2  认知与自我模型 完成
Phase 3  行动总线       完成
Phase 4  低风险 Adapter 完成（mock + sticker）
Phase 5  更多 Adapter   完成（music + private chat + mock host）
Phase 6  文档与 token  完成（使用说明、兼容性、ContextPack）
Phase 7  权限与 GUI    完成（权限等级、功能开关、时间窗、日/周限额、只读面板）
Phase 8  QQA host      完成（setup/activate、settings→Gateway、snapshot→storage、只读工具）
Phase 9  记忆迁移      完成（3764 条冻结事件导入，旧三套记忆引擎停写）
Phase 10 顶栏与注入    完成（顶栏「认知」、ContextPack 默认关闭、49 项测试）
Phase 11 检索评估      完成（200 样本 lexical proxy；600 token 为默认预算）
Phase 12 A/B           完成（基线 vs 600 token 注入；+305 token/轮，缓存无明显崩塌；注入已关闭）
Phase 13 认人迁移      完成（21 人 / 21 关系 / 67 印象；新认人卡片已在群聊验证）
Phase 14 真实 sticker  完成（owner-only 真实发送已验收；admin 变更需重载）
Phase 15 旧工具收口    完成（memory_append/query/remove 已禁用）
Phase 16 人设卡移除    完成（persona / per-chat / customPersonas 全部清空并验证）
Phase 17 Owner/SelfModel 完成（owner 关系入库；SelfModel v1；未注入）
Phase 18 超时修复    完成（person-cards 索引；cognition_self 只读工具）
Phase 19 真实私聊    完成（owner-only 真实发送已验收）
Phase 20 SelfModel   完成（只读工具；不自动注入）
Phase 21 B站只读    完成（搜索/视频信息；真实 API + QQ action log 通过）
Phase 22 小黑盒只读  完成（信息流真实 API + QQ action log 通过）
Phase 23 QQ空间只读  完成（真实 QQ action log 通过）
Phase 24 QQ空间发布  完成（core Adapter 真实发布成功；旧发布工具已关闭）
Phase 25 公开版      完成（0.20.0 公开包；协议/导出/扫描/核心/风险/冲突文档）
Phase 26 表情额度    完成（默认无限制；stickerDailyLimit 可配置）
Phase 27 表情收藏    完成（list / query / tag / random；0.21.0）
Phase 28 记忆生长    完成（dialogue → Episode → Cognition → SelfModel；0.22.0，默认关闭）
Phase 29–36 注入攻坚  完成（0.22.1–0.22.8：turns 记账、BM25+RRF、superseded 指针、retrieve 接进注入）
Phase 37 注入上线    完成（0.22.9 真实私聊首命中；检索词改用本轮原话）
Phase 38–41 止血    完成（0.22.10–0.22.13：降级不污染、空包留痕、去重、补录 mtime 精度竞态）
Phase 42–43 A+B 抽取 完成（0.22.14–0.22.15：偏好/事实窄规则、candidate 不注入、孤句也抽取）
Phase 44–49 记忆三件套 完成（0.23.0–0.23.5：timeline / observation / raw，owner-only，证据链可追溯）
Phase 50 注入遥测     完成（0.23.5：injection-stats + 面板记忆健康）
Phase 51 宿主重载    完成（0.23.7–0.23.8：56 秒重载下仍要去重；inject-state.json 落盘）
Phase 52 写入幂等    完成（0.23.9–0.23.12：mid 重叠拦截、record-state 落盘、历史重复迁移 153 条）
Phase 53 抽取精度    完成（0.23.13：修 3 个假阳性、补宾语前置偏好、退役 1 条假记忆）
Phase 54 约定与关系  完成（0.23.15–0.23.18：四维判定、撤销、期限、覆盖、面板 C/D 块）
```

```text
QQA 已安装 cognition-core 0.23.14
adminId 已绑定，真实表情/私聊/群聊链路均已验证
owner 关系已入库；SelfModel v1 只读检索，不注入
真实数据（2026-10-30 21:30）：4640 事件 / 290 Episode / 8 条认知（迁移后重复组 0）
注入：已开启，私聊+群聊，stable 认知 + 本会话事件，预算 600 token / 最多 3 条
巩固：已开启，30 分钟一次；日志带 events/ms，超阈值告警（KI-004）
去重：跨轮 5 分钟 + 跨重载落盘；写入侧 mid 重叠 ≥60% 整批跳过
抽取：偏好 + 事实 + 约定 + 关系（含纠正/别名/QQ/宾语前置/称呼/格式规则）；边界只喂 SelfModel
无自动注入人设卡；不会跨会话串私聊记忆
```

## 文档

- [使用说明](docs/USER_GUIDE.zh-CN.md)
- [兼容性说明](docs/COMPATIBILITY.zh-CN.md)
- [Token 预算与优化](docs/TOKEN_BUDGET.zh-CN.md)
- [权限 GUI 说明](docs/GUI.zh-CN.md)
- [QQA 顶栏模块](docs/QQA_TOPBAR.zh-CN.md)

## 数据模型

```text
IdentityAnchor
Person
Relationship
Event            只追加
Episode          只追加
Cognition        只追加修订，最新版本物化
SelfModel        只追加版本，每个版本带 change
```

### Event

```text
id, time, scope, source {type,id,ref}, participants,
text, summary, confidence, salience, privacy, metadata
```

每条 Event 必须有 `source.ref`，保证可回到原文。

### Cognition

```text
id, scope, kind, subject, relation, object, statement,
evidenceEventIds, evidenceEpisodeIds,
confidence, contradictions,
status: candidate / stable / contested / retired,
revision, changeReason
```

- `stable` 必须至少有一条证据
- 更新不覆盖旧版本，只追加 `revision + 1`
- `history(id)` 可回看完整修订

### SelfModel

```text
version
values
commitments
boundaries
openQuestions
selfNarrative
updatedAt
change { reason, evidenceIds, actor, changedFields }
```

- 每个版本都是 append-only
- 不静默覆盖
- 每个版本必须写 `change.reason`
- `changedFields` 由前后版本自动计算

## 命令

```bash
node --test

node scripts/import-legacy.mjs --source-root "<QQA data dir>"           # dry-run
node scripts/import-legacy.mjs --source-root "<QQA data dir>" --write   # 写入 data/events.jsonl
```

也可以设置环境变量 `QQA_DATA_DIR` 代替 `--source-root`。

## 当前导入结果

```text
mem-layered blocks   294
cross-memory        3458
life-events           12
total               3764
```

冻结导入在 QQA 停止后进行。

## 设计约束

- 模块顶层不做 IO
- EventStore / JsonlStore 首次 append 才创建文件
- append 串行
- 读到坏行显式报错，不静默跳过
- IdentityAnchor 不接受 personality 字段
- 每条 Event 必须带 source.ref
- 认知不覆盖，只追加修订
- 自我模型不覆盖，只追加版本
- 不注入提示词，不自动行动，不写人格文件

## 行动总线

```text
ActionBus
  register(capability)
  execute({ action, senderId, confirmed, target, ... })
  action-log.jsonl
```

所有能力默认：

```text
ownerOnly: true
```

另外强制：

- 公共/不可逆动作需要 `confirmed`
- 数据外发（egress）需要 `confirmed`
- 自毁动作需要 `confirmed`
- 非主人一律拒绝
- 拒绝和成功都写审计

`origin: 'self'` 表示认知核心自己发起，不是用户输入。  
宿主调度器才能设置它；用户输入不得设置，否则等于绕过 P2。

## 低风险 Adapter

```text
src/adapters/mock.js        无副作用 mock
src/adapters/sticker.js     本地表情目录选择，不发送
src/adapters/music.js       本地音乐目录选择，不播放
src/adapters/private-chat.js owner-only 私聊端口 + mock transport
src/adapters/mock-host.js   无 QQ/无网络/无桌面的组合宿主
```

StickerAdapter：

- 读取本地 `catalog.json`
- 支持 `stickerId` 或 `tags`
- 校验路径不能逃出 root
- 校验文件存在与大小
- 只返回 payload，不发送到 QQ

MusicAdapter：

- 读取本地 `catalog.json`
- 支持 `trackId` 或 `tags`
- 校验路径不能逃出 root
- 只返回 payload，不播放

PrivateChatAdapter：

- `transport.send` 由宿主注入
- 默认只允许发给 owner
- 只允许 owner / self 发起
- 不接真实 QQ

MockHost：

```js
const host = createMockHost({ dataDir, identity, stickerCatalog, musicCatalog });
```

## 还不做

- 自动从对话归纳 Cognition
- 自动更新 SelfModel
- 真实私聊/表情/B站/QQ
- 桌面控制
- QQA 安装

## 权限 GUI

QQA 设置表单（可编辑）：

```text
最高权限等级 L0–L4
11 个功能接口开关
每个社交/评价/发布功能：
  允许时间窗
  每日条数上限
  每周条数上限
  冷却分钟
```

插件页：

```text
panel/overview.html
```

它是只读总览。  
QQA 的插件页面通道只读，避免页面绕过配置与权限校验；修改仍走设置表单。

## ContextPack 评估

```bash
node scripts/evaluate-context.mjs \
  --data-dir "<QQA core data dir>" \
  --samples 200
```

结果写入 `docs/context-eval.json`，不包含聊天原文。

## A/B 数据

```text
docs/ab-baseline.json
docs/ab-injection.json
docs/phase12-ab-report.md
```

## 公开版文档

```text
docs/核心架构.md
docs/数据收集协议.md
docs/CONSENT.zh-CN.md
docs/炸机说明（必看！！！！）.md
docs/PUBLIC_RELEASE.zh-CN.md
docs/命名规范.md
```

## 记忆生长（0.23.x，注入与巩固均已开启）

```text
dialogue Event
  → Episode            同 scope、≤30 分钟、≤20 条、≥1 条（孤句也成段，否则抽不出认知）
  → 候选 Cognition     只从主人发言抽；首命中即止；偏好/事实/边界三类
  → stable Cognition   证据 ≥2 且跨 ≥2 情境且 confidence ≥0.7
  → 注入               只有 stable 进 ContextPack（injectCognitionStatus=stable）
```

工具与脚本：

```text
cognition_consolidate { dryRun }     owner-only；dryRun 只报告
cognition_mem_timeline { days, limit, kinds, query, scope }   owner-only；按天列事件/剧集/认知
cognition_mem_observation { id, limit }                       owner-only；认知或剧集的证据链与版本历史
cognition_mem_raw { ids }                                     owner-only；按事件 id 读原话
cognition_mem_terms { kind, status }                          owner-only；关系与约定两张表（C/D）
scripts/consolidate.mjs              默认 dry-run，--apply 才写
scripts/verify-memory-tools.mjs      真实数据只读副本上验证三件套（12 项断言）
scripts/audit-extraction.mjs         只读审计抽取召回：命中数、规则分布、漏句清单
scripts/eval-retrieval.mjs           只读评测检索基线：hit@1/3/8、MRR、拒识率（接向量前先量）
scripts/migrate-duplicates.mjs       历史重复事件迁移：默认 dry-run，带引用修复与备份
scripts/retire-cognition.mjs         退役一条认知（追加修订，不删历史）
scripts/eval-refusal.mjs             只读评测拒识规则：22 条标注，比误拒/误纳
scripts/build-release.mjs            社区发布构建：混淆 + 双包 + 混淆后跑全量测试自检
```

三个查看工具的粒度是刻意分开的：时间线回答"发生过什么"，观察层回答"结论是什么、凭什么"，
原始层回答"原话到底怎么说的"。结论会漂移，原话不会；三者必须能一路对上。

配置四个：`consolidateEnabled`（默认 false）、`consolidateIntervalMin`（默认 30）、
`injectContextKinds`（all/private/group）、`injectCognitionStatus`（stable/any，默认 stable）。

设计与限制：`docs/记忆生长链路.md`、`docs/KNOWN_ISSUES.md`（KI-004…KI-010）。

## 约定与关系（0.23.15，C/D 两类记忆）

判定用的是主人给的四维逻辑树，不是关键词表：

```text
维度 1  这句话在"定身份"还是"定规矩"？   定身份 → relationship；定规矩 → agreement
维度 2  全局还是场景？                   关系是底色（聊什么都在），约定只在任务里生效
维度 3  违约代价是"人设崩"还是"没按规矩"？ 前者是关系，后者是约定
维度 4  怎么解除？                       关系要明确声明（绝交/结束扮演）；约定可单方面撤回或到期
```

存储（与其它认知同一张表，带结构化字段）：

```text
kind = relationship   object = role:<角色>      metadata.attrs = { role }
kind = agreement      object = call:<称呼> / format:<限制> / rule:<原句>   metadata.attrs = { rule, value }
```

两条原则：

1. **明确声明直接 stable**：`你是我的赛博伴侣` / `请叫我老板` 是指令不是推断，不需要等第二次证据
   （correction 早就是这个策略）。误判靠窄规则 + `audit-extraction` 审计 + `retire-cognition` 退役控制。
2. **不恢复人设卡**：关系与约定只作为普通认知参与检索，**按本轮回合的话是否相关**决定要不要注入，
   不做全局 system prompt 注入。`请叫我老板` 按主人给的边界案例默认归为"称呼约定"，不升级成主从关系。

```text
你是我的X / 我把你当作X / 你就像我的X一样 / 我们是X        → relationship
请叫我X（称呼约定）                                      → agreement: call
不要用X回复我（输出格式）                                 → agreement: format
以后你每次回答前先加一个颜文字（时间锚 + 任务词 + 义务词）   → agreement: rule
引用别人的话、问句（"你是想回家？"）不作为证据

我们绝交 / 结束扮演 / 做回助手                            → 退役该会话里的关系
以后不用加颜文字了 / 不用再叫我老板了                      → 退役内容匹配的那条约定（不写新条目）

约定还会自己退场：新的称呼/格式约定顶掉旧的；写了期限的约定到期自动退役。
到下周五为止 / 截止到月底 / 直到年底 / 三天内 / 两周内 / 一个月内   → attrs.expiresAt（只对 Asia/Hong_Kong 生效）
```

约定带 `attrs.scenario`（code / document / group / conversation），只从原句能读出的词判断，读不出就按对话算；
关系的 `attrs` 是 `{ role, subject, ownerLabel, object: 'assistant' }`，可以据此拼关系图。
`cognition_mem_terms` 是这两张表的只读视图（主人专用），已撤销的默认不列出。
场景在注入时只影响**排序**（聊到代码时先给代码约定），不做硬过滤。

## 下一步

```text
已完成（0.23.x）  注入去重 + 命中遥测 + 记忆三件套 + 面板记忆健康
已完成（0.23.10） 跨重载状态落盘（inject-state / record-state），重复事件写入侧归零
待做             抽取召回（KI-005）；语义召回（需 embedding 依赖，排在最后）
待你决定         历史重复事件迁移（需带引用修复，append-only 不删）
交付            Git 仓库地址与署名、公开包发布渠道
```






