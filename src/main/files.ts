import * as chokidar from "chokidar";
import { access, appendFile, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { callRenderer } from "./ipc/send_ipc";

let file!: string;

export async function setupFiles(inputFile: string) {
  file = inputFile;

  // Create the file if it doesn't exist.
  try {
    await access(file);
  } catch (err) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "");
  }
}

export async function loadInitial(): Promise<string[]> {
  // Watch for future changes.
  setupFileWatch();

  return (await readFile(file))
    .toString()
    .split("\n")
    .filter((line) => line !== "");
}

let watcher: chokidar.FSWatcher | null = null;

/** Notifies renderer if a file changes (besides one we just wrote). */
function setupFileWatch() {
  watcher = chokidar.watch(file, {
    ignoreInitial: true,
  });
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  watcher.on("add", onFileChange);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  watcher.on("change", onFileChange);
}

export async function stopFileWatch(): Promise<void> {
  if (watcher !== null) await watcher.close();
}

async function onFileChange(): Promise<void> {
  if (ignoreNextChange) {
    ignoreNextChange = false;
    return;
  }

  const newLines = (await readFile(file))
    .toString()
    .split("\n")
    .filter((line) => line !== "");
  callRenderer("onFileChange", newLines);
}

let saveInProgress = false;
let ignoreNextChange = false;
/**
 *
 * @param savedState
 * @param localChange Whether the state has changed due to local operations
 * (else it has just changed by merging files).
 * If false, only latestFile is written, to prevent back-and-forth saves
 * when multiple users are online.
 * @throws If called when another save() is already in progress.
 * Currently, the renderer's load_doc.ts ensures that it does not call this twice, but
 * we will have to refactor that if we end up calling this elsewhere.
 */
export async function save(newLines: string[]): Promise<void> {
  if (saveInProgress) {
    throw new Error("save() already in progress");
  }

  try {
    saveInProgress = true;
    ignoreNextChange = true;

    console.log(`Saving to ${file}...`);

    await appendFile(file, "\n" + newLines.join("\n"));

    console.log("Done.");
  } finally {
    saveInProgress = false;
  }
}
