import { Message } from "../common/messages";
import { setupReceiveIpc } from "./ipc/receive_ipc";
import { callMain } from "./ipc/send_ipc";
import { QuillWrapper } from "./quill_wrapper";

void (async function () {
  setupReceiveIpc();

  const initial = await callMain("loadInitial");
  new QuillWrapper(initial, onChange);
})();

function onChange(event: Message): void {
  // TODO
}
