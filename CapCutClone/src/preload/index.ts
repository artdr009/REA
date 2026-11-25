import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { ExportJob, ExportProgress } from '../shared/types'

const api = {
  pickMediaFiles: () => ipcRenderer.invoke('media:pick'),
  pickSavePath: (defaultName: string) => ipcRenderer.invoke('media:save-dialog', defaultName),
  probe: (p: string) => ipcRenderer.invoke('media:probe', p),
  thumbnail: (p: string, id: string) => ipcRenderer.invoke('media:thumb', p, id),
  ensureSampleVideo: () => ipcRenderer.invoke('app:ensure-sample'),
  openInFolder: (p: string) => ipcRenderer.invoke('app:open-path', p),
  exportVideo: (job: ExportJob) => ipcRenderer.invoke('export:run', job),
  onExportProgress: (cb: (p: ExportProgress) => void) => {
    const listener = (_e: unknown, p: ExportProgress) => cb(p)
    ipcRenderer.on('export:progress', listener as never)
    return () => ipcRenderer.removeListener('export:progress', listener as never)
  },
  pathForFile: (file: File) => webUtils.getPathForFile(file)
}

contextBridge.exposeInMainWorld('api', api)
