# 开元六爻

部署详细教程：https://www.ta-ku.top/blog/liuyao-kytb 

> 六爻起卦 · 自动装卦 · 规则分析 · AI 解读

现代极简白色 UI 的文王六爻 / 京房纳甲在线起卦与排盘网站。

**核心原则**：起卦随机、装卦可复核、分析透明、AI 只负责解读、不负责计算。

## 项目介绍

「开元六爻」是一个可以复核的六爻计算引擎 + 一个现代化的起卦体验 + 一个透明的传统规则解释层 + 一个可选的 AI 自然语言解读层。

- **在线起卦**：3 枚开元通宝、6 次掷币（浏览器 `crypto.getRandomValues` 位运算取 bit，杜绝取模偏差）
- **手动排盘**：在现实中用真正铜钱起卦，输入每爻背面数（0–3）即可装卦分析
- **六爻引擎**：纯 TypeScript 包 `packages/liuyao-engine`，不依赖 React / Next.js / DOM
- **AI 解读（可选）**：仅当管理员配置后可用；AI 只把已确定的规则结果翻译成自然语言

## 功能

- 本卦 / 变卦 / 动爻、纳甲（含天干）、六亲、八宫、世应、六神
- 时间引擎：北京时间（Asia/Shanghai）强制；年柱立春换年、月柱十二节交节时刻换月（内置 1900–2100 节气时刻表，VSOP87 生成、附校验和）、日柱 JDN 公式（`(JDN+49) mod 60`，锚点 2000-01-01 戊午 / 1949-10-01 甲子）、23:00 换日、历史夏令时（IANA）
- 旬空、月破、六冲、六合、三合（仅识别）、暗动 / 日破 / 空而被冲 / 月破日冲
- 用神系统：按类别推荐、多候选择优（透明理由，禁止黑盒评分）、疾病双用神（官鬼为病 / 子孙为药）、婚姻性别确认、用神不上卦提示
- 原神 / 忌神 / 仇神、旺衰（旺相休囚死）、日辰作用（日生/日克/日冲/日合/日扶/日平）
- 结论引擎：有序规则表首条命中、证据链含 ruleId、冲突保守输出「难断」、无数字评分
- 历史记录：LocalStorage 匿名保存、JSON 导入导出（含 schema 校验、重复 id 跳过、5MB/1000 条上限）
- 管理后台：AI Provider 配置（Base URL / Model / API Key）、连接测试、会话安全（登录限流 5 次/分、连续 5 次失败锁定 15 分钟、空闲 30 分钟 / 绝对 12 小时过期、登录轮换 session id、CSRF 双提交 cookie）

## 截图

（部署后自行补充：首页 / 掷币 / 结果页 / 手动排盘 / 历史记录）

## 算法说明

六爻计算引擎与 AI 解读完全分离。装卦、旺衰、用神、生克、结论完全确定、可复核、可回归测试；AI 只负责把已确定的规则结果翻译成自然语言，其输出经服务端 JSON Schema 校验，`overall` 与引擎结论冲突时以引擎为准。

随机性：每爻 3 字节独立取自 `crypto.getRandomValues`，每枚硬币按最低位（`& 1`）判正背，无取模偏差；同一 `tosses + timeContext` 输入的卦盘 JSON 字节级一致。

回归测试覆盖：硬币映射、八卦、纳支、纳甲天干、六亲、世应（火天大有世三应六）、六神（甲日/庚日起例）、23:00 换日、立春/惊蛰节气边界（±1 分钟月柱不同）、五虎遁、旬空、月破、暗动（排除旬空/月破）、结论首条命中与冲突合成、双用神、10 万次抽样分布（容差 1%）等 45 项。

## 本地开发

```bash
npm install          # 安装依赖（workspace：packages/liuyao-engine）
npm run test:engine  # 引擎单元测试（45 项）
npm run typecheck    # 类型检查
npm run dev          # 启动开发服务器 http://localhost:3000
npm run build        # 生产构建（standalone 输出）
```

环境变量（管理员）：`ADMIN_USERNAME`、`ADMIN_PASSWORD`、`SESSION_SECRET`（≥32 位）。生产模式下 `SESSION_SECRET` 缺失或过短将拒绝启动。

## Docker 部署

```bash
cp .env.example .env   # 修改 ADMIN_PASSWORD / SESSION_SECRET
docker compose build
docker compose up -d
```

升级：

```bash
git pull
docker compose build
docker compose up -d
```

- 生产镜像多阶段构建、standalone 输出、非 root 用户运行、仅 `/app/data` 可写
- 容器 umask 0027，`ai.json` 以 0600 创建，启动时校验并尝试修正
- healthcheck 使用 `wget http://localhost:3000/api/health`（镜像内已安装 wget）
- HSTS 与 HTTPS 由反向代理层开启；`/admin` 可在反代层追加 IP 白名单

## AI 配置

1. 访问 `/admin` 登录（环境变量中的管理员账号）
2. 填入 OpenAI-compatible 的 Base URL、Model、API Key，保存或先「测试连接」
3. 访问者打开结果页的「AI 解读」→ 请求经 `/api/ai/interpret` 服务端转发，API Key 永不出现在浏览器

安全要点：API Key 不回显（只返回 `apiKeyConfigured`）；保存时 Key 留空则保留原值；支持环境变量 `AI_API_KEY` 覆盖；服务端对请求中的 tosses + timeContext 用引擎复算，不一致返回 400（防篡改）；限流 10 次/分钟、100 次/日；AI 输出 JSON Schema 校验不通过自动重试一次，仍失败则降级。AI 关闭或不可用时，基础排盘与规则分析完整可用。

## 隐私说明

- 无用户账号、无用户数据库；卦象仅保存在当前浏览器 LocalStorage
- 除管理员会话外不设置任何 Cookie；无第三方统计 / 追踪脚本
- AI 请求默认仅发送卦盘与分析 JSON；所问文本是否随请求发送由管理端开关控制（默认关闭）
- 删除全部历史后，服务器没有任何数据残留可删除

## 开源协议

MIT License，见 [LICENSE](./LICENSE)。

## 免责声明

本站用于传统文化学习与娱乐参考。六爻结果不构成医疗、法律、财务等专业决策建议；重大事项请咨询相关专业人士。

## 规则冲突登记

开发中发现的文档与权威规则不一致处见 [RULES-CONFLICTS.md](./RULES-CONFLICTS.md)（含火天大有纳支示例的裁决）。
