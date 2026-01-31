# AI Code Quota Dashboard

**语言:** [English](README.md) | [简体中文](README.zh-cn.md) | [繁體中文](README.zh-tw.md)

## 目录

- [项目介绍](#项目介绍)
- [支持的提供商](#支持的提供商)
- [安装](#安装)
- [致谢](#致谢)
- [许可](#许可)

> [!WARNING]
> **重要风险提示**
>
> 本项目使用 OAuth 登录的实现说明：
>
> - **AntiGravity** 和 **GitHub Copilot** 的 OAuth 凭证并非官方正式分配给此应用
> - 使用这些凭证可能违反原服务的条款与用户协议
> - **账号风险**：官方可能会检测并封锁使用未授权第三方客户端的账号
> - **使用风险**：本项目无法保证凭证的长期有效性，官方可能随时更新机制导致功能失效
> - **建议**：使用前请充分了解相关风险，自行评估是否使用。本项目不对因使用本软件造成的账号损失或法律问题负责

## 项目介绍

AI Code Quota Dashboard 是一款基于 Electron 开发的桌面应用程序，专为需要同时管理多个 AI 服务提供商使用配额的用户设计。通过直观的界面，您可以轻松查看和跟踪各种 AI 服务的使用量、剩余配额以及重置时间。

无论您是开发者、研究人员，还是需要密切监控 AI 资源使用情况的企业用户，这款仪表板都能帮助您更有效地管理您的 AI 配额，避免因配额耗尽而影响工作流程。支持多种主流 AI 服务，包括 AntiGravity、GitHub Copilot 和 Zai Coding Plan。

## 支持的提供商

- [x] **Google AntiGravity** - 支持
- [x] **GitHub Copilot** - 支持
- [x] **Zai Coding Plan** - 支持
- [ ] **Claude Code** - 不支持
- [ ] **OpenAI Codex** - 不支持
- [ ] **Kimi For Coding** - 不支持
- [ ] **MiniMax Coding Plan** - 不支持
- [ ] **其他**

> [!TIP]
> 想要帮助我们支持更多提供商？欢迎提交 pull request！

## 安装

### 方法一：通过 Releases 安装（推荐）

目前仅提供 **Windows** 版本的安装程序。

#### 步骤：

1. 前往项目的 [Releases 页面](../../releases)
2. 下载最新的 Windows 安装程序
3. 双击运行下载的安装程序
4. 按照安装向导的指引完成安装
5. 安装完成后，从开始菜单或桌面快捷方式启动应用程序

> [!NOTE]
> 目前 **macOS** 和 **Linux** 版本尚不提供安装程序，请使用方法二自行构建。

---

### 方法二：从源码安装

如果您想要自行构建或使用最新开发版本，可以通过以下步骤安装：

#### 系统要求

- **Node.js**: 22.20 或更高版本
- **npm**: 10.9 或更高版本（随 Node.js 安装）
- **Git**: 用于克隆仓库

#### 步骤

**1. 克隆仓库**

```bash
git clone https://github.com/CrystalVibe28/ai-code-quota-dashboard.git
cd ai-code-quota-dashboard
```

**2. 安装依赖包**

```bash
npm install
```

**3. 安装 Electron 依赖**

```bash
npm run postinstall
```

此步骤会自动安装 Electron 相关的本地依赖。

**4. 运行应用程序**

开发模式（支持热重载）：
```bash
npm run dev
```

生产模式构建并预览：
```bash
npm run build
npm run preview
```

#### 构建安装程序（可选）

如果您想要构建安装程序：

**Windows:**
```bash
npm run build:win
```

构建完成的安装程序会输出到 `release/` 目录。

**macOS:**
```bash
npm run build:mac
```

**Linux:**
```bash
npm run build:linux
```

> [!TIP]
> 首次构建可能需要较长时间，因为需要下载 Electron 相关的文件。

#### 故障排除

**问题 1：`npm install` 时出现错误**

尝试清除 npm 缓存并重新安装：
```bash
npm cache clean --force
npm install
```

**问题 2：启动时显示错误**

确保已执行 `npm run postinstall` 来安装 Electron 依赖。

**问题 3：构建失败**

检查 Node.js 版本是否符合要求：
```bash
node --version
npm --version
```

如果版本不符，请升级至推荐版本。

## 致谢

- 本项目 Antigravity 的部分参考了 [AntigravityQuotaWatcher](https://github.com/wusimpl/AntigravityQuotaWatcher)
- 本项目 Zai Coding Plan 的部分参考了官方的 [zai-coding-plugins](https://github.com/zai-org/zai-coding-plugins)

感谢以上项目开源贡献！如果这些项目对你有帮助，也请给他们点个 Star 支持一下！

## 许可

本项目使用 [MIT 许可条款](LICENSE) 发布
