import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import PublicApp from "./pages/PublicApp";
import { LayoutDetector } from "./components/storefront/LayoutDetector";
import "./styles/index.css";

// Initialize public app
const rootElement = document.getElementById("imcst-public-root");
if (!rootElement) {
    throw new Error("Root element 'imcst-public-root' not found");
}

// Detect if we are in "Storefront Button" mode (parameters passed via data attributes)
const productId = rootElement.getAttribute('data-product-id');
const shop = rootElement.getAttribute('data-shop');

if (productId && shop) {
    // Direct render for storefront button integration
    createRoot(rootElement).render(
        <BrowserRouter>
            <LayoutDetector productId={productId} shop={shop} />
        </BrowserRouter>
    );
} else {
    // Full Public App (Embedded, Modal, Open mode)
    createRoot(rootElement).render(<PublicApp />);
}
