# Changelog

## 0.23.22 — 社区发布包

没有功能改动，只有发布工程与文档。代码与 0.23.21 完全一致。

- `scripts/build-release.mjs`：混淆构建 + 双包产出（社区/GitHub）+ **混淆后自检**
  （把混淆后的 src 跑完 200 条测试，不过就不许出包）
- 发布包只带白名单文档：`docs/` 下有历史报告含主人 QQ 与绝对路径，整目录复制会泄露
- 许可改为 **UNLICENSED**（专有软件，禁止二次开发），`NOTICE.zh-CN.md` 写清允许与禁止的边界
- 新增社区文档：使用说明、完成度说明（记忆/上下文思路逐条对账）、
  更新说明（相较 0.20.0）、发布包与混淆说明；炸机说明按真实插件列表重写
- 修掉 `INSTALL.md` 的历史编码损坏（44 个替换字符）

## 0.23.21 — 拒识阈值：先有标注，再定数

**0.23.20 之前只有"零命中才拒"**，等于没有拒识：10 条日常负例里 6﹣10 条被硬塞结果。

- `scripts/eval-refusal.mjs`：22 条标注集（recall 7 / refuse 15，每条附理由），
  每条回到它原本的 scope 评测；同一份数据上对比 7 类判定规则
- 采用「覆盖率 < 0.25 **且** 命中词 maxIdf < 5 才拒」：误拒 0/7、误纳 6/15
  （原行为 0/7、15/15）；只用覆盖率会误拒长查询，maxIdf 是兜底
- `cognition_recall` 检索前**剔掉本轮这句话自己**：它已在库里时文本相同、必然 100% 命中，
  会把真正该回忆的内容挤到第二名
- `retrieve()` 新增 `maxIdfFloor`；库层默认值仍是 0，阈值写在调用处
- 新增 1 条测试锁住兜底行为（命中稀有词不拒 / 只命中高频词才拒），总计 200 pass

## 0.23.20 — 同义词表：可解释的召回补充

**为什么先做表再谈向量**：0.23.19 实测向量在这份语料上不划算（会拖垮拒识），
而同义词表一小时、零依赖、每条都能人工审阅。先吃掉能解释的那部分。

- `src/synonyms.js`：51 组近义词共 154 词，按主题分组；歧义单字（打/搞/弄）一律不入表
- `scoreLexical` 支持查询扩展：原词没命中时看等价词，同义词命中的频次与覆盖率打六折，
  避免「打车」命中「攻击」
- `cognition_recall` 显式开启扩展；注入路径不动（它走字符重合判定，另算一件事）
- 实测：同义词覆盖查询 hit@1 0% → 23%，hit@8 0% → 53%；
  专有名词查询与负例拒识均无回退（79% / 4-of-10 不变）
- 新增 3 条测试（扩展命中、直接命中优先级、歧义单字不入表），总计 199 pass

## 0.23.19 — 语义召回的离线能力与实测结论

**没有把向量接进运行时。** 装好 Ollama + bge-m3、离线建好全量向量、做了对照评测，
结论是接上去会变差，所以只交付离线能力与结论，不加开关。

- `scripts/eval-retrieval.mjs`：只读检索评测。自造四类查询（专有名词、同义改写、
  语料外负例、日常负例），量化"自检索偏差"与拒识缺口
- `scripts/build-vectors.mjs`：离线建向量侧车（vectors.bin + vectors-index.jsonl），
  幂等，模型/维度/文本哈希随行存；4873 条 67.8s / 19MB
- `src/vectors.js`：读侧车 + **中心化余弦**（不减均值时无关句余弦 0.94–0.98，完全不可用）
- `src/embedder.js`：Ollama 客户端，keep_alive 30m、800ms 超时、失败抛错
- `src/retrieval.js`：新增 `semantic` 通道与 `semanticMinScore`，查询向量由调用方传入
  （retrieve 保持同步、可测）
- 实测：事件查询 hit@1 纯词法 83% / 向量兜底 83% / 并列 RRF 68%；
  同义改写 0% → 11%；现实负例拒识 4/10 → 0/10。详见 `docs/检索设计.md` 第八节、KI-011
- 新增 8 条测试（中心化余弦、侧车读取与缓存、嵌入失败与超时、语义通道门控与拒识）

## 0.23.18 — Phase 54d —— 修格式约定互覆盖 + 面板显示关系与约定

**Bug 修复（0.23.17 引入）**：覆盖检查按 `rule` 分组，导致"不要用英文回复"和"别用表情说话"
互相顶掉——它们本该同时生效。现在只对标 `call`（称呼天然唯一），格式类约定各自独立。
另外撤销匹配以前只要命中一个双字块就算数，改成必须过半，避免"发消息"退掉任何含"消息"的约定。

- **面板新增「关系与约定」块**：关系、约定分组列出，带角色/场景/到期/证据数；
  没有内容时整块不渲染（面板空着比显示 0 更可疑）
- 面板快照写入时多取一次认知表（`collectTerms`），已撤销/被取代的不进面板
- 新增 3 条测试（格式约定并存、面板 C/D 数据、空态），总计 188 pass

## 0.23.17 — Phase 54c —— 约定的期限、覆盖与场景排序

C/D 的第三批：让约定有生命周期，让场景真正影响选择。

- **期限解析**（`src/time-phrase.js`）：`到下周五为止 / 截止到月底 / 直到年底 / 三天内 / 两周内 / 一个月内`
  → `attrs.expiresAt`；到期在巩固时自动退役（`agreement expired: <date>`）。
  只认这几种说法，超过一年不猜；只对 Asia/Hong_Kong 生效（香港无夏令时，固定 +08:00）
- **覆盖**：新的称呼/格式约定顶掉同 scope 同类型的旧约定（`superseded by newer agreement`）。
  实测 `请叫我老板` → `请叫我老哥` 之后，旧的 `call:老板` 变 retired，不并排躺着
