import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

if (import.meta.hot) {
  import.meta.hot.on("vite:beforeFullReload", () => {
    // Mencegah reload penuh saat koneksi WebSocket Vite terputus di latar belakang (misal saat membuka kamera)
    throw "(skipping full reload)";
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
