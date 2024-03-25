import { app, BrowserWindow } from "electron";
import path from "path";
import { setupCloseBehavior } from "./close_behavior";
import { setupFiles } from "./files";
import { setupReceiveIpc } from "./ipc/receive_ipc";
import { setupSendIpc } from "./ipc/send_ipc";

if (process.argv.length < 3) {
  console.error("No file arg provided");
  process.exit(1);
}
const theFile = process.argv[2];
if (!theFile.endsWith(".clog")) {
  console.error("Not a .clog file: ", theFile);
  process.exit(2);
}

void app
  .whenReady()
  .then(async () => {
    // Call this first b/c it checks if the file is accessible.
    await setupFiles(theFile);

    const win = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
    });
    setupReceiveIpc();
    setupSendIpc(win);
    setupCloseBehavior(win);

    void win.loadFile("build/renderer/index.html");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
