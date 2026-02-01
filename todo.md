# AI Code Quota Dashboard - 改進計劃

> 專案分析日期：2026-02-01

## 目錄

- [高優先級 - 新功能](#高優先級---新功能)
- [高優先級 - 程式碼品質](#高優先級---程式碼品質)
- [中優先級 - 效能最佳化](#中優先級---效能最佳化)
- [中優先級 - UI/UX 改進](#中優先級---uiux-改進)
- [低優先級 - 其他改進](#低優先級---其他改進)
- [結構性重構](#結構性重構)

---

## 高優先級 - 新功能

### 新增 AI 供應商支援

- [ ] **OpenAI** - API Key 認證，取得 usage/billing 資料
- [ ] **Anthropic Claude** - API Key 認證，取得配額資訊
- [ ] **Cursor** - 取得 Pro/Free 使用量
- [ ] **其他供應商** - 根據需求擴充

### Token 過期處理 UI

- [ ] 在帳戶卡片顯示 token 過期警告圖示
- [ ] 提供「重新登入」按鈕引導使用者刷新 token
- [ ] Token 即將過期時主動通知 (例如：剩餘 24 小時)

### 開機自動啟動

- [X] Windows：註冊 Registry 啟動項
- [ ] macOS：使用 Login Items API
- [X] 在設定頁面新增「開機自動啟動」開關

### 使用量歷史記錄

- [ ] 設計歷史資料儲存結構 (SQLite 或 JSON)
- [ ] 定期儲存使用量快照
- [ ] 新增歷史頁面，顯示趨勢圖表 (可用 Recharts 或 Chart.js)
- [ ] 支援匯出歷史資料 (CSV/JSON)

---

## 高優先級 - 程式碼品質

### TypeScript 類型系統強化

- [ ] 建立 `src/shared/types/` 目錄，存放共享類型定義
- [ ] 定義完整的帳戶類型 (`AntigravityAccount`, `GithubCopilotAccount`, `ZaiCodingAccount`)
- [ ] 定義使用量類型 (`AntigravityUsage`, `CopilotUsage`, `ZaiUsage`)
- [ ] 定義設定類型 (`Settings`, `Customization`)
- [ ] 更新 `src/preload/index.d.ts`，將 `unknown` 替換為具體類型
- [ ] 消除程式碼中的 `any` 類型斷言

### 錯誤處理改進

- [ ] 新增 React Error Boundary 元件 (`src/renderer/src/components/common/ErrorBoundary.tsx`)
- [ ] 定義錯誤類型和錯誤碼
- [ ] 在 Store 中保存錯誤訊息，而非靜默失敗
- [ ] 使用 Toast 通知元件顯示友好的錯誤訊息
- [ ] 為 OAuth 流程新增更詳細的錯誤提示

### Provider Store 重構

- [ ] 建立泛型 Store 工廠函式 `createProviderStore<TAccount, TUsage>(providerId)`
- [ ] 抽離共用邏輯：`fetchAccounts`, `deleteAccount`, `updateAccount`, `fetchUsage`
- [ ] 減少三個 Provider Store 的重複程式碼

---

## 中優先級 - 效能最佳化

### API 請求最佳化

- [ ] 新增 `bulk-fetch` IPC handler，一次取得所有供應商資料
- [ ] 減少 `refreshAllData` 的 IPC 請求數量 (6 → 1)
- [ ] 實作請求快取，避免短時間內重複請求

### Token 刷新邏輯統一

- [ ] 建立 `src/main/services/token-manager.ts`
- [ ] 抽離 `ensureValidToken(account)` 共用函式
- [ ] 在 background refresh 和 IPC handler 中統一使用

### Tailwind CSS 動態 Class 修正

- [ ] 修正 `grid-cols-${cols}` 無法 JIT 編譯的問題
- [ ] 使用完整 class 名稱映射表

```typescript
// 修改前
return `grid gap-4 grid-cols-${cols}`

// 修改後
const gridColsMap = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}
return `grid gap-4 ${gridColsMap[cols]}`
```

### React 效能優化

- [ ] 為 `UsageCard` 元件加上 `React.memo`
- [ ] 檢查不必要的重新渲染
- [ ] 使用 `useMemo` / `useCallback` 優化計算和回調

---

## 中優先級 - UI/UX 改進

### Loading 狀態

- [ ] 新增 Skeleton Loading 元件
- [ ] 在資料載入時顯示 Skeleton 替代空白
- [ ] OAuth 登入流程中顯示 loading spinner

### 對話框改進

- [ ] 新增 AlertDialog 元件 (基於 Radix UI)
- [ ] 將原生 `confirm()` 替換為自訂 Modal
- [ ] 刪除帳戶時使用確認對話框

### 動畫效果

- [ ] 新增卡片進場動畫 (fade-in + slide-up)
- [ ] 進度條數值變化過渡效果
- [ ] 頁面切換轉場動畫

### Tooltip 提示

- [ ] 新增 Tooltip 元件 (基於 Radix UI)
- [ ] 為側邊欄圖示按鈕新增說明提示
- [ ] 為設定項目新增詳細說明

### 響應式設計

- [ ] 小視窗時側邊欄自動摺疊
- [ ] 新增漢堡選單按鈕
- [ ] 優化卡片在不同視窗大小的顯示

### 其他 UI 改進

- [ ] 檢查深色模式的 WCAG 對比度
- [ ] 新增空狀態圖示 (無帳戶時的提示)
- [ ] 改進低配額警告的視覺呈現

---

## 低優先級 - 其他改進

### 匯出/匯入設定

- [ ] 設定頁面新增「匯出設定」按鈕
- [ ] 設定頁面新增「匯入設定」按鈕
- [ ] 匯出格式：JSON (包含 settings + customization)
- [ ] 匯入時驗證格式並提示覆蓋確認

### 帳戶排序

- [ ] 支援拖曳排序帳戶順序
- [ ] 儲存自訂順序到 customization
- [ ] 可使用 `@dnd-kit/core` 或 `react-beautiful-dnd`

### 全域快捷鍵

- [ ] 使用 Electron `globalShortcut` API
- [ ] 快速刷新快捷鍵 (例如：`Ctrl+R` 或 `F5`)
- [ ] 開啟/聚焦視窗快捷鍵
- [ ] 在設定頁面提供快捷鍵自訂

### 測試

- [X] 設定測試框架 (Vitest + React Testing Library)
- [X] 為核心服務撰寫單元測試 (crypto, storage)
- [X] 為 Store 撰寫測試
- [X] 為關鍵元件撰寫測試

### Linting

- [ ] 設定 ESLint + Prettier
- [ ] 新增 `.eslintrc.js` 和 `.prettierrc`
- [ ] 新增 `npm run lint` 指令
- [ ] 設定 pre-commit hook (husky + lint-staged)

---

## 結構性重構

### 建議的目錄結構調整

```
src/
├── shared/                        # 新增：Main/Renderer 共享
│   └── types/
│       ├── accounts.ts            # 帳戶類型定義
│       ├── usage.ts               # 使用量類型定義
│       ├── settings.ts            # 設定類型定義
│       └── ipc.ts                 # IPC 請求/回應類型
├── main/
│   ├── services/
│   │   ├── token-manager.ts       # 新增：統一 Token 管理
│   │   └── ...
│   └── ipc/
│       ├── bulk-fetch.ts          # 新增：批次取得資料
│       └── ...
└── renderer/
    └── src/
        ├── hooks/
        │   ├── useProviderOperations.ts  # 新增：統一 Provider 操作
        │   └── ...
        ├── components/
        │   ├── common/
        │   │   ├── ErrorBoundary.tsx     # 新增
        │   │   ├── Skeleton.tsx          # 新增
        │   │   └── ...
        │   ├── overview/                  # 新增：拆分 Overview
        │   │   ├── AntigravitySection.tsx
        │   │   ├── GithubCopilotSection.tsx
        │   │   └── ZaiCodingSection.tsx
        │   └── ...
        ├── stores/
        │   ├── createProviderStore.ts    # 新增：Store 工廠
        │   └── ...
        └── constants/
            ├── ipc-channels.ts           # 新增：IPC 頻道常數
            └── ...
```

### 程式碼抽離清單

- [ ] 抽離 `copilotLabelMap` 到 `constants/labels.ts` (目前在 Overview.tsx 和 ProviderAccount.tsx 重複)
- [ ] 抽離配額計算邏輯到 `lib/quota-utils.ts`
- [ ] 抽離時間格式化到 `lib/date-utils.ts`

---

## 進度追蹤

| 類別 | 總項目 | 已完成 | 進度 |
|------|--------|--------|------|
| 高優先級 - 新功能 | 10 | 0 | 0% |
| 高優先級 - 程式碼品質 | 11 | 0 | 0% |
| 中優先級 - 效能最佳化 | 10 | 0 | 0% |
| 中優先級 - UI/UX | 16 | 0 | 0% |
| 低優先級 | 13 | 0 | 0% |
| 結構性重構 | 3 | 0 | 0% |
| **總計** | **63** | **0** | **0%** |

---

## 備註

- 專案目前無測試框架和 Linting 工具，建議先設定開發工具鏈
- shadcn/ui 元件位於 `src/renderer/src/components/ui/`，修改時需謹慎
- 加密憑證儲存於 `userData/data/credentials.enc`，請勿直接修改
