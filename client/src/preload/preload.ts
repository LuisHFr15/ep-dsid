import { contextBridge, ipcRenderer } from "electron"

// Allow-list explícita: o renderer só alcança estes canais. Impede que um
// renderer comprometido invoque handlers IPC arbitrários. Mantenha em sincronia
// com buildIpcMap (ipc-map.ts) e os ipcMain.handle diretos em index.ts.
const INVOKE_CHANNELS = new Set<string>([
  "health:check",
  "auth:register",
  "auth:login",
  "auth:logout",
  "auth:session",
  "networks:list",
  "networks:create",
  "networks:requestAccess",
  "networks:listAccessRequests",
  "networks:decideAccess",
  "networks:listPeers",
  "files:getCurrent",
  "files:listVersions",
  "files:promote",
  "files:publishLocal",
  "files:downloadCurrent",
  "workspace:configure",
  "workspace:status",
  "transfers:list",
  "dialog:openFile",
  "workspace:choose",
  "clipboard:write",
  "presence:start",
  "presence:stop",
  "presence:joinNetwork",
  "presence:leaveNetwork",
  "presence:getNetwork",
])

const ON_CHANNELS = new Set<string>(["presence:update"])

contextBridge.exposeInMainWorld("clientApi", {
  invoke: (channel: string, ...args: unknown[]) => {
    if (!INVOKE_CHANNELS.has(channel)) {
      return Promise.reject(new Error(`Canal IPC não permitido: ${channel}`))
    }
    return ipcRenderer.invoke(channel, ...args)
  },
  on: (channel: string, handler: (...args: unknown[]) => void) => {
    if (!ON_CHANNELS.has(channel)) {
      return
    }
    ipcRenderer.on(channel, (_event, ...args) => handler(...args))
  },
})
