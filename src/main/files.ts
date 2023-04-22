import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import os from "os";
import path from "path";

const root = path.join(os.homedir(), "Dropbox/Files/filestore-rich-text-demo");

export async function readAll(): Promise<string[]> {
  try {
    const files = await readdir(root);
    const ans: string[] = [];
    for (const file of files) {
      try {
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

export async function write(file: string, data: string): Promise<void> {
  const thePath = path.join(root, file);
  await mkdir(path.dirname(thePath), { recursive: true });
  await writeFile(thePath, data, { encoding: "utf8" });
}

// TODO: notify renderer if a file changes (besides our own).
