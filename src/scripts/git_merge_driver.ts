import fs from "fs";
import readline from "readline/promises";

void (async function () {
  const args = process.argv.slice(2);

  const currentFile = args[0];
  const baseFile = args[1];
  const incomingFile = args[2];

  const current = await getEvents(currentFile);
  // const base = await getEvents(baseFile);
  const incoming = await getEvents(incomingFile);

  // Append to current all events in (incoming - current).
  // TODO: handle reversions (delete events in base - incoming).
  const appendStream = fs.createWriteStream(currentFile, { flags: "a" });
  for (const [id, line] of incoming.entries()) {
    if (!current.has(id)) {
      appendStream.write("\n" + line);
    }
  }
  appendStream.end();
})();

async function getEvents(file: string): Promise<Map<string, string>> {
  const ans = new Map<string, string>();
  const rl = readline.createInterface(fs.createReadStream(file));
  for await (const line of rl) {
    if (line === "") continue;
    const id = line.slice(0, line.indexOf(" "));
    ans.set(id, line);
  }
  rl.close();
  return ans;
}
