# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Start the renderer only (Vite dev server on http://localhost:5173)
npm run dev

# Start the in-memory mock hub (required for any API calls)
node mock-server.mjs

# Build the renderer to dist/
npm run build

# Build the full Electron app (main + preload + renderer) via electron-vite
npx electron-vite build

# Run the Electron app in dev mode via electron-vite
npx electron-vite dev

# Type-check all sources
npx tsc --noEmit -p tsconfig.node.json && npx tsc --noEmit -p tsconfig.web.json
```

There are no lint or test scripts configured.

## Architecture

This is an **Electron + React + TypeScript** desktop app for a P2P file-sharing hub (EP-DSID). It follows the standard three-process Electron pattern:

- **`src/main/main.ts`** — Electron main process. Creates the `BrowserWindow`, loads the renderer (dev server in development, bundled HTML in production), and registers IPC handlers. The `torrent:status` IPC handler is a placeholder stub pending WebTorrent integration (MVP 9).
- **`src/preload/preload.ts`** — Preload script with `contextIsolation: true`. Exposes `window.electronAPI.torrentStatus()` to the renderer via `contextBridge`. Currently only the torrent stub is bridged; all hub API calls go directly from the renderer over HTTP.
- **`src/renderer/`** — A React SPA (React 18, React Router v6). Entry: `main.tsx` → `App.tsx`.

### Build system split

Two config files coexist:
- **`electron.vite.config.ts`** — Used by `electron-vite` for the full Electron build (main + preload + renderer together). This is what produces `out/main/main.js` (the `main` field in package.json).
- **`vite.config.ts`** — Standalone Vite config pointing at `src/renderer` as root, used by the `npm run dev/build` scripts. Useful for renderer-only iteration without Electron overhead.

For production packaging, `electron-vite build` must be used. For renderer-only development, `npm run dev` + `node mock-server.mjs` is sufficient.

### Renderer internals

- **State / auth**: A single React Context (`AuthContext`) stores the `Session` (`{ userId, username, jwt }`), persisted to `localStorage` under key `ep_dsid_session`. There is no global state library.
- **API layer** (`src/renderer/api.ts`): All hub calls are plain `fetch` against `http://localhost:3000`. The `request<T>()` helper attaches the JWT as `Authorization: Bearer`. No interceptor or retry logic.
- **Types** (`src/renderer/types.ts`): Mirrors the hub's domain model — `Network`, `FileVersion`, `VersionNode`, `ActivePeer`, `HeartbeatResult`, `NetworkAccessRequest`, `Session`.
- **Routing**: `/login` → `LoginPage`, `/networks` → `NetworksPage`, `/networks/:id` → `NetworkDetailPage`. Unauthenticated users are redirected to `/login` via `PrivateRoute`.
- **Presence / heartbeat**: `useHeartbeat` calls `POST /networks/:id/heartbeat` every 10 seconds via `useInterval`. It tracks a `peerId` (stable `crypto.randomUUID()` per component mount) and returns `peers` + `fallbackActive` (`shouldActivateFallback: active peers ≤ 4`).
- **Styling**: A single `src/renderer/styles/global.css` using CSS custom properties (`--bg`, `--surface`, `--accent`, etc.). No CSS-in-JS, no component library — all class names are plain strings matching rules in that file.

### Mock server (`mock-server.mjs`)

A zero-dependency Node.js HTTP server that simulates the entire hub API in memory. Start it with `node mock-server.mjs` (listens on `:3000`). It implements auth, networks CRUD, file version DAG with Lamport timestamps, access requests, and presence/heartbeat. Passwords are stored in plain text (dev only). State is lost on restart.

### Key design constraints

- The "Download" and "Announce file" buttons in `NetworkDetailPage` are intentional stubs (`alert()`) — P2P file transfer via WebTorrent is deferred to MVP 9.
- `NetworkDetailPage` loads network details by calling `GET /networks` and filtering client-side (the hub exposes no `GET /networks/:id` endpoint).
- `canContribute` is true when the user is the network owner **or** when `updateMode === 'collaborative'` (regardless of membership status in the renderer — the mock server enforces membership on the backend).
