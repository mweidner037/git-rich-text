import { app, IpcMainInvokeEvent } from "electron";
import { IRendererToMain } from "../../common/renderer_to_main";
import { readAll, write } from "../files";

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

const rendererToMain: IRendererToMain = {
  readAll: function (): Promise<string[]> {
    return readAll();
  },
  write: function (file: string, data: string): Promise<void> {
    return write(file, data);
  },
  // eslint-disable-next-line @typescript-eslint/require-await
  readyToClose: async function (): Promise<void> {
    app.quit();
  },
};
