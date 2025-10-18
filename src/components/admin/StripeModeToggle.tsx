import { LiveModeStatus } from "./LiveModeStatus";

// Backwards-compat shim so any usage of StripeModeToggle renders the new live status card
export const StripeModeToggle = () => {
  return <LiveModeStatus />;
};
