import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("clientApi", {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, handler: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => handler(...args))
  },
})
