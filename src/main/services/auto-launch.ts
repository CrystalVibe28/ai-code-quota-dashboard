import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs'
import { dirname, isAbsolute, join } from 'path'
import { replaceFileAtomicallySync } from './atomic-file'

const AUTO_LAUNCH_ARG = '--hidden'
const LINUX_AUTOSTART_FILE = 'ai-code-quota-dashboard.desktop'
const WINDOWS_LOGIN_ITEM = {
  path: process.execPath,
  args: [AUTO_LAUNCH_ARG]
}

function getLinuxAutostartPath(): string {
  return join(app.getPath('appData'), 'autostart', LINUX_AUTOSTART_FILE)
}

function getLinuxExecutablePath(): string {
  const appImagePath = process.env.APPIMAGE
  return appImagePath && isAbsolute(appImagePath) ? appImagePath : process.execPath
}

function quoteDesktopExecArgument(value: string): string {
  if (/[=\x00-\x1f\x7f]/.test(value)) throw new Error('Invalid auto-launch executable path')
  const escaped = value
    .replace(/%/g, '%%')
    .replace(/(["`$\\])/g, '\\$1')
    .replace(/\\/g, '\\\\')
  return `"${escaped}"`
}

function getLinuxExecEntry(): string {
  return `Exec=${quoteDesktopExecArgument(getLinuxExecutablePath())} ${AUTO_LAUNCH_ARG}`
}

function getLinuxAutoLaunch(): boolean {
  const filePath = getLinuxAutostartPath()
  if (!existsSync(filePath)) return false

  const contents = readFileSync(filePath, 'utf8')
  const disabled = /^Hidden\s*=\s*true\s*$/im
  return contents.split(/\r?\n/).includes(getLinuxExecEntry()) && !disabled.test(contents)
}

function setLinuxAutoLaunch(enabled: boolean): void {
  const filePath = getLinuxAutostartPath()
  if (!enabled) {
    rmSync(filePath, { force: true })
    return
  }

  const name = app.getName().replace(/[\r\n]+/g, ' ')
  const contents = [
    '[Desktop Entry]',
    'Type=Application',
    `Name=${name}`,
    getLinuxExecEntry(),
    'Terminal=false',
    ''
  ].join('\n')
  mkdirSync(dirname(filePath), { recursive: true })
  replaceFileAtomicallySync(filePath, contents)
}

export function getAutoLaunch(): boolean {
  if (process.platform === 'linux') return getLinuxAutoLaunch()

  if (process.platform === 'win32') {
    const settings = app.getLoginItemSettings(WINDOWS_LOGIN_ITEM)
    const loginItem = settings.launchItems.find(item =>
      item.path.toLowerCase() === WINDOWS_LOGIN_ITEM.path.toLowerCase() &&
      item.args.length === WINDOWS_LOGIN_ITEM.args.length &&
      item.args.every((arg, index) => arg === WINDOWS_LOGIN_ITEM.args[index])
    )
    return settings.openAtLogin && loginItem?.enabled === true
  }

  if (process.platform === 'darwin') return app.getLoginItemSettings().openAtLogin
  return false
}

export function setAutoLaunch(enabled: boolean): boolean {
  if (!app.isPackaged) return false

  if (process.platform === 'linux') {
    setLinuxAutoLaunch(enabled)
  } else if (process.platform === 'win32') {
    app.setLoginItemSettings({
      ...WINDOWS_LOGIN_ITEM,
      openAtLogin: enabled,
      ...(enabled && { enabled: true })
    })
  } else if (process.platform === 'darwin') {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      ...(enabled && { openAsHidden: true })
    })
  } else {
    return false
  }

  return getAutoLaunch() === enabled
}
