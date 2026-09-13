# 上游特性盘点清单(INVENTORY)

> 基线:Claude Code v2.1.88 → 目标:v2.1.250
> 状态图例:⬜ 缺失待移植 · 🟨 部分存在 · ✅ 已存在/已完成 · ☁️ 云端耦合(排除)
> 每行必须有证据(文件:行 或 grep 结论)。移植 PR 须引用本表行。

## P0 — TUI / 交互

| 特性 | 上游版本 | 状态 | 证据 / 备注 |
|---|---|---|---|
| /tui 命令与 tui 设置 | 2.1.110 | 🟨 | `src/commands/tui` 已存在；2026-09-07 修复实际模式切换与环境变量优先级，`tests/tui.test.ts` 通过；完整 TUI 实测待完成 |
| NO_FLICKER / DISABLE_ALTERNATE_SCREEN | 2.1.89/132 | 🟨 | fullscreen.ts 已有 isFullscreenEnvEnabled;环境变量开关未见 |
| /rewind | 2.1.191 | ✅ | src/commands/rewind 存在(预先摘樱桃) |
| /scroll-speed | 2.1.139 | ⬜ | src/commands/scroll-speed 不存在(随鼠标支持搁置) |
| /cd | 2.1.169/246 | ✅ | `src/commands/cd/cd.ts`：会话内 process.chdir + setCwd + CwdChanged hooks；`tests/cd.test.ts` |
| emoji 短代码补全 | 2.1.217 | ⬜ | 无 emojiCompletion |
| spellcheck | 2.1.235 | ⬜ | 无 spellcheck |
| vim visual 模式 | 2.1.118 | ⬜ | VimTextInput 无 visual |
| vimInsertModeRemaps | 2.1.208 | ⬜ | 无 |
| keybindingFlavor: readline | 2.1.238 | ⬜ | 无 |
| Concise 输出样式 | 2.1.237 | ✅ | src/constants/outputStyles.ts OUTPUT_STYLE_CONFIG.Concise |
| 用户消息 markdown 渲染 | 2.1.234 | ⬜ | REPL 用户消息为纯文本 |
| /resume 分页加载 | 2.1.243 | ⬜ | ResumeConversation 为一次性列表 |
| 后台会话进 /resume | 2.1.144 | ⬜ | 同上 |
| Auto(match terminal) 主题 | 2.1.111 | ⬜ | theme.ts 无 auto 主题 |

## 启动链路诊断(非上游条目)

- ✅ 2026-09-07 视觉反馈修正：Orb 最终调整为 9×3、单排双眼与主体连续背景填充，撤销导致四眼错觉的两排眼睛；`getLogoDisplayData` 统一展示版本 0.8；LogoV2/CondensedLogo 使用 `useConfiguredMainLoopModel`，未配置时显示 no model 且无 effort 后缀。API 模型回落链未更改。
- ✅ 2026-09-08 底部状态栏同步：`PromptInputFooter` 使用同一配置判定，未嵌入模型时显示 `model:no model`，避免 UI 与欢迎栏不一致。

- ✅ 2026-09-07 用户指定的圆形吉祥物：`Orb.tsx` 7 列×3 行，沿用 mascot_body，两个白色竖长方形眼睛；`AnimatedOrb.tsx` 固定尺寸眨眼/左右看；`CompanionSprite.tsx` 名称限宽和气泡收窄。独立 Ink 渲染已验证，完整 REPL 待用户实测。

| 检查项 | 状态 | 证据 / 备注 |
|---|---|---|
| 无 API key 可进入交互 TUI | ✅ | WSL 伪终端实测:源码扫描后渲染 Welcome/主题选择;请求阶段才提示认证缺失 |
| 相对导入完整性 | ✅ | `bun run check:imports` 输出 `missing relative imports: 0` |
| 启动阶段性能可观测 | ✅ | `~/.openthink/startup-perf/*.txt` 已记录至 `action_commands_loaded`; `/mnt/d` 扫描约 8–18 秒 |

| 信任确认后 REPL 挂载 | ✅ | 修复别名导入与 API-only stub 导出缺口；WSL 伪终端日志含 `[REPL:mount] REPL mounted` |

| `/config key=value` 与 `/config --help` | ✅ | `src/commands/config/config.tsx`, `config-help.ts`;支持 `thinking` → `alwaysThinkingEnabled` 兼容别名、非法值拒绝落盘 |
| OpenThink TUI 吉祥物/欢迎页/输入区规整化 | ✅ | `src/buddy/CompanionSprite.tsx`; `src/components/PromptInput/PromptInput.tsx`; `src/components/LogoV2/LogoV2.tsx`;布局与宽字符换行优化，行为保持兼容 |

## P1 — 安全 / 权限

