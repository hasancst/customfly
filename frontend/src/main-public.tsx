import { createRoot } from "react-dom/client";
import PublicApp from "./pages/PublicApp";
import "./styles/index.css";

// Initialize public app
const rootElement = document.getElementById("imcst-public-root");
if (!rootElement) {
    throw new Error("Root element 'imcst-public-root' not found");
}

createRoot(rootElement).render(<PublicApp />);
