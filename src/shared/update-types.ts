export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'dev'

export interface UpdateStatus {
  state: UpdateState
  version?: string
  percent?: number
  message?: string
}
