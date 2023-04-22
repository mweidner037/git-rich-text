import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { handleCallMain } from "./receive_ipc";
import { callRenderer, setupCallRenderer } from "./send_ipc";

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
  win.on("close", (e) => {
    if (!sentCloseSignal) {
      sentCloseSignal = true;
      e.preventDefault();
      callRenderer("signalClose");
    }
  });
};

// app.on("window-all-closed", () => {
//   app.quit();
// });

void app.whenReady().then(() => {
  ipcMain.handle("callMain", handleCallMain);
  createWindow();

  // setTimeout(() => callRenderer("tick", Date.now(), "from main"), 1000);
});
