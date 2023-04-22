import { setupEditor } from "./components/editor";
import { setupReceiveIpc } from "./ipc/receive_ipc";
import { callMain } from "./ipc/send_ipc";

setupReceiveIpc();

void (async function () {
  const initialContents = await callMain("readInitial");
  setupEditor(initialContents);

  // console.log("hello from renderer process");
  // const response = await callMain("echo", "test message");
  // console.log(response);
})();
