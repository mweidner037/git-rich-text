import { IpcMainInvokeEvent } from "electron";
import { IRendererToMain } from "../common/renderer_to_main";

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
  // eslint-disable-next-line @typescript-eslint/require-await
  async echo(val: string) {
    return "You said: " + val;
  },
  async move(x: number, y: number) {
    // TODO
  },
};
