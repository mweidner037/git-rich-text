import { IpcRendererEvent } from "electron";

/**
 * All return types should be void (or rather, any
 * return values are ignored),)
 * since main->renderer communication is 1-way by default.
 */
export interface IMainToRenderer {
  /**
   * Called when the app is about to close.
   *
   * Triggers a final save (if needed) and then calls
   * IRendererToMain.readyToClose().
   */
  signalClose(): void;
  /**
   * Called when the file changes on disk (not by us)
   * with its new content.
   */
  onFileChange(allLines: string[]): void;
}

export type OnCallRendererInternalType = (
  callback: <K extends keyof IMainToRenderer & string>(
    event: IpcRendererEvent,
    name: K,
    args: Parameters<IMainToRenderer[K]>
  ) => void
) => void;
