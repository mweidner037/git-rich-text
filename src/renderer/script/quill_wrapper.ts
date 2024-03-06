/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Quill, { DeltaStatic, Delta as DeltaType } from "quill";

// Quill CSS.
import {
  FormattedValues,
  RichList,
  RichListSavedState,
  sliceFromSpan,
} from "list-formatting";
import { BunchMeta, Order, Position } from "list-positions";
import "quill/dist/quill.snow.css";
import { WrapperOp } from "../../common/ops";

const Delta: typeof DeltaType = Quill.import("delta");

export type Selection = {
  start: Position;
  end: Position;
};

export class QuillWrapper {
  readonly editor: Quill;
  /**
   * Instead of editing this directly, use the applyOps method.
   */
  readonly richList: RichList<string>;

  private ourChange = false;

  constructor(
    /**
     * Called when the local user performs ops, which need to be synchronized
     * to other replicas.
     *
     * When a single user action produces multiple ops (e.g., meta + set + mark),
     * they are passed together as an array.
     */
    readonly onLocalOps: (ops: WrapperOp[]) => void,
    /**
     * Must end in "\n" to match Quill, even if otherwise empty.
     *
     * Okay if marks are not in compareMarks order (weaker than RichListSavedState reqs).
     */
    initialState: RichListSavedState<string>
  ) {
    this.richList = new RichList({ expandRules });

    // Setup Quill.
    const editorContainer = document.getElementById("editor") as HTMLDivElement;
    this.editor = new Quill(editorContainer, {
      theme: "snow",
      modules: {
        toolbar: [
          ["bold", "italic"],
          [{ header: "1" }, { header: "2" }],
          [{ list: "ordered" }, { list: "bullet" }],
        ],
        history: {
          userOnly: true,
        },
      },
      formats: ["bold", "italic", "header", "list"],
    });

    // Load initial state.
    this.load(initialState);

    // Sync Quill changes to our local state and to the consumer.
    this.editor.on("text-change", (delta) => {
      // Filter our own applyOps changes.
      if (this.ourChange) return;

      const wrapperOps: WrapperOp[] = [];
      for (const deltaOp of getRelevantDeltaOperations(delta)) {
        // Insertion
        if (deltaOp.insert) {
          if (typeof deltaOp.insert === "string") {
            const quillAttrs = deltaOp.attributes ?? {};
            const formattingAttrs = Object.fromEntries(
              [...Object.entries(quillAttrs)].map(quillAttrToFormatting)
            );
            const [startPos, createdBunch, createdMarks] =
              this.richList.insertWithFormat(
                deltaOp.index,
                formattingAttrs,
                ...deltaOp.insert
              );
            if (createdBunch) {
              // Push meta op first to avoid missing BunchMeta deps.
              wrapperOps.push({ type: "metas", metas: [createdBunch] });
            }
            wrapperOps.push({ type: "set", startPos, chars: deltaOp.insert });
            for (const mark of createdMarks) {
              wrapperOps.push({
                type: "mark",
                mark,
              });
            }
          } else {
            // Embed of object
            throw new Error("Embeds not supported");
          }
        }
        // Deletion
        else if (deltaOp.delete) {
          const toDelete = [
            ...this.richList.list.positions(
              deltaOp.index,
              deltaOp.index + deltaOp.delete
            ),
          ];
          for (const pos of toDelete) {
            this.richList.list.delete(pos);
            wrapperOps.push({
              type: "delete",
              startPos: pos,
            });
          }
        }
        // Formatting
        else if (deltaOp.attributes && deltaOp.retain) {
          for (const [quillKey, quillValue] of Object.entries(
            deltaOp.attributes
          )) {
            const [key, value] = quillAttrToFormatting([quillKey, quillValue]);
            const [mark] = this.richList.format(
              deltaOp.index,
              deltaOp.index + deltaOp.retain,
              key,
              value
            );
            wrapperOps.push({
              type: "mark",
              mark,
            });
          }
        }
      }

      if (wrapperOps.length !== 0) this.onLocalOps(wrapperOps);
    });
  }

