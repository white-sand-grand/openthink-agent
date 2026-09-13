# 上游移植变更台账(CHANGELOG NOTES)

> 每完成一个移植条目,在此追加一条:日期、条目编号、上游版本、实现要点、与上游的偏离。

## 2026-09-07

### 2026-09-14 P0-3 `/cd`
- 新增 `src/commands/cd/`：无参数显示当前目录；参数支持相对/绝对路径，先 realpath 校验再更新进程 cwd 和 bootstrap cwd 状态，并触发 CwdChanged hooks。
- 失败时保留原目录；不修改 originalCwd/projectRoot。验证覆盖查询、成功切换和失败不变。

### 第二次截图反馈：恢复单排双眼与圆形比例
- 用户终端把跨两行的眼睛显示成四个分离白块；9×4 主体显得过高。修正为上一版单排双眼的 9×3 放大版，左右各留三列，保留眨眼/左右视线和上下主体连续填充。
- 不改版本号与模型空态。偏离：用户指定视觉修订，无上游对应条目。独立 Ink 姿态预览与结构检查；待用户 bun run dev 实测。

### 2026-09-08：底部状态栏模型空态对齐
- `PromptInputFooter` 改用 `useConfiguredMainLoopModel` 的结果；没有槽位/环境/显式模型配置时，底部显示 `model:no model`，有配置时显示当前模型。
- 验证：WSL Bun 测试 3 项、21 断言通过；相对导入检查为 0；实机隔离 REPL 已看到 `model:no model`。待用户完整交互实测。

### 截图反馈：放大圆形、消除主体黑缝、欢迎栏显示真实配置
- Orb 由 7×3 调为 9×4，中央背景在四行间连续填充；双眼两行高，保留左右视线和眨眼。
- 顶部完整/紧凑欢迎栏统一使用 UI 版本 0.8；包版本、协议版本与更新比较版本保持原值。
- 新增配置判定与 UI Hook：没有当前可用配置时显示 no model，不显示内置 Sonnet 和 effort；配置了默认 Artisan、选中的槽位或显式模型 ID 时显示解析后的实际名称；订阅设置及选择变化。
- 验证：独立 Ink 彩色输出检查；配置判断 2 个测试、11 断言通过；balance 中 logoV2Utils.ts 在 HEAD 与改后均报相同第 269 行（URL 正则导致既有误报），其余修改文件 balanced。待用户 bun run dev 实测。
- 偏离：本次为用户指定的 UI 修正，API 请求仍遵循原模型回落机制；no model 仅用于展示，不作为请求模型发送。

### 用户指定：小尺寸圆形吉祥物与灵动双眼
- 当前代码为 Orb（并非旧文档中的 Shrimp）：保留已有 mascot_body 主题色与白色眼睛，用半块字符形成圆弧，去掉轮廓外的有色背景；尺寸由 11×5 减为 7×3。
- 两只眼睛为白色竖长方形，左右视线实际位移，眨眼保留身体底色；AnimatedOrb 定时器循环有界、清理正确，移除会超出高度的身体弹跳；prefersReducedMotion 下静止。
- CompanionSprite 复用新尺寸，名称最多 10 显示列，气泡宽度从 34 缩为 24 列；输入宽度预留同步调整。
- 验证：独立 Ink 渲染静态四姿态和完整动画循环，未出现布局高度增长；balance 与导入检查执行。预览使用隔离配置目录，不改用户个人设置。待用户 bun run dev 实测完整 UI。
- 与上游偏离：用户明确要求的品牌视觉定制，无上游对应条目；不使用位图，保持终端字符组件和现有主题接口。

### P0-1 子项：修复渲染器切换与环境变量优先级
- 上游对应：2.1.110 /tui、2.1.132 禁用备用屏幕；本次为已移植实现的回归修复。
- 原问题：NO_FLICKER=1 时 /tui classic 报成功但保持全屏；无参数切换读取持久设置而非实际模式。
- 修复：会话选择覆盖启动 NO_FLICKER 偏好；DISABLE_ALTERNATE_SCREEN 保持硬禁用且命令拒绝启用，不改设置或渲染 nonce。
- 验证：WSL Bun 1.3.11 执行 tests/tui.test.ts，1 测试、10 断言通过；配置写入以 mock 隔离。balance 与 git diff --check 通过。
- 偏离：继续使用本 fork 已有 OPENTHINK_* 名称；未复原云端功能。前两次 modal 尺寸补丁仅通过静态检查，不能据此认定长对话框滚动或焦点恢复正常。待用户 bun run dev 实测。

