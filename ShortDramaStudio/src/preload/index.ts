import { contextBridge, ipcRenderer } from 'electron'

const studioApi = {
  loadAutosave: () => ipcRenderer.invoke('project:load-autosave'),
  autosaveProject: (project: unknown) => ipcRenderer.invoke('project:autosave', project),
  saveProject: (project: unknown) => ipcRenderer.invoke('project:save', project),
  openProject: () => ipcRenderer.invoke('project:open'),
  exportText: (text: string, format: 'md' | 'txt' | 'html') => ipcRenderer.invoke('project:export-text', text, format)
}

contextBridge.exposeInMainWorld('studio', studioApi)
