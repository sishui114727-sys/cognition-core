# 权限 GUI 说明

![权限面板预览](gui-preview.png)

## 0. 顶栏入口

已增加 QQA 顶栏一级入口：

```text
会话 | 用量 | 认知 | 下载 | 工具 | 设置
```

点「认知」直接打开同一个权限面板。  
补丁说明见 [QQA 顶栏模块](QQA_TOPBAR.zh-CN.md)。

## 1. 两个界面

QQA 的插件界面分两层：

```text
设置表单（可编辑）
  由 plugin.json 的 configSchema 生成
  保存走宿主 /api/skills/<id>

权限面板（只读）
  panel/overview.html
  展示当前快照
```

面板从上到下四块：权限等级与状态、**记忆健康（注入遥测）**、**关系与约定（C/D）**、功能卡片。
「关系与约定」只在确实记下过内容时出现：关系与约定分组列出，带角色/场景/到期/证据数，
已撤销或被取代的不显示。它读插件同目录的 `live-snapshot.json`（插件每次写快照时重写，
含 `collectTerms` 单独取的一次认知表），不经过宿主 storage。

### 为什么面板只读

QQA 的 `/plugin-panel/` 通道是**纯 GET 静态文件**：

- 没有写接口
- 页面只能读自己插件目录和 `plugin-data`
- CSP 禁止内联脚本
- 设计目的就是防止页面绕过配置和权限校验

因此：

> 开关和限制的编辑入口是「设置表单」；面板负责解释当前状态，不负责写入。

这比在面板里偷偷调内部 API 更安全。

## 2. 权限等级

| 等级 | 名称 | 允许 |
|---|---|---|
| L0 | 只读 | 读取和回复，不主动社交、不发布 |
| L1 | 低风险 | 表情、音乐、学习阅读 |
| L2 | 社交 | 私聊、群内接话；仍受时间窗/频率限制 |
| L3 | 公共表达 | 评论、空间、头像；默认关闭 |
| L4 | 高影响 | 视频、桌面；默认关闭 |

功能有硬性等级：

```text
sticker/music        L1
privateChat/group    L2
biliComment/xiaohihe/qzone/avatar L3
video/desktop        L4
```

实际放行：

```text
feature.hardLevel <= permissionLevel
```

所以最高权限设为 L2 时，即使打开评论开关，也不会真正执行。

## 3. 功能接口开关

当前 11 个：

```text
sticker       表情
music         音乐
privateChat   主动私聊
groupChat     群内接话
biliRead      B站学习/观看
biliComment   B站评论/弹幕
xiaohihe      小黑盒发帖/评论
qzone         QQ空间发布/评论
avatar        更换头像
video         发布视频
desktop       桌面操作
```

默认：

```text
开启：sticker, music, privateChat, groupChat, biliRead
关闭：biliComment, xiaohihe, qzone, avatar, video, desktop
```

## 3.5 可选上下文注入

设置里还有：

```text
每轮注入认知上下文（实验，默认关闭）
注入预算（估算 token，默认 600）
注入条数上限（默认 3）
```

默认关闭，不增加常驻 token。  
打开后只注入当前会话范围内的小 ContextPack，不注入完整 SelfModel。

## 3.5 表情发送额度

默认：

```text
每日上限：0（无限制）
每周上限：0（无限制）
冷却：0（无冷却）
```

对应设置：

```text
stickerDailyLimit
stickerWeeklyLimit
stickerCooldownMin
```

只有填大于 0 的数才会开始限制。  
`meme-taste` 的收藏额度是另一套，不是发送额度。

## 3.6 跨会话认人卡片

设置里还有：

```text
跨会话认人卡片（默认开启）
```

行为：

- 只对当前发言者注入
- 最多 2 条印象
- 追加到 user 末尾，不改 system
- 群聊不带入私聊印象
- 没有印象就不注入

## 4. 时间窗与条数限制

所有社交、评价、发布、资料修改类功能都有：

```text
WindowStart   开始时间 HH:mm
WindowEnd     结束时间 HH:mm
DailyLimit    每日条数上限
WeeklyLimit   每周条数上限
CooldownMin   冷却分钟
```

规则：

- 时间窗按 `timeZone` 的本地时间判断
- 支持跨午夜，例如 `23:00–02:00`
- `start == end` 表示全天
- `DailyLimit = 0` 表示不限
- `WeeklyLimit = 0` 表示不限
- `DailyLimit` 不得大于 `WeeklyLimit`
- 冷却以最后一次成功记录为准

默认值：

| 功能 | 时间窗 | 日 | 周 | 冷却 |
|---|---|---:|---:|---:|
| 主动私聊 | 08:00–23:30 | 20 | 100 | 5 分钟 |
| 群内接话 | 08:00–23:30 | 40 | 250 | 2 分钟 |
| B站评论/弹幕 | 10:00–22:00 | 3 | 10 | 60 分钟 |
| 小黑盒发帖/评论 | 10:00–23:00 | 2 | 7 | 120 分钟 |
| QQ空间发布/评论 | 09:00–23:00 | 2 | 7 | 120 分钟 |
| 更换头像 | 00:00–23:59 | 1 | 2 | 1440 分钟 |
| 发布视频 | 10:00–22:00 | 1 | 2 | 1440 分钟 |

## 5. 面板里能看到什么

- 当前权限等级与含义
- 运行状态
- 时区
- 每个功能的开关
- 时间窗
- 日/周上限
- 冷却
- 硬性等级提示
- 不限次数警告

面板数据来源：

```text
../@data/storage.json
```

真实运行时由宿主写入：

```text
<DATA_DIR>/plugin-data/cognition-core/storage.json
```

未接入时使用：

```text
panel/storage.example.json
```

## 6. 设置表单怎么改

在 QQA 插件页打开「认知核心」的 ⚙ 设置，修改：

```text
最高权限等级
功能开关
时间窗
日/周上限
冷却
```

保存后由宿主写入配置；插件重载后生效。

特别地：保存 `adminId`、`injectPersonCardEnabled`、`injectContextEnabled` 后，
运行中的 hostState 不会自动刷新。必须重载插件或重启 QQA，否则工具仍读旧值。

## 7. 接入状态

当前（Phase 8）：

```text
GUI 页面与 manifest 已完成
设置 schema 已完成
Gateway 拦截已完成
QQA plugin setup / activate 已完成
settings -> Gateway 已完成
Gateway snapshot -> api.storage 已完成
真实 QQ/B站/小黑盒/QQ空间 Adapter 尚未接
```

安装验收：

```text
QQA 加载成功：cognition-core v0.8.0
active = true
toolIds = cognition_status, cognition_recall
panel 200
storage.json 已生成
```

## 8. 安全

- 面板只读
- 无内联脚本
- 无外部 CDN
- 路径由宿主校验
- 设置保存只接受 manifest 声明过的键
- 非主人不能通过面板改权限
- 面板不能绕过 ActionBus

## 9. 预览

```bash
# local static preview
cd panel
python -m http.server 8765
# open http://127.0.0.1:8765/overview.html
```
