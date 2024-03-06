import { BunchNode, Position } from "list-positions";
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

  console.log("loadInitial...");
  const initialLines = await callMain("loadInitial");
  console.log("loaded");
  const quill = new QuillWrapper(onLocalOps, QuillWrapper.makeInitialState());
  const order = quill.richList.order;
  quill.applyOps(opsFromLines(initialLines));

  // Reloading
  onFileChange((allLines) => {
    console.log("Reloading...");
    // TODO: if it's a suffix of existing lines (fast-forward), just applyOps.
    const oldSel = quill.getSelection();
    quill.load(QuillWrapper.makeInitialState());
    quill.applyOps(opsFromLines(allLines));
    quill.setSelection(oldSel);
    console.log("reloaded");
  });

  // Saving
  window.onblur = () => {
    void save();
  };
  onSignalClose(save);

  const id = quill.richList.formatting.replicaID;
  let idCounter = 0;
  function pushLine(lines: string[], op: WrapperOp) {
    const lineID = id + "_" + idCounter++;
    lines.push(lineID + " " + JSON.stringify(op));
  }

  let pendingOps: WrapperOp[] = [];
  const deps = new Set<BunchNode>();

  function onLocalOps(ops: WrapperOp[]): void {
    for (const op of ops) {
      switch (op.type) {
        case "set":
          addDeps(op.startPos);
          break;
        case "delete":
          addDeps(op.pos);
          break;
        case "mark":
          addDeps(op.mark.start.pos);
          addDeps(op.mark.end.pos);
          break;
        default:
          continue;
      }
      pendingOps.push(op);
    }
  }

  let inSave = false;
  async function save(): Promise<void> {
    if (pendingOps.length === 0) return;
    if (inSave) return;

    console.log("saving...");

    const lines: string[] = [];
    // One line with all dependent metas.
    const metasOp: WrapperOp = {
      type: "metas",
      metas: [...deps.values()].map((node) => node.meta()),
    };
    pushLine(lines, metasOp);
    for (const op of pendingOps) pushLine(lines, op);

    pendingOps = [];
    deps.clear();

    inSave = true;
    try {
      await callMain("save", lines);
    } finally {
      inSave = false;
    }
    console.log("saved");
  }

  function addDeps(pos: Position) {
    let node = order.getNodeFor(pos);
    while (node.parent !== null) {
      if (deps.has(node)) return;
      deps.add(node);
      node = node.parent;
    }
  }
})();

function opsFromLines(lines: string[]): WrapperOp[] {
  return lines.map((line) => {
    const json = line.slice(line.indexOf(" ") + 1);
    return JSON.parse(json) as WrapperOp;
  });
}
