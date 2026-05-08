import { createRoot } from "react-dom/client";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { supabase } from "./lib/supabase";
import App from "./App";
import "./index.css";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
setBaseUrl(apiUrl);

setAuthTokenGetter(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
});

createRoot(document.getElementById("root")!).render(<App />);
