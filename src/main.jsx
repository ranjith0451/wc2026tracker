import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import App from "./App.jsx";
import { ThemeProvider } from "./lib/theme.jsx";
import "./index.css";
import "./styles/themes.css";
import "./styles/features.css";
import "./styles/motion.css";
import "./styles/trophy3d.css";
import "./styles/favorites.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      {/* reducedMotion="user" → honours prefers-reduced-motion automatically */}
      <MotionConfig reducedMotion="user" transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.45 }}>
        <QueryClientProvider client={queryClient}>
          <HashRouter>
            <App />
          </HashRouter>
        </QueryClientProvider>
      </MotionConfig>
    </ThemeProvider>
  </React.StrictMode>
);