| 特性 | 上游版本 | 状态 | 证据 |
|---|---|---|---|
| Tool(param:value) 规则 | 2.1.178 | ⬜ | PermissionRule 无参数级解析 |
| deny 规则 glob | 2.1.166 | ⬜ | 同上 |
| --safe-mode | 2.1.169 | ⬜ | main.tsx 无该旗标 |
| --restricted | 2.1.248 | ⬜ | 无 |
| sandbox.network.deniedDomains | 2.1.113 | ⬜ | settings types 无 |
| sandbox.network.strictAllowlist | 2.1.219 | ⬜ | 无 |
| sandbox.credentials | 2.1.187 | ⬜ | 无 |
| shell 权限绕过修复合集 | 2.1.222-246 | ⬜ | P1-1 逐条移植(见计划文档) |
| NT \??\ 路径拒绝 | 2.1.233/234 | ⬜ | 路径校验无该规则 |

## P2 — 子代理 / 多会话

| 特性 | 上游版本 | 状态 | 证据 |
|---|---|---|---|
| SendMessageTool | 2.1.224 | 🟨 | src/tools/SendMessageTool 已有,与上游差距见 P2-1 |
| ListAgents | 2.1.224 | 🟨 | 同上盘点 |
| subagent forking 默认 | 2.1.232 | ⬜ | AgentTool 无 fork 语义 |
| 嵌套深度 3 / 并发 20 | 2.1.219/217 | ⬜ | 无对应限制常量 |
| claude agents 视图 | 2.1.139 | 🟨 | src/cli/handlers/agents.ts 雏形(挂起项 P2-4) |
| 后台会话 Notification hook | 2.1.198 | ⬜ | 无 agent_needs_input/agent_completed |

## P3 — 平台扩展

| 特性 | 上游版本 | 状态 | 证据 |
|---|---|---|---|
| PreToolUse "defer" | 2.1.89 | ⬜ | PermissionResult 无 defer |
| PermissionDenied hook | 2.1.89 | ⬜ | 无 |
| PreCompact hook 阻断 | 2.1.105 | ⬜ | 无 |
| hook args exec 形式 | 2.1.139 | ⬜ | hooks schema 无 args |
| continueOnBlock | 2.1.139 | ⬜ | 无 |
| MessageDisplay hook | 2.1.152 | ⬜ | 无 |
| DirectoryAdded hook | 2.1.219 | ⬜ | 无 |
| /reload-skills | 2.1.152 | ⬜ | 无该命令 |
| disableBundledSkills | 2.1.169 | ⬜ | 无 |
| 插件 archive 源 | 2.1.224 | ⬜ | marketplace 源类型无 archive |
| 插件 GitLab 源 | 2.1.232 | ⬜ | parseMarketplaceInput 无 gitlab |
| MCP alwaysLoad | 2.1.121 | ⬜ | MCP 配置无该键 |
| claude mcp login/logout | 2.1.186 | ⬜ | cli/handlers/mcp 无 |

## E — 模型机制

| 特性 | 上游版本 | 状态 | 证据 |
|---|---|---|---|
| xhigh effort | 2.1.111 | ⬜ | effort 层无 xhigh |
| /model 命令 | 2.1.88 基线 | ✅ | 基线即缺失,2026-09-02 重建:src/commands/model(immediate;无参开 ModelPicker 槽位优先清单,带参经 parseUserSpecifiedModel 直切) |
| /effort 交互式选择器 | 2.1.2xx(2.1.258 changelog 中已属既有) | ✅ | 无参 /effort 渲染 Select 选择器(commands/effort/effort.tsx EffortSelector);带参保持 executeEffort 直切。偏离:无 per-model effort 持久化、无 2.1.257 的 s 键 |
| ModelPicker effort 行(←→ 循环+持久化) | 2.1.88 基线 | ✅ | 曾被本仓 2534075 剥离 UI、d8be712 删键位,2026-09-02 恢复(ModelPicker.tsx + ModelPicker 键位上下文 + onSelect 双参) |
| modelPicker 设置 | 2.1.243 | ✅* | 本项目以自有四槽体系 + /provider 实现(结构性替代),见 slots.ts |
| enforceAvailableModels | 2.1.175 | ⬜ | modelAllowlist 不约束 Default |
| modelPricing | 2.1.243 | ⬜ | modelCost 无托管定价 |
| promptCacheTtl / 1h 选项 | 2.1.243/108 | ⬜ | 无对应设置 |
| ANTHROPIC_DEFAULT_MODEL | 2.1.236 | ⬜ | model.ts 优先级链无此变量 |
| fast mode | — | ✅ | 已整体移除(本项目决策) |

## F — 云端耦合(明确排除)

Remote Control、云会话(ultrareview/autofix-pr/teleport)、self-hosted runner、
usage-credits、managed settings 服务器、/web-setup、Claude in Chrome、
VSCode/JetBrains 扩展专项 —— 依赖 Anthropic 服务端,不做。
