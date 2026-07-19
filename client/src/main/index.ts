import { app, BrowserWindow, ipcMain, dialog } from "electron"
import path from "node:path"
import { buildElectronContainer, ElectronContainer } from "./electron-container.js"
import { FakeTorrentEngine } from "../infrastructure/torrent/fake-torrent-engine.js"
import { FileTorrentTransferStore } from "../infrastructure/torrent/file-torrent-transfer-store.js"

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string
declare const MAIN_WINDOW_VITE_NAME: string

let container: ElectronContainer

function buildContainer(): ElectronContainer {
  const dataRoot = app.getPath("userData")
  const hubBaseUrl = process.env.HUB_BASE_URL ?? "http://localhost:3000"
  const torrentEngine = new FakeTorrentEngine(
    new FileTorrentTransferStore(path.join(dataRoot, "transfers.json")),
  )
  return buildElectronContainer(dataRoot, hubBaseUrl, torrentEngine)
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0d1117",
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }
}

app.whenReady().then(() => {
  container = buildContainer()
  createWindow()
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

ipcMain.handle("dialog:openFile", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    title: "Selecionar arquivo para compartilhar",
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})
