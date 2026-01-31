# AI Code Quota Dashboard

**Languages:** [English](README.md) | [简体中文](README.zh-cn.md) | [繁體中文](README.zh-tw.md)

## Table of Contents

- [Overview](#overview)
- [Supported Providers](#supported-providers)
- [Installation](#installation)
- [Acknowledgments](#acknowledgments)
- [License](#license)

> [!WARNING]
> **Important Risk Warning**
>
> OAuth login implementation details for this project:
>
> - The OAuth credentials for **AntiGravity** and **GitHub Copilot** are not officially allocated to this application
> - Using these credentials may violate the original service's terms of service and user agreement
> - **Account Risk**: Official services may detect and ban accounts using unauthorized third-party clients
> - **Usage Risk**: This project cannot guarantee the long-term validity of credentials; official services may update mechanisms at any time, causing features to stop working
> - **Recommendation**: Please fully understand the related risks before using and evaluate whether to use this application yourself. This project is not responsible for account losses or legal issues caused by using this software

## Overview

AI Code Quota Dashboard is a desktop application built with Electron, designed for users who need to manage AI service usage quotas across multiple providers simultaneously. Through an intuitive interface, you can easily view and track usage, remaining quota, and reset times for various AI services.

Whether you are a developer, researcher, or enterprise user who needs to closely monitor AI resource usage, this dashboard helps you manage your AI quotas more effectively and avoid workflow disruptions due to quota depletion. It supports multiple mainstream AI services, including AntiGravity, GitHub Copilot, and Zai Coding Plan.

## Supported Providers

- [x] **Google AntiGravity** - Supported
- [x] **GitHub Copilot** - Supported
- [x] **Zai Coding Plan** - Supported
- [ ] **Claude Code** - Not Supported
- [ ] **OpenAI Codex** - Not Supported
- [ ] **Kimi For Coding** - Not Supported
- [ ] **MiniMax Coding Plan** - Not Supported
- [ ] **Others**

> [!TIP]
> Want to help us support more providers? We welcome pull requests!

## Installation

### Method 1: Install via Releases (Recommended)

Currently, only **Windows** installer is available.

#### Steps:

1. Go to the project's [Releases page](../../releases)
2. Download the latest Windows installer
3. Double-click the downloaded installer to run it
4. Follow the installation wizard to complete the installation
5. After installation, launch the application from the Start menu or desktop shortcut

> [!NOTE]
> Currently, **macOS** and **Linux** installers are not available. Please use Method 2 to build from source.

---

### Method 2: Install from Source

If you want to build from source or use the latest development version, follow these steps:

#### System Requirements

- **Node.js**: 22.20 or higher
- **npm**: 10.9 or higher (installed with Node.js)
- **Git**: For cloning the repository

#### Steps

**1. Clone the repository**

```bash
git clone https://github.com/CrystalVibe28/ai-code-quota-dashboard.git
cd ai-code-quota-dashboard
```

**2. Install dependencies**

```bash
npm install
```

**3. Install Electron dependencies**

```bash
npm run postinstall
```

This step will automatically install Electron-related native dependencies.

**4. Run the application**

Development mode (with hot reload):
```bash
npm run dev
```

Production build and preview:
```bash
npm run build
npm run preview
```

#### Building Installer (Optional)

If you want to build the installer:

**Windows:**
```bash
npm run build:win
```

The built installer will be output to the `release/` directory.

**macOS:**
```bash
npm run build:mac
```

**Linux:**
```bash
npm run build:linux
```

> [!TIP]
> The first build may take a long time as it needs to download Electron-related files.

#### Troubleshooting

**Issue 1: Error during `npm install`**

Try clearing npm cache and reinstalling:
```bash
npm cache clean --force
npm install
```

**Issue 2: Error on startup**

Make sure you have run `npm run postinstall` to install Electron dependencies.

**Issue 3: Build failure**

Check if Node.js version meets the requirements:
```bash
node --version
npm --version
```

If the version does not match, please upgrade to the recommended version.

## Acknowledgments

- The Antigravity portion of this project referenced [AntigravityQuotaWatcher](https://github.com/wusimpl/AntigravityQuotaWatcher)
- The Zai Coding Plan portion of this project referenced the official [zai-coding-plugins](https://github.com/zai-org/zai-coding-plugins)

Thanks to these open source projects! If these projects help you, please give them a star to support them!

## License

This project is released under the [MIT License](LICENSE)