- **场景排序**：`buildContextPack` 新增 `scenario` 参数，命中的约定 +15 分排序加成；
  **只影响顺序，不排除条目**（避免"写代码时忘了其它约定"）
- 巩固报告新增 `agreementsRetired`（覆盖 + 到期两类都计）
- 新增 7 条测试（时限 4、覆盖 1、到期 1、场景排序 1），总计 186 pass
- KI-010 更新：时限只认几种说法、场景不硬过滤、正反冲突不裁决

## 0.23.16 — Phase 54b —— 撤销、场景字段、关系与约定视图

C/D 的第二批：让"约定可撤销"和"能查得到"成为真实行为。

- **撤销通道**：`我们绝交 / 结束扮演 / 做回助手` 退役该会话里的关系；
  `以后不用加颜文字了 / 不用再叫我老板了` 按内容匹配退役那条约定。
  撤销只追加 `retired` 修订（`changeReason: revoked by owner: …`），不写新条目、不删历史
- **不误伤**：`不用了`、`以后要好好吃饭` 这类没有指向的句子不算撤销（有测试）
- **结构化字段**：关系写 `attrs { role, subject, object:'assistant' }`；
  约定写 `attrs { rule, value, scenario }`，scenario 只从原句能读出的词判断（code / document / group / conversation）
- **新工具 `cognition_mem_terms`**：关系与约定分表列出（状态 / 场景 / 证据数 / 最近确认），owner-only
- 巩固报告新增 `revoked` 计数；没有可撤销目标时记 `notes: revoke-no-target:*`，不静默
- 新增 6 条测试（撤销匹配、闲聊不触发、反例、视图格式、空态），总计 179 pass
- KI-010 更新：过期时间未解析、scenario 不参与检索执行、`我们绝交` 是全局退役

## 0.23.15 — Phase 54 —— 约定（agreement）与关系（relationship）

按主人给的"四维判定逻辑树"落地 C/D 两类记忆。判定不是关键词表，而是先问：这句话在定身份还是在定规矩？

- **新增 kind**：`relationship` / `agreement`（schema 白名单 + 抽取 + 巩固 + attrs 落库）
- **关系规则**：你是我的X / 我把你当作X / 你就像我的X一样 / 我们是X
  → `object: role:<角色>`，`metadata.attrs.role`
- **约定规则**：请叫我X（称呼）→ `call:`；不要用X回复我（格式）→ `format:`；
  以后你每次回答前先加颜文字（时间锚 + 任务词 + 义务词）→ `rule:`
- **明确声明直接 stable**：关系与约定是指令不是推断，和 correction 同策略；误判靠窄规则 + 审计 + 退役工具
- **不恢复人设卡**：两类都只作为普通认知参与检索，按本轮话是否相关决定注入，不做全局 system prompt 注入；
  `请叫我老板` 按边界案例归为称呼约定，不升级成主从关系
- **精度**：引用他人的话（`[引用 …]`）与 @ 提及剥离后再匹配；问句（`你是想回家？`）不算陈述；
  角色名必须是名词（拒绝"想回家"）
- 实测：历史 678 条 dialogue 的巩固 dry-run 命中 0（历史语料没有这类句子），线上 98 条主人发言 C/D 命中 0
- 新增 8 条测试（句式、问句、引用、端到端巩固稳定化与 attrs），总计 174 pass
- 限制写进 KI-010：撤销不自动处理、无场景绑定、role 是字面抽取

## 0.23.14 — Phase 53b —— 收尾：面板布局审计 + 文档对齐

面板没有视觉评审条件（无视觉模型），所以改成**可测量的布局审计**：headless Edge 在 900 / 1280 / 1600
三档宽度下取 DOM 度量，检查横向溢出、文本截断、最小字号。

- 三档宽度均无横向溢出；`.shell` 上限 1080px 正常
- **修**：记忆健康里的"提示"标签被长数值挤到 14px（只显示一个字）→ `.mem-row span` 设 `flex: 0 0 auto`
- **修**：`.metric span` 10.5px → 11px（1080px 面板里的实际可读下限）
- **修**：`.mem-row strong` 加 `overflow-wrap: anywhere`，长数字串不再顶破卡片
- 审计后 `clipped: []`、`minFont: 11px`；预览图按当前快照重渲染（`panel/overview-preview.png`）
- 文档对齐：README 补 Phase 44–53、版本与真实数据数字、脚本清单；INSTALL 版本号；KI-004/KI-005/KI-008/KI-009 实测记录
- 测试 166 pass

## 0.23.13 — Phase 53a —— 抽取：先修假阳性，再补一条真召回

用线上语料审计（84 条主人事件 / 70 条实义句）后改的，顺序按"错的数据比少的数据危险"：

- **修** `correction` 抽影评："不是发明，是把废料场里的零件重新排成能用的东西"曾变成事实改判
  → 纠正项与纠正值必须是 ≤12 字名词性短语，不以 在/把/被/是… 开头、不以 这/那/它 指代
- **修** `correction` 陈述反义："不是A，而是B"被写成"A 不是 B" → 改回"不是A，是B（主人纠正）"
- **修** `boundary` 抽罗列句："…禁止接入、封号风险、响应档位…" → 含顿号或 >20 字不再算边界
- **增** 宾语前置偏好：`香菜我不吃` → 主人不喜欢香菜（60 条漏句里唯一一条真该抽的）
- **记录** 召回 14%（70 条实义句命中 10），漏的绝大多数是寒暄/问句/临时决定，不该进长期记忆
- 新增只读工具 `scripts/audit-extraction.mjs`；新增 `scripts/retire-cognition.mjs`（退役假记忆，追加修订不删历史）
- 测试 166 pass

## 0.23.12 — Phase 52j —— 历史重复事件迁移（用户批准）

- 新增 `scripts/migrate-duplicates.mjs`：默认 dry-run，`--apply` 才写，写前逐文件备份
- 判重键：**同会话 + 同一组非 self mid**（同一条消息发两次 mid 不同，不会被误删）；
  保留最早一条，其余删除