## 2026-08-29

### P0-0.1 / P0-0.2 / P0-0.3(Phase 0 完成)
- INVENTORY.md 建立并完成首轮全量盘点
- ultraplan 命令与注册移除(上游 2.1.222 "Removed ultraplan feature")
  - **偏离说明**:计划预估"删命令与注册"为 S;实际发现 ultraplan 触角延伸到
    AppState 字段、PromptInput 关键词触发、远程会话组件、SDK schema 等 25 文件,
    与 F 类云基础设施交织。本阶段只移除命令入口(命令文件 + commands.ts 注册),
    其余触角为休眠代码(feature('ULTRAPLAN') 门控 + 云端路径不可达),
    深度清除归入 F 类云基础设施清理专项,不做。

### 此前已完成(独立于升级计划的本 fork 工作)
- 四角色模型槽位(Architect/Artisan/Seer/Clerk)——结构性覆盖升级计划 E-1
- /provider 多提供商切换(Anthropic/OpenAI 双协议、密钥本地 0600、协议探测、模型抓取)
- Seer 视觉转述、按槽供应商路由、/status 槽面板、/cost 按槽分列、槽位感知错误信息
- fast mode 整体移除(用户面 + 深层管道;fastMode.ts 保留惰性 stub)
- 系统提示词重写(合并 CLAUDE.md 行为规范;移除 Anthropic/Claude 品牌)
- 吉祥物去 Clawd 化(Shrimp.tsx / mascot_body / mascot_background)

### P0-9 Concise 输出样式(上游 2.1.237)
- src/constants/outputStyles.ts 新增内置 Concise 样式(keepCodingInstructions: true)
- 提示词为自有文案:先结果后解释、无开场白/过程叙述/复述请求、工作严谨度不变
- 与上游偏离:无(行为规格一致;提示词文本自写)

## 2026-08-31

### OpenThink TUI 吉祥物、欢迎页与输入区规整化(计划外体验优化)
- `PromptInput` 输入列宽与圆角边框内边距同步，footer 状态组间距固定，避免光标/换行和状态列随吉祥物出现而跳动。
- `CompanionSprite` 气泡换行改用 `stringWidth`，兼容中文和宽字符；LogoV2 紧凑/横向布局增加一致的内容留白与列间距。
- 与上游偏离:无上游条目；保留现有 BUDDY、fullscreen、Apple Terminal 和 reduced-motion 行为。
- 验证:结构平衡与 `git diff --check` 通过；Bun 构建待当前环境补齐 Bun 1.3.5 后复测。

### 启动链路兼容性与实测诊断(计划外基础设施)
- 修复恢复源码树中的运行时导出/契约缺口,补充 headless 与 CLI 异步错误可见性,并让开发入口在缺少 vendored ripgrep 时回退系统 `rg`。
- WSL `/mnt/d/Download_Data_D/openthink-agent` 实测:
  - `bun run check:imports` → `missing relative imports: 0`;
  - `bun run dev --version` → `999.0.0-restored`;
  - 无 `ANTHROPIC_API_KEY` 的 `-p` 模式进入真实 API 请求前提示 `Not authenticated · Please set ANTHROPIC_API_KEY`;
  - 交互模式约 8–18 秒完成扫描并渲染 Welcome/主题选择界面;
  - 启动 profiler 显示源码扫描是主要耗时,动态导入约 2.3 秒,设置/迁移/hook/命令加载均完成。
- 与上游偏离:无对应上游条目;这是恢复树为 API-only 可运行所需的本地兼容层。该修复不等同于完成 P0-1…P0-17。

### P0-4 `/config` 快捷写入与帮助(上游 2.1.181/2.1.183)
- `config-help.ts` 从 `SettingsSchema()` 生成简单类型键清单;`config.tsx` 支持 `key=value`、`--help`、布尔/数字/枚举校验,写入统一走 `updateSettingsForSource('userSettings', ...)`。
- 增加 `thinking` 到 `alwaysThinkingEnabled` 的兼容别名,匹配计划验收示例;Zod 解包改为只读迭代,避免修改只读 schema。
- API-only 的 `agentmd` 和 `AgentMdExternalIncludesDialog` 补齐共享运行时导出,使配置面板完整加载。
- 与上游偏离:复杂对象/数组仍要求使用配置面板,未新增任意 JSON shorthand。

