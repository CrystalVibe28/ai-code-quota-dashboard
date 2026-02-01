# AGENTS.md - AI Code Quota Dashboard

AI 多供應商 Quota 監控的 Electron 桌面應用。

## Build Commands

```bash
# Development
npm run dev           # Start dev server with hot reload

# Build
npm run build         # Build for production
npm run build:win     # Build Windows installer
npm run build:mac     # Build macOS installer
npm run build:linux   # Build Linux package
npm run preview       # Preview production build

# Dependencies
npm run postinstall   # Install Electron native deps
```

**Note**: No test framework configured. No linting setup - follow existing code patterns.

## Project Structure

```
src/
├── main/                     # Electron main process (Node.js)
│   ├── index.ts              # App entry, window creation
│   ├── ipc/                  # IPC handlers (auth, storage, providers)
│   └── services/             # Business logic (crypto, storage, providers)
├── preload/                  # Preload scripts (bridge main <-> renderer)
│   └── index.ts              # Expose APIs via contextBridge
└── renderer/                 # React frontend
    └── src/
        ├── App.tsx           # Root component
        ├── components/       # React components (ui/, common/, layout/, settings/)
        ├── pages/            # Route pages
        ├── stores/           # Zustand stores (use*Store.ts)
        ├── contexts/         # React contexts
        ├── hooks/            # Custom hooks
        ├── types/            # TypeScript type definitions
        ├── lib/              # Utility functions
        ├── constants/        # Constants/config values
        └── i18n/             # Internationalization
```

## Tech Stack

- **Framework**: Electron 33 + React 18
- **Build**: electron-vite + Vite 7
- **Language**: TypeScript (strict mode, ESNext)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand
- **Routing**: react-router-dom (HashRouter)
- **i18n**: i18next + react-i18next

## Code Style Guidelines

### Imports
Order: React core → Third-party → Internal components → Stores/hooks → Types → Utils

```typescript
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/useAuthStore'
import type { ProviderId } from '@/types/customization'
import { cn } from '@/lib/utils'
```

### Naming Conventions
| Element         | Convention       | Example                    |
|-----------------|------------------|----------------------------|
| React Component | PascalCase       | `UsageCard`, `MainLayout`  |
| Custom Hook     | `use` prefix     | `useTheme`, `useAuthStore` |
| Store           | `use*Store`      | `useSettingsStore`         |
| Variable/Func   | camelCase        | `fetchAccounts`, `isLoading` |
| Interface       | PascalCase       | `AuthState`, `UsageCardProps` |
| Type            | PascalCase       | `ProviderId`, `CardSize`   |
| File (Component)| PascalCase.tsx   | `UsageCard.tsx`            |
| File (Util/Hook)| camelCase.ts     | `useTheme.ts`              |
| IPC Channel     | kebab-case       | `auth:verify-password`     |

### Patterns

```typescript
// Component
interface UsageCardProps { title: string; percentage: number; className?: string }
export function UsageCard({ title, percentage, className }: UsageCardProps) {
  return <div>{title}: {percentage}%</div>
}

// Zustand store
export const useAuthStore = create<AuthState>((set) => ({
  isUnlocked: false,
  unlock: async (password) => {
    const result = await window.api.auth.verifyPassword(password)
    if (result) set({ isUnlocked: true })
    return result
  }
}))

// Error handling: silent failure
async function doSomething(): Promise<boolean> {
  try { return await someOperation() } catch { return false }
}

// Error handling: store state
try { set({ data: await fetchData(), error: null }) }
catch (error) { set({ error: String(error) }) }

// Styling with cn()
<div className={cn('flex items-center', isActive && 'bg-primary', className)} />
```

## Electron Architecture

**Main Process (`src/main/`)** - Window management, IPC handlers, file system access, crypto operations
**Preload (`src/preload/`)** - Exposes `window.api` via contextBridge, type-safe IPC wrapper
**Renderer (`src/renderer/`)** - React SPA accessing main process via `window.api.*`

### IPC Pattern

```typescript
// Main process (ipc/auth.ts)
ipcMain.handle('auth:verify-password', async (_, password: string) => {
  return cryptoService.verifyPassword(password)
})

// Preload (index.ts)
const api = {
  auth: {
    verifyPassword: (password: string): Promise<boolean> =>
      ipcRenderer.invoke('auth:verify-password', password)
  }
}
// Renderer (store)
const result = await window.api.auth.verifyPassword(password)
```

## TypeScript Configuration

- **Strict mode**: enabled
- **Target**: ESNext
- **Module resolution**: bundler
- **Path alias**: `@/*` -> `src/renderer/src/*` (renderer only)

## Important Notes

1. **No ESLint/Prettier** - follow existing code patterns
2. **No test framework** - tests not configured
3. **shadcn/ui components** in `src/renderer/src/components/ui/` - modify carefully
4. **Encrypted storage** - credentials in `userData/data/credentials.enc`
5. **Dark mode** - controlled via `useTheme` hook and CSS class on `<html>`
6. **System Tray** - optional minimize-to-tray with background refresh (TrayService in `src/main/services/tray.ts`)

## Common Tasks

- **Add IPC handler**: Create in `src/main/ipc/`, register in `src/main/index.ts`, add to preload API, update types
- **Add Zustand store**: Create in `src/renderer/src/stores/useNewStore.ts`, follow `useAuthStore` pattern
- **Add page**: Create in `src/renderer/src/pages/`, add route in `App.tsx`, add nav link in `MainLayout.tsx`
