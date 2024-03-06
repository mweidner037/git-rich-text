import * as chokidar from "chokidar";
import { access, appendFile, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

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
  // Watch for future changes. TODO
  // setupFileWatch();

  const lines = (await readFile(file)).toString();
  return lines.split("\n").filter((line) => line !== "");
}

let watcher: chokidar.FSWatcher | null = null;

// TODO
// /** Notifies renderer if a file changes (besides one we just wrote). */
// function setupFileWatch() {
//   watcher = chokidar.watch(root, {
//     ignoreInitial: true,
//     // To reduce the change of reading a file while it's being written
//     // (which readOne skips harmlessly but wastes time reading), wait
//     // for its size to stay steady for 200 ms before emitting a change event.
//     awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
//   });
//   // eslint-disable-next-line @typescript-eslint/no-misused-promises
//   watcher.on("add", onFileChange);
//   // eslint-disable-next-line @typescript-eslint/no-misused-promises
//   watcher.on("change", onFileChange);
// }

export async function stopFileWatch(): Promise<void> {
  if (watcher !== null) await watcher.close();
}

// async function onFileChange(fullPath: string): Promise<void> {
//   // Skip the files that (only) we write.
//   const normalized = path.normalize(fullPath);
//   if (normalized === ourFile || normalized === latestFile) return;

//   const content = await readContent(normalized);
//   if (content === null) return;

//   console.log("onFileChange", normalized);
//   callRenderer("onFileChange", Bytes.parse(content.savedState));
// }

let saveInProgress = false;
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
export async function save(newEvents: string[]): Promise<void> {
  if (saveInProgress) {
    throw new Error("save() already in progress");
  }

  try {
    saveInProgress = true;

    console.log(`Saving to ${file}...`);

    await appendFile(file, "\n" + newEvents.join("\n"));

    console.log("Done.");
  } finally {
    saveInProgress = false;
  }
}
