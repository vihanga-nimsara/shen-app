import { build } from 'esbuild'

// vite-plugin-electron merges its own default `lib.formats` with ours, which
// makes it emit both an ES and a CJS preload to the same .cjs path. The two
// writers race at startup and can leave a half-ESM preload behind, silently
// breaking `window.shen`. Building the preload with esbuild gives us exactly
// one deterministic CommonJS file.
await build({
  entryPoints: ['src/preload/index.ts'],
  outfile: 'dist-electron/preload/index.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['electron'],
  logLevel: 'info'
})