- 引用必须跟着改，否则等于制造证据缺口：Episode `eventIds`、Cognition `evidenceEventIds`、
  事件 `metadata.replyTo` 全部改指保留记录，并在单条记录内去重
- 线上执行（2026-10-30 21:00，宿主停机状态下）：
  ```text
  events 4789 → 4636（删 153 条 / 102 组，重复组大小 2~6）
  引用修复：episodes 86 / cognitions 4 / replyTo 29
  校验：重复组 0 · 悬空引用 0 · 记录内重复引用 0 · 二次 dry-run removed 0（幂等）
  ```
- 回滚：`<file>.before-migration-1793365181666` 三个备份整份覆盖即可
- 测试 163 pass

## 0.23.11 — Phase 52i —— KI-004 先测量再决定：不做增量索引

- 真实数据测成本：4766 事件 `readAll` **34.5ms** + `episodes.list` 1.9ms ≈ 36ms，巩固 30 分钟一次
- 结论：为 36ms/30min 引入"按字节游标可能漏事件"的迁移，不符合"正确优先于性能" → **暂不做增量索引**
- 改为可观测：巩固日志带上 `events N / Xms`，`events ≥ 20000` 或 `ms ≥ 200` 时 warn（阈值写进 KI-004）
- 顺手修文档失真：`host.js` 里"messages 能拿到上一轮 assistant"的注释（实测只有 `[system, user]`）；
  README「下一步」还停在 0.22.0
- 测试 163 pass

## 0.23.10 — Phase 52h —— 写入幂等收口：重叠判定 + 落盘

- 新增第三种形态拦截：**mid 重叠 ≥60% 就整批跳过**（`record-skip-overlap`）。
  线上重复的尾部形态是"批次末尾多一条拍一拍/引用扩展"，精确键和"最后一条正文"都会变，只有 mid 重合度稳定
- 写入幂等键落盘 `record-state.json`（上限 768 键 / 10 分钟过期 / 传输截断 200 字），
  `activate` 恢复、`deactivate` 先存后清；修掉"先清再存"的同款顺序 bug
- 测试 162 pass（新增：批次增长不重复、重载后不重复、record-state 往返/过期/损坏降级）

## 0.23.9 — Phase 52f —— 重复事件还有 20%，mid 集合做键不够

0.23.7 之后复查写入侧：今天 12:00 后仍有 **71 组 / 138 条**同分钟重复事件。

- **根因**：宿主的两次回调 mid 集合并不相同（一次带 1 条、一次带 2 条），
  原来的键是"整批 mid 排序后拼接"，集合一变键就变，同一条消息被写两遍
- **修法**：加"正文幂等"——用**最后一条对方消息**做键（不是整批拼接），30 秒窗口内同文只记一次；
  mid 集合键保留（10 分钟）。用最后一条是因为"多带一条"会改掉整批签名，而触发的还是同一条
- 命中时记 `[cognition] record-skip-dup`，可在线统计拦截量
- 测试 159 pass（新增 mid 集合变化的重复形态）
- **历史数据仍不删**：append-only 是设计承诺，清理须单独做带引用修复的迁移

## 0.23.8 — Phase 52g —— 注入状态立即落盘

- 2 秒去抖 + 56 秒重载之间存在竞态窗口；注入后立刻写一次 `inject-state.json`
- 实测确认：`[cognition] echo-entry … replyFrom=store` 首次出现在线上日志，`echoChecks` 不再恒为 0

## 0.23.7 — Phase 52d —— 去重和回声失效的根因：宿主每 56 秒重载一次插件

查日志才发现的：`qq-agent-2026-10-30.log` 当天「加载成功：认知核心」**286 次，中位间隔 56 秒**。
模块级 Map 活不过一轮，所以：

- 跨轮注入去重（5 分钟窗口）在真机上几乎不生效——同一段记忆每轮重复占预算
- 回声检查永远拿不到"上一轮注入了什么" → `echoChecks` 恒为 0（79 次注入 / 0 次检查）

修法（`src/inject-state.js`）：

- 每个会话最近一次注入的 `keys + at + text` 落盘到 `<core>/inject-state.json`，
  上限 64 会话 / 文本 800 字 / 30 分钟过期；`activate` 恢复、`deactivate` **先存后清**
- 顺带修了一个顺序 bug：原来 `deactivate` 先 `recentInjections.clear()` 再 `saveStatsNow`，
  等于每次重载都把去重状态写空
- 新增回归：同一条消息重载后不再重复注入；状态文件往返、过期与损坏降级
- 诊断日志 `[cognition] echo-entry`（每会话 10 分钟一条），把"没跑到"和"跑了没命中"分开

测试 159 pass。

## 0.23.6 — Phase 52e —— 回声断点探针

- 在回声分支加 `echo-entry` 探针日志（含 `replyFrom=messages|store|none`），
  用于定位"注入 79 次、检查 0 次"的断点
- 宿主 `ctx.messages` 只有 `[system, user]`（`orchestrator.js:1392`），已确认

## 0.23.5 — Phase 52c —— 回声指标的真实断点找到了

上一版（0.23.4，只加了计数器）之后查明并修掉断点：

- **根因**：宿主的 `before-llm-messages` 拿到的 `messages` 只有 `[system, user]` 两条
  （`resources/app/src/orchestrator.js:1392`），永远没有 assistant 历史。所以在 `messages` 里
  找"上一轮回复"这条路径**在真实宿主上不可能命中**——`echoRounds` 恒为 0 不是"复现率低"，
  是这条链路根本没通
- **修法**：优先用 `messages` 里的 assistant（兼容其他宿主/版本），拿不到就退回读宿主落盘的
  消息文件（复用 `lastSelfMessages`：mtime 门控 + 占位正文过滤），取注入时间之后的头两条自我发言
