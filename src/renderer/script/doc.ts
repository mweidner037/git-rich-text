import * as collabs from "@collabs/collabs";
import { onFileChange, onSignalClose } from "./ipc/receive_ipc";
import { callMain } from "./ipc/send_ipc";

const SAVE_INTERVAL = 5000;

const noGrowAtEnd = [
  // Links (Peritext Example 9)
  "link",
  // Paragraph-level (\n) formatting: should only apply to the \n, not
  // extend to surrounding chars.
  "header",
  "blockquote",
  "code-block",
  "list",
  "indent",
];

export class RichTextDoc extends collabs.AbstractDoc {
  readonly text: collabs.CRichText;

  constructor(options?: collabs.RuntimeOptions) {
    super(options);

    this.text = this.runtime.registerCollab(
      "text",
      (init) => new collabs.CRichText(init, { noGrowAtEnd })
    );
  }
}

function makeInitialSave(): Uint8Array {
  const doc = new RichTextDoc({ debugReplicaID: "INIT" });
  doc.transact(() => doc.text.insert(0, "\n", {}));
  return doc.save();
}

/**
 * Sets up the RichTextDoc, including loading its initial state
 * (before returning) and scheduling future loads & saves.
 *
 * Since the returned doc has some state already, you need to
 * explicitly sync that state to your GUI (can't rely on events
 * like for future changes).
 */
export async function setupDoc(): Promise<RichTextDoc> {
  const doc = new RichTextDoc();
  // "Set the initial state"
  // (a single "\n", required by Quill) by
  // loading it from a separate doc.
  doc.load(makeInitialSave());

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
