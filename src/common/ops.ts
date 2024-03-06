import { TimestampMark } from "list-formatting";
import { BunchMeta, Position } from "list-positions";

/**
 * An operation that can be performed on the QuillWrapper or emitted by it.
 */
export type WrapperOp =
  | {
      type: "set";
      startPos: Position;
      chars: string;
    }
  | {
      type: "delete";
      startPos: Position;
      count?: number;
    }
  | {
      type: "metas";
      metas: BunchMeta[];
    }
  | { type: "mark"; mark: TimestampMark };
