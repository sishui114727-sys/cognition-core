# 安装与验证（cognition-core 0.23.22）

这份文档只写**能验证的步骤**。每一步都给出如何确认它真的生效，以及怎么回滚。

---

## 1. 前置条件

```text
QQ Agent（QQA）0.4.9.0 或更高，已安装并运行过至少一次
Node 运行时由 QQA 自带，不需要单独安装
```

## 2. 放入插件目录

把压缩包里的 `plugin/` 整个目录复制到：

```text
<QQ Agent 安装目录>\resources\app\plugins\cognition-core
```

要求复制完成后目录结构是：

```text
resources\app\plugins\cognition-core\plugin.json
resources\app\plugins\cognition-core\index.js
resources\app\plugins\cognition-core\src\...
```

**不要**在 `plugin/` 里再套一层目录。`plugin.json` 必须直接位于 `cognition-core\` 下。

## 3. 重启宿主

QQA 的热重载只重载 `index.js`，`src/` 下的静态导入会被缓存，所以**换版本必须重启进程**：

```powershell
taskkill /IM "QQ Agent.exe" /T /F
Remove-Item "<QQ Agent 安装目录>\data\qq-agent.lock" -ErrorAction SilentlyContinue
Start-Process explorer.exe -ArgumentList '"<QQ Agent 安装目录>\QQ Agent.exe"'
```

如果 `qq-agent.lock` 存在且进程已退出，不删掉会导致启动失败。

## 4. 确认加载成功

```powershell
(Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3210/api/skills).Content
```

在返回的 JSON 里找 `"id": "cognition-core"`，确认：

```text
version = 0.23.22
active  = true
工具数量 = 16
```

日志里应该出现：

```text
✅ 加载成功：认知核心（cognition-core v0.23.22，api v1）
```

## 5. 首次配置

```text
设置 → 插件 → 认知核心
  主人 QQ 号     必填（owner-only 判定的唯一依据）
  启用认知核心   打开
  最高权限等级   建议先 L2
  时区           按所在地填
```

保存后重启一次，让设置进入默认策略。

## 6. 功能确认（五分钟）

```text
1. 私聊说一句「我喜欢吃甜的」
2. 打开权限面板：应该能看到这条事件被记录
3. 再问一句「我喜欢吃什么」，看它是否能回忆
4. 问一个完全无关的话题（比如「明天的机票价格」），
   它应该回答「没有找到可靠的相关记忆」而不是硬凑
5. 面板「关系与约定」区块：如果说过「以后叫我主人」，这里应该有记录
```

## 7. 回滚

```text
1. 保留上一版本的 plugin/ 目录副本
2. 停用插件 → 退出 QQA → 换回旧目录 → 重启
3. 数据结构是 append-only，旧版本读新数据一般没问题；
   如果旧版本报错，备份 data/plugin-data/cognition-core 后回滚数据
```

## 8. 卸载

```text
1. 设置里停用「启用认知核心」
2. 退出 QQA
3. 删除 resources\app\plugins\cognition-core
4. 按需删除 data\plugin-data\cognition-core（不可恢复，先备份）
```

---

安装遇到问题，先看 `docs/炸机说明（必看！！！！）.md` 第四节「装载后可能出现的具体问题」。