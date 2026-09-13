# OpenThink 升级计划:对齐 Claude Code v2.1.89 → v2.1.250

> 状态:草案 v1(待评审)
> 基线:本项目 = Claude Code **v2.1.88** 衍生分支(更名 OpenThink,含自有改动:虾吉祥物、/provider 提供商切换、双协议适配等)
> 目标:按官方 CHANGELOG(v2.1.89 → v2.1.250,共 129 个发布版本)移植可移植特性
> 决策记录(已与维护者确认):
> 1. **云端耦合特性排除出计划**(Remote Control / 云会话 / ultrareview / self-hosted runner 等依赖 Anthropic 服务端的能力),仅移植其本地伴生能力
> 2. **模型只移植机制、不换模型**:modelPicker 自定义选择器、组织级模型限制、xhigh effort、modelPricing 定价机制等照搬;模型 ID/名称/定价保持本项目现状,不跟进 Opus 4.8/Opus 5/Sonnet 5
> 3. **优先级:体验优先** → P0=TUI/交互,P1=安全/权限,P2=子代理/多会话,P3=平台扩展(Hook/技能/插件/MCP)
> 4. 文档粒度:全量详细版(每项含上游版本、内容、落点、实现要点、风险、验收标准)
> 复审调整(第二次确认):
> 5. **全屏渲染器不做虚拟化 scrollback**——P0-1 降范围:/tui 命令 + 设置 + 稳定性修复;鼠标支持/滚动加速随之搁置
> 6. **E-5(prompt cache 修复与 TTL)提前至 M1**,与 P0 批次同期执行
> 7. **P2-4(agents 视图)推迟**:依赖多进程会话注册表新基础设施,单终端场景收益低,挂起待需求
> 8. **工作量估算不作为承诺**,已从全部条目与里程碑中移除;仅保留风险与验收

---

## 0. 执行状态(每完成一小节即更新)

| 条目 | 状态 | 完成记录 |
|---|---|---|
| 吉祥物连续填充、版本与模型空态 | ✅ 完成 | 2026-09-07：按第二次截图反馈修正为 9×3、单排双眼与连续主体背景；欢迎栏显示 v0.8，未配置模型显示 no model，抑制空态 effort；11 项配置判断断言通过，待用户终端实测。 |
| P0-1 底部状态栏模型空态 | ✅ 完成 | 2026-09-08：PromptInput footer 与欢迎栏统一使用已配置模型判定；无配置显示 no model，避免回落 Sonnet 出现在用户界面。 |
| P0-3 `/cd` 会话内切换目录 | ✅ 完成 | 2026-09-14：新增 local `/cd`，支持当前目录查询、相对/绝对路径、realpath 校验和 CwdChanged hooks；测试通过。 |
| 圆形小尺寸吉祥物重画 | ✅ 完成 | 2026-09-07：Orb 改为 7×3、白色竖长方形双眼，眨眼/左右视线；固定动画占位、收窄宠物名称和气泡。独立 Ink 渲染检查通过，待用户完整 UI 实测。 |
| P0-0.1 全量盘点 | ✅ 完成 | docs/upstream-sync/INVENTORY.md(首轮 40+ 条目有结论) |
| P0-0.2 移除 ultraplan | ✅ 完成 | 命令文件+注册已删;深度触角为休眠代码,归入 F 类清理专项(见 CHANGELOG-NOTES 偏离说明) |
| P0-0.3 台账机制 | ✅ 完成 | docs/upstream-sync/CHANGELOG-NOTES.md |
| P0-1 …P0-3、P0-5…P0-8、P0-10…P0-16 | ⬜ 未开始 | M1 批次 |
| P0-4 `/config` 快捷写入与帮助 | ✅ 完成 | `src/commands/config/` 已支持 schema 键清单、类型校验、持久化; `thinking` 兼容别名 |
| OpenThink TUI 吉祥物、欢迎页与输入区规整化 | ✅ 完成 | `CompanionSprite`、`PromptInput`、`LogoV2` 已统一间距/边框/宽度计算；Bun 构建待环境补齐后复测 |
| P0-9 Concise 输出样式 | ✅ 完成 | `src/constants/outputStyles.ts` 已加入内置 Concise 样式;见 CHANGELOG-NOTES |
| 启动链路兼容性修复(计划外基础设施) | ✅ 完成 | 无 key 可进入 TUI;无 key 在真实请求阶段报认证错误;见 CHANGELOG-NOTES |
| P1-1 …P1-10 | ⬜ 未开始 | M1 并行批次 |
| P2-1 …P2-7(P2-4 挂起) | ⬜ 未开始 | M2 批次 |
| P3 各项 | ⬜ 未开始 | M3 批次 |
| E-1…E-4、E-6 | ⬜ 未开始 | E-1 已被四槽体系结构性覆盖(见下) |

> **E-1 备注**:modelPicker 机制已被本项目的四角色槽位体系(Architect/Artisan/Seer/Clerk,
> src/utils/model/slots.ts)+ /provider 结构性覆盖——槽位表即"有序、带标签的模型清单",
> 且支持按槽绑定供应商。E-1 标记为 ✅(结构性替代),不再单独移植。
> E-5 已提前为 P0-17(未开始)。

> **启动诊断记录(2026-08-31)**:在 WSL `/mnt/d` 实测 `bun run dev` 时,相对导入扫描约 8–18 秒,
> 主模块动态加载约 2.3 秒;设置、迁移、hook 快照和命令加载均已完成。交互模式已渲染 Welcome/主题选择界面,
> 因未继续输入而由测试超时结束。无 API key 的 `-p` 模式在请求前明确输出 `Not authenticated · Please set ANTHROPIC_API_KEY`。
> 因此“完成 P0”不是启动成功的唯一条件;恢复树的运行时导出契约和错误可见性同样是启动前置条件。当前 P0-1…P0-8、P0-10…P0-17 仍未全部完成。

---

## 1. 方法论与总体约束(必读)

