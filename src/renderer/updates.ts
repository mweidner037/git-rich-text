import { TimestampMark } from "list-formatting";
import { BunchMeta, OutlineSavedState, TextSavedState } from "list-positions";

export type UpdatePre =
  | { type: "metas"; metas: BunchMeta[] }
  | {
      type: "sets";
      sets: TextSavedState;
    }
  | { type: "deletes"; deletes: OutlineSavedState }
  | { type: "marks"; marks: TimestampMark[] };

/**
 * The type of updates stored in the log (as JSON lines).
 */
export type Update = {
  /**
   * Include a unique ID in each update to ensure that they are all unique.
   */
  id: string;
} & UpdatePre;
