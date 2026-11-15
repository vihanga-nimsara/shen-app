# Releasing Shen for Windows

GitHub: https://github.com/vihanga-nimsara/shen-app

## Local build

```powershell
npm.cmd install
npm.cmd run dist:win       # installer only
npm.cmd run pack:win       # unpacked folder, fast
```

Outputs:

| Path | What it is |
| --- | --- |
| `release/Shen-<version>-Setup.exe` | NSIS installer (per-user, no admin required) |
| `release/Shen-<version>-Setup.exe.blockmap` | differential-update block map |
| `release/latest.yml` | auto-update feed (uploaded with the release) |
| `release/win-unpacked/Shen.exe` | unpacked build for quick testing |

## Signing

A local self-signed code-signing certificate lives in `certs/` (ignored by git):

- `certs/shen-codesign.pfx` — PFX used by electron-builder
- `certs/shen-codesign.cer` — public certificate
- `certs/signing.env` — `CSC_LINK` + `CSC_KEY_PASSWORD` for local builds

`certs/shen-codesign.cer` is installed into the current user's **Trusted Publisher** and
**Trusted Root** stores so the signature validates on this machine. Other machines
will still show an unknown-publisher warning until the `.cer` is installed there
(or an OV/EV certificate is used).

To build signed locally:

```powershell
Get-Content certs/signing.env | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') { Set-Item -Path "Env:$($matches[1])" -Value $matches[2] }
}
npm.cmd run dist:win
```

electron-builder signs `Shen.exe` and the installer with the PFX. Update signature
verification is disabled in the build config because the certificate is self-signed
(`win.verifyUpdateCodeSignature: false`).

## Publishing a release

```powershell
$env:GH_TOKEN = (gh auth token)
npm.cmd version patch --no-git-tag-version
npm.cmd run release:win
```

`release:win` runs the build and publishes a **published** GitHub release (not a
draft) with the installer, blockmap and `latest.yml`, tagged `v<version>`.

Or push a tag and let GitHub Actions do it:

```powershell
git tag v0.1.1
git push origin v0.1.1
```

`.github/workflows/release.yml` builds on `windows-latest` and publishes with the
repository's `GITHUB_TOKEN`. To sign in CI, add these repository secrets:

| Secret | Value |
| --- | --- |
| `WIN_CSC_LINK` | base64 of `certs/shen-codesign.pfx` |
| `WIN_CSC_KEY_PASSWORD` | the PFX password |

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certs/shen-codesign.pfx"))
```

Without the secrets the workflow produces an unsigned installer.

> GitHub blocks pushes that add workflow files when the authenticated OAuth app
> lacks the `workflow` scope. Grant it once with `gh auth refresh -s workflow`,
> then commit/push `.github/workflows/release.yml`. Until then, use the local
> `npm run release:win` command above.

## Auto-updates

`electron-updater` is wired in the main process:

- checks GitHub ~6 seconds after startup (packaged builds only)
- downloads new versions in the background
- shows native Windows notifications when an update is downloading and when it is ready
- installs on quit (`autoInstallOnAppQuit`)
- Support tab has a **Check for updates** button, live progress and **Restart & install**

The feed is the `latest.yml` asset on the newest GitHub release. Repo visibility
must stay public for unauthenticated update checks.

## Runtime configuration

The renderer talks to `https://shen.zagan.space` by default. Override with
`SHEN_API_URL` (see `.env.example`). The Status tab uses `NORTHFLANK_API_TOKEN`
when set, otherwise it falls back to the local `northflank login` session.

Secrets are **not** baked into the installer. Set environment variables on the
machine, or place a `.env` next to `Shen.exe` / in the working directory.
