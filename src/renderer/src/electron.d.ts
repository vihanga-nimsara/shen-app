import type { UpdateStatus } from '../../shared/update-types'

declare global {
  interface Window {
    shen?: {
      platform: string
      getVersion: () => Promise<string>
      checkForUpdates: () => Promise<void>
      installUpdate: () => Promise<void>
      onUpdate: (callback: (status: UpdateStatus) => void) => () => void
    }
  }
}

export {}
