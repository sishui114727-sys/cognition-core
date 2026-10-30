# cognition-core 兼容性说明

版本：0.6.0

## 1. 运行环境

| 项目 | 要求 |
|---|---|
| Node.js | 20+ |
| 已验证 | Node.js 24.18 |
| 模块系统 | ESM |
| 包管理 | 无第三方运行依赖 |
| 操作系统 | Windows / Linux / macOS |
| 文件系统 | 支持 UTF-8 与追加写 |
| 时区 | 输入 ISO 时间或 epoch ms；内部统一转 ISO |

### ESM

必须使用：

```js
import { CognitionCore } from './index.js';
```

不要用：

```js
const { CognitionCore } = require('./index.js');
```

CommonJS 宿主请使用动态 `import()`。

## 2. 与 QQA 的兼容性

当前版本：

```text
不是 QQA 可直接安装插件
plugin.json 只是元数据
没有宿主 register / hooks / tools
没有 QQ 消息发送
```

原因：

- 当前目标是社区核心库
- QQA 插件入口需要宿主生命周期、config、tool registration
- 真实平台适配要单独设计和审计

### QQA 权限 GUI 兼容

`plugin.json` 使用官方 `configSchema`：

```text
boolean / number / string / enum / action
```

`overview` 是 `type: action` 的只读面板：

```text
panel/overview.html
```

设置表单可写；面板只读。  
这是 QQA `/plugin-panel/` 通道的设计，不是本插件限制。

### QQA 旧插件兼容

导入器支持以下本地目录结构：

```text
memory-v3/blocks/**.json
cross-memory/memories.json
life-events/*.json
```

已验证版本：

```text
mem-layered 1.7.1
cross-memory 2.0.0
life-memory 1.2.0
```

不保证：

- 未来版本字段不变
- DSH 插件数据格式
- 包含图片/附件/嵌入向量的完整迁移

### 迁移要求

```text
先停止 QQA / 旧记忆插件写入
再复制或冻结数据
再运行导入
```

不要在新旧插件同时写的时候做 shadow read。

## 3. 与 DSH 插件的兼容性

`dsh-bili-humanism`、`dsh-agent-soul` 不是运行依赖：

```text
不安装它们也能运行 cognition-core
不共享它们的 API
不读取它们的私有数据
```

可借鉴：

- humanism：证据、来源、反思、可撤回
- agent-soul：唯一权威源、append-only 账本、ref、体检

不直接兼容：

- ECHO 上下文压缩
- compaction
- huanqi
- SELF.md / 宪章模板

## 4. 数据兼容性

### 存储格式

```text
JSONL
UTF-8
一行一个 JSON
append-only
```

文件：

```text
events.jsonl
episodes.jsonl
cognitions.jsonl
self-model-versions.jsonl
action-log.jsonl
```

### Schema

```text
schemaVersion = 1
```

未来变更原则：

- 新增字段必须可选
- 不删除已有字段
- 不改变已有字段语义
- 迁移必须版本化
- 旧数据可回读

### 并发

```text
单进程单写者
```

不要让两个进程同时写同一个 `dataDir`。  
不要用文本编辑器直接改 JSONL 来“修补”数据。

### 时间

支持：

```text
ISO 8601 字符串
epoch 毫秒
```

内部统一为 UTC ISO。  
展示时由宿主转本地时区。

### scope

```text
global
person:<id>
group:<id>
relationship:<id>
```

`person` / `group` 的 id 建议使用平台稳定 ID，例如 QQ 号。  
不要把昵称当主键。

## 5. API 兼容性

当前公共导出：

```text
CognitionCore
EventStore
EpisodeStore
CognitionStore
SelfModelStore
ActionBus
ActionPolicy
JsonlStore
StickerAdapter
MusicAdapter
PrivateChatAdapter
MockAdapter
MockChatTransport
createMockHost
buildContextPack
estimateTokens
```

稳定性：

- 核心 store / schema：稳定
- Adapter：实验
- MockHost：实验
- ContextPack：稳定但 token 估算为启发式

## 6. Token 兼容性

`estimateTokens` 不是精确 tokenizer。

```text
中文接近 1 token/char
英文接近 4 chars/token
混合文本使用 0.8 系数
```

宿主如果有精确 tokenizer，应覆盖估算：

```js
const pack = buildContextPack({
  events,
  cognitions,
  budget: { maxTokens: 1200 },
});

if (pack.estimatedTokens > 1200) {
  // 用宿主 tokenizer 再裁一次
}
```

## 7. 权限兼容性

ActionBus 默认：

```text
ownerOnly: true
```

需要宿主提供：

```text
ownerId
senderId
origin: 'owner' | 'self'
confirmed: boolean
```

宿主必须保证：

- `origin` 由调度器设置，不由用户输入设置
- 非主人请求不能伪装成 `self`
- 公共/外发/自毁动作有确认
- 审计日志不被用户删除

## 8. 已知不兼容

- 不能直接 `npm install` 后当 QQA 插件使用
- 不支持 CommonJS `require`
- 不支持多进程同时写
- 不支持 SQLite / 向量库作为后端
- 不支持真实 QQ/B站/桌面
- 不支持自动迁移 DSH 私有格式

## 9. 兼容性测试

```bash
node --test
```

```text
tests 60
pass 60
fail 0
```

如果宿主 Node 版本低于 20，可能缺少：

- `node:test`
- 部分 `fs/promises`
- `Array.prototype.at`

## 10. 发布检查清单

- [ ] Node 20+ 测试通过
- [ ] 无 `data/` 目录
- [ ] 无真实 QQ 号
- [ ] 无聊天原文
- [ ] 无平台 token
- [ ] 无本地绝对路径
- [ ] `node --test` 全绿
- [ ] 版本号与 CHANGELOG 一致














