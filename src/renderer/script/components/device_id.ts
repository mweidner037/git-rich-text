import * as collabs from "@collabs/collabs";

/**
 * Returns a deviceID, unique among concurrently-running processes
 * but consistent across restarts. Used for the filename in the
 * conflicts folder.
 *
 * We try to keep it consistent to prevent too many files.
 */
export function getDeviceID(): string {
  // TODO: if multiple windows are open, each needs a different
  // deviceID.
  let deviceID = window.localStorage.getItem("deviceID");
  if (deviceID === null) {
    // Choose a random new ID. We sanitize base64's / and + so that it's
    // a safe alphanumeric file name.
    // TODO: choose based on e.g. Dropbox's device name.
    deviceID = collabs.ReplicaIDs.random()
      .replaceAll("/", "a")
      .replaceAll("+", "b");
    window.localStorage.setItem("deviceID", deviceID);
  }
  return deviceID;
}
