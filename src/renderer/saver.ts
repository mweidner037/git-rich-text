import { TimestampFormatting } from "list-formatting";
import { BunchMeta, Order, Outline, Text } from "list-positions";
import { maybeRandomString } from "maybe-random-string";
import { WrapperOp } from "./quill_wrapper";
import { Update, UpdatePre } from "./updates";

export class Saver {
  readonly saverID: string;
  private idCounter = 0;

  // Instead of using WrapperOps directly as updates (high overhead),
  // we collect all of the ops for each save into one Update for
  // each op type.
  private pendingMetas: BunchMeta[];
  private readonly pendingSets: Text;
  private readonly pendingDeletes: Outline;
  private readonly pendingMarks: TimestampFormatting;

  constructor(readonly order: Order) {
    this.saverID = maybeRandomString({ length: 8 });

    this.pendingMetas = [];
    this.pendingSets = new Text(order);
    this.pendingDeletes = new Outline(order);
    this.pendingMarks = new TimestampFormatting(order);
  }

  /**
   * Records the given local ops. They will be included in the next
   * pendingLines() call.
   */
  recordLocalOps(ops: WrapperOp[]): void {
    for (const op of ops) {
      switch (op.type) {
        case "metas":
          this.pendingMetas.push(...op.metas);
          break;
        case "set":
          this.pendingSets.set(op.startPos, op.chars);
          break;
        case "delete":
          for (const pos of Order.startPosToArray(op.startPos, op.count ?? 1)) {
            if (this.pendingSets.has(pos)) {
              // Don't record the set at all.
              this.pendingSets.delete(pos);
            } else this.pendingDeletes.add(pos);
          }
          break;
        case "marks":
          for (const mark of op.marks) {
            this.pendingMarks.addMark(mark);
          }
          break;
      }
    }
  }

  /**
   * Converts the recorded local ops to lines and clears them.
   */
  pendingLines(): string[] {
    const lines: string[] = [];
    /**
     * @param isMeta Whether to mark the update as metadata in the log.
     * See the comment in `src/renderer/updates.ts`.
     */
    const addUpdate = (updatePre: UpdatePre, isMeta = false): void => {
      const update: Update = { id: this.nextID(), ...updatePre };
      lines.push((isMeta ? "meta " : "") + JSON.stringify(update));
    };

    if (this.pendingMetas.length !== 0) {
      addUpdate(
        {
          type: "metas",
          // OPT: compress (custom serializer)?
          metas: this.pendingMetas,
        },
        true
      );
      this.pendingMetas = [];
    }

    // OPT: activeMarks instead.
    const theMarks = [...this.pendingMarks.marks()];
    if (theMarks.length !== 0) {
      addUpdate({ type: "marks", marks: theMarks });
      this.pendingMarks.clear();
    }

    if (this.pendingSets.length !== 0) {
      addUpdate({ type: "sets", sets: this.pendingSets.save() });
      this.pendingSets.clear();
    }

    if (this.pendingDeletes.length !== 0) {
      addUpdate({
        type: "deletes",
        deletes: this.pendingDeletes.save(),
      });
      this.pendingDeletes.save();
    }

    return lines;
  }

  private nextID(): string {
    return `${this.saverID}_${this.idCounter++}`;
  }

  /**
   * Converts the given saved lines to WrapperOps so they can be loaded.
   */
  opsFromLines(lines: string[]): WrapperOp[] {
    const ops: WrapperOp[] = [];
    for (let line of lines) {
      // Strip off the "meta " at the start of metadata lines.
      if (line.startsWith("meta ")) {
        line = line.slice(5);
      }
      const update = JSON.parse(line) as Update;
      switch (update.type) {
        case "metas": {
          ops.push({ type: "metas", metas: update.metas });
          break;
        }
        case "sets": {
          // OPT: Go directly from saved state to items, skipping Text construction?
          // Likewise for deletes.
          const text = new Text(this.order);
          text.load(update.sets);
          for (const [startPos, chars] of text.items()) {
            ops.push({ type: "set", startPos, chars });
          }
          break;
        }
        case "deletes": {
          const outline = new Outline(this.order);
          outline.load(update.deletes);
          for (const [startPos, count] of outline.items()) {
            ops.push({ type: "delete", startPos, count });
          }
          break;
        }
        case "marks": {
          ops.push({ type: "marks", marks: update.marks });
          break;
        }
        default:
          console.error(`Unknown update type, skipping: "${line}"`);
      }
    }
    return ops;
  }
}
