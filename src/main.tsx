import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";

// Force cache clear for desktop session fix
const APP_VERSION = '2025-10-15-chat-fix';
const storedVersion = localStorage.getItem('app_version');
if (storedVersion !== APP_VERSION) {
  console.log('App version updated, clearing caches...');
  localStorage.setItem('app_version', APP_VERSION);
  // Clear any stale subscription flags
  localStorage.removeItem('subscriptionActive');
  localStorage.removeItem('userRole');
}

createRoot(document.getElementById("root")!).render(<App />);
