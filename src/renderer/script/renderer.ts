import { TimestampFormatting } from "list-formatting";
import { BunchNode, List, Order, Outline } from "list-positions";
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

  const pendingSets = new List<string>(order);
  const pendingDeletes = new Outline(order);
  const pendingMarks = new TimestampFormatting(order);

  function onLocalOps(ops: WrapperOp[]): void {
    for (const op of ops) {
      switch (op.type) {
        case "set":
          pendingSets.set(op.startPos, ...op.chars);
          break;
        case "delete":
          for (const pos of Order.startPosToArray(op.startPos, op.count ?? 1)) {
            if (pendingSets.has(pos)) {
              // Don't record the set at all.
              pendingSets.delete(pos);
            } else pendingDeletes.add(pos);
          }
          break;
        case "mark":
          pendingMarks.addMark(op.mark);
          break;
        default:
          continue;
      }
    }
  }

  let inSave = false;
  async function save(): Promise<void> {
    if (inSave) return;

    // TODO: activeMarks instead.
    const theMarks = [...pendingMarks.marks()];
    if (
      pendingSets.length === 0 &&
      pendingDeletes.length === 0 &&
      theMarks.length === 0
    ) {
      return;
    }

    console.log("saving...");

    const lines: string[] = [];

    // One line with all dependent metas.
    // TODO: use list/outline get-deps method instead.
    const deps = new Set<BunchNode>();
    const setsSaved = pendingSets.save();
    // TODO: don't need deps for deletes; make List/Outline.delete tolerage missing deps.
    const deletesSaved = pendingDeletes.save();
    for (const bunchID of Object.keys(setsSaved)) {
      addDeps(deps, order.getNode(bunchID)!);
    }
    for (const bunchID of Object.keys(deletesSaved)) {
      addDeps(deps, order.getNode(bunchID)!);
    }
    for (const mark of theMarks) {
      addDeps(deps, order.getNodeFor(mark.start.pos));
      addDeps(deps, order.getNodeFor(mark.end.pos));
    }

    const metasOp: WrapperOp = {
      type: "metas",
      metas: [...deps.values()].map((node) => node.meta()),
    };
    pushLine(lines, metasOp);

    // Lines for sets, deletes, and marks. Bulk where possible.
    // TODO: use direct methods on List/Outline instead of save().
    for (const [bunchID, arr] of Object.entries(setsSaved)) {
      let innerIndex = 0;
      for (let i = 0; i < arr.length; i++) {
        if (i % 2 === 0) {
          const item = arr[i] as string[];
          if (item.length === 0) continue;
          pushLine(lines, {
            type: "set",
            startPos: { bunchID, innerIndex },
            chars: item.join(""),
          });
          innerIndex += item.length;
        } else innerIndex += arr[i] as number;
      }
    }
    for (const [bunchID, arr] of Object.entries(deletesSaved)) {
      let innerIndex = 0;
      for (let i = 0; i < arr.length; i++) {
        if (i % 2 === 0) {
          if (arr[i] === 0) continue;
          pushLine(lines, {
            type: "delete",
            startPos: { bunchID, innerIndex },
            count: arr[i],
          });
        }
        innerIndex += arr[i];
      }
    }
    for (const mark of theMarks) {
      pushLine(lines, {
        type: "mark",
        mark,
      });
    }

    pendingSets.clear();
    pendingDeletes.clear();
    pendingMarks.clear();

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

function addDeps(deps: Set<BunchNode>, node: BunchNode) {
  while (node.parent !== null) {
    if (deps.has(node)) return;
    deps.add(node);
    node = node.parent;
  }
}
