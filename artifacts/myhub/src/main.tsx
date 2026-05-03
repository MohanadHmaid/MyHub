import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";

// Use environment variable for API URL, fallback to localhost for development
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
setBaseUrl(apiUrl);

import App from "./App";
import { setBaseUrl } from "@workspace/api-client-react";

setBaseUrl(import.meta.env.VITE_API_URL || null);

import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);