1. **上游只发布压缩 JS bundle,没有公开源码 diff**。本计划中每个特性都是"按 changelog 行为规格在本仓库重新实现",不是代码搬运。实现时以本仓库既有架构为准,不引入上游内部模块名。
2. **保护本 fork 的自有改动**: shrimp 吉祥物(Clawd.tsx/WelcomeV2.tsx)、provider 切换体系(apiProviders.ts/openaiCompat.ts/ProviderPicker.tsx/providerKeys.ts)是自有资产。任何移植不得回退这些文件的行为;`/provider` 与上游 `modelPicker` 机制需要在设计上打通(见 E-1)。
3. **本 fork 不是纯净 2.1.88**(盘点结论): 已发现部分上游 2.1.89+ 特性被提前摘樱桃(SendMessageTool、auto mode 分类器、fullscreen 基础、`src/cli/handlers/agents.ts`),同时残留上游 2.1.222 已删除的 `ultraplan.tsx`,而 `xhigh` effort、`/goal`、spellcheck 等确实缺失。因此 **Phase 0 盘点是硬性前置**,每项移植前必须先跑存在性检查。
4. 验收约定:每个条目必须可在真实终端人工验收;涉及权限/沙箱的条目必须附"绕过尝试必须失败"的反例验收。

---

## 2. 总体路线图

| 阶段 | 主题 | 条目数 | 说明 |
|---|---|---|---|
| Phase 0 | 盘点对齐 + 反向移除 | ~10 检查项 | 逐项存在性核查;移除 ultraplan;建立同步台账 |
| P0 | TUI / 交互体验(体验优先) | 17 项 | 含 E-5 提前进来的 P0-17(cache 修复与 TTL);全屏渲染器**不含虚拟化** |
| P1 | 安全与权限 | 10 项 | 权限绕过修复合集、规则新语法、--safe-mode/--restricted、沙箱凭据防护 |
| P2 | 子代理 / 多会话 | 7 项 | P2-4(agents 视图)挂起;forking、深度/并发限制、跨会话消息补全 |
| P3 | 平台扩展(Hook/技能/插件/MCP) | 4 大项(约 20 子项) | Hook 新事件合集、技能/插件/MCP 增强合集 |
| E | 模型机制(不换模型) | 5 项 | E-5 已提前为 P0-17;modelPicker(与 /provider 打通)、xhigh、org 限制、modelPricing |
| — | 明确排除(F 类) | — | 见第 9 章 |

依赖关系:Phase 0 → 全部;E-5 已并入 P0-17(建议与 P1 并行);E-1(modelPicker)依赖 /provider(已有);P2-5(跨会话消息)依赖 P2-1 盘点结论。

---

## 3. Phase 0 — 盘点对齐(硬性前置)

### P0-0.1 全量特性存在性盘点 ✅
- **内容**: 对本计划每个条目在本仓库执行存在性检查(命令行 grep + 手工确认),输出 `docs/upstream-sync/INVENTORY.md` 台账:特性 × 状态(缺失/部分/已有/自有实现) × 证据(文件:行)。
- **方法**: 以计划文档条目为 checklist;抽查已知"摘樱桃"样本校准(SendMessageTool=已有、autoMode=已有、fullscreen=部分)。
- **产出**: INVENTORY.md;对"部分存在"的条目标注差距说明。
- **验收**: 计划中每个条目都有台账行;后续移植 PR 必须引用台账行号。

### P0-0.2 移除 ultraplan(上游 v2.1.222 "Removed ultraplan feature") ✅
- **落点**: `src/commands/ultraplan.tsx`、`src/commands.ts`(两处注册列表)、相关引用 grep `ultraplan`。
- **要点**: 上游已整体移除该特性;本 fork 无对应服务端,保留只会造成困惑。直接删除命令文件与注册项,保留 git 历史。
- **风险**: 低。
- **验收**: `/ultraplan` 不再出现在斜杠菜单;`grep -r ultraplan src` 仅剩历史注释(若有)。

### P0-0.3 建立 UPSTREAM_SYNC 台账机制 ✅
- **内容**: 新建 `docs/upstream-sync/` 目录:INVENTORY.md(盘点)+ CHANGELOG-NOTES.md(每个已移植条目记录:上游版本、实现差异、偏离原因)。
- **要点**: 后续每次移植 PR 必须附台账更新,形成可持续的追上游流程。
- **验收**: 台账模板就位,Phase 0 两条记录已写入。

---

## 4. P0 — TUI / 交互体验(体验优先)

> 落点总览:REPL 主屏 `src/screens/REPL.tsx`;输入 `src/components/PromptInput/`、`src/components/TextInput.tsx`、`src/components/BaseTextInput.tsx`、Vim `src/components/VimTextInput.tsx`;按键 `src/keybindings/`(defaultBindings.ts、schema.ts);markdown `src/components/Markdown.tsx`;设置 `src/utils/settings/types.ts` + `src/components/Settings/Config.tsx`;全屏 `src/utils/fullscreen.ts` + `src/screens/REPL.tsx`;/resume `src/screens/ResumeConversation.tsx`。

### P0-1 `/tui` 切换与全屏稳定性修复合集(不做虚拟化) 🟨
- ✅ 2026-09-07：修复 `/tui` 按实际渲染模式切换、会话选择覆盖启动偏好；备用屏幕硬禁用优先，并在命令端拒绝写入。行为测试 10 项断言通过。完整终端切换与长对话框实测仍待完成。
- **上游**: v2.1.89(`CLAUDE_CODE_NO_FLICKER=1` opt-in 备用屏幕渲染)、v2.1.110(`/tui` 命令与 `tui` 设置、autoScrollEnabled)、v2.1.132(`CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN`)、v2.1.110(Ctrl+O 仅切换 verbose,`/focus` 独立)、v2.1.139(transcript 快捷键 `?`/`{`/`}`/`v`)、v2.1.236/239/246(稳定性修复:渲染器单次失败不再永久失效而是回退经典、resize 空白/重绘、失焦点击不触发控件、slash 面板不遮挡最新消息、长会话流式归一化性能、内存释放)
- **内容**: 同会话内 `/tui fullscreen` / `/tui classic` 双向切换;备用屏幕无闪烁渲染(基础形态,滚动依赖终端原生 scrollback,**不做虚拟化**);全屏模式稳定性修复合集。
- **明确不做**(复审决策):虚拟化 scrollback、鼠标点击/选区/滚轮加速(相关上游条目 2.1.195/174 一并搁置,见 P0-14)。
- **现状**: 本仓库已有 `src/utils/fullscreen.ts`(含 `isFullscreenEnvEnabled`,AnimatedClawd/CondensedLogo 已按此分支)与 REPL 中局部全屏逻辑;缺口:`/tui` 命令、`tui` 设置、稳定性修复合集。
- **实现要点**:
  1. 新命令 `src/commands/tui/`(`immediate: true`,local-jsx):校验会话可安全重启(存在 `--allowed-tools` 等不可迁移限制时拒绝并说明,上游 2.1.234 行为),复用现有 REPL 重启管线;
  2. `tui: "fullscreen" | "classic"` 设置 + `CLAUDE_CODE_NO_FLICKER` / `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` 环境变量(落 `src/utils/fullscreen.ts`);
  3. 备用屏幕基础渲染:会话历史在切回 classic 时完整保留于终端 scrollback;全屏内滚动用简化分页(不做虚拟窗口);
  4. 稳定性修复合集逐项落 REPL:渲染器失败回退不退出、resize 空白、失焦首击不触发控件、slash 面板遮挡、长会话不整段重归一化的低成本优化(仅去掉明显冗余重算,不做虚拟化改造);
  5. `/focus` 独立命令与 Ctrl+O 语义拆分(若盘点发现本仓库已有等价物则对齐行为即可)。
