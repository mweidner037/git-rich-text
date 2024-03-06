import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { setupCloseBehavior } from "./close_behavior";
import { setupFiles } from "./files";
import { handleCallMain } from "./ipc/receive_ipc";
import { setupCallRenderer } from "./ipc/send_ipc";

if (process.argv.length < 3) {
  console.error("No file arg provided");
  process.exit(1);
}
const theFile = process.argv[2];
if (!theFile.endsWith(".clog")) {
  console.error("Not a .clog file: ", theFile);
  process.exit(2);
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  setupCallRenderer(win);
  setupCloseBehavior(win);
  void win.loadFile("build/renderer/index.html");
};

void app.whenReady().then(async () => {
  await setupFiles(theFile);
  ipcMain.handle("callMain", handleCallMain);
  createWindow();
});
