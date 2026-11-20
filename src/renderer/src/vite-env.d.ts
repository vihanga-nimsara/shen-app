/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional override for the backend the dev server proxies /api to. */
  readonly SHEN_API_URL?: string
  /** Optional override for the public feedback project. */
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Replaced at build time from package.json. */
declare const __APP_VERSION__: string
