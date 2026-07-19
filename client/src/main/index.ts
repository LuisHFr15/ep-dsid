import { app, BrowserWindow, ipcMain, dialog, session } from "electron"
// @ts-ignore
import path from "node:path"
import { buildElectronContainer, ElectronContainer } from "./electron-container.js"
import { buildIpcMap } from "./ipc-map.js"
import { registerIpcHandlers } from "./ipc.js"
import { WebTorrentEngine } from "../infrastructure/torrent/webtorrent-engine.js"
import { FileTorrentTransferStore } from "../infrastructure/torrent/file-torrent-transfer-store.js"
import { approveFilePath } from "./approved-file-paths.js"

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string
declare const MAIN_WINDOW_VITE_NAME: string

let container: ElectronContainer
let mainWindow: BrowserWindow | null = null

function buildContainer(): ElectronContainer {
  const dataRoot = app.getPath("userData")
  const hubBaseUrl = process.env.HUB_BASE_URL ?? "http://52.90.156.108:3000"
  const torrentEngine = new WebTorrentEngine(
    new FileTorrentTransferStore(path.join(dataRoot, "transfers.json")),
    (message, err) => (err !== undefined ? console.error(message, err) : console.log(message)),
  )
  return buildElectronContainer(dataRoot, hubBaseUrl, torrentEngine)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0b0b0f",
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// Presença automática: inicia o runtime empurrando updates para o renderer.
let presenceStarted = false
async function startPresence(): Promise<void> {
  if (presenceStarted) return
  try {
    await container.presenceRuntime.start({
      onUpdate: (update) => {
        mainWindow?.webContents.send("presence:update", update)
      },
    })
    presenceStarted = true
  } catch (err) {
    // Sem sessão ainda: silencioso; o login dispara startPresence de novo.
    void err
  }
}

// Content-Security-Policy aplicada via header de resposta. Em produção é
// estrita (o renderer não faz requisições de rede — tudo vai por IPC — então
// nem precisa de connect-src externo). Em dev, o Vite/React Refresh exige
// eval, inline e websocket para o HMR, então relaxamos apenas nesse caso.
function applyContentSecurityPolicy(): void {
  const isDev = Boolean(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  const policy = isDev
    ? "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data:; font-src 'self' data:; " +
      "connect-src 'self' ws: http: https:"
    : "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data:; font-src 'self' data:; " +
      "connect-src 'self'"

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [policy],
      },
    })
  })
}

app.whenReady().then(() => {
  container = buildContainer()
  applyContentSecurityPolicy()
  registerIpcHandlers(buildIpcMap(container))

  ipcMain.handle("dialog:openFile", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      title: "Selecionar arquivo para compartilhar",
    })
    if (result.canceled || result.filePaths.length === 0) return null
    // Só arquivos escolhidos aqui podem ser publicados (ver publishLocal).
    approveFilePath(result.filePaths[0])
    return result.filePaths[0]
  })

  ipcMain.handle("workspace:choose", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
      title: "Escolher pasta de compartilhamento",
    })
    if (result.canceled || result.filePaths.length === 0) return { ok: false, error: { code: "CANCELLED", message: "Nenhuma pasta escolhida" } }
    try {
      const workspace = await container.configureWorkspace.execute({ rootDirectory: result.filePaths[0] })
      return { ok: true, data: workspace }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: { code: "WORKSPACE_ERROR", message } }
    }
  })

  ipcMain.handle("presence:start", async () => {
    await startPresence()
    return { ok: true, data: null }
  })

  ipcMain.handle("presence:stop", async () => {
    container.presenceRuntime.stop()
    presenceStarted = false
    return { ok: true, data: null }
  })

  // Auto-configura workspace no primeiro boot
  container.getWorkspaceStatus.execute().then(async (status) => {
    if (!status.configured) {
      const defaultDir = path.join(app.getPath("documents"), "EP-DSID")
      await container.configureWorkspace.execute({ rootDirectory: defaultDir })
    }
  }).catch(() => {})

  createWindow()
  void startPresence() // boot: se já há sessão, entra online

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("before-quit", () => {
  container?.presenceRuntime.stop()
})
