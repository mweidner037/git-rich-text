import { setupReceiveIpc } from "./receive_ipc";
import { callMain } from "./send_ipc";

setupReceiveIpc();

void (async () => {
  // TODO: replace below with renderer code
  console.log("hello from renderer process");
  const response = await callMain("echo", "test message");
  console.log(response);
})();