- `echoSkipped` 每次注入只记一次，避免每轮重复计数；面板显示
  `回声 0 / N 次检查（M 轮拿不到回复）`，`echoChecks=0` 时明确标"链路问题"
- 新增三条回归：`messages` 有回复、真实落盘文件兜底、无任何来源时计 skip 而非静默
- 测试 155 pass

## 0.23.4 — Phase 52b —— 回声指标先证明自己能跑

现场数据：注入 21 轮，`echoRounds` 一直是 0。两种可能——"回复真的很少复现注入词块"和
"这条链路根本没跑到"——原来的统计分不出来，等于拿一个可能永远不工作的指标当结论。

- 新增 `echoChecks` / `echoSkipped`，区分"比对了但没命中"和"压根没比成"
- 面板在 `injections > 0 && echoChecks === 0` 时直接标出链路问题

## 0.23.3 — Phase 52b —— 回声指标先证明自己能跑

现场数据：注入 21 轮，`echoRounds` 一直是 0。两种可能——"回复真的很少复现注入词块"和
"这条链路根本没跑到"——原来的统计分不出来，等于拿一个可能永远不工作的指标当结论。

- 新增 `echoChecks`：每次真正做了回声比较就 +1。面板显示 `回声 0 / N 次检查`；
  当 `injections > 0` 且 `echoChecks === 0` 时直接标"链路问题，不是复现率低"
- 补一条 round-trip 测试：第一轮注入、第二轮带 assistant 回复 → `echoChecks=1, echoRounds=1`，
  证明上一轮回复在场时确实会比较
- 测试 153 pass

## 0.23.2 — Phase 52 —— 复查修掉五个 bug

三件套上线后按"先找错、再谈功能"复查了一遍，改了五处真实缺陷（都带回归测试）：

- **回声统计算了两遍 bigram**：`recent.terms` 存的是 bigram 集合，下一轮 `[...terms].join('')`
  拼回字符串再拆，分母虚高、还会造出跨词对的假命中。改为存原始注入文本 + `recordEcho()` 统一记账
- **repeatHits 虚增**：只要有排除集就 +1，哪怕一条都没撞上。改为只有 `suppressed > 0` 才计数
- **时间线的 scope 是隐私缺口**：`scope` 参数解析失败时 `scopeFromChatKey` 返回 `null`，
  而 `null` 在过滤里等于"不限范围"——传错格式会把别的会话记忆读出来。现在显式校验并报错；
  `cognition_recall` 同样加守卫（无法识别会话时拒绝，不跨会话检索）
- **未命中统计漂移**：`below-threshold` 没进桶、`ok` 但空包落进"其他"。补齐 `belowThreshold`/`other`
  并给出 `ok → no-match` 的映射，保证"每个未命中都有归处"
- **面板渲染错误被静默吞掉**：之前 catch 包住 render，出错就停在"读取中"或悄悄显示示例数据。
  现在渲染失败直接显示错误文案
- 顺带修 `verify-memory-tools.mjs` 的面板复制路径（推导错三级，一直静默失败）与
  观察层的 `owner` 哨兵显示（显示为"主人"，不改存储）

测试 151 pass（新增 5 项：echo 分母、未命中分桶、repeatHits、scope 拒绝、recall 拒绝）。

## 0.23.1 — Phase 51b —— 工具描述纠正

`cognition_mem_raw` 原来写"id 形如 evt_…"，但宿主真实 id 是 `dialogue:private:…`。
描述改成"用时间线里显示的那串"，避免模型猜前缀后查不到。

## 0.23.0 — Phase 51 —— 记忆三件套

新增三个只读工具，把"查得到、对得上"补上（此前只有 `cognition_recall`，查不到证据链和原话）：

- `cognition_mem_timeline`：按天列出事件/剧集/认知，每行带 id；默认跳过只含一条原话的剧集，
  否则同一条消息会以 event + episode 出现两次（真实数据实测）
- `cognition_mem_observation`：认知或剧集的完整记录——置信度、证据链、上下文、版本历史；
  证据引用找不到时**显式标注**并给出"结论存疑"警告，不静默丢
- `cognition_mem_raw`：按事件 id 读原话（`metadata.turns` 逐条渲染，旧事件退回 `text`），支持最多 10 条
- 三个工具 owner-only：原话是隐私内容，群成员读不到别人会话
- 新增 `src/memory-view.js`（纯视图层，不改状态）+ `scripts/verify-memory-tools.mjs`（真实数据只读副本，12 项断言）
- 测试 146 pass（新增 8 项视图单测 + 3 工具联动与越权拒绝）

## 0.22.24 — Phase 50 —— 面板显示真实数据

面板自始至终显示的是**打包内附的示例快照**，两个独立原因叠在一起：

1. 宿主的 `../@data/storage.json` 在本环境里一直 404，面板就回落到 `storage.example.json`；
2. `api.storage` 写出的 `features` 是**对象**（键=功能名），示例文件是**数组**。
   `render()` 里 `features.filter` 直接抛错，又被 `try/catch` 吞掉，于是继续回落示例数据。

修法：

- 插件每次发布快照时把同一份 JSON 写到面板同目录的 `live-snapshot.json`（临时文件 + 改名，避免读到半截）；
  面板按 `live-snapshot.json` → `../@data/storage.json` → 示例 的顺序找数据
- `featureList()` 同时接受数组和对象两种形状
- `try/catch` 只包住 fetch/parse，render 的错误不再被吞（否则下次还会静默显示假数据）
- 界面明确标注数据来源：`实时快照` / `示例数据（未接实时快照）`，示例数据额外加一条醒目提示
- 记忆健康区块改成"一行一个指标"（三列 × 两行），长数字串不再折行；新增 `.mem` 样式

## 0.22.23 — Phase 49.2 —— 面板快照写盘

