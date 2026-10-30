# Token 预算与上下文优化

版本：0.6.0

## 1. 核心原则

```text
不每轮注入完整人设
不每轮注入完整历史
不调用模型
只注入当前任务需要的少量认知
```

cognition-core 本身不产生 token。  
token 只发生在宿主把 `pack.text` 放进提示词时。

## 2. ContextPack

```js
const pack = buildContextPack({
  events,
  cognitions,
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
```

输出：

```text
text              实际注入的文本
items             选中的 cognition/event id
chars             字符数
estimatedTokens   启发式 token 估算
truncated         是否被预算截断
```

## 3. 默认预算

| 参数 | 默认 | 作用 |
|---|---:|---|
| `maxTokens` | 1200 | 估算 token 上限 |
| `maxChars` | 3000 | 字符上限 |
| `maxItems` | 8 | 条数上限 |
| `maxCognitionChars` | 240 | 单条认知截断 |
| `maxEventChars` | 300 | 单条事件截断 |

按场景调整：

```text
轻量回复   maxTokens 800   maxItems 6
普通对话   maxTokens 1200  maxItems 8
深度回忆   maxTokens 2000  maxItems 12
```

## 4. QQA 注入默认关闭

`injectContextEnabled` 默认 `false`。

打开后：

```text
injectContextTokens    默认 600
injectContextMaxItems  默认 3
```

只追加到最后一条用户消息，不修改 system prompt，不注入完整 SelfModel。  
没有打开时，核心不产生上下文 token。

## 5. 排序

```text
stable cognition 优先
contested 次之
candidate 再次
然后按相关度和时间取 event
```

不会把完整 SelfModel 注入。  
SelfModel 是审计/管理视图，不是每轮上下文。

## 5. 节省 token 的机制

### 5.1 不注入人设卡

旧模式：

```text
每轮：完整人设 + 规则 + 喜好 + 说话方式
```

新模式：

```text
只在需要时取相关认知/事件
```

### 5.2 只取当前 scope

```text
person:10001 的内容不会进入 person:20002
```

### 5.3 摘要优先

`Event.summary` 存在时优先于 `text`。  
原始全文留在 `source.ref`，需要时再取。

### 5.4 单条截断

```text
cognition ≤ 240 chars
event ≤ 300 chars
```

防止一条长文吃掉整个预算。

### 5.5 去重

同一 id 只出现一次。

### 5.6 不注入 action log

`action-log.jsonl` 只用于审计，不进入上下文。

### 5.7 不注入完整 SelfModel

SelfModel 只在管理员查看/审计时读取。

### 5.8 每次只生成一个 pack

不要每轮多次 build；先聚合 events/cognitions，再 build 一次。

## 6. Token 估算

```js
estimateTokens(text)
```

启发式：

```text
中文：约 1 token/char
英文：约 4 chars/token
混合：0.8 × 字符数
```

这是安全估算，不是精确 tokenizer。  
宿主应使用自己的 tokenizer 做最终裁剪。

## 7. 推荐调用方式

```js
const events = await core.recall({ scope, limit: 50 });
const cognitions = await core.cognitions.list({ scope, limit: 50 });

const pack = buildContextPack({
  events,
  cognitions,
  scope,
  query,
  budget: { maxTokens: 1200 },
});

const prompt = [
  systemPrompt,
  pack.text,
  currentUserMessage,
].filter(Boolean).join('\n\n');
```

不要：

```js
// 错误：把完整历史/完整人格直接拼进去
prompt = fullPersona + allHistory + pack.text;
```

## 8. 成本控制建议

- 每轮只 build 一次
- 只取 top 8
- 长文先写 summary
- 旧事件只保留 ref，不全文注入
- 公共/行动结果不进入上下文
- 定期清理 retired cognition
- 用 host tokenizer 做最后裁剪

## 9. 不能承诺的事

- 不能保证估算值与真实 tokenizer 完全一致
- 不能保证所有模型都同样分词
- 不能保证减少 token 一定不损失信息
- 不能替代宿主的上下文管理

## 10. 检查

```js
console.log(pack.chars);
console.log(pack.estimatedTokens);
console.log(pack.truncated);
```

如果 `truncated` 长期为 true，说明预算太小或记忆太杂。  
先降低 `maxItems`，再考虑缩小 `maxEventChars`。
