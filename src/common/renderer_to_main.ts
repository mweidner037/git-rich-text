export interface AllPromises {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [name: string]: (...args: any[]) => Promise<any>;
}

/** All return types must be Promises (enforced in main/ipc/recieve_ipc.ts
 * by using the type `IRendererToMain & AllPromises`). */
export interface IRendererToMain {
  /** Reads the initial state and watches for future changes. */
  loadInitial(): Promise<string[]>;
  save(newState: string[]): Promise<void>;
  readyToClose(): Promise<void>;
}

export type CallMainInternalType = <K extends keyof IRendererToMain & string>(
  name: K,
  ...args: Parameters<IRendererToMain[K]>
) => ReturnType<IRendererToMain[K]>;
