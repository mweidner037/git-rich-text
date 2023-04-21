import { IpcRendererEvent } from "electron";
import {
  IMainToRenderer,
  OnCallRendererInternalType,
} from "../../common/main_to_renderer";

declare global {
  interface Window {
    onCallRendererInternal: OnCallRendererInternalType;
  }
}

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

const mainToRenderer: IMainToRenderer = {
  tick: function (time: number, hello: string): void {
    console.log("tick " + time + ": " + hello);
  },
};