- 新增 `writePanelSnapshot`：`live-snapshot.json` 与注入统计一起刷新（2 秒去抖，不额外增加写盘次数）
- `activate()` 里等首次写盘完成再返回，避免刚启动时面板读到空文件
- 打包时排除 `panel/live-snapshot.json`：那是运行期数据，不能让发布者本机的权限和统计随包发出去

## 0.22.22 — Phase 49.1 —— 面板兜底与统计

- 修统计对象被整体替换导致快照读到旧引用（改为原地 `Object.assign`）
- 去重导致的空包也计入 `suppressedItems`
- 新增 6 项测试（两轮去重、空包、统计累计、落盘回读、回声阈值、抑制计数）

## 0.22.21 — Phase 49 —— 面板记忆健康 + 相关性闸门

- 面板新增「记忆健康（注入遥测）」区块：注入轮数/覆盖率、平均 token、条目类型、
  去重挡掉、重复命中、未命中拆分、回声轮数（明确标注是代理指标）
- 修线上实测的质量问题：稳定认知此前**不看查询相关性**一律进注入。
  实测 `cov=0.00` 的轮次仍塞进 2 条无关认知（「我讨厌香菜」把「主人喜欢睡觉」「牢大 是 猫猫侠」都带上了），
  等于每轮固定交 50 token 的税。现在按实义汉字重叠判定相关性（共享 ≥1 个实义字）；
  需要旧行为时传 `requireRelevance: false`
- 用双字块判定会被中文坑：`今晚我想早点睡` 与 `主人喜欢睡觉` 没有共同双字块却显然相关，
  所以改用"实义汉字 + 虚字停用表"
- `normalizeQuery`：剥掉触发文本的前导括注标记（`（🤔）`/`【图片】`/`(笑)`），
  实测这类标记会让覆盖率掉到 0、明明库里有的句子召回不到
- 测试 135 pass（新增 6 项：无关认知不注入、相关认知仍注入、开关可回退、空查询、标记剥离、标记不影响逐字相关性）

## 0.22.20 — Phase 48 —— 注入去重与命中遥测

- 跨轮去重：同一会话 5 分钟内已经注入过的条目不再重复占预算（`excludeIds` + `suppressed` 计数）。
  同一件事连着问两轮，第二轮不再把同样的记忆再塞一遍
- 新增 `src/injection-stats.js`：注入轮数 / 条数 / token 估算 / 各未命中原因 / 被去重挡掉的条数 /
  重复命中轮数 / 回声轮数；`<core>/injection-stats.json` 跨重启延续，2 秒去抖 + 临时文件改名落盘
- 回声代理 `measureEcho`：注入词块是否出现在机器人下一轮回复里（弱信号，报告里注明"不是真的用上了"）
- `cognition_status` 快照新增 `injectionStats`（含 `averageTokens`），面板/工具可读
- 注入日志补全：命中轮也记 `inject chat=… items=… tok=… suppressed=… cov=…`
- 修统计对象被整体替换导致快照读到旧引用的问题（改为原地 `Object.assign`）
- 测试 129 pass（新增 6 项：去重两轮、空包、统计累计、落盘回读、回声阈值、抑制计数）

## 0.22.19 — Phase 47 —— 一条消息只记一条

- 修线上实测 bug：宿主对同一批消息会重复触发 `after-response`，同一条 QQ 消息被写成
  2~4 条 dialogue 事件（实测 208 条对话事件里有 87 条是重复的，44 组同 mid 重复）
- `after-response` 增加 mid 幂等键（10 分钟窗口，最多 512 条）：同 mid 重复回调直接跳过，
  回复正文仍走原有补录逻辑
- 新增 `scripts/audit-duplicates.mjs`（只读）：统计重复组、多余事件、受影响的 Episode 与认知证据数。
  历史库不重写——append-only 是设计承诺，重写需要先看数字再决定
- 测试 123 pass（新增"同 mid 两次回调只写一条、不同 mid 不被误吞"）

## 0.22.18 — Phase 46 —— 改判与衰减

- 新增 `alias-fix` 规则（排在 `correction` 之前）：`X 不是我，是 Y` → 事实改判 `X 是 Y`，
  `authoritative` + `supersedes=X`，旧事实被标 `superseded` 并写入 `supersededBy` 指针
  - 此前这条句子会被 `correction` 抓成 `我 不是 Y`（对象取到代词），既没改判也留下废事实
- `correction` 增加代词护栏：`before` 是"我/你"时不再当被纠正对象
- 新增候选衰减：`candidateTtlDays`（默认 30，0 关闭）。只有一条证据、且超过 TTL 未再出现的
  candidate 会被退役（`changeReason: candidate expired: Nd without second context`），
  避免候选池只涨不消
- 报告新增 `expired` 字段；晋升判定不受影响（本次刚拿到证据的候选先走晋升）
- 测试 122 pass（新增改判取代、陈旧候选退役、新鲜候选不退役、改判抽取 4 例）

## 0.22.17 — Phase 45 —— 记忆链路端到端验证

- 新增 `scripts/verify-memory-chain.mjs`：用**真实事件的副本** + 显式第二语境，跑完整链路并断言
  （候选不注入 → 第二语境晋升 stable → stable 进 ContextPack）
- 修出抽取真 bug：`alias-mine` 贪婪量词把"就是"的"就"吞进名字
  （"牢大就是我" → 名字"牢大就"，与"牢大是我"永不合并，因此永远无法晋升）
  → 改为惰性量词，附回归测试
- 验证结果（真实副本 3986 事件）：晋升 promoted=2，偏好与事实均 ev=2/stable，
  注入块出现 `C: 牢大 是主人`、`C: 主人不喜欢香菜`，而候选 `主人喜欢睡觉` 未进入注入
- 测试 118 pass

## 0.22.16 — Phase 44 —— 可交付性

- 新增 `scripts/build-dist.mjs`：打包前做**依赖闭包检查**（107 条相对导入全部可解析），
  并排除 27 份内部 phase 报告（含真实本机路径与主人 QQ）
