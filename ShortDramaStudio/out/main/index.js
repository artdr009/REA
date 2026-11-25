"use strict";
const electron = require("electron");
const path = require("node:path");
const promises = require("node:fs/promises");
function createWindow() {
  const win = new electron.BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    show: false,
    backgroundColor: "#0b0c0b",
    title: "REA Short Drama Studio",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.once("ready-to-show", () => win.show());
  if (process.env["ELECTRON_RENDERER_URL"]) {
    void win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
function registerProjectFileHandlers() {
  const autosavePath = path.join(electron.app.getPath("userData"), "autosave.rea-drama.json");
  electron.ipcMain.handle("project:load-autosave", async () => {
    try {
      return { contents: await promises.readFile(autosavePath, "utf8") };
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return { contents: null };
      throw error;
    }
  });
  electron.ipcMain.handle("project:autosave", async (_event, project) => {
    const directory = path.dirname(autosavePath);
    await promises.mkdir(directory, { recursive: true });
    const temporaryPath = `${autosavePath}.tmp`;
    await promises.writeFile(temporaryPath, JSON.stringify(project), "utf8");
    await promises.rename(temporaryPath, autosavePath);
    return { saved: true };
  });
  electron.ipcMain.handle("project:save", async (_event, project) => {
    const result = await electron.dialog.showSaveDialog({
      title: "프로젝트 저장",
      defaultPath: "나의-숏드라마.rea-drama.json",
      filters: [{ name: "REA Drama Project", extensions: ["rea-drama.json", "json"] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await promises.writeFile(result.filePath, JSON.stringify(project, null, 2), "utf8");
    return { canceled: false, filePath: result.filePath };
  });
  electron.ipcMain.handle("project:open", async () => {
    const result = await electron.dialog.showOpenDialog({
      title: "프로젝트 열기",
      properties: ["openFile"],
      filters: [{ name: "REA Drama Project", extensions: ["json"] }]
    });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    const filePath = result.filePaths[0];
    const contents = await promises.readFile(filePath, "utf8");
    return { canceled: false, filePath, contents };
  });
  electron.ipcMain.handle("project:export-text", async (_event, text, format) => {
    const extension = ["md", "txt", "html"].includes(format) ? format : "md";
    const label = extension === "html" ? "HTML" : extension === "txt" ? "Text" : "Markdown";
    const result = await electron.dialog.showSaveDialog({
      title: "제작 문서 내보내기",
      defaultPath: `숏드라마-제작안.${extension}`,
      filters: [{ name: label, extensions: [extension] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await promises.writeFile(result.filePath, text, "utf8");
    return { canceled: false, filePath: result.filePath };
  });
}
electron.app.whenReady().then(() => {
  electron.Menu.setApplicationMenu(null);
  registerProjectFileHandlers();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  electron.app.quit();
});
