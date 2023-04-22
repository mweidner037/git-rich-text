import * as chokidar from "chokidar";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { callRenderer } from "./ipc/send_ipc";

const root = path.join(os.homedir(), "Dropbox/Files/filestore-rich-text-demo");

export async function readAll(): Promise<string[]> {
  // Watch for future changes.
  // TODO: change readAll's name to reflect that it should be called
  // exactly once at beginning of the program.
  setupFileWatch();

  try {
    const files = await readdir(root);
    const ans: string[] = [];
    for (const file of files) {
      try {
        if (!file.endsWith(".json")) continue;
        const content = await readFile(path.join(root, file), {
          encoding: "utf8",
        });
        ans.push(content);
      } catch (err) {
        console.error(err);
        // Skip the file - might have been deleted in the meantime.
      }
    }
    return ans;
  } catch (err) {
    console.error(err);
    // Assume it was because the folder did not exist.
    return [];
  }
}

let watcher: chokidar.FSWatcher | null = null;
/** Used to prevent onFileChange calls for our own writes. */
let ourWrittenFile: string | null = null;

/** Notifies renderer if a file changes (besides one we just wrote). */
function setupFileWatch() {
  watcher = chokidar.watch(root, { ignoreInitial: true });
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  watcher.on("add", onFileChange);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  watcher.on("change", onFileChange);
}

export function stopFileWatch() {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  if (watcher !== null) watcher.close();
}

async function onFileChange(fullPath: string): Promise<void> {
  if (!fullPath.endsWith(".json")) return;
  if (ourWrittenFile !== null && fullPath.endsWith(ourWrittenFile)) return;

  console.log("onFileChange", fullPath);
  try {
    // Wait a moment for the change to hopefully finish.
    // TODO: skip if get new onFileChange; do JSON parsing here so we
    // can know when it succeeds.
    await new Promise((resolve) => setTimeout(resolve, 100));
    const content = await readFile(fullPath, {
      encoding: "utf8",
    });
    callRenderer("onFileChange", content);
  } catch (err) {
    console.error("Error reading file in onFileChange:");
    console.error(err);
  }
}

export async function write(file: string, data: string): Promise<void> {
  ourWrittenFile = file;

  const thePath = path.join(root, file);
  await mkdir(path.dirname(thePath), { recursive: true });
  await writeFile(thePath, data, { encoding: "utf8" });
  // Use an atomic write to avoid losing progress if we crash while writing?
  // writeFileAtomic seems to confuse Dropbox (interprets every change as
  // delete + re-add, causing annoying notification).
  // Also, would prefer if its temp files were hidden from Dropbox - e.g.
  // in /tmp or starting with ~.
  // await writeFileAtomic(thePath, data, { encoding: "utf8" });
}
