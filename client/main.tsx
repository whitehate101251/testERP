import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./global.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element with id 'root' not found");
}

ReactDOM.createRoot(rootEl).render(
  <App />
);
