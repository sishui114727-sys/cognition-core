# 核心工艺 · cognition-core

面向 QQ Agent 的本地优先认知与身份核心。它把“她是谁”从固定人设卡里拿出来，放进可审计、可检索、可迁移的数据结构中。

## 不是人设卡

身份：Identity Anchor / Person / Relationship  
经历：Event / Episode  
长期认识：Cognition  
自我描述：SelfModel  
行动：ActionBus + Gateway

SelfModel 只读，不每轮注入；对话会记录为本地 Event，但当前不会自动生成 Cognition 或自动更新 SelfModel。

## 能力

- 本地 JSONL，不依赖云服务
- 多用户 / 多关系隔离
- 跨会话认人卡片
- 有预算的回忆检索
- 权限等级、时间窗、日/周上限、冷却
- QQ 表情/私聊、B站只读、小黑盒信息流、QQ空间只读/发布
- ActionBus 审计与 owner-only 公共动作确认

## 隐私

默认不联网上传、不发遥测。公开数据收集是自愿、聚合、opt-in 的；只导出计数/分类/版本/日期，不含聊天正文、QQ、昵称、群号、路径或 Cookie。协议见 docs/数据收集协议.md。

## 安装

下载 Release 包，将 plugin/ 放入 QQ Agent 插件目录；按 INSTALL.md 启用。顶栏补丁在 patch/。重启 QQ Agent 让 adminId 和权限生效。

## 风险

本地记忆属于敏感数据；公共平台动作可能不可撤回；插件以宿主权限运行，不是 OS 沙箱。详见 docs/炸机说明（必看！！！！）.md。

## 版本与测试

0.20.0  
node --test: 61 pass / 0 fail

维护者：似水未来  
2736629638@qq.com
