import { WrapperOp } from "../../common/ops";
import {
  onFileChange,
  onSignalClose,
  setupReceiveIpc,
} from "./ipc/receive_ipc";
import { callMain } from "./ipc/send_ipc";
import { QuillWrapper } from "./quill_wrapper";

void (async function () {
  setupReceiveIpc();

  const initialLines = await callMain("loadInitial");
  const quill = new QuillWrapper(onLocalOps, QuillWrapper.makeInitialState());
  quill.applyOps(opsFromLines(initialLines));

  // Loading
  onFileChange((newEvents) => {
    quill.applyOps(opsFromLines(newEvents));
  });

  // Saving
  window.onblur = () => {
    void save();
  };
  onSignalClose(save);

  const id = quill.richList.formatting.replicaID;
  let idCounter = 0;

  let pendingOps: WrapperOp[] = [];

  function onLocalOps(ops: WrapperOp[]): void {
    pendingOps.push(...ops);
  }

  let inSave = false;
  async function save(): Promise<void> {
    if (pendingOps.length === 0) return;
    if (inSave) return;

    console.log("saving...");

    const lines = pendingOps.map((op) => {
      const lineID = id + "_" + idCounter++;
      return lineID + " " + JSON.stringify(op);
    });
    pendingOps = [];

    inSave = true;
    try {
      await callMain("save", lines);
    } finally {
      inSave = false;
    }
    console.log("saved");
  }
})();

function opsFromLines(lines: string[]): WrapperOp[] {
  return lines.map((line) => {
    const json = line.slice(line.indexOf(" ") + 1);
    return JSON.parse(json) as WrapperOp;
  });
}
