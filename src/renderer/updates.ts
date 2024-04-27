import { TimestampMark } from "@list-positions/formatting";
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
 * The content of updates stored in the log.
 *
 * Each update is stored as one line in the log, JSON encoded.
 *
 * Optionally, an update may be marked as metadata, in which case its line
 * is prefixed with "meta ". The git merge driver treats these specially:
 * during cherry-picking, incoming metadata updates are appended to current
 * even if they are not in (incoming - base), in case other updates
 * depend on them. For this to be reasonable, updates marked as metadata
 * should not directly affect the user-visible state.
 */
export type Update = {
  /**
   * Include a unique ID in each update to ensure that they are all unique.
   */
  id: string;
} & UpdatePre;