- 新增 `scripts/smoke-install.mjs`：从**已打包目录**加载插件跑真实钩子（setup→activate→
  before-context→after-response→before-llm-messages→巩固→deactivate），抓打包后才暴露的缺文件
- `scan-release.mjs` 修假阴性：空目录曾经返回 `ok:true`，现在返回 `ok:false` 并退出码 4
- 隐私修复：README 不再写主人 QQ；README.en 的联系方式改为指向 SECURITY.md
- `build-manifest.mjs` 的版本改为从 `package.json` 读取（此前手写常量 0.21.0，改版本时必然漂移）
- 清单补齐 `injectContextKinds` / `injectCognitionStatus` / `consolidate*` 四个配置项
- `INSTALL.md` 首次入库：安装、验证、回滚都给出可执行命令
- 交付物：`dist/cognition-core-0.22.16.zip`（94 文件，扫描 0 命中，冒烟 11/11 通过）

## 0.22.15 — Phase 43 —— 孤句也能抽取

- `episode.minEvents: 2 → 1`：真实聊天里大量陈述是孤立一句（实测 02:25「我喜欢睡觉」前后隔两小时），
  要求两句成段会让整句话永远抽不出认知——线上实测 `记忆巩固：episodes 1 / 新认知 0` 就是这个原因
- 真实数据副本验证：119 条未巩固事件 → 11 Episode + 1 条候选 `主人喜欢睡觉`
- 测试 117 pass（Episode 切分用例改为断言单句成段）

## 0.22.14 — Phase 42 —— 按主人定的 A+B 范围收窄抽取

- 抽取只启用 `preference`（偏好）+ `fact`（事实）；`boundary` 保留但仅喂 SelfModel，
  `value` / `commitment` 停用（涉及时间与承诺，误判代价高，第二批再做）
- 新增事实规则：
  - `alias-mine`：`牢大是我，不是你` → `牢大 是主人`
  - `qq-of`：`猫猫侠的QQ是3431047779` → 事实三元组
- 修真实语料上的三类误抽（都在真实数据里验证过）：
  - `不要担心....哪怕…` 被抽成边界 → 标点（含 `....`）作为子句边界 + 安慰语白名单排除
  - `我喜欢你` 被抽成 `主人喜欢你` → 代词宾语不参与偏好抽取
  - 群聊 `@大肥鱼(QQ:…)` 把括号数字带进名字 → 名字专用清洗（去 @/括号/尾部"的"）
- 注入新增 `injectCognitionStatus`（默认 `stable`）：**候选认知不进注入**，
  只有经两个独立语境验证过的 stable 才配当事实使用
- 真实数据：116 条未巩固事件 → 12 Episode + 1 条干净候选认知（`牢大 是主人`）
- 已把 02:18 那次旧规则产生的 2 条噪音认知 append-only 置为 `retired`（保留历史，不删）
- 测试 117 pass

## 0.22.13 — Phase 41

- 修补录的时区/精度竞态：mtime（秒级精度）与 `Date.now()` 直接比较会把"刚写好的消息文件"判成旧文件，
  导致补录偶发不触发（测试里表现为随机失败，实测 3 次连跑全绿）
  - 门控改为 `mtime < afterMs - 2000`，留 2 秒容差
- 测试 107 pass × 3 连跑稳定

## 0.22.12 — Phase 40

- 未命中日志补上**原因**：`reason=low-coverage/no-match cov=0.xx`（`core.recall` 新增 `withMeta`）。
  以后"没注入"不再需要靠猜，日志自己说明是门槛拒召还是空包
- 移除临时的 `bc` 计数日志（已确认真实情况：每轮都会调用 `before-context`）
- 实测（02:04 三条私聊）：`在嘛`/`你困了吗` → `ev=0` 门槛拒召（正确）；`晚安` → 正常注入
- 测试 107 pass

## 0.22.11 — Phase 39

- 注入去重：同一句话被记成多条事件时只注入一次（实测群聊注入里「牢大是我，不是你」重复两行）
- 未命中留痕：空包时打 `inject-miss`（turns/queryLen/ev），命中不出声
- 线上首次群聊注入（01:59:04 group:651032450），内容全部是群聊范围记忆，未串私聊
- 测试 107 pass（新增：重复行折叠）

## 0.22.10 — Phase 38

- 注入降级不再污染：拿不到「本轮对方原话」时**直接跳过**，不再退回整条 user 消息
  （那条里塞着状态/时间/表情包/印象，7495 字符 → 2331 token → coverage 0.00，必然拒召）
- 跳过时按会话 10 分钟节流打一次 warn，失败可见但不刷屏
- 删掉调试用的 inject-probe / inject-pack 日志
- 测试 106 pass（注入用例改为先用 before-context 播种 turns，覆盖真实路径）

## 0.22.9 — Phase 37

- 修注入检索词：之前拿**整条 user 消息**当 query，宿主会把状态/时间/记忆块拼在同一条里（实测 7495 字符 → 2331 个 query token），
  coverage 被稀释成 0.00，`minCoverage=0.5` 直接拒召 → 注入永远不触发
  - 改成用「本轮对方最后一句原话」（pendingTurns 里的非 self turn）：同一句话 10 token、coverage 1.00、30 条命中
- 实测对照：`wholeUserMsg → refused low-coverage (0.00)` vs `triggerText → ok (1.00)`
- 测试 106 pass

## 0.22.8 — Phase 36

- **修一个长期静默 bug**：`core.recall` 还在用 `row.text.includes(query)` 子串匹配，
  注入路径从来没走过 0.22.2 的 BM25/RRF 检索（只有 `cognition_recall` 工具走了）。
  现象就是注入永远只对"原句片段"生效，自然提问全部落空。
- 召回统一走 `retrieve`；注入加 `minCoverage=0.5` 门槛
  - 真实 3900 事件实测：真实追问 top coverage 0.72–1.00，寒暄/无关 0.00–0.27
