# Berloga auto updater — Windows, GitHub Releases, Tauri v2

This patch modifies ONLY the desktop updater. It does not touch the Next.js web UI, chat, LiveKit, Supabase, or theme files.

## 1. Copy the patch

Extract the ZIP over the repository root, retaining paths: `.github/workflows/desktop.yml`, `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, and `scripts/configure-updater.ps1`.

The existing `src-tauri/tauri.conf.json` is intentionally **not overwritten**. The script below edits it in place and preserves your Vercel URL.

## 2. Generate signing keys on YOUR Windows computer (once)

Install project dependencies if needed (`npm ci`), then run from the repository root:

```powershell
New-Item -ItemType Directory -Force "$HOME\.tauri" | Out-Null
npm run tauri signer generate -- -w "$HOME\.tauri\berloga.key"
```

Choose and record a strong signing password when prompted. This generates `berloga.key` (PRIVATE) and `berloga.key.pub` (PUBLIC). Do not commit, send, or publish the private key. Keep a secure offline backup. If lost, existing installs cannot verify updates signed with a new key.

## 3. Configure the endpoint and PUBLIC key

Find your repository's `OWNER/REPO` on GitHub. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\configure-updater.ps1 -Repository "OWNER/REPO"
```

This adds `bundle.createUpdaterArtifacts: true` and `plugins.updater` with the actual public key and:
`https://github.com/OWNER/REPO/releases/latest/download/latest.json`

The repository/releases MUST be accessible without authentication (typically a public GitHub repo, or public release host). A private repository's Releases are not an anonymous update endpoint.

## 4. Configure GitHub Actions secrets

GitHub repository -> Settings -> Secrets and variables -> Actions -> New repository secret:

- `TAURI_SIGNING_PRIVATE_KEY` = full content of `berloga.key` (PRIVATE file, not .pub)
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` = the password used to generate that key

GitHub Actions must have permission to create Releases (workflow includes `contents: write`; repository Actions settings may restrict it).

## 5. First release (friends install it once)

Version is `0.1.0` in `src-tauri/tauri.conf.json`. Also synchronize `package.json` / `src-tauri/Cargo.toml` if you change them in future; the updater compares the Tauri config app version.

```powershell
git add .
git commit -m "feat: signed auto updates via GitHub Releases"
git push origin main
git tag v0.1.0
git push origin v0.1.0
```

GitHub -> Actions -> 'Windows installer and auto-update release' should build a PUBLIC GitHub Release with the NSIS setup.exe, signed updater artifacts and `latest.json`. Friends should install this NEW signed installer once. Previously distributed clients without the updater cannot acquire the updater by themselves.

## 6. Next release: no more installer sharing

Increment `version` in `src-tauri/tauri.conf.json` (e.g. `0.1.1`) and keep `Cargo.toml` and `package.json` aligned. Commit, push, tag, and push tag:

```powershell
git add .
git commit -m "release: v0.1.1"
git push origin main
git tag v0.1.1
git push origin v0.1.1
```

GitHub Action publishes another Release and updates `latest.json`. Installed desktop clients check **on launch**, download signed updated code, install it, and restart. The tray menu includes “Проверить обновления” for manual checking. There is NO periodic interruption of live calls, but a check at startup/manual invocation may restart during a call. Use the menu only when ready to restart.

## Important: web changes vs desktop updates

The Tauri desktop window opens your LIVE Vercel URL. Most Next.js UI changes deployed to Vercel already appear for all users after refresh and DO NOT require a desktop installer or new Tauri release. Use desktop releases when `src-tauri` native code/config changes, or when you want an explicitly versioned desktop release.

## Verification / limitations

- `src-tauri/tauri.conf.json` must already point at YOUR Vercel domain (not REPLACE-ME).
- Installer signature is Tauri updater signing (NOT the same as a Microsoft Authenticode publisher certificate).
- The first signed installer is necessary to bootstrap updater support on friends' machines.
- Build/test GitHub Actions on Windows; this ZIP was generated without compiling Rust locally.
- Closing the app's window hides it in tray; quitting via tray and relaunching triggers a new update check.
