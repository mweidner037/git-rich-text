import fs from "fs";
import readline from "readline/promises";

void (async function () {
  const args = process.argv.slice(2);

  const currentFile = args[0];
  const baseFile = args[1];
  const incomingFile = args[2];

  // console.log(
  //   "\n\nCURRENT" +
  //     fs.readFileSync(currentFile) +
  //     "\n\nBASE\n\n" +
  //     fs.readFileSync(baseFile) +
  //     "\n\nINCOMING\n\n" +
  //     fs.readFileSync(incomingFile)
  // );

  const current = await readUpdates(currentFile);
  const base = await readUpdates(baseFile);
  const incoming = await readUpdates(incomingFile);

  // Append to current all updates in (incoming - base) that are not already
  // in current. (Since base is not a subset of current during cherry-picking,
  // we can't use (incoming - current).)
  // Also append to current all updates in base that start with "meta ", as described
  // in `src/renderer/updates.ts`.
  // TODO: handle reversions (delete updates in base - incoming)?
  const appendStream = fs.createWriteStream(currentFile, { flags: "a" });
  for (const update of incoming) {
    if (!current.has(update)) {
      if (update.startsWith("meta ") || !base.has(update)) {
        appendStream.write("\n" + update);
      }
    }
  }
  appendStream.end();
})();

/**
 * Reads all of the updates (lines) from file into a Set, in log order.
 */
async function readUpdates(file: string): Promise<Set<string>> {
  const updates = new Set<string>();
  const rl = readline.createInterface(fs.createReadStream(file));
  for await (const line of rl) {
    if (line === "") continue;
    updates.add(line);
  }
  rl.close();
  return updates;
}
