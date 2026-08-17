import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import App from "./App";
import "@/app/globals.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find root element");
}

const PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "";

createRoot(rootElement).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  </StrictMode>
);
