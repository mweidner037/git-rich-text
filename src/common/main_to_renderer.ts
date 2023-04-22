import { IpcRendererEvent } from "electron";

/**
 * All return types should be void (or rather, any
 * return values are ignored),)
 * since main->renderer communication is 1-way by default.
 */
export interface IMainToRenderer {
  signalClose(): void;
  // tick(time: number, hello: string): void;
}

export type OnCallRendererInternalType = (
  callback: <K extends keyof IMainToRenderer & string>(
    event: IpcRendererEvent,
    name: K,
    args: Parameters<IMainToRenderer[K]>
  ) => void
) => void;