- **风险**: 中(REPL 是核心路径,但范围已大幅收窄)。缓解:全程环境变量 opt-in,经典渲染器永远保留一键回退。
- **验收**: `/tui fullscreen` 与 `/tui classic` 双向切换保留权限模式/模型/允许工具;resize 与失焦点击行为符合上游描述;`CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1` 完全回退经典模式;切回 classic 后终端 scrollback 历史完整。

### P0-2 `/rewind`:撤销 /clear
- **上游**: v2.1.191
- **内容**: `/clear` 后可 `--resume`/`/rewind` 恢复到清除前的对话。
- **落点**: `/clear` 命令(`src/commands/clear/`)在清空前将当前转录快照另存(带 `clearedAt` 标记);`--resume`/`/rewind` 选择器(`src/screens/ResumeConversation.tsx`)列出可恢复的 cleared 快照。
- **风险**: 中(转录文件格式兼容)。快照作为普通转录文件变体存储,复用现有 resume 加载。
- **验收**: /clear 后 /rewind 能恢复完整对话;普通 /resume 列表不被 cleared 快照污染(显式 /rewind 才显示)。

### P0-3 `/cd` 会话内切换目录(含 mid-session 热生效)
- **上游**: v2.1.169(/cd 基础)、v2.1.206(目录补全)、v2.1.246(切换后项目设置/hooks/.mcp.json/技能/代理立即生效)
- **落点**: 新 `src/commands/cd/`;目录切换核心改 `src/utils/cwd.js` + REPL 会话上下文;补全复用 `/add-dir` 路径补全。
- **要点**: cwd 切换后触发设置重载管线(复用 `applySettingsChange` + 项目信任对话框;.mcp.json 走既有审批);prompt cache 不失效(上游卖点——注意本 fork 走第三方 provider 时 cache 行为按 P0-17 处理)。
- **风险**: 中(工作目录是全局状态,注意后台任务/沙箱引用旧路径)。
- **验收**: /cd 后新目录的 CLAUDE.md/设置/hook 生效;后台 shell 不受影响;权限信任按新目录走。

### P0-4 `/config key=value` 与 `/config --help`
- **上游**: v2.1.181、v2.1.183
- **内容**: 斜杠任意设置快捷写法(`/config thinking=false`),`/config --help` 列出全部可 shorthand 的键;Enter/Space 切换、Esc 保存关闭(2.1.183 交互修正)。
- **落点**: `src/commands/config/`、`src/components/Settings/Config.tsx`;键清单从 settings zod schema(`src/utils/settings/types.ts`)自动生成,标注类型与合法值。
- **风险**: 低-中(写路径必须走 `updateSettingsForSource('userSettings')`,不得直写文件)。
- **验收**: `/config model=…`、`/config thinking=false` 生效并持久化;`--help` 列表与 /config 面板一致;非法值报错不落盘。

### P0-5 emoji 短代码补全
- **上游**: v2.1.217(`:heart:` → ❤️,`emojiCompletionEnabled` 设置)、v2.1.221(别名 `:thumbsup:` 等)
- **落点**: `src/components/PromptInput/`(补全弹层复用 @文件/slash 补全框架);短代码表内置(gemoji 精简表)。
- **风险**: 低。**验收**: `:hea` 弹建议、回车插入;设置可关;不干扰普通冒号输入。

### P0-6 拼写检查 spellcheck
- **上游**: v2.1.235(aspell/hunspell/ispell 下划线标错)
- **落点**: `src/components/PromptInput/`(高亮层已有 slash/mention highlight 基建);探测本机拼写二进制,无则功能静默关闭;`spellcheck` 设置(默认关)。
- **风险**: 低(Windows 下常无 aspell——必须优雅降级)。
- **验收**: 有 aspell 的环境标错并建议;无拼写器时不告警不报错。

### P0-7 vim 补全:visual 模式 + 插入模式重映射
- **上游**: v2.1.118(visual `v`/visual-line `V`)、v2.1.208(`vimInsertModeRemaps` 如 `jj`→Esc)、v2.1.221(yank 寄存器跨对话框存活)、v2.1.239(NORMAL 模式保持)、v2.1.238(Esc 保持文本)
- **落点**: `src/components/VimTextInput.tsx` + `src/hooks/useTextInput.ts`;寄存器状态提升出输入实例。
- **风险**: 中(vim 状态机细节多)。
- **验收**: v/V 选区+d/o 操作;`jj` 映射生效;yank 后打开 /config 再回来 Ctrl+X 仍可粘贴;ctrl+o 返回后 NORMAL 模式保持。

### P0-8 `keybindingFlavor: "readline"`
- **上游**: v2.1.238(Ctrl+W 按空白分词)、v2.1.239(Alt+F、Ctrl/Option+→、Alt+D 词操作、标点分词)
- **落点**: `src/keybindings/` + `src/hooks/useTextInput.ts` 词移动/删除原语;设置 `keybindingFlavor: "classic" | "readline"`。
- **风险**: 低。**验收**: readline 模式下 Ctrl+W/Alt+F/Alt+D 行为与 bash 一致;默认 classic 不变。

### P0-9 Concise 输出样式
- **上游**: v2.1.237(内置 "Concise":先结果后细节、无寒暄)——机制落地为 output style
- **落点**: 本仓库已有 `outputStyle` 设置(types.ts:667);新增内置样式定义 + `/config` Output style 选择;样式本体是系统提示词片段(自写文案,非上游拷贝)。
- **风险**: 低。**验收**: 选 Concise 后回复风格变化;custom output style 不再被重置回默认(上游 2.1.238 修复项一并处理)。

