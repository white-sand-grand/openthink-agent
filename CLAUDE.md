# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 最重要的五件事

1. **这是 Claude Code v2.1.88 的深度改造 fork**,项目名 OpenThink,MIT,纯 API 多提供商。不是原版 CC——很多"上游有"的东西这里状态不同,动手前必查 `docs/upstream-sync/INVENTORY.md`。
2. **每次更改完自行实测、检验、查漏洞并修复**。验证工具箱在下方 §验证工具箱。
3. **工作区有大量未提交改动**(用户自行提交)。动手前先 `git status` + `git log --oneline -5` 摸清基线,不要假设干净。
4. **铁律**:不回退本 fork 自有资产(四角色槽位、/provider 体系、虾吉祥物、去品牌的系统提示词);不把 Anthropic/Claude 品牌写回模型可见提示词;`ANTHROPIC_*` 环境变量名与 5 个 `@anthropic-ai/*` SDK 依赖是协议实体,**不要改名**。
5. **每完成一小步就更新三个追踪文档**(见下方 §工作流与追踪文档),这是用户明确要求的工作方式。

## 平台注意

用户在 **Windows 11 + Git Bash** 上运行,WSL2 系统映射。有些情况可能不适配,**第一时间告诉用户**。

## 命令

```bash
# 安装依赖
bun install                  # Bun 1.3.5+ required

# 开发入口
bun run dev                 # 交互 REPL
bun run dev -p "..."        # 打印模式(单次查询)
bun run dev mcp             # MCP 服务器模式
bun run dev --version       # 版本

# 类型检查
bun run build

# 无 bun test 脚本;无测试基础设施
```

**注意**:`src/dev-entry.ts` 会先扫描所有相对 import 缺失情况,有缺失时打印摘要并退出而非启动 REPL。很多源文件仍在恢复中,import 未解决是正常的中间态。

## 验证工具箱

改完每份文件后运行这些检查:

1. **结构平衡校验器** (`balance.mjs`):对改过的 `.ts/.tsx` 跑一遍,输出必须 `balanced`。已知误报:正则字面量里的 `//`、`"`、`(`、`[`。报警先看该行是否正则,再 `git stash -- <file>` 对照原文件确认是否既有误报。
2. **交叉引用 grep**:改/删任何导出后,全仓 grep 旧名确认零残留。
3. **git diff 自查**:每次编辑后看 diff,每行改动都能说清理由。
4. **git stash 对照法**:怀疑误报时,`git stash -- <file>` 后对原文件跑检查器,原文件也报 = 既有误报。

