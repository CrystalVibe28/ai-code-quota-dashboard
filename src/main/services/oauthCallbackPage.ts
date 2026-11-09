import type { ServerResponse } from 'http'
import { app } from 'electron'
import { StorageService } from './storage'

export type OAuthCallbackStatus = 'success' | 'denied' | 'stateMismatch' | 'noCode' | 'failed'
type Language = 'en' | 'zh-TW' | 'zh-CN'

interface PageText {
  title: string
  message: string
}

const APP_NAME = 'AI Code Quota Dashboard'

const TEXT: Record<Language, Record<OAuthCallbackStatus, PageText>> = {
  en: {
    success: { title: 'Signed in', message: `Your account is connected. You can close this tab and return to ${APP_NAME}.` },
    denied: { title: 'Sign-in cancelled', message: 'Authorization was not granted. Return to the app to try again.' },
    stateMismatch: { title: 'Sign-in failed', message: 'The security check did not pass. Return to the app and sign in again.' },
    noCode: { title: 'Sign-in failed', message: 'No authorization code was received. Return to the app to try again.' },
    failed: { title: 'Sign-in failed', message: 'Something went wrong while completing sign-in. Return to the app to try again.' }
  },
  'zh-TW': {
    success: { title: '登入成功', message: `帳號已連結完成，你可以關閉此分頁並返回 ${APP_NAME}。` },
    denied: { title: '已取消登入', message: '未取得授權，請返回應用程式重新嘗試。' },
    stateMismatch: { title: '登入失敗', message: '安全驗證未通過，請返回應用程式重新登入。' },
    noCode: { title: '登入失敗', message: '未收到授權碼，請返回應用程式重新嘗試。' },
    failed: { title: '登入失敗', message: '完成登入時發生錯誤，請返回應用程式重新嘗試。' }
  },
  'zh-CN': {
    success: { title: '登录成功', message: `账号已连接完成，你可以关闭此标签页并返回 ${APP_NAME}。` },
    denied: { title: '已取消登录', message: '未获得授权，请返回应用重新尝试。' },
    stateMismatch: { title: '登录失败', message: '安全验证未通过，请返回应用重新登录。' },
    noCode: { title: '登录失败', message: '未收到授权码，请返回应用重新尝试。' },
    failed: { title: '登录失败', message: '完成登录时发生错误，请返回应用重新尝试。' }
  }
}

const CHECK_ICON = '<path class="mark" d="M17 28.5l7 7 15-15" />'
const ERROR_ICON = '<path class="mark" d="M20 20l16 16M36 20L20 36" />'

function normalizeLanguage(value: string | undefined): Language {
  const lower = (value ?? '').toLowerCase()
  if (lower === 'zh-tw' || lower === 'zh-hk' || lower.startsWith('zh-hant')) return 'zh-TW'
  if (lower.startsWith('zh')) return 'zh-CN'
  return 'en'
}

function resolveLanguage(): Language {
  try {
    const storage = new StorageService()
    if (storage.isUnlocked()) return normalizeLanguage(storage.getSettings().language)
  } catch {
    // fall back to system locale
  }
  try {
    return normalizeLanguage(app.getLocale())
  } catch {
    return 'en'
  }
}

export function renderOAuthCallbackPage(status: OAuthCallbackStatus, language: string = 'en'): string {
  const lang = normalizeLanguage(language)
  const text = TEXT[lang]
  const { title, message } = text[status]
  const isSuccess = status === 'success'

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${title} · ${APP_NAME}</title>
<style>
  :root {
    --bg: #f5f5f5;
    --card: #ffffff;
    --stroke: #e0e0e0;
    --fg: #242424;
    --fg-2: #616161;
    --fg-3: #8a8a8a;
    --accent: ${isSuccess ? '#107c10' : '#c50f1f'};
    --accent-bg: ${isSuccess ? '#f1faf1' : '#fdf3f4'};
    --shadow: 0 0 2px rgba(0,0,0,.12), 0 8px 16px rgba(0,0,0,.14);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1a1a1a;
      --card: #292929;
      --stroke: #3d3d3d;
      --fg: #ffffff;
      --fg-2: #d6d6d6;
      --fg-3: #adadad;
      --accent: ${isSuccess ? '#54b054' : '#dc626d'};
      --accent-bg: ${isSuccess ? '#052505' : '#3b0509'};
      --shadow: 0 0 2px rgba(0,0,0,.24), 0 8px 16px rgba(0,0,0,.28);
    }
  }
  * { box-sizing: border-box; margin: 0; }
  html, body { height: 100%; }
  body {
    display: grid;
    place-items: center;
    padding: 16px;
    background: var(--bg);
    color: var(--fg);
    font-family: "Segoe UI Variable Text", "Segoe UI", -apple-system, BlinkMacSystemFont, "Microsoft JhengHei UI", "Microsoft YaHei UI", "PingFang TC", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .card {
    width: 100%;
    max-width: 400px;
    padding: 40px 32px 28px;
    background: var(--card);
    border: 1px solid var(--stroke);
    border-radius: 12px;
    box-shadow: var(--shadow);
    text-align: center;
    animation: rise .4s cubic-bezier(.1,.9,.2,1) both;
  }
  .badge {
    width: 64px;
    height: 64px;
    margin: 0 auto 20px;
    border-radius: 50%;
    background: var(--accent-bg);
    display: grid;
    place-items: center;
  }
  .badge svg { width: 56px; height: 56px; }
  .badge circle { fill: var(--accent); }
  .mark {
    fill: none;
    stroke: #fff;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 40;
    stroke-dashoffset: 40;
    animation: draw .35s .25s ease-out forwards;
  }
  h1 { font-size: 24px; line-height: 32px; font-weight: 600; }
  p.message { margin-top: 8px; font-size: 14px; line-height: 20px; color: var(--fg-2); }
  .footer {
    margin-top: 28px;
    padding-top: 16px;
    border-top: 1px solid var(--stroke);
    font-size: 12px;
    line-height: 16px;
    color: var(--fg-3);
  }
  @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes draw { to { stroke-dashoffset: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .card { animation: none; }
    .mark { animation: none; stroke-dashoffset: 0; }
  }
</style>
</head>
<body>
  <main class="card" role="status">
    <div class="badge" aria-hidden="true">
      <svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" />${isSuccess ? CHECK_ICON : ERROR_ICON}</svg>
    </div>
    <h1>${title}</h1>
    <p class="message">${message}</p>
    <div class="footer">${APP_NAME}</div>
  </main>
</body>
</html>`
}

export function writeOAuthCallbackPage(res: ServerResponse, status: OAuthCallbackStatus): void {
  const body = renderOAuthCallbackPage(status, resolveLanguage())
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body).toString(),
    'Cache-Control': 'no-store',
    'Connection': 'close'
  })
  res.end(body)
}