### P0-10 用户消息 markdown 渲染
- **上游**: v2.1.234(用户提示与回复同样渲染 markdown)
- **落点**: `src/screens/REPL.tsx` 用户消息行 → 复用 `src/components/Markdown.tsx`;注意用户输入按字面优先(反引号内不转义)。
- **风险**: 低-中(用户输入含未配对 ``` 的边界)。
- **验收**: 用户贴 markdown 代码块/列表正常渲染;未闭合围栏按原文显示。

### P0-11 markdown 渲染修复合集
- **上游**: v2.1.246(嵌套列表 depth≥3 缩进、悬挂缩进;首 500 字符无 markdown 不再禁用整条消息渲染;`+`/`N)` 列表、setext 标题)、v2.1.234(`---` 分隔线吞行、异常 Unicode 慢渲染)、v2.1.247(超长单行截断标记)
- **落点**: `src/components/Markdown.tsx`。
- **风险**: 低。**验收**: 每个上游 case 一条快照测试(构造样例输入断言渲染行)。

### P0-12 `/resume` 增强:分页加载 + 后台会话
- **上游**: v2.1.243(滚动加载更多,原只列 50 条)、v2.1.144(后台会话出现在 /resume 并标 `bg`)、v2.1.239(/resume 排序/重复打开修复、`-c` 目录匹配过宽修复)、v2.1.246(自定义标题丢失修复)
- **落点**: `src/screens/ResumeConversation.tsx` + 会话枚举(`src/utils/sessionStorage.js`)。
- **风险**: 中(会话目录结构与本项目一致性好)。
- **验收**: >50 条会话可滚动加载;`claude --bg` 会话带 bg 标记可恢复;重名/跨目录不再误选。

### P0-13 会话命名与标题
- **上游**: v2.1.196(可读默认名)、v2.1.234(自动标题改成短名词短语风格)、v2.1.236(重名自动加后缀)、v2.1.239(标题以 `/` 开头可被寻址)、v2.1.246(/clear 保留 /rename 名、标题 >64KB 丢失修复)
- **落点**: 会话命名 `src/utils/sessionStorage.js` + 标题生成(复用小模型调用,注意走 provider 时后台辅助模型按 P0-17 的 utility 模型设置)。
- **风险**: 低。**验收**: 新会话有可读名;重名自动 `name-word-word`;标题变更在 /resume 与提示条一致。

### P0-14 `/scroll-speed` —— 搁置
- **上游**: v2.1.139(滚轮速度实时预览)+ v2.1.174(加速度开关)
- **搁置原因**: 依赖全屏鼠标滚轮支持;复审决定全屏渲染器不做虚拟化与鼠标支持(见 P0-1),本项随之搁置。若未来恢复鼠标支持,与本项一并重启。

### P0-15 输入/按键稳定性修复合集
- **上游**: v2.1.247(快速方向键+Enter 竞态:历史搜索、/config、/mcp、/skills、/model 全部命中上一行;Ctrl 在非拉丁布局 kitty 协议失效;鼠标报告分包插入乱码)、v2.1.239/238(Backspace/Ctrl+H、粘贴占位符内删除、Ctrl+Backspace 词删)、v2.1.235(高亮偏移、Shift+Tab 误批准注释字段)、v2.1.218(`\u` 路径段损坏、Ctrl+J 换行粘贴折叠)
- **落点**: `src/hooks/useTextInput.ts`、`src/ink/parse-keypress.ts`、`src/components/PromptInput/`。
- **风险**: 中(底层输入路径,回归面广)。每修复附最小复现脚本。
- **验收**: 每条上游修复一个复现 case 通过;中文/俄文键盘布局 Ctrl 组合键可用。

### P0-16 主题增强
- **上游**: v2.1.111(Auto match terminal 主题)、v2.1.239(自定义 diffAdded/diffRemoved 及暗色变体生效;`/rename` 不再吃掉 promptBorder 颜色;effort 徽章颜色可定制)
- **落点**: `src/utils/theme.ts`(增加 auto 主题:启动时探测终端深浅)+ diff 渲染处读取主题键。
- **风险**: 低。**验收**: 终端切深浅色重启后主题跟随;自定义 diff 色在 diff 与 /theme 预览一致。

### P0-17 Prompt cache 修复与 TTL(原 E-5,复审决定提前)
- **上游**: v2.1.108(`ENABLE_PROMPT_CACHING_1H`/`FORCE_PROMPT_CACHING_5M`)、v2.1.243(`promptCacheTtl`/`subagentPromptCacheTtl` 设置)、v2.1.248(agent frontmatter `experimental.cacheTtl`)、**v2.1.237(修复使用 LLM 网关/自定义 base URL 时的 prompt cache 失效)**、v2.1.222(自定义 ANTHROPIC_BASE_URL 流空闲超时忽略 keep-alive 的修复)、v2.1.247(请求头抖动导致整缓存失效的修复)
- **与本项目的关系**: /provider 让自定义 base URL 成为常态,v2.1.237 修复的正是这条路径;OpenAI 协议适配层(openaiCompat)不带 cache_control 语义,需要明确策略。
- **实现要点**:
  1. 排查本仓库 cache_control 注入点(系统提示/工具/消息断点),确认 provider 激活时未被意外剥离;
  2. Anthropic 协议 provider:修复 URL/头抖动导致的 cache miss(对齐 2.1.237 行为);
  3. OpenAI 协议 provider:无 cache_control,文档明确"依赖网关自身前缀缓存",不伪造 usage;
  4. TTL 三件套落地:`promptCacheTtl`/`subagentPromptCacheTtl` 设置 → 请求参数/头;`ENABLE_PROMPT_CACHING_1H`/`FORCE_PROMPT_CACHING_5M` 环境变量兼容。
- **风险**: 中(cache 行为只能实测观察,部分网关不回传 cache 指标)。**验收**: 同会话第二轮起 cache_read_input_tokens > 0(Anthropic 协议 provider 实测);TTL 设置改变请求行为可抓包验证;OpenAI 协议下文档与行为一致。

---

## 5. P1 — 安全与权限

> 落点总览:权限引擎 `src/utils/permissions/`(PermissionRule.ts、PermissionResult.ts、PermissionMode.ts);Bash 分析 `src/tools/BashTool/`(权限检查与命令解析);沙箱 `src/utils/sandbox/`(已有 sandbox-adapter);设置 `src/utils/settings/`。**上游对每条绕过都有对应修复,本项目逐条以"攻击样例必须被拦截"为验收。**

### P1-1 Shell 权限检查绕过修复合集
- **上游/内容**(逐条):
  - v2.1.223 构造命令对权限检查隐藏部分自身
  - v2.1.223 制表符/不可见 Unicode 填充使命令在审批框中"变短"
  - v2.1.229 zsh `[[ ]]` 正则条件内隐藏命令
  - v2.1.221 PowerShell 引号路径处理失当
  - v2.1.232 PowerShell `$PSDefaultParameterValues` 变量写参数覆盖 + Git Bash Cygwin 风格符号链接穿透
  - v2.1.233 Windows `cd X && cmd > file` 反复误停(回归修复);输入重定向 `< file` 权限检查(2.1.232 引入,2.1.233 收窄回退——按最终态实现)
  - v2.1.246 悬空 `&&`/`||` 的畸形命令必须弹审批
  - v2.1.246 git 子仓库不再继承父目录信任
  - v2.1.243 hook `if: Bash(cat *)` 对含 `$()`/反引号替换命令误匹配
  - v2.1.212 WebSearch/子代理会话级上限(防失控循环,`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`/`CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION`)——防资源滥用,并入此项
- **实现要点**: 在本仓库 Bash/PowerShell 解析器(命令 → 子命令树)补齐对应语法覆盖;每条绕过写成"攻击样例 → 期望弹审批"的表驱动测试。
- **风险**: 中(过严会误弹)。缓解:每个修复同时记录"正常命令不应误拦"反例。
- **验收**: 全部攻击样例被拦截;样例库进 CI。

### P1-2 权限规则参数语法 `Tool(param:value)`
- **上游**: v2.1.178(如 `Agent(model:opus)` 拦 Opus 子代理,`*` 通配)、v2.1.210(`Write(path)`/`NotebookEdit(path)`/`Glob(path)` 规则启动警告,应使用 `Edit/Read`)
- **落点**: `src/utils/permissions/PermissionRule.ts`(规则解析)+ 匹配引擎 + 文档字符串。
- **风险**: 中(规则语义向后兼容)。
- **验收**: `Agent(model:*)`、`Bash(command:git status)` 类规则按文档匹配;旧规则行为不变。

### P1-3 deny 规则 glob 与启动告警
- **上游**: v2.1.166(deny 位置支持 `"*"` 全工具;allow 拒绝非 MCP glob;未知工具名启动告警)
- **落点**: 同 P1-2。**验收**: deny `*` 生效;未知工具 deny 启动黄条。

### P1-4 `--safe-mode` 排障启动
- **上游**: v2.1.169
- **内容**: 旗标/`CLAUDE_CODE_SAFE_MODE` 禁用 CLAUDE.md、插件、技能、hooks、MCP 启动。
- **落点**: 启动装配层(`src/main.tsx` / `src/bootstrap/`),统一"自定义加载器"开关。
- **风险**: 低-中(装配点分散)。
- **验收**: safe-mode 下 /status 显示全部自定义关闭;不写任何用户配置。

### P1-5 `--restricted` 受限模式
- **上游**: v2.1.248(移除执行类内建工具与 WebFetch(除非 `--tools` 点名)、文件工具锁工作目录、拒绝 bypassPermissions、忽略用户/项目/local 设置)
- **落点**: 工具注册表过滤 + 权限模式覆盖 + 设置源过滤(复用 `--setting-sources` 管线)。
- **风险**: 中。**验收**: restricted 下 bash/edit 不可用、bypassPermissions 被拒、用户设置不加载。

### P1-6 沙箱凭据与网络防护
- **上游**: v2.1.187(`sandbox.credentials` 阻断读凭据文件/秘密环境变量)、v2.1.113(`network.deniedDomains`)、v2.1.219(`network.strictAllowlist` 拒绝未列主机不弹窗)、v2.1.221(`mode:"mask"` 哨兵文件 + 代理侧替换,Linux/WSL)、v2.1.224(extract/onExtractNoMatch、JWT decode+maskClaims、awsPairs/sigv4 重签——需 TLS 终止,仅 user/managed/--settings 来源)、v2.1.216(`filesystem.disabled` 只留网络控制)、v2.1.229(IPv6 字面量方括号 + fail-closed + /doctor 检查)、v2.1.224(尾斜杠 denyRead 绕过修复)、v2.1.222(违规详情进 Bash 结果)
- **落点**: `src/utils/sandbox/`(本仓库已有 sandbox-adapter 基础)。
- **风险**: 高面(平台差异);建议 Linux 先行,macOS/WSL 跟进。
- **验收**: 沙箱内 `cat ~/.aws/credentials` 被拒/遮罩;deny 域名请求失败且详情进工具结果;`/doctor` 报告含糊域名拼写。

### P1-7 Windows NT 设备路径加固
- **上游**: v2.1.233(NT `\??\` 前缀绕过 UNC 校验,NTLM 泄漏向量)、v2.1.234(远程读/会话恢复/CLAUDE.md includes/workflow 脚本/上传全量拒绝 NT 命名空间)
- **落点**: 路径校验工具(本仓库路径规范化处,盘点 `src/utils/file.js`/`src/utils/path*`)。
- **风险**: 低。**验收**: `\??\C:\...` 形态输入全部被拒;正常 UNC 不受影响。

### P1-8 敏感文件写入前置提示
- **上游**: v2.1.160(写 `.zshenv`/`.zlogin`/`.bash_login`/`~/.config/git/` 前提示)、v2.1.90(`.husky` 入保护目录)
- **落点**: 写类工具(Edit/Write)的保护路径清单 + 审批文案。
- **验收**: 写上述路径弹审批;拒绝后不落盘。

### P1-9 docker/Podman 重定向权限
- **上游**: v2.1.214(docker 命令带 `--url`/`--connection`/`--identity` 及 Podman remote 弹审批)
- **落点**: Bash 权限规则特殊分支。**验收**: 样例命令弹审批;普通 docker ps 不弹。

### P1-10 权限 UI/机制增强
- **上游**: v2.1.246(`/permissions` Auto 标签页查看/编辑分类器规则;Bash 通配前置警告 `Bash(git * main)`)、v2.1.220(SendMessage 消息过分类器)、v2.1.205(阻止篡改转录文件的 auto 规则)、v2.1.235("don't ask again"覆盖范围与显示一致)、v2.1.246(`requiresUserInteraction` 工具不给"不再询问")
- **落点**: `src/components/permissions/`(盘点)+ autoMode 既有模块。
- **风险**: 中。**验收**: Auto 标签可查看/增删规则;通配前置规则启动黄条提示。


---

## 6. P2 — 子代理 / 多会话

> 落点总览:Agent 工具 `src/tools/AgentTool/`;消息工具 `src/tools/SendMessageTool/`(已有骨架,上游 2.1.224+ 的跨会话体系);agents 视图 `src/cli/handlers/agents.ts`(已有雏形);子代理生命周期 `src/utils/` (盘点 spawn/调度处);worktree `src/utils/` worktree 相关模块。

### P2-1 多会话能力盘点(前置)
- **内容**: 本仓库已有 `SendMessageTool/`、autoMode、`handlers/agents.ts`,但与上游 2.1.224–2.1.250 的跨会话体系(inbox socket、`ListAgents`、`crossSessionInbound`、名字唯一化)差距未知。逐项对照产出差距清单,决定"补全"还是"重构对齐"。
- **验收**: 差距清单进 INVENTORY.md,P2-5 按清单施工。

### P2-2 Subagent forking 默认化
- **上游**: v2.1.232(`subagent_type: "fork"` 子代理继承完整对话与 prompt cache;非 teammate 的 agent spawn 交互会话默认转后台)、v2.1.218(`context: fork` 技能默认后台,`background: false` 可关)、v2.1.227(SessionStart hook source="fork")、v2.1.223(fork 后台代理 resume 卡死修复)、v2.1.218(fork 血缘过 compaction 保留)
- **实现要点**: fork 子代理 = 复用当前会话消息前缀(prompt cache 友好)的新代理实例;后台化复用现有后台任务框架;compaction 时保留 lineage 字段。
- **风险**: 中高(prompt cache 前缀一致性;与 provider 的 cache 行为联动)。
- **验收**: fork 子代理首 token 明显快于冷启动;父会话 compaction 后 fork 子代理仍可继续;`background: false` 技能前台执行。

### P2-3 子代理规模治理
- **上游**: v2.1.217(并发上限 20,`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`)、v2.1.219(嵌套深度 3,`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`)、v2.1.212(每会话 spawn 预算 200,/clear 重置)、v2.1.224(移除 200 子代理硬上限,并发/深度仍限)、v2.1.246(maxTurns 耗尽的子代理结果标记 partial 并提示 SendMessage 续跑)、v2.1.247(子代理首调用 404 走会话 fallback 模型链)
- **落点**: Agent 工具调度处加并发/深度/预算三个计数器;`maxTurns` 结果标记;fallback 链接模型解析。
- **风险**: 低-中。**验收**: 超并发/超深度/超预算时错误信息明确;partial 结果带续跑提示。

### P2-4 `claude agents` 会话视图补全 —— 挂起(复审决定推迟)
- **上游**: v2.1.139(Research Preview 总览:运行/待输入/完成)、v2.1.142(flags:`--add-dir/--settings/--mcp-config/--plugin-dir/--permission-mode/--model/--effort/--dangerously-skip-permissions`)、v2.1.141(`--cwd`)、v2.1.145(`--json`)、v2.1.198(通知 hook:`agent_needs_input`/`agent_completed`)、v2.1.203/206/212(分区空态、Ctrl+X 永久删除、"Needs input"状态)、v2.1.233(GitLab MR 展示)、v2.1.238-246(一系列稳定性修复)、v2.1.196(单击 `←` 进入)
- **落点**: `src/cli/handlers/agents.ts`(已存在,盘点差距)+ 新 `src/screens/` 或 CLI 交互面板;后台会话注册表(复用 `/resume` 的会话存储)。
- **风险**: 中(多进程会话注册表是新增基础设施)。
- **验收**: 多终端场景:一个会话后台运行,agents 视图可见状态、可附身、可通知;`--json` 输出稳定。

### P2-5 跨会话消息补全
- **上游**: v2.1.224(SendMessage/ListAgents 基础)、v2.1.225(Remote Control 会话按名寻址——RC 部分排除)、v2.1.232(`@`提及按名发消息、裸名精确投递、重名自动变体、`/config` 行)、v2.1.236(`notify_when_idle` 一次性空闲通知)、v2.1.238-247(投递失败如实上报、超限前置拒绝、消息折叠显示 Ctrl+O 展开、socket 目录加固、Linux user namespace 修复、Windows 支持)
- **落点**: `src/tools/SendMessageTool/`(已有)+ 新 inbox 基础设施(本机 socket/文件信箱,注意 Windows 可用性——上游 Windows 支持是 2.1.239 才补的,直接按跨平台方案实现);`crossSessionInbound: "accept" | "hold" | "refuse"` 设置。
- **风险**: 中高(跨平台 IPC + 安全:socket 目录加固必须同步实现)。
- **验收**: 同机两会话互发;`refuse` 时发送方收到 refused;信箱目录防符号链接预植(对齐上游加固);@提及可发现并投递。

### P2-6 后台会话与 worktree 治理
- **上游**: v2.1.221(`/fork` 自动建独立 worktree)、v2.1.222(worktree 隔离覆盖所有会话类型的文件与 Bash)、v2.1.133(`worktree.baseRef: fresh|head`)、v2.1.143(`worktree.bgIsolation: "none"`)、v2.1.246(后台会话持有 worktree 锁)、v2.1.246(后台会话按上游行为 commit/push/草稿 PR 策略——注意:PR 汇报部分涉及 gh,保留本地 git 行为即可)
- **落点**: worktree 工具与后台会话启动管线。**风险**: 中(git 操作误伤主检出)。
- **验收**: fork 会话在独立 worktree 工作,主检出不受影响;baseRef 两种取值行为正确。

### P2-7 后台会话进入 /resume 与通知
- **上游**: v2.1.144(bg 会话进 /resume 标 `bg`)、v2.1.198(完成/待输入触发 Notification hook)、v2.1.246(启动失败秒级报因、重名编号 `(2)`)
- **落点**: `src/screens/ResumeConversation.tsx` + 后台任务框架。
- **验收**: bg 会话可 /resume;完成时 hook 收到事件。

### P2-8 子代理权限弹窗主会话化
- **上游**: v2.1.186(后台子代理权限提示浮到主会话,显示来源代理,Esc 只拒当前工具)
- **落点**: 权限提示路由(后台代理 → 主会话 UI)。**风险**: 中。
- **验收**: 后台子代理要权限时主会话弹窗;Esc 只拒绝该次调用。

---

## 7. P3 — 平台扩展(Hook / 技能 / 插件 / MCP)

### P3-1 Hook 体系增强(合集)
- **上游逐条**:
  - v2.1.89 `PermissionDenied` hook(auto mode 拒绝后触发,`{retry:true}` 反馈模型)
  - v2.1.89 PreToolUse `"defer"` 决策(-p 暂停,-p --resume 重评)
  - v2.1.89 hook 输出 >50K 落盘为文件路径+预览
  - v2.1.105 PreCompact hook 可阻断(退出码 2 或 `{"decision":"block"}`)
  - v2.1.105 插件 `monitors` 清单自动布防(依赖 Monitor 工具,G-1)
  - v2.1.139 `args: string[]` exec 形式(不经 shell,免引号)、`continueOnBlock`(PostToolUse 拒绝原因回灌模型继续)
  - v2.1.141 `terminalSequence` 输出字段(桌面通知/标题/铃)
  - v2.1.152 `MessageDisplay` hook(转换/隐藏助手消息显示)
  - v2.1.219 `DirectoryAdded` hook(/add-dir 后触发)
  - v2.1.233 SessionStart source="fork"
  - v2.1.243 `if:` 条件对 `$()`/反引号替换的误匹配修复;v2.1.214 `dir/**` 单段语义变更
  - v2.1.247/250 hook 巨量输出不冲垮会话、非法 stdout JSON 报 hook 错误
  - v2.1.246 后台代理权限提示触发 Notification hook
  - v2.1.239 agent 前置 frontmatter hooks 需目录信任
- **落点**: `src/utils/hooks/`(已有 execHttpHook/execPromptHook 等体系)。
- **实现要点**: 每个新事件 = 事件枚举 + 触发点 + 输出 schema;`args` exec 形式绕过 shell 直接 spawn;"defer" 需要会话可暂停恢复(与 -p --resume 管线联动)。
- **风险**: 中。
- **验收**: 每事件一条端到端用例;50K 输出落盘路径可在 /status 查到。

### P3-2 技能体系增强
- **上游逐条**: v2.1.152 `/reload-skills`;v2.1.169 `disableBundledSkills` 设置+环境变量;v2.1.91 `disableSkillShellExecution`;v2.1.218 frontmatter 布尔宽泛值(`yes/no/on/off/1/0`)、`context: fork` 后台化(P2-2 联动);v2.1.229 claude.ai 同步技能不遮蔽本地命令、体不跑 `!` 命令(RC 同步部分排除,防遮蔽逻辑保留);v2.1.246(`/reload-plugins` 计数、skills/*/SKILL.md 路径);v2.1.121 `/skills` 类型过滤搜索;v2.1.233(BOM 文件忽略修复、技能参数模板二次展开防护)
- **落点**: 技能加载器(盘点 `src/skills/` 或 `src/utils/skills*`)+ `/reload-skills` 新命令。
- **验收**: /reload-skills 即时生效;BOM 技能正常加载;宽泛布尔值可解析。

