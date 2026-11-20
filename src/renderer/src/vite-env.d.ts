/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional override for the backend the dev server proxies /api to. */
  readonly SHEN_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Replaced at build time from package.json. */
declare const __APP_VERSION__: string