  /**
   * Applies the given ops to the Quill state.
   *
   * They will all be applied to the state together,
   * in one editor.updateContents call.
   *
   * Redundant ops are okay (will do nothing).
   */
  applyOps(wrapperOps: WrapperOp[]): void {
    this.ourChange = true;
    try {
      // To defend against reordering within the same applyOps call, process
      // "meta" ops first in a batch.
      const allMetas: BunchMeta[] = [];
      for (const op of wrapperOps) {
        if (op.type === "metas") {
          allMetas.push(...op.metas);
        }
      }
      this.richList.order.receive(allMetas);

      // Process the non-"meta" ops.
      let pendingDelta: DeltaStatic = new Delta();
      for (const op of wrapperOps) {
        switch (op.type) {
          case "metas":
            break;
          case "set":
            // TODO: doesn't support updates, only initial sets (or redundant copies);
            // also, assumes sets are in causal order, so the positions are still together
            // and have the same format.
            // Ideal solution would be to consider the general case, then opt
            // list.set so that it is not much slower to call it one-by-one
            // & post-batch the result for Quill. (What about getting the format?
            // I guess could use slice args.)
            if (!this.richList.list.has(op.startPos)) {
              this.richList.list.set(op.startPos, ...op.chars);
              const startIndex = this.richList.list.indexOfPosition(
                op.startPos
              );
              const format = this.richList.formatting.getFormat(op.startPos);
              pendingDelta = pendingDelta.compose(
                new Delta()
                  .retain(startIndex)
                  .insert(op.chars, formattingToQuillAttr(format))
              );
            }
            break;
          case "delete":
            for (const pos of Order.startPosToArray(
              op.startPos,
              op.count ?? 1
            )) {
              if (this.richList.list.has(pos)) {
                const index = this.richList.list.indexOfPosition(pos);
                this.richList.list.delete(pos);
                pendingDelta = pendingDelta.compose(
                  new Delta().retain(index).delete(1)
                );
              }
            }
            break;
          case "mark": {
            const changes = this.richList.formatting.addMark(op.mark);
            for (const change of changes) {
              const { startIndex, endIndex } = sliceFromSpan(
                this.richList.list,
                change.start,
                change.end
              );
              pendingDelta = pendingDelta.compose(
                new Delta()
                  .retain(startIndex)
                  .retain(
                    endIndex - startIndex,
                    formattingToQuillAttr({ [change.key]: change.value })
                  )
              );
            }
            break;
          }
          default:
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore https://github.com/microsoft/TypeScript/issues/9838
            throw new Error("Unknown WrapperOp type: " + op.type);
        }
      }

      if (pendingDelta.ops!.length !== 0) {
        this.editor.updateContents(pendingDelta);
      }
    } finally {
      this.ourChange = false;
    }
  }

  /**
   * Loads the given state, *overwriting* the current state.
   *
   * Note: Order is not cleared, just appended.
   */
  load(savedState: RichListSavedState<string>): void {
    this.ourChange = true;
    try {
      // Clear existing state.
      this.richList.clear();
      this.editor.setContents(new Delta());

      // Load initial state into richList.
      this.richList.order.load(savedState.order);
      this.richList.list.load(savedState.list);
      // initialState.marks is not a saved state; add directly.
      for (const mark of savedState.formatting) {
        this.richList.formatting.addMark(mark);
      }
      if (
        this.richList.list.length === 0 ||
        this.richList.list.getAt(this.richList.list.length - 1) !== "\n"
      ) {
        throw new Error('Bad initial state: must end in "\n" to match Quill');
      }

      // Sync initial state to Quill.
      this.editor.updateContents(
        deltaFromSlices(this.richList.formattedValues())
      );
      // Delete Quill's own initial "\n" - the initial state is supposed to end with one.
      this.editor.updateContents(
        new Delta().retain(this.richList.list.length).delete(1)
      );
    } finally {
      this.ourChange = false;
    }
  }

  getSelection(): Selection | null {
    const quillSel = this.editor.getSelection();
    return quillSel === null
      ? null
      : {
          start: this.richList.list.cursorAt(quillSel.index),
          end: this.richList.list.cursorAt(quillSel.index + quillSel.length),
        };
  }