- 新增设置 `injectContextKinds`（all / private / group）：首验只在私聊注入，群聊不动
- 测试 106 pass（新增：kinds=private 时群聊不被注入）

## 0.22.7 — Phase 35

- 补录时丢掉宿主的占位正文 `已回复。` / `已经回复了。`（工具轮次没有真实台词），
  实测 512KB 窗口内 309 条自发言中命中 1 条，纯噪音
- 线上首次拿到**多行补录**：`行吧，鱼咬钩了，你赢了` + `已回复。`（后者已被本版过滤）
- 测试 105 pass（新增占位过滤断言）

## 0.22.6 — Phase 34

- 回复补录支持**一轮多条**：按消息头 `"id"/"mid"/"ts"` 切块，取出本次 pending 之后所有 `self: true` 的发言，
  用换行拼接（实测一轮里"文字 + 图片"两条都拿得到）
- 线上首次跑通：`dialogue.reply` 事件 `replyTo` 正确指回原对话事件，上下文包渲染为 `E: 我（补录）：…`
- 单测改为双条断言（含"不能把对方消息算进来"）；105 pass

## 0.22.5 — Phase 33

- KI-006 补录：按「`ctx.messages` 里最后一条 assistant → 宿主消息落盘文件尾部 → 触发里的 `self` 条目」三级取回机器人发言，
  追加一条 `dialogue.reply` 事件（带 `metadata.replyTo` 指回原对话事件）
- 消息文件读取只取尾部 512KB + mtime 门控：5MB 全量 `JSON.parse` 会阻塞主线程约 50ms
- 实测校验：从真实 5MB `messages/group_*.json` 尾部正确取回最后一条 self 发言
- 新 source 类型 `dialogue.reply`：单独成类型，不进巩固（Episode 只认 `dialogue`），
  上下文包里渲染为 `E: 我（补录）：…`
- 补录上限：只补 6 小时内的待补项，内存表上限 128 条，重启后 pending 丢失（可接受）
- 新增 1 项集成测试（补录链路）；测试 103 pass

## 0.22.4 — Phase 32

- 修复：`after-response` 拿不到回复正文时会**整轮丢弃对话**（宿主每轮触发、content 与 session.sent 常为空）
  - 现在无论如何都记录用户侧原文 + turns + 媒体，缺回复时标 `metadata.replyMissing=true`
  - 实测 00:13–00:36 之间因此丢失全部新对话；修复后 9 条新事件全部落盘
- `renderTurn` 去掉重复占位：正文只有 `[图片]` 且有 media 时不再重复输出；宿主的 `[动画表情]` 这类空描述降级为「图片」
- 新增 `test/turns` 两条测试（空正文记账、占位去重）；测试 102 pass
- 记入 `KNOWN_ISSUES.md` KI-006（回复正文缺失的根因与补法计划）

## 0.22.3 — Phase 31

- Cognition 新增 `supersededBy` 显式演化指针；status 增加 `superseded`
- 主人纠正「不是 A，而是 B」时，旧事实标 `superseded` 并指向新事实 id（可回溯，不靠相似度猜）
- 检索默认排除 `superseded`；`includeSuperseded=true` 才看历史时间线
- `cognition_recall` 改用 `retrieve()`：返回分数与 matched 数；零命中时明确回「没有找到可靠的相关记忆」并带 `refused` 元数据
- 新增 1 项检索测试、1 项 host 断言；测试 100 pass

## 0.22.2 — Phase 30

- 新增 `src/retrieval.js`：BM25（中文二元组 + 英文/数字标识符）、scope / retired / sinceDays 硬过滤、recency 半衰期与 status 权重重排、RRF 融合骨架
- 预留向量通道接口 `embedder`（纯 JS 余弦，不引入任何依赖）；不传则只走词法，失败自动退回
- 拒识：零命中必拒；覆盖率闸门可配，但实测会误伤正常追问，默认关闭（数据见 docs/检索设计.md）
- 实测：3852 条事件单次检索 8–17ms，10 次平均 10.5ms
- 新增 13 项检索测试；测试 99 pass
- 未接入注入路径（injectContextEnabled 仍为 false）

## 0.22.1 — Phase 29

- L0 事件新增 `metadata.turns`：逐条保留说话人、媒体、引用（≤8 条 / 每条 ≤240 字符）
- 新增 `src/turns.js`：buildTurns / renderTurn / collectReferents / describeReferents / hasPronoun
- ContextPack 检索结果改用带说话人的 turn 渲染；旧事件无 turns 时保持原样
- 新增【指代参考】块：仅当当前消息含代词时注入（3 行 ≈ 52 token）
- 图片/表情保留 faceId / summary，渲染为 `[表情#178]` / `[图片「描述」]`；无描述不猜内容
- 新增 11 项测试（含 after-response 落 L0 的集成测试）
- 测试 86 pass

## 0.22.0 — Phase 28

- 新增 dialogue → Episode → Cognition → SelfModel 链路（`episode-builder` / `extract` / `consolidation-pipeline`）
- Episode：同 scope、间隔 ≤30 分钟、单集 ≤20 条、≥2 条才成立
- 抽取：只从主人发言取证据，5 条窄规则，首命中即止；不调模型、不猜内容
- 晋升：evidence ≥2 且跨 ≥2 个情境（scope+日期）且 confidence ≥0.7
- 主人纠正「不是 A，而是 B」直接 stable（0.9），并把旧事实标 contested
- SelfModel 门控：stable + value/commitment/boundary + contexts ≥2 + confidence ≥0.75 + 无矛盾；每轮 ≤3 条，写 change.reason 与 evidenceIds
- 默认关闭（`consolidateEnabled=false`）；`cognition_consolidate`（owner-only，支持 dryRun）
- 新增 `scripts/consolidate.mjs`，默认 dry-run，`--apply` 才写
- 调度：after-response 后才挂 unref 定时器，deactivate 清理，不占启动路径
- 实测：真实数据 20 条 dialogue → 4 Episode / 0 认知；副本连跑两次，第二次 0 写入；单次 30–48ms（events.jsonl 2.87MB）
- 冷加载 21–26ms（3 次，热 FS 缓存）；测试 75 pass（新增 11）

