import { Order } from "list-positions";
import {
  onFileChange,
  onSignalClose,
  setupReceiveIpc,
} from "./ipc/receive_ipc";
import { callMain } from "./ipc/send_ipc";
import { QuillWrapper } from "./quill_wrapper";
import { Saver } from "./saver";

void (async function () {
  setupReceiveIpc();

  console.log("loadInitial...");
  const initialLines = await callMain("loadInitial");
  console.log("loaded");

  const order = new Order();
  const saver = new Saver(order);
  const quill = new QuillWrapper(
    (ops) => saver.recordLocalOps(ops),
    QuillWrapper.makeInitialState(),
    order
  );

  quill.applyOps(saver.opsFromLines(initialLines));

  // Reloading
  onFileChange((allLines) => {
    console.log("Reloading...");
    // OPT: if it's a suffix of existing lines (fast-forward), just applyOps.
    const oldSel = quill.getSelection();
    quill.load(QuillWrapper.makeInitialState());
    quill.applyOps(saver.opsFromLines(allLines));
    quill.setSelection(oldSel);
    console.log("reloaded");
  });

  // Saving
  window.onblur = () => {
    void save();
  };
  onSignalClose(save);

  let inSave = false;
  async function save(): Promise<void> {
    if (inSave) return;

    inSave = true;
    try {
      console.log("saving...");
      const lines = saver.pendingLines();
      if (lines.length === 0) {
        console.log("skipped");
        return;
      }
      await callMain("save", lines);
      console.log("saved");
    } finally {
      inSave = false;
    }
  }
})();