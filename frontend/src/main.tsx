import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { AppStateProvider } from "@/state/AppState";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AppStateProvider>
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </AppStateProvider>
    </BrowserRouter>
  </StrictMode>,
);
