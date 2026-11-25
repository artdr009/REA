"use strict";
const electron = require("electron");
const studioApi = {
  loadAutosave: () => electron.ipcRenderer.invoke("project:load-autosave"),
  autosaveProject: (project) => electron.ipcRenderer.invoke("project:autosave", project),
  saveProject: (project) => electron.ipcRenderer.invoke("project:save", project),
  openProject: () => electron.ipcRenderer.invoke("project:open"),
  exportText: (text, format) => electron.ipcRenderer.invoke("project:export-text", text, format)
};
electron.contextBridge.exposeInMainWorld("studio", studioApi);
