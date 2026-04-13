import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App.tsx";
import "./globals.css";

const root = createRoot(document.getElementById("root")!);

if (import.meta.env.DEV) {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  root.render(<App />);
}