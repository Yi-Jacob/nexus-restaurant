import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import "./styles/app.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Short TTL keeps results fresh without refetching on every navigation.
      staleTime: 2 * 60 * 1000,
      // Retain cached results briefly to avoid thrashing when toggling tabs.
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false
    }
  }
});

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