### P3-3 插件体系增强
- **上游逐条**: v2.1.224 `archive` 源(HTTPS zip + SHA-256 pin);v2.1.229 `command` 源(本地命令输出插件目录,免重启生效);v2.1.232 GitLab marketplace(裸 repo URL 克隆);v2.1.229/232 marketplaces 别名设置(`additionalMarketplaces`/`allowedMarketplaces`)、`blockedMarketplaces` URL 型条目;v2.1.223 `owner/*` 通配;v2.1.157 `claude plugin init`;v2.1.118 `claude plugin tag`;v2.1.121 `claude plugin prune`/`uninstall --prune`;v2.1.163 `claude plugin list --enabled/--disabled`;v2.1.172 `/plugin` marketplace 浏览搜索框;v2.1.143 依赖强制(disable 链提示/enable 传递启用);v2.1.221 安装即激活(免 /reload-plugins);v2.1.226/247(缓存/命名/安装安全加固合集);v2.1.154 `skipLfs`;v2.1.129 `--plugin-url`
- **落点**: `src/utils/plugins/`(已有 pluginLoader)+ `src/commands/plugin/`。
- **风险**: 中(zip 解压与校验引入攻击面——SHA-256 pin 必须实现,拒绝控制字符名称,对齐上游加固)。
- **验收**: 从 https zip 安装(校验和错误拒装);GitLab 源克隆;依赖链禁用被拒并给出链路;安装后即用免重载。

