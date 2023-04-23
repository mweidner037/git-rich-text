import { setupEditor } from "./components/editor";
import { setupDoc } from "./doc";
import { setupReceiveIpc } from "./ipc/receive_ipc";

setupReceiveIpc();

void (async function () {
  const doc = await setupDoc();
  setupEditor(doc);
})();
