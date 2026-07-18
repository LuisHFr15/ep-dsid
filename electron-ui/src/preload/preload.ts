import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getHubUrl: (): Promise<string> => ipcRenderer.invoke('app:getHubUrl'),
  openFilePicker: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFile'),
  torrentStatus: () => ipcRenderer.invoke('torrent:status')
})