### P3-4 MCP 体系增强
- **上游逐条**: v2.1.121 `alwaysLoad`(跳过工具搜索延迟);v2.1.91 结果大小覆盖 `_meta["anthropic/maxResultSizeChars"]`(至 500K);v2.1.186 `claude mcp login/logout <name>`(--no-browser SSH 支持);v2.1.229 OAuth redirect 用 `127.0.0.1`、协议版本探测失败快断;v2.1.239/246(远程 MCP 掉线自动重连、elicitation 表单全屏适配);v2.1.246(空 schema 参数不再 JSON 字符串化、被中断调用如实上报);v2.1.238(stdio 服务收到提前 discover 请求修复);v2.1.203(roots/list 附会话附加目录);v2.1.236(MCP 诊断不打印解析后的秘密);v2.1.222(用量归属修复);v2.1.243(连接失败时告知 Claude "服务器连接失败"而非"工具不存在")
- **落点**: `src/services/mcp/`(已有 client.ts 等)。
- **验收**: login/logout 全流程;远程服务断网恢复;诊断输出不含明文密钥。

---

## 8. E 类 — 模型机制移植(不换模型)

> 约束:模型 ID/名称/定价保持本项目现状(Opus 4.6 / Sonnet 4.6 谱系)。只移植"机制"。
> 注:原 E-5(prompt cache 修复与 TTL)已提前为 **P0-17**,本章编号保留空洞以防交叉引用失效。

