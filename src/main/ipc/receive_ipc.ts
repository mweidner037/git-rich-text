import { app, IpcMainInvokeEvent } from "electron";
import { IRendererToMain } from "../../common/renderer_to_main";
import { readInitial, write } from "../files";

export function handleCallMain<K extends keyof IRendererToMain & string>(
  _event: IpcMainInvokeEvent,
  name: K,
  args: Parameters<IRendererToMain[K]>
): ReturnType<IRendererToMain[K]> {
  const method = rendererToMain[name];
  if (method === undefined) {
    throw new Error("Not an IRendererToMain method name: " + name);
  }
  // @ts-expect-error TypeScript gets confused by this, see https://github.com/microsoft/TypeScript/issues/47615
  return method(...args);
}

// TODO: move elsewhere. Can't put in main.ts b/c circular dep.
// eslint-disable-next-line @typescript-eslint/require-await
async function readyToClose(): Promise<void> {
  app.quit();
}

const rendererToMain: IRendererToMain = {
  readInitial,
  write,
  readyToClose,
};
