import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { stopFileWatch } from "./files";
import { handleCallMain } from "./ipc/receive_ipc";
import { callRenderer, setupCallRenderer } from "./ipc/send_ipc";

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  setupCallRenderer(win);
  void win.loadFile("build/renderer/index.html");

  // On close, inform the window so it can save, and wait
  // for it to finish saving before quitting.
  let sentCloseSignal = false;
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  win.on("close", async (e) => {
    if (!sentCloseSignal) {
      sentCloseSignal = true;
      e.preventDefault();
      await stopFileWatch();
      callRenderer("signalClose");
    }
  });
};

void app.whenReady().then(() => {
  ipcMain.handle("callMain", handleCallMain);
  createWindow();
});
