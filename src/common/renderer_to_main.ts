interface AllPromises {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [name: string]: (...args: any[]) => Promise<any>;
}

/** All return types must be Promises (enforced by `extends AllPromises`). */
export interface IRendererToMain extends AllPromises {
  /** Reads the initial state and watches for future changes. */
  readInitial(): Promise<[savedState: Uint8Array][]>;
  write(savedState: Uint8Array): Promise<void>;
  readyToClose(): Promise<void>;
}

export type CallMainInternalType = <K extends keyof IRendererToMain & string>(
  name: K,
  ...args: Parameters<IRendererToMain[K]>
) => ReturnType<IRendererToMain[K]>;
