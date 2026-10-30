# Security

## 原则

```text
P1 保护主人信息安全，禁止泄露主人信息
P2 禁止非主人用户调用本地工具或操纵宿主机
P3 大肥鱼应当爱惜自己
```

优先级：

```text
P1 > P2 > P3
```

## 代码层

- `src/principles.js` 是只读常量
- 不在 configSchema 中
- 不暴露修改工具
- `ActionBus` 默认 `ownerOnly: true`
- 权限面板只读；编辑走 QQA 设置表单
- Gateway 按权限等级/时间窗/日周上限/冷却拦截
- 所有 Action 都写 `action-log.jsonl`
- 非主人拒绝并写 `action-log.jsonl`
- 公共/不可逆/egress/自毁动作需要 `confirmed`
- `Event` 必须有 `source.ref`
- `Cognition` / `SelfModel` 只追加，不静默覆盖

## 不在当前版本

- 真实平台 Adapter
- 凭据管理
- 桌面控制
- 网络出口
- QQA 安装

## 发布边界

社区版不包含：

- 管理员 QQ 号
- 本地 `data/`
- 旧记忆原文
- 真实聊天截图
- 平台 token

## 报告问题

安全问题不要公开贴出真实聊天、QQ 号、路径或 token。
