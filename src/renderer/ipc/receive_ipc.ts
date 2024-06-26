import { IpcRendererEvent } from "electron";
import {
  IMainToRenderer,
  OnCallRendererInternalType,
} from "../../common/main_to_renderer";
import { callMain } from "./send_ipc";

declare global {
  interface Window {
    onCallRendererInternal: OnCallRendererInternalType;
  }
}

const mainToRenderer: IMainToRenderer = {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  signalClose: async function (): Promise<void> {
    if (signalCloseHandler) {
      try {
        await signalCloseHandler();
      } finally {
        await callMain("readyToClose");
      }
    }
  },
  onFileChange: function (allLines: string[]): void {
    if (fileChangeHandler) fileChangeHandler(allLines);
  },
};

function handleCallRenderer<K extends keyof IMainToRenderer & string>(
  _event: IpcRendererEvent,
  name: K,
  args: Parameters<IMainToRenderer[K]>
) {
  const method = mainToRenderer[name];
  if (method === undefined) {
    throw new Error("Not an IMainToRenderer method name: " + name);
  }
  // @ts-expect-error TypeScript gets confused by this, see https://github.com/microsoft/TypeScript/issues/47615
  return method(...args);
}

export function setupReceiveIpc() {
  window.onCallRendererInternal(handleCallRenderer);
}

let signalCloseHandler: (() => Promise<void>) | null = null;
export function onSignalClose(handler: () => Promise<void>): void {
  signalCloseHandler = handler;
}

let fileChangeHandler: ((allLines: string[]) => void) | null = null;
export function onFileChange(handler: (allLines: string[]) => void): void {
  fileChangeHandler = handler;
}
