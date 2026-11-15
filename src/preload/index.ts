import { contextBridge, ipcRenderer } from 'electron'
import type { UpdateStatus } from '../shared/update-types'

contextBridge.exposeInMainWorld('shen', {
  platform: process.platform,
  getVersion: (): Promise<string> => ipcRenderer.invoke('shen:version'),
  checkForUpdates: (): Promise<void> => ipcRenderer.invoke('shen:check-updates'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('shen:install-update'),
  onUpdate: (callback: (status: UpdateStatus) => void) => {
    const listener = (_event: unknown, status: UpdateStatus) => callback(status)
    ipcRenderer.on('shen:update-status', listener)
    return () => {
      ipcRenderer.removeListener('shen:update-status', listener)
    }
  }
})