### 对抗性检测与死代码清理(2026-08-31)
- 攻击样例覆盖: `__proto__`/`constructor` 配置键、`Infinity`/`NaN`/空数字、helper 布尔参数;均按预期拒绝或安全处理,未发现配置原型污染路径。
- API key helper 增加 15 秒硬超时并在 Unix 下终止进程组,避免恶意/失控 helper 无限期阻塞认证。
- 删除未引用的 `DEFAULT_API_KEY_HELPER` 常量和无 JSX 用途的 React 导入;修正 UI 中指向不存在 `/provide` 命令的提示文本。
- 验证: helper `sleep 20` 在约 15 秒返回 `null`;快速 helper 仍正常返回 key;结构平衡、导入检查和 `git diff --check` 通过。

### 信任确认后启动阻塞修复(2026-08-31)
- 根因: 信任确认后加载 `REPL.tsx` 时缺少 `usePromptsFromOpenThinkInBrowser`、`useClaudeCodeHintRecommendation`、`PluginHintMenu`，以及 API-only stub 缺少 `getRawUtilization`、`getRateLimitWarning`、`getUsingOverageText`、`BoundedUUIDSet`、`isChromeExtensionInstalled` 导出；错误在普通终端中表现为界面停住。
- 修复: 增加禁用态 Hook/菜单占位、空用量/限流函数、有限环形 UUID 集合和浏览器检测 stub，不启用任何云端或浏览器功能。
- 验证: `bun run check:imports`、`bun run dev --version` 通过；WSL 交互启动实测 `[REPL:mount] REPL mounted`。`tsc --noEmit` 仍受仓库现有 Bun 类型缺失及 TypeScript `baseUrl` 兼容错误阻塞，与本次改动无关。

### 启动后契约与 WSL 兼容性补强(2026-08-31)
- API-only `agentmd` 桩改为与调用方一致的同步 `Map`/字符串/`MemoryFileInfo[]` 契约，并保持模块级空 Promise 稳定，避免设置面板或 React `use()` 再次挂起。
- `BoundedUUIDSet` 对非法容量做下限归一化，避免异常输入触发无限淘汰循环。
- WSL 且未配置 `USERPROFILE` 时跳过不可用的 `powershell.exe` 回退；路径函数继续枚举 `/mnt/c/Users`，消除 Bun+execa 的只读流异常刷屏。
- 验证: WSL 交互启动约 18 秒完成扫描并出现 `[REPL:mount]`；导入检查为 0，结构平衡通过。

## 2026-09-02