```js
// balance.mjs — 结构平衡校验(处理字符串/模板/注释;对正则有已知误报)
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2);
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const stack = []; let inComment = null; let i = 0; let ok = true;
  const lineAt = idx => src.slice(0, idx).split('\n').length;
  while (i < src.length) {
    const c = src[i]; const next = src[i + 1];
    if (inComment === 'line') { if (c === '\n') inComment = null; i++; continue; }
    if (inComment === 'block') { if (c === '*' && next === '/') { inComment = null; i += 2; continue; } i++; continue; }
    const top = stack[stack.length - 1];
    if (top === '"' || top === "'") { if (c === '\\') { i += 2; continue; } if (c === top) stack.pop(); i++; continue; }
    if (top === '`') {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') stack.pop();
      else if (c === '$' && next === '{') { stack.push('${'); i += 2; continue; }
      i++; continue;
    }
    if (top === '${') { if (c === '}') { stack.pop(); i++; continue; } }
    if (c === '/' && next === '/') { inComment = 'line'; i += 2; continue; }
    if (c === '/' && next === '*') { inComment = 'block'; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') { stack.push(c); i++; continue; }
    if (c === '{' || c === '(' || c === '[') { stack.push(c); i++; continue; }
    if (c === '}') { if (top === '${' || top === '{') { stack.pop(); i++; continue; } console.log(`${f}: stray '}' near line ${lineAt(i)}`); ok = false; break; }
    if (c === ')') { if (top === '(') { stack.pop(); i++; continue; } console.log(`${f}: stray ')' near line ${lineAt(i)}`); ok = false; break; }
    if (c === ']') { if (top === '[') { stack.pop(); i++; continue; } console.log(`${f}: stray ']' near line ${lineAt(i)}`); ok = false; break; }
    i++;
  }
  if (!ok) continue;
  console.log(`${f}: ${stack.length === 0 ? 'balanced' : 'LEFTOVER ' + JSON.stringify(stack)}`);
}
```

## 两套代码风格

| 风格 | 适用文件 | 特征 |
|---|---|---|
| **手写源码风格**(Biome) | `src/utils/**`、`src/services/**`、`src/commands/**` 手写文件、`src/commands.ts`、`theme.ts` | **无分号、单引号**、2 空格、尾逗号;JSX 属性双引号;布尔属性裸写 |
| **编译产物风格**(react-compiler 输出) | `src/components/**` 大部分文件 | 分号、双引号、`import { c as _c } from "react/compiler-runtime"`、`$[n]` memo 槽、sourceMappingURL |

**如何判断文件是否编译产物**:看有没有 `_c(` 与 `//# sourceMappingURL=`。手写改造编译产物的先例:`Shrimp.tsx`、`ModelPicker.tsx`、`ProviderPicker.tsx` 都是"整文件重写为无 `_c` 的纯 React"——运行时等价,风格向手写组件看齐。

**新写文件的手写组件惯例**:分号保留、JS 字符串单引号、JSX 属性双引号、裸布尔属性、`useKeybindings`/`Select`/`TextInput`/`Pane`/`Byline` 复用。

## 关键架构

### 主提示词
`src/constants/prompts.ts` — `getSystemPrompt()`(444 行)组装;主体约 175 行起;动态小节带 `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 缓存边界;已合并 CLAUDE.md 行为规范、已去品牌——**不要加回**。

### 模型解析
`src/utils/model/model.ts` — `getMainLoopModel`(主循环=Artisan 槽)、`getRuntimeMainLoopModel`(plan=Architect 槽)、`getSmallFastModel`(=Clerk 槽)、`getDefault*Model` 回落链:槽配置 → 旧 env → 内置家族字符串。

### 四角色槽位
`src/utils/model/slots.ts` — architect/artisan/seer/clerk;`modelSlots` 设置;`getSlotProviderOverrideForModel` 供 client 按槽路由;`supportsVision` 声明制;旧别名静默映射(opus→artisan, sonnet→seer, haiku→clerk, best→architect)。

### 提供商与密钥
`src/utils/model/apiProviders.ts` — 通用注册表(模板只含端点,模型用户自管);协议探测(POST /v1/messages 失败则试 /chat/completions);`fetchProviderModels`(GET /v1/models 候选 URL);激活=写 `settings.env` + 镜像 `process.env`。
`src/utils/model/providerKeys.ts` — `~/.openthink/provider-keys.json` 0600;含头注入防御;**Key 永不进 settings.json/日志**。

### OpenAI 适配
`src/services/api/openaiCompat.ts` — Anthropic Messages ↔ Chat Completions 翻译;表面仅 `beta.messages.create`/`countTokens`/`models.list`。

### 客户端路由
`src/services/api/client.ts` — 优先级:槽位绑定供应商 > 全局激活供应商 > 官方;OpenAI 协议走适配层。环境变量文档(ANTHROPIC_BASE_URL、Bedrock、Foundry、Vertex)在此文件头部。

### 视觉转述
`src/services/api/claude.ts` 内 `maybeRelayImagesThroughSeer` — 主模型未声明视觉时图片交 Seer 描述(会话级缓存,`queryModel` 顶部钩子)。

### /provider 与 /model UI
`src/components/ProviderPicker.tsx` — 添加/编辑/删除提供商 + 槽位分配视图(slotList/slotEdit/slotModel/slotProvider)。
`src/components/ModelPicker.tsx` — 槽位优先清单(Default=Artisan → 四槽 → 提供商模型 → 旧别名/自定义);含「更多提供商」入口。

### 状态回写
`src/state/onChangeAppState.ts` — `mainLoopModel` 变化自动持久化 `settings.model`;`settings.env` 变化自动 `applyConfigEnvironmentVariables()`。

### fast mode
`src/utils/fastMode.ts` — **已移除**,剩惰性 stub(签名兼容,`isFastModeEnabled()` 恒 false);深层调用点休眠;**不要复活**。

### 吉祥物
`src/components/LogoV2/Shrimp.tsx`、`AnimatedShrimp.tsx` — 主题键 `mascot_body`/`mascot_background`;3 行 11 列,单眼在第一行。

### 设置 schema
`src/utils/settings/types.ts` — zod;外层 passthrough;新键加在 `model:` 字段附近;辅助 schema 用 `lazySchema(() => ...)` 模式;删除键用 `updateSettingsForSource` 传 `undefined`。

## 工作流与追踪文档

三份文档,职责固定,均由用户维护:

1. **`docs/upgrade-plan-2.1.88-to-2.1.250.md`** — 主计划。§0 是执行状态表(每完成一项就更新),各条目标题带 ✅/⬜ 标记。条目含上游版本/内容/落点/要点/风险/验收,是任务规格书。
2. **`docs/upstream-sync/INVENTORY.md`** — 特性×状态×证据 的盘点表,移植 PR 前查、完成后改行。
3. **`docs/upstream-sync/CHANGELOG-NOTES.md`** — 每条移植追加:日期、条目、上游版本、实现要点、**与上游的偏离**(有偏离必须写明理由)。

**工作循环**(用户原话:每完成每段计划中的一小部分都在文档中进行修改):
```
查 INVENTORY 确认状态 → 读计划条目规格 → 改代码 → 跑 balance+grep 校验
→ 更新 INVENTORY 行 → 计划文档 §0 表+条目标 ✅ → CHANGELOG-NOTES 追加
→ 汇报(含"待用户 bun run dev 实测"声明)
```

**优先级**(用户已定):体验优先 → P0(TUI)→ P1(安全)→ P2(多会话)→ P3(平台)→ E(机制)。

**排除**(用户已定):F 类云端耦合(Remote Control/云会话/ultrareview/self-hosted runner 等);模型只移植机制不换厂商模型;P2-4(agents 视图)挂起;不写设计文档除非用户明确要求。

## 已知陷阱(每条都有真实前车之鉴)

1. **多行 import 块删除**:删成员时留下孤立 `import {`——删除后必须重扫平衡。
2. **正则批量删除误伤**:对含某词的文件用正则连删,曾把 `if` 头删掉留尾巴——批量删后必须 balance + git diff 逐行审。
3. **编译产物 memo 块**:不可只删赋值段;`$[n]` 槽读写要成对重建(重建后读写槽号要保持自洽)。
4. **sed 时序**:文件 git mv 改名后再对其内容跑 sed(先 sed 旧路径会静默空转)。
5. **编译文件里替换 raw JSX 文本时**,预览/提取脚本要处理"裸文本子节点"(不在引号里)。
6. **replace_all 于同形字符串**:会漏掉变体——改完 grep 全部变体。
7. **不要发明新环境变量**(有过 `OPENTHINK_PROVIDER_KEYS_DIR` 被毙的先例);配置目录用 `getOpenThinkConfigHomeDir()`。
8. **删常量时注意对象尾 `}` 与悬空注释**。
9. **不要发明新环境变量面**(有过 OPENTHINK_PROVIDER_KEYS_DIR 被毙的先例);配置目录用 getOpenThinkConfigHomeDir()。
10. 工具输出/预览脚本超大时会被截断落盘——读持久化路径,别重跑。

## M1 剩余待办(按序)

1. **P0-4** `/config key=value` + `/config --help` — `src/commands/config/` + `Config.tsx`; 键清单从 zod schema 自动生成; 写路径必须走 `updateSettingsForSource`
2. **P0-13** 会话命名 — `src/utils/sessionStorage.js` + 标题生成(复用小模型)
3. **P0-10** 用户消息 markdown — REPL 用户消息行复用 `src/components/Markdown.tsx`
4. **P0-16** Auto 主题 + 自定义 diff 色 — `src/utils/theme.ts`
5. **P0-5** emoji 补全、**P0-6** spellcheck(优雅降级，Windows 常无 aspell)、**P0-7** vim visual、**P0-8** readline 键位
6. **P0-1** /tui 与全屏稳定性(收窄后范围:无虚拟化/无鼠标)
7. **P0-17** prompt cache 修复(用户点名提前;含 2.1.237 自定义端点缓存修复——与 /provider 直接相关)

之后: **P1** 安全批次(攻击样例表驱动验收) → **P2** → **P3** → **E-2/E-3/E-4/E-6**。

## Feature flags

Feature flags are declared inline using `bun:bundle` feature:
```typescript
if (feature('SOME_FEATURE')) { ... }
```
These are compile-time dead-code-eliminated by Bun's bundler. Common flags: `COORDINATOR_MODE`, `KAIROS`, `AGENT_TRIGGERS`, `MONITOR_TOOL`, `WEB_BROWSER_TOOL`, `WORKFLOW_SCRIPTS`, `OVERFLOW_TEST_TOOL`, `HISTORY_SNIP`, `TERMINAL_PANEL`.

## Handoff doc

`docs/HANDOFF.md` 是交接文档(不入库,.gitignore 排除)。包含完整的已知陷阱、工作循环、验证手段和代码风格说明。改代码前不确定时先读它。