  setSelection(sel: Selection | null): void {
    if (sel === null) {
      // Set fake selection for later.
      this.editor.setSelection(0, 0);
      this.editor.blur();
    } else {
      const startIndex = this.richList.list.indexOfCursor(sel.start);
      const endIndex = this.richList.list.indexOfCursor(sel.end);
      this.editor.setSelection({
        index: startIndex,
        length: endIndex - startIndex,
      });
    }
  }

  /**
   * Fake initial saved state that's identical on all replicas: a single
   * "\n", to match Quill's initial state.
   */
  static makeInitialState() {
    const richList = new RichList<string>({
      order: new Order({ newBunchID: () => "INIT" }),
    });
    richList.list.insertAt(0, "\n");
    return richList.save();
  }
}

/**
 * Expand arg for the given format key's mark/unmark op.
 *
 * Default for inline formatting is "after"/"after".
 *
 * For links, instead use "none"/"both" (Peritext example 9).
 *
 * We also set all block formats to "none"/"none" for a Quill-specific reason:
 * Quill doesn't let a block format apply to a non-"\n", so a block format
 * shouldn't expand to neighboring non-"\n" chars (otherwise, we have to do
 * extra unmark ops).
 */
function expandRules(
  key: string,
  value: any
): "none" | "before" | "after" | "both" {
  switch (key) {
    case "block":
    case "indent":
    case "align":
    case "direction":
      return "none";
    case "link":
      return value !== null ? "none" : "both";
    default:
      return "after";
  }
}

/**
 * Convert delta.ops into an array of modified DeltaOperations
 * having the form { index: first char index, ...DeltaOperation },
 * leaving out ops that do nothing.
 */
function getRelevantDeltaOperations(delta: DeltaStatic): {
  index: number;
  insert?: string | object;
  delete?: number;
  attributes?: Record<string, any>;
  retain?: number;
}[] {
  if (delta.ops === undefined) return [];
  const relevantOps = [];
  let index = 0;
  for (const op of delta.ops) {
    if (op.retain === undefined || op.attributes) {
      relevantOps.push({ index, ...op });
    }
    // Adjust index for the next op.
    if (op.insert !== undefined) {
      if (typeof op.insert === "string") index += op.insert.length;
      else index += 1; // Embed
    } else if (op.retain !== undefined) index += op.retain;
    // Deletes don't add to the index because we'll do the
    // next operation after them, hence the text will already
    // be shifted left.
  }
  return relevantOps;
}

function deltaFromSlices(slices: FormattedValues<string>[]) {
  let delta = new Delta();
  for (const values of slices) {
    delta = delta.insert(
      values.values.join(""),
      formattingToQuillAttr(values.format)
    );
  }
  return delta;
}

/**
 * These formats are exclusive; we need to pass only one at a time to Quill or
 * the result is inconsistent.
 * So, we wrap them in our own "block" formatting attribute:
 * { block: [key, value] }.
 */
const exclusiveBlocks = new Set(["blockquote", "header", "list", "code-block"]);

/**
 * Converts a Quill formatting attr (key/value pair) to the format
 * we store in Formatting.
 */
function quillAttrToFormatting(
  attr: [key: string, value: any]
): [key: string, value: any] {
  const [key, value] = attr;
  if (exclusiveBlocks.has(key)) {
    // Wrap it in our own "block" formatting attribute.
    // See the comment above exclusiveBlocks.
    if (value === null) return ["block", null];
    else return ["block", JSON.stringify([key, value])];
  } else {
    return [key, value];
  }
}

/**
 * Inverse of quillAttrToFormatting, except acting on a whole object at a time.
 */
function formattingToQuillAttr(
  attrs: Record<string, any>
): Record<string, any> {
  const ret: Record<string, any> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "block") {
      if (value === null) {
        // Instead of figuring out which block key is being unmarked,
        // just ask Quill to unmark all of them.
        for (const blockKey of exclusiveBlocks) ret[blockKey] = null;
      } else {
        const [quillKey, quillValue] = JSON.parse(value) as [string, any];
        ret[quillKey] = quillValue;
      }
    } else ret[key] = value;
  }
  return ret;
}
