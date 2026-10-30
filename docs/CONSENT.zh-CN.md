# 数据提供同意书

版本：`public-data-v1`  
项目：`cognition-core`

---

## 同意文本

请在使用导出脚本前阅读。

```text
我自愿向 cognition-core 维护者提供本机生成的匿名聚合指标。

我知道：
1. 提供是自愿的，不提供不影响软件使用。
2. 只包含计数、分类、版本号和日期。
3. 不包含聊天正文、QQ 号、昵称、群号、Cookie、token、
   文件路径、SelfModel 文本或人物印象原文。
4. 少于 5 的单元会被抑制。
5. 数据用于评估架构、兼容性和性能。
6. 数据不会出售。
7. 聚合数据最长保存 90 天。
8. 我可以不运行脚本，或联系维护者删除已提交文件。
9. 我确认自己有权提供这些数据。
10. 我已阅读 docs/数据收集协议.md。

同意版本：public-data-v1
```

---

## 如何表示同意

运行：

```bash
node scripts/public-data-export.mjs \
  --data-dir <本机 core 数据目录> \
  --out public-data.json \
  --consent public-data-v1
```

只有在命令里显式包含：

```text
--consent public-data-v1
```

才视为同意。

---

## 不同意

不运行脚本即可。  
软件不会因为没有提交数据而减少功能。

---

## 提交前检查

```text
[ ] 文件里没有聊天原文
[ ] 文件里没有 QQ 号
[ ] 文件里没有路径
[ ] 文件里没有 cookie/token
[ ] 文件里只有计数和分类
[ ] 我确认要提交
```



---

维护者：似水未来  
邮箱：2736629638@qq.com  
项目：QQ Agent 插件 cognition-core

