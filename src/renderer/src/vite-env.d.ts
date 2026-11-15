/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional override for the backend the dev server proxies /api to. */
  readonly SHEN_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
