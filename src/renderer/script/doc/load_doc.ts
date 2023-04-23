import { onFileChange, onSignalClose } from "../ipc/receive_ipc";
import { callMain } from "../ipc/send_ipc";
import { RichTextDoc } from "./rich_text_doc";

const SAVE_INTERVAL = 5000;

/**
 * Sets up the RichTextDoc, including loading its initial state
 * (before returning) and scheduling future loads & saves.
 *
 * Since the returned doc has some state already, you need to
 * explicitly sync that state to your GUI (can't rely on events
 * like for future changes).
 */
export async function loadDoc(): Promise<RichTextDoc> {
  const doc = RichTextDoc.new();

  // Load the initial state.
  const initialContents = await callMain("loadInitial");
  for (const [savedState] of initialContents) {
    doc.load(savedState);
  }

  // Save function.
  let savePending = true;
  let localChange = false;
  async function save() {
    if (savePending) {
      const localChangeCopy = localChange;
      savePending = false;
      localChange = false;
      console.log(`Saving...`);
      await callMain("save", doc.save(), localChangeCopy);
      console.log("Saved.");
    }
  }

  // Save the merged state now, after changes
  // (delayed by SAVE_INTERVAL), and on close.
  void save();
  doc.on("Transaction", (e) => {
    if (e.meta.isLocalOp) localChange = true;
    if (!savePending) {
      savePending = true;
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      setTimeout(save, SAVE_INTERVAL);
    }
  });
  onSignalClose(save);

  // Load files that change (presumably due to collaborators).
  onFileChange((savedState) => doc.load(savedState));

  return doc;
}