### /model 命令重建、/effort 选择器与对话框底部锚定(计划外体验修复,回应用户实测反馈)
- `/model` 命令在基线中即缺失(仅有 meta+p 键位入口):新建 `src/commands/model/`(手写风格)。无参 → 经 immediate 分发渲染 ModelPicker(槽位优先:Default→四槽→活跃提供商→自定义);带参 → `parseUserSpecifiedModel` 解析旧别名(opus/sonnet/haiku/best 经四槽回落链)后写入 `appState.mainLoopModel`,持久化仍走 onChangeAppState → `settings.model`。`immediate` 复用 `shouldInferenceConfigCommandBeImmediate()`(与 /effort 同门)。
- `/effort` 无参行为从「打印当前值」改为交互式 Select 选择器(low/medium/high/max/auto,effortLevelToSymbol 徽标 + (current) 标记);带参路径保持 `executeEffort` 原语义(env 覆盖警告、max→high 降级、max 仅 ants 持久化)。文件整体从编译产物风格重写为手写风格(原始 2.1.88 源码取自 sourcemap)。
- 恢复被本仓 2534075 剥离的 ModelPicker effort 行:←→ effort 循环(恢复 `modelPicker:decreaseEffort/increaseEffort` schema+defaultBindings 键位,context ModelPicker)、`resolvePickerEffortPersistence` 持久化、`skipSettingsWrite` 属性;`onSelect` 恢复 `(model, effort)` 双参,PromptInput 的 `handleModelSelect` 同步恢复 `_effort` 形参。
- `/agents` 标记 `immediate: true`:实测非 immediate 对话框渲染在滚动区内、提示符被隐藏,视觉上悬在消息流中部;immediate 分发(同 /model /provider /mcp /btw)在底部槽渲染、贴底、提示符保留。另把 REPL 滚动区内其余非 immediate 对话框移到 flexGrow spacer 之后,短内容对话框贴向底部(长内容如 /diff 仍在 ScrollBox 内可滚)。
- 修复 effort 徽章冻结 bug:通知系统对同 key 通知去重丢弃(`notifications.tsx` 非立即通知无 `fold` 时 `shouldAdd=false`),PromptInput 的 `effort-level` 徽章被冻结在启动值,且经 immediate 通知 re-queue 后以 12s 超时反复复活,表现为「切了 effort 右下角仍显示旧档位」——这正是用户感知 `/effort 切不动` 的组成部分。修复:该通知补 `fold: (_acc, incoming) => incoming`(最新值胜出,超时重置)。实测 `/effort low` 后 20s 徽章正确显示 low。
- 与上游偏离:`/effort` 选择器未实现 per-model effortLevel 持久化(上游 changelog「save your default effort level per model」)与 2.1.257 的 `s` 键(session-only);settings schema 仍为单一 `effortLevel`。ThinkingToggle 保持删除(2534075/d8be712 移除,非本次范围)。`/agents` 的 immediate 为本仓决策,上游该命令为普通 local-jsx。
- 验证(WSL tmux 实测,bun 1.3.11):`/model` 槽位清单+effort 行渲染正常;`/model gpt-5.6-sol` 直切后 footer 与 settings.model 均更新,选 Default 后 model 键移除;`/effort` 选择器箭头导航+Enter 生效,effortLevel 正确写回;`/agents` 贴底无裁剪;dev-entry import 扫描 0 缺失;balance.mjs 全部 balanced。测试期间被改写的 `~/.openthink/settings.json` 已精确还原(modelSlots.architect + effortLevel: high)。

## 2026-09-03

### 实机漏洞检查批次:命令边界/注入面/对话框交互/设置安全面
- **修复 /model 垃圾参数持久化**:`parseUserSpecifiedModel` 对未知字符串原样放行(为自定义端点设计),导致 `/model --help`、`/model foo bar` 被当作模型字符串写入 `settings.model` 并持久化,后续查询全部打向无效模型。已在 `commands/model/model.tsx` args 路径加守卫:含空白或以 `-` 开头的参数拒绝执行并提示用法;合法别名(opus/best/[1m] 后缀)不受影响,实测 `/model opus` 仍正确解析。
- **确认非漏洞项(上游一致语义)**:含 `;`、`$()` 的输入不满足命令名字符集,按普通提示词进入对话流(本地无任何执行;无 API key 时在认证处拦截,`output:12` 为错误路径本地计数);命令名大小写敏感(`/MODEL` → Unknown skill,参数在警告中保留);`/effort --help` 输出用法、`/effort bogus` 报 Invalid argument、`/effort max` 正确标注 (this session only) 且不写入 settings。
- **对话框交互**:/model 选择器焦点/↑↓/Esc/连续开关循环正常(三次开-导航-关循环全部正确);「更多提供商」子视图可进入;Ctrl+C 不关闭 picker(与上游对话框一致,关闭键为 Esc,面板有提示)——维持现状。
- **设置安全面**:`settings.json` 全程无密钥材料;`provider-keys.json` 未创建过(0600 收紧逻辑在创建时生效,见 providerKeys.ts);`history.jsonl` 含本批测试写入,已按时间戳边界剪除 53 条测试记录(保留用户既有 30 条)。
- **测试手段说明**:批量 tmux send-keys 突发键入会与 slash 菜单重渲染竞态,曾误判为「键盘失效/REPL 假死」;经分阶段逐键复测确认 REPL 无此问题,均系测试污染(探针字符残留、加载期键入被丢弃)。
- 验证:`balance.mjs` 全部 balanced;修复后 `/model --help`、`/model foo bar` 正确拒绝,`/model opus` 正确切换;`~/.openthink/settings.json` 结束态与用户原始配置逐字节一致(modelSlots.architect + effortLevel: high)。
