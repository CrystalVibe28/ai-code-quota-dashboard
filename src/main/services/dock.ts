import { app } from 'electron'

// macOS 縮到系統工具列時隱藏 Dock 圖示，只留選單列圖示；其他平台不做事
export function hideDockIcon(): void {
  if (process.platform !== 'darwin' || !app.dock) return
  app.dock.hide()
}

// 需在顯示視窗前等待完成，否則視窗可能無法取得焦點
export async function showDockIcon(): Promise<void> {
  if (process.platform !== 'darwin' || !app.dock || app.dock.isVisible()) return
  try {
    await app.dock.show()
  } catch (error) {
    console.error('[Dock] Failed to show dock icon:', error)
  }
}
