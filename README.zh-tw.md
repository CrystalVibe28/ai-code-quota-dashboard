# AI Code Quota Dashboard

**語言:** [English](README.md) | [简体中文](README.zh-cn.md) | [繁體中文](README.zh-tw.md)

## 目錄

- [專案介紹](#專案介紹)
- [支援的供應商](#支援的供應商)
- [安裝](#安裝)
- [致謝](#致謝)
- [授權](#授權)

> [!WARNING]
> **重要風險提示**
>
> 本專案使用 OAuth 登入的實作說明：
>
> - **AntiGravity** 和 **GitHub Copilot** 的 OAuth 憑證並非官方正式分配給此應用
> - 使用這些憑證可能違反原服務的條款與使用者協議
> - **帳號風險**：官方可能會檢測並封鎖使用未授權第三方客戶端的帳號
> - **使用風險**：本專案無法保證憑證的長期有效性，官方可能隨時更新機制導致功能失效
> - **建議**：使用前請充分了解相關風險，自行評估是否使用。本專案不對因使用本軟體造成的帳號損失或法律問題負責

## 專案介紹

AI Code Quota Dashboard 是一款基於 Electron 開發的桌面應用程式，專為需要同時管理多個 AI 服務供應商使用配額的使用者設計。透過直觀的介面，您可以輕鬆查看和追蹤各種 AI 服務的使用量、剩餘配額以及重置時間。

無論您是開發者、研究人員，或是需要密切監控 AI 資源使用情況的企業用戶，這款儀表板都能幫助您更有效地管理您的 AI 配額，避免因配額耗盡而影響工作流程。支援多種主流 AI 服務，包括 AntiGravity、GitHub Copilot 和 Zai Coding Plan。

## 支援的供應商

- [x] **Google AntiGravity** - 支持
- [x] **GitHub Copilot** - 支持
- [x] **Zai Coding Plan** - 支持
- [ ] **Claude Code** - 不支持
- [ ] **OpenAI Codex** - 不支持
- [ ] **Kimi For Coding** - 不支持
- [ ] **MiniMax Coding Plan** - 不支持
- [ ] **其他**

> [!TIP]
> 想要幫助我們支援更多供應商？歡迎提交 pull request！

## 安裝

### 方法一：透過 Releases 安裝（推薦）

目前僅提供 **Windows** 版本的安裝程式。

#### 步驟：

1. 前往專案的 [Releases 頁面](../../releases)
2. 下載最新的 Windows 安裝程式
3. 雙擊執行下載的安裝程式
4. 依照安裝精靈的指引完成安裝
5. 安裝完成後，從開始選單或桌面捷徑啟動應用程式

> [!NOTE]
> 目前 **macOS** 和 **Linux** 版本尚不提供安裝程式，請使用方法二自行建置。

---

### 方法二：從原始碼安裝

如果您想要自行建置或使用最新開發版本，可以透過以下步驟安裝：

#### 系統需求

- **Node.js**: 22.20 或更高版本
- **npm**: 10.9 或更高版本（隨 Node.js 安裝）
- **Git**: 用於克隆倉庫

#### 步驟：

**1. 克隆倉庫**

```bash
git clone https://github.com/CrystalVibe28/ai-code-quota-dashboard.git
cd ai-code-quota-dashboard
```

**2. 安裝依賴套件**

```bash
npm install
```

**3. 安裝 Electron 依賴**

```bash
npm run postinstall
```

此步驟會自動安裝 Electron 相關的本地依賴。

**4. 執行應用程式**

開發模式（支援熱重載）：
```bash
npm run dev
```

生產模式建置並預覽：
```bash
npm run build
npm run preview
```

#### 建置安裝程式（可選）

如果您想要建置安裝程式：

**Windows:**
```bash
npm run build:win
```

建置完成的安裝程式會輸出到 `release/` 目錄。

**macOS:**
```bash
npm run build:mac
```

**Linux:**
```bash
npm run build:linux
```

> [!TIP]
> 首次建置可能需要較長時間，因為需要下載 Electron 相關的檔案。

#### 故障排除

**問題 1：`npm install` 時出現錯誤**

嘗試清除 npm 快取並重新安裝：
```bash
npm cache clean --force
npm install
```

**問題 2：啟動時顯示錯誤**

確保已執行 `npm run postinstall` 來安裝 Electron 依賴。

**問題 3：建置失敗**

檢查 Node.js 版本是否符合需求：
```bash
node --version
npm --version
```

如果版本不符，請升級至推薦版本。

## 致謝

- 本項目Antigravity的部分參考了 [AntigravityQuotaWatcher](https://github.com/wusimpl/AntigravityQuotaWatcher)
- 本項目Zai Coding Plan的部分參考了官方的 [zai-coding-plugins](https://github.com/zai-org/zai-coding-plugins)

感謝以上專案開源貢獻！如果這些項目對你有幫助，也請給他們點個Star支持一下！

## 授權

本專案使用 [MIT 授權條款](LICENSE) 發布