## 0.21.0 — Phase 27

- 新增 cognition_sticker_list
- 表情发送支持 query / tag / random
- 修复收藏标签的嵌套/转义解析
- 新增 1 项表情收藏测试
- 测试 64 pass

## 0.20.0 — Phase 26

- 表情发送默认无限制
- 新增 stickerDailyLimit / stickerWeeklyLimit / stickerCooldownMin
- 0 = 不限制；默认 0
- 新增 1 项表情额度测试

## 0.19.0 — Phase 25

- after-response 记录 dialogue event
- 新增 public-data-export / scan-release / dedupe-events
- 新增数据收集协议与同意书
- 新增核心说明、风险说明、冲突清理清单
- 停用 owner-identity 与旧 sticker 发送工具

## 0.18.0 — Phase 24

- 新增 QzonePublishAdapter
- 新增 cognition_qzone_publish
- 公共动作确认 + owner-only + 好友可见
- 复制 qzone 内容安全过滤
- 关闭旧 qzone publish 工具
- 新增 1 项发布测试

## 0.17.0 — Phase 23

- 新增 QzoneReadAdapter
- 新增 cognition_qzone_read
- 复用 OneBot get_qzone_feeds，不重写登录
- 只读自己的说说/评论
- 新增 1 项 QQ空间测试

## 0.16.0 — Phase 22

- 新增 XhhReadAdapter
- 新增 cognition_xhh_feed
- 实现小黑盒 hkey 签名
- 信息流真实 API 实测通过
- 新增 1 项小黑盒测试

## 0.15.0 — Phase 21

- 新增 BiliReadAdapter
- 新增 cognition_bili_search / cognition_bili_video
- 视频 view 412 时回退精确 BV 搜索
- 新增 2 项 B站测试

## 0.14.0 — Phase 20

- SelfModel 只读检索验证
- 明确不自动注入
- 新增 1 项检索/不注入测试

## 0.14.0 — Phase 19

- 新增 QQPrivateAdapter
- 新增 cognition_private_send
- owner-only 私聊发送
- 新增 1 项私聊测试

## 0.13.0 — Phase 18

- person-cards.json 小索引，修复 5 秒 hook 超时
- 新增 cognition_self 只读工具
- 认人卡片不再扫描 3831 条事件
- 新增 1 项测试工具注册断言

## 0.12.0 — Phase 17

- PersonStore / RelationshipStore 支持 upsert + 最新记录
- owner 写入 Person/Relationship
- SelfModel v1 初始化
- 新增 owner/self-model 测试

## 0.11.0 — Phase 14

- 新增 QQStickerAdapter
- 新增 cognition_sticker_send 工具
- 通过 ActionBus / Gateway 执行 owner-only 检查
- 真实 QQ 发送等待 adminId 绑定
- 新增 1 项 QQ sticker 测试

## 0.10.0 — Phase 13

- 新增 PersonStore / RelationshipStore
- 导入 21 人 / 21 关系 / 67 条印象
- 新增跨会话认人卡片
- 停用 cross-chat-link
- 停用 context-reuse
- 新增 1 项认人测试

## 0.9.0 — Phase 10

- 顶栏「认知」模块补丁
- 可选小预算 ContextPack 注入，默认关闭
- 新增 `injectContextEnabled` / `injectContextTokens` / `injectContextMaxItems`
- 新增 2 项注入测试

## 0.8.0 — Phase 8 + 顶栏模块

- QQA 顶栏一级入口「认知」
- 顶栏 iframe 懒加载权限面板
- UI 补丁脚本与备份
- 社区安装包 `cognition-core-community-0.8.0.zip`
- QQA host `setup` / `activate` / `deactivate`
- settings -> Gateway
- Gateway snapshot -> `api.storage`
- 注册只读工具 `cognition_status` / `cognition_recall`
- QQA 安装验证：active、panel 200、storage 生成
- 新增 2 项 host 测试

## 0.7.0 — Phase 7

- 新增权限等级 L0–L4
- 新增 11 个功能接口开关
- 新增时间窗、日上限、周上限、冷却
- 新增 Gateway / UsageLedger
- 新增 ActionBus 网关拦截
- 新增 QQA 权限面板
- 新增 manifest 生成器
- 新增 GUI 文档

## 0.6.0 — Phase 6

- 新增 ContextPack / token 预算
- 新增 estimateTokens
- 新增中文使用说明
- 新增兼容性说明
- 新增 token 预算文档
- 新增 4 项 ContextPack 测试

## 0.5.0 — Phase 5

- 新增 MusicAdapter
- 新增 PrivateChatAdapter
- 新增 MockChatTransport
- 新增 createMockHost
- 新增 4 项 Phase 5 测试

## 0.4.0 — Phase 4

- 新增 MockAdapter
- 新增 StickerAdapter
- 新增示例 sticker catalog
- ActionBus 支持 `origin: self`
- 新增 4 项 Adapter 测试

## 0.3.0 — Phase 3

- 新增 ActionBus
- 新增 ActionPolicy
- 新增 owner-only dispatcher
- 新增 action-log.jsonl
- 新增 5 项 Action 测试

## 0.2.0 — Phase 2

- 新增 EpisodeStore
- 新增 CognitionStore（修订追加）
- 新增 SelfModelStore（版本追加）
- 新增 promotion 纯函数
- 新增 5 项 Phase 2 测试
- 冻结导入 3764 条事件

## 0.1.0 — Phase 1

- 新增 IdentityAnchor / Person / Relationship / Event schema
- 新增 EventStore
- 新增旧记忆只读导入
- 新增 P1/P2/P3 常量
- 新增 9 项测试



