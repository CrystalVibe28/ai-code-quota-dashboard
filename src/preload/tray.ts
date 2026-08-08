import { contextBridge, ipcRenderer } from 'electron'
import type { TrayPopoverViewModel } from '@shared/types'

const trayApi = {
  getViewModel: (): Promise<TrayPopoverViewModel> =>
    ipcRenderer.invoke('tray:get-view-model'),
  openMain: (): void => ipcRenderer.send('tray:open-main'),
  hide: (): void => ipcRenderer.send('tray:hide'),
  onDataUpdated: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('tray:data-updated', handler)
    return () => ipcRenderer.removeListener('tray:data-updated', handler)
  }
}

contextBridge.exposeInMainWorld('trayApi', trayApi)
