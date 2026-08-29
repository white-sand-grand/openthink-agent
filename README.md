# OpenThink

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**OpenThink** 是一个基于 Anthropic Claude Code 构建的 AI 编程助手 CLI 工具，采用 MIT 协议完全开源。它保留了 Claude Code 的核心能力（工具调用、上下文管理、插件系统），同时移除了账户登录系统，改为纯 API Key 接入模式。

## 特性

- 🤖 **纯 API 接入** — 通过 `ANTHROPIC_API_KEY` 环境变量或 `apiKeyHelper` 配置认证，无需 OAuth 登录
- 🔧 **完整的工具系统** — Edit、Write、Bash、Read、Multiedit 等内置工具
- 📦 **插件生态** — 支持 Skills 插件系统，可扩展自定义 Skill
- 🌍 **多平台支持** — 支持 Anthropic API、AWS Bedrock、Google Vertex AI、Azure Foundry
- ⚡ **高性能架构** — 基于 Bun 运行时，流式响应，子代理并行执行
- 📝 **AGENT.md 系统提示** — 支持项目级和用户级 AGENT.md 记忆文件自动发现

## 架构

```
openthink/
├── src/
│   ├── entrypoints/          # 入口点（CLI、MCP、SDK）
│   │   ├── cli.tsx          # 主 CLI 入口
│   │   ├── mcp.ts           # MCP 服务器入口
│   │   └── sdk/             # Agent SDK 类型定义
│   ├── commands/            # 斜杠命令系统
│   │   ├── help/            # /help
│   │   ├── cost/            # /cost 统计
│   │   ├── init/            # /init 初始化
│   │   ├── skills/          # /skills 管理
│   │   ├── mcp/             # /mcp 管理
│   │   └── ...              # 更多命令
│   ├── tools/               # 工具系统
│   │   ├── Tool.ts          # 工具基类
│   │   ├── BashTool/        # Bash 执行工具
│   │   ├── EditTool/        # 文件编辑工具
│   │   ├── WriteTool/       # 文件写入工具
│   │   ├── ReadTool/        # 文件读取工具
│   │   ├── AgentTool/       # 子代理工具
│   │   └── ...              # 更多工具
│   ├── services/            # 核心服务
│   │   ├── api/             # Anthropic API 客户端
│   │   ├── mcp/             # MCP 服务器管理
│   │   ├── analytics/       # 遥测和分析
│   │   └── ...
│   ├── utils/               # 工具函数
│   │   ├── apiKey.ts        # API Key 管理
│   │   ├── settings/        # 配置管理
│   │   ├── messages/        # 消息处理
│   │   └── ...
│   ├── components/          # React/TUI 组件
│   ├── constants/           # 常量定义
│   ├── bootstrap/           # 启动状态管理
│   └── hooks/               # React hooks
├── package.json
├── tsconfig.json
└── README.md
```

### 核心设计

- **REPL 架构**：基于 Ink（React for CLI）构建交互式命令行界面
- **工具调用**：类 ChatGPT Function Calling 的工具系统，支持并行执行和权限控制
- **上下文管理**：自动 CLAUDE.md 发现、上下文压缩、会话持久化
- **多 Provider**：统一抽象层支持 Anthropic / Bedrock / Vertex / Foundry
- **Plugin 系统**：Skills 可安装/卸载，支持版本管理和自动更新 Marketplaces

## 快速开始

### 环境要求

- Bun 1.3.5 或更高版本
- Node.js 24 或更高版本

### 安装

```bash
# 克隆仓库
git clone https://github.com/anthropics/claude-code.git openthink-agent
cd openthink-agent

# 安装依赖
bun install
```

### 配置

设置 Anthropic API Key：

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

或配置 `apiKeyHelper`：

```bash
openthink config set apiKeyHelper "echo $ANTHROPIC_API_KEY"
```

### 运行

```bash
# 启动交互式 REPL
bun run dev

# 非交互模式
bun run dev -p "你的问题"

# 查看版本
bun run version
```

## 命令

| 命令 | 说明 |
|------|------|
| `/help` | 查看帮助 |
| `/clear` | 清屏 |
| `/compact` | 压缩上下文 |
| `/cost` | 查看 session 成本 |
| `/diff` | 查看 diff |
| `/doctor` | 运行诊断 |
| `/config` | 查看/修改配置 |
| `/init` | 初始化 AGENT.md |
| `/skills` | 管理插件 |
| `/model` | 切换模型 |

## 核心模块

### API Key 管理 (`src/utils/apiKey.ts`)

纯 API Key 模式，支持两种认证方式：

1. **环境变量**：`ANTHROPIC_API_KEY`
2. **apiKeyHelper**：自定义命令获取 API Key

### 配置系统 (`src/utils/settings/`)

三级配置覆盖：

- **Global**：`~/.openthink/settings.json` — 用户级配置
- **Project**：`.openthink/settings.json` — 项目级配置（可提交到 Git）
- **Local**：`.openthink/settings.local.json` — 本地覆盖

### AGENT.md 系统记忆

自动发现的记忆文件层级：

- `AGENT.md` — 项目级共享指令
- `AGENT.local.md` — 项目级本地覆盖
- `~/.openthink/AGENT.md` — 用户级全局指令

### 遥测

可选的匿名使用统计，通过环境变量控制：

```bash
OPENTHINK_ENABLE_TELEMETRY=1  # 启用
OPENTHINK_DISABLE_NONESSENTIAL_TRAFFIC=1  # 减少非必要上报
```

## 开发

```bash
# 开发模式
bun run dev

# 构建
bun run build

# 测试
bun test
```

## 许可证

MIT License — 详见 [LICENSE](LICENSE) 文件。

## 致谢

本项目基于 [Anthropic Claude Code](https://github.com/anthropics/claude-code) 的源代码构建，感谢 Anthropic 团队开源了这部分代码。
