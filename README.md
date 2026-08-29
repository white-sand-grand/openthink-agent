# OpenThink Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-1.3%2B-black)](https://bun.sh)

**OpenThink Agent** 是一个纯 API 接入的 AI 编程助手 CLI，MIT 协议开源。

以 CC 为基础架构，移除了账户登录与 OAuth 流程，只保留 API Key 认证。记忆文件采用通用的 **AGENT.md** 约定，便于接入各类开源 Agent 生态。

## 特性

- 🤖 **纯 API 接入** — `ANTHROPIC_API_KEY` 环境变量或 `apiKeyHelper`，无需 OAuth
- 🔧 **完整工具系统** — Edit、Write、Bash、Read、Multiedit 等内置工具，含权限控制
- 📦 **插件生态** — Skills 插件系统，支持安装/卸载社区插件
- 🌍 **多平台支持** — Anthropic API / AWS Bedrock / Google Vertex / Azure Foundry
- ⚡ **高性能架构** — Bun 运行时，流式响应，子代理并行
- 📝 **AGENT.md 记忆** — 项目级/用户级自动发现，兼容主流开源 Agent 工具
- 🔌 **MCP 协议** — 完整的 Model Context Protocol 服务器管理

## 系统架构

```
openthink-agent/
├── src/
│   ├── entrypoints/              # 程序入口
│   │   ├── cli.tsx              # 主 CLI 交互入口
│   │   ├── mcp.ts               # MCP 服务器模式
│   │   └── sdk/                 # Agent SDK 类型定义与 schema
│   ├── commands/                # 斜杠命令系统（30+ 命令）
│   │   ├── help/ help            #   /help
│   │   ├── cost/                #   /cost Token 统计
│   │   ├── init/                #   /init AGENT.md 初始化
│   │   ├── skills/              #   /skills 插件管理
│   │   ├── mcp/                 #   /mcp MCP 管理
│   │   ├── review/              #   /review 代码评审
│   │   └── ...
│   ├── tools/                   # 工具执行层
│   │   ├── Tool.ts              #   工具基类与权限框架
│   │   ├── BashTool/            #   命令行执行
│   │   ├── EditTool/            #   精确文本编辑
│   │   ├── WriteTool/           #   文件写入
│   │   ├── ReadTool/            #   文件读取
│   │   ├── AgentTool/           #   子代理委派
│   │   ├── McpTool/             #   MCP 工具调用
│   │   └── ...
│   ├── services/                # 核心服务
│   │   ├── api/                 #   Anthropic API 客户端与重试
│   │   ├── mcp/                 #   MCP 服务器生命周期管理
│   │   ├── analytics/           #   遥测（可禁用）
│   │   └── ...
│   ├── utils/                   # 工具库
│   │   ├── apiKey.ts            #   API Key 管理（纯 Key 模式）
│   │   ├── settings/            #   三级配置管理（Global/Project/Local）
│   │   ├── messages/            #   消息序列化与上下文构建
│   │   ├── agentmd.ts           #   AGENT.md 解析
│   │   └── ...
│   ├── components/              # Ink TUI 组件
│   ├── constants/               # 常量与系统提示词
│   ├── bootstrap/               # 启动与状态管理
│   └── hooks/                   # React hooks
├── package.json
├── tsconfig.json
├── LICENSE
└── README.md
```

### 核心设计

| 模块 | 职责 |
|------|------|
| **entrypoints** | CLI / MCP / SDK 三种启动模式 |
| **commands** | 斜杠命令注册、权限校验、参数解析 |
| **tools** | 工具定义、权限控制、执行与结果序列化 |
| **services/api** | API 请求构建、流式响应、重试、错误分类 |
| **services/mcp** | MCP 服务器发现、连接、工具转换 |
| **utils/settings** | 三级配置合并与变更监听 |
| **utils/agentmd** | AGENT.md 文件发现、解析与注入 |
| **bootstrap** | REPL 主循环、会话管理、指标收集 |

- **REPL 架构**：基于 Ink（React for CLI）构建交互式命令行界面
- **工具调用**：类 Function Calling 的工具系统，支持并行执行与权限控制
- **上下文管理**：自动 AGENT.md 发现、上下文压缩、会话持久化
- **多 Provider**：统一抽象层支持 Anthropic / Bedrock / Vertex / Foundry
- **Plugin 系统**：Skills 可安装/卸载，支持版本管理和自动更新 Marketplaces

## 快速开始

### 环境要求

- [Bun](https://bun.sh) 1.3.5 或更高版本

### 安装

```bash
git clone https://github.com/white-sand-grand/openthink-agent.git
cd openthink-agent
bun install
```

### 配置

设置 API Key：

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

或使用 `apiKeyHelper`：

```bash
openthink config set apiKeyHelper "echo $ANTHROPIC_API_KEY"
```

### 运行

```bash
# 交互式 REPL
bun run dev

# 单次查询模式
bun run dev -p "你的问题"

# 查看版本
bun run version
```

## 可用命令

| 命令 | 说明 |
|------|------|
| `/help` | 查看帮助 |
| `/clear` | 清屏 |
| `/compact` | 压缩上下文窗口 |
| `/cost` | 当前 session 成本统计 |
| `/diff` | 查看变更差异 |
| `/doctor` | 运行环境诊断 |
| `/config` | 查看与修改配置 |
| `/init` | 初始化 AGENT.md |
| `/skills` | 管理插件 |
| `/model` | 切换模型 |

## 配置系统

三级配置，优先级从低到高：

| 层级 | 路径 | 说明 |
|------|------|------|
| Global | `~/.openthink/settings.json` | 用户全局配置 |
| Project | `.openthink/settings.json` | 项目共享配置（可提交 Git） |
| Local | `.openthink/settings.local.json` | 本地覆盖（不提交） |

## AGENT.md 记忆文件

采用通用的 AGENT.md 约定，与主流开源 Agent 工具兼容：

```
项目根目录/
├── AGENT.md          # 项目级共享指令（团队成员共享）
├── AGENT.local.md    # 项目级本地覆盖（不提交 Git）
└── .openthink/
    └── settings.json
```

用户级全局记忆：`~/.openthink/AGENT.md`

## 遥测

可选的匿名使用统计，默认关闭：

```bash
OPENTHINK_ENABLE_TELEMETRY=1                  # 启用
OPENTHINK_DISABLE_NONESSENTIAL_TRAFFIC=1      # 仅上报必要数据
```

## 开发

```bash
# 开发模式
bun run dev

# 类型检查
bun run build

# 测试
bun test
```

## License

MIT — 详见 [LICENSE](LICENSE) 文件。