### E-1 `modelPicker` 设置:自定义 /model 选择器清单 ✅(结构性替代:四槽体系 + /provider)
- **上游**: v2.1.243(有序、带标签的模型列表,任意 id 拼写含 Vertex/Bedrock,可追加或替换内置清单)
- **落点**: `src/utils/model/modelOptions.ts`(getModelOptions 注入)+ settings schema + `src/components/ModelPicker.tsx`。
- **与 /provider 的联动**(本项目自有):provider 激活时,其 `models` 列表自动注入选择器顶部(分组标签"当前提供商"),`modelPicker` 用户清单排其后,内置清单按设置追加/替换。这是把自有 provider 体系纳入上游机制的正规化改造。
- **风险**: 中(选择器是高频路径)。
- **验收**: `modelPicker` 设置生效(append/replace 两模式);provider 模型分组显示;默认行为不变。

### E-2 `xhigh` effort 档位
- **上游**: v2.1.111(Opus 4.7 专属,介于 high 与 max;其他模型回落 high)
- **落点**: `src/utils/effort.ts`(档位枚举/循环顺序)、`modelSupportsEffort` 支持、/effort 与选择器。
- **本项目策略**: 档位机制加入;哪些模型支持 = 本项目现有模型配置决定(现状:不支持 xhigh 的模型回落 high,行为与上游一致)。
- **验收**: /effort 出现 xhigh;不支持模型自动落 high;持久化与恢复正确。

### E-3 组织模型限制机制补全
- **上游**: v2.1.196(org 默认模型,显示 "Org default" —— 服务端部分排除,本地机制保留:managed settings 可定义 orgDefaultModel)、v2.1.175(`enforceAvailableModels`:allowlist 同时约束 Default,用户/项目设置不得放宽)、v2.1.187(org 限制在选择器/--model/环境变量处统一提示)、v2.1.223(受限模型回退族内最新)
- **落点**: `src/utils/model/modelAllowlist.ts`(已有 isModelAllowed)+ managed settings schema。
- **验收**: managed 设置 allowlist 下 Default 回退首个允许模型;用户设置无法放宽;提示文案出现。

### E-4 `modelPricing` 定价机制
- **上游**: v2.1.243(托管设置:按模型的自定义单价与折扣系数,用于 /cost、状态行、遥测)
- **落点**: `src/utils/modelCost.ts`(已有 formatModelPricing)+ settings schema + /cost 与状态行取数点。
- **验收**: 托管设置单价覆盖列表价;/cost 与状态行一致。

### E-6 `ANTHROPIC_DEFAULT_MODEL` 环境变量
- **上游**: v2.1.236(设定新会话起始模型;/model 选择仍覆盖且持久化,优先级介于 ANTHROPIC_MODEL 与 settings.model 之间)
- **落点**: `src/utils/model/model.ts` 的 `getUserSpecifiedModelSetting()` 优先级链(现有:session > --model > ANTHROPIC_MODEL > settings.model;插入 ANTHROPIC_DEFAULT_MODEL 于 ANTHROPIC_MODEL 之后、settings.model 之前,仅当未显式 /model 过)。
- **验收**: 三个来源的优先级按上游语义。

---

## 9. 明确排除项(F 类,云端耦合)与伴生能力白名单

| 排除项 | 上游版本 | 排除理由 |
|---|---|---|
| Remote Control(`claude remote-control`、推送通知、手机/web 附身) | 2.1.222/224/225/229/232/235/236/238/239/246/247/250 多条 | 依赖 claude.ai 会话服务 |
| Claude Code on web/mobile/desktop 云会话(`/ultrareview`、`/autofix-pr`、`/teleport`、cloud gateway 登录) | 2.1.239/241/246/247/250 多条 | 依赖云容器与会话服务 |
| `claude self-hosted-runner`(自托管环境) | 2.1.224/228/229/233/238/239/250 | 依赖 Anthropic 会话分发服务 |
| 组织服务端(managed settings 服务器下发、org default models 服务端、usage-credits、gateway spend limit、`/web-setup`、Claude in Chrome、VSCode/JetBrains 扩展专项) | 2.1.196/224/225/243/248 等 | 依赖组织控制面/桌面端宿主 |

**伴生能力白名单**(本地可用,随所属类移植):设置键 schema(`crossSessionInbound`、`dialogExpiry`、`desktopSessionCleanupPeriodDays` 等)、`/doctor`/`/status` 诊断行、managed settings 校验与合并逻辑、遥测事件字段、GitLab 凭据脱敏清单(2.1.232)、`forceLoginMethod` 等企业键。

**维护者后续若要启用任一排除项**:需先立项自建对应服务端,再按上游协议实现;本计划不阻塞。

---

## 10. 风险登记与工程约定

| 风险 | 等级 | 缓解 |
|---|---|---|
| 上游无源码 diff,行为规格移植存在理解偏差 | 高 | 每条目附上游 changelog 原文引用;验收标准以 changelog 行为句为准 |
| REPL/全屏改动回归面大(已排除虚拟化,范围收窄) | 中 | 环境变量 opt-in;`/tui classic` 一键回退;经典渲染器永远保留 |
| 权限修复过严误拦正常命令 | 中 | 每条修复配"正常命令不弹窗"反例;表驱动测试进 CI |
| 与自有 provider 体系冲突(cache/模型解析) | 中 | P0-17 与 E-1 设计时显式联动;provider 回归用例纳入每阶段验收 |
| fork 与上游差距持续扩大 | 中 | UPSTREAM_SYNC 台账 + 每月一次增量盘点(把新版本 changelog 追加进本计划) |
| 本 fork 自有改动被上游行为覆盖 | 中 | 第 1 章约束 2;每个 PR 自查 shrimp/provider 相关文件 diff |

**工程约定**:
1. 每个 PR 只做一个条目(合集类可拆子 PR),PR 描述引用计划条目编号与上游版本号;
2. 分支命名 `upstream/<阶段>-<条目号>`,如 `upstream/p0-2-rewind`;
3. 每条目完成即更新 INVENTORY.md 与 CHANGELOG-NOTES.md;
4. 手写代码遵循仓库 Biome 风格(源文件无分号单引号;组件 JSX 属性双引号、裸布尔属性);
5. 验收必须在真实终端人工执行一遍,权限/沙箱类必须含反例验收。

---

## 11. 里程碑建议

| 里程碑 | 内容 | 出口标准 |
|---|---|---|
| M0 | Phase 0 盘点 + ultraplan 移除 + 台账建立 | INVENTORY.md 全条目有结论 |
| M1 | P0 体验批次(含 P0-17 cache 修复)+ P1 安全批次(可并行) | 全屏 /tui 切换可用且稳定;攻击样例库全绿;provider 会话 cache 命中 |
| M2 | P2 多会话批次(P2-4 除外) | 跨会话消息可用;fork/规模治理生效 |
| M3 | P3 平台批次 + E 类收尾 | Hook 新事件/插件新源/MCP 增强全通过;E-1..E-4、E-6 完成 |

## 启动后信任确认排查记录（2026-08-31）

- 信任对话框确认后会正常调用 `onDone()`；此前“停住”实际是 REPL 动态加载阶段的恢复源码缺口。
- 已补齐 API-only 构建所需的浏览器提示 Hook/菜单占位、Claude AI 限制服务的状态栏导出与桥接去重集合；浏览器/Claude.ai 功能仍保持禁用。
- WSL 伪终端实测日志出现 `[REPL:mount] REPL mounted`，无 API key 时停留在可交互 REPL，API 请求阶段再提示认证缺失。

> 并行度:P0-17 与 P1 可并行;P0 内部小项(P0-2/P0-3/P0-4)可穿插。工期不设承诺,按条目推进。
