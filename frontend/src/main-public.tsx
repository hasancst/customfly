import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import PublicApp from "./pages/PublicApp";
import { LayoutDetector } from "./components/storefront/LayoutDetector";
import { DirectProductDesigner } from "./pages/DirectProductDesigner";
import "./styles/index.css";

/**
 * DirectCustomizerDetector
 * Theme-agnostic logic for detecting and mounting Direct Customize roots.
 */
class DirectCustomizerDetector {
    private mediaSelectors = [
        '.product__media-wrapper', '.product-single__media-group', '.product-gallery',
        '.featured-product-image', '.product-photos', '[data-product-single-media-group]',
        '.main-product-image', '.product__column--media', '.grid__item.product__media-wrapper'
    ];

    private infoSelectors = [
        '.product__info-wrapper', '.product-single__meta', '.product-shop',
        '.product-info-main', '.product-details', '.product__info-container'
    ];

    public async findContainers(): Promise<{ media: HTMLElement; info: HTMLElement } | null> {
        let media: HTMLElement | null = null;
        let info: HTMLElement | null = null;

        // Try known selectors
        for (const s of this.mediaSelectors) {
            const el = document.querySelector(s);
            if (el && this.isVisible(el as HTMLElement)) {
                media = el as HTMLElement;
                break;
            }
        }

        for (const s of this.infoSelectors) {
            const el = document.querySelector(s);
            if (el && this.isVisible(el as HTMLElement)) {
                info = el as HTMLElement;
                break;
            }
        }

        // Heuristic fallback: Find container with Add to Cart form if info selector failed
        if (!info) {
            const atcForm = document.querySelector('form[action*="/cart/add"]');
            if (atcForm) info = atcForm.parentElement as HTMLElement;
        }

        if (media && info) return { media, info };
        return null;
    }

    private isVisible(el: HTMLElement): boolean {
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }

    public injectRoots(media: HTMLElement, info: HTMLElement): { canvas: HTMLElement; options: HTMLElement } {
        // 1. Create Canvas Root inside Media
        let canvasRoot = document.getElementById('direct-canvas-root');
        if (!canvasRoot) {
            // Force parent visibility
            media.style.setProperty('display', 'block', 'important');
            media.style.setProperty('visibility', 'visible', 'important');
            media.style.setProperty('opacity', '1', 'important');
            media.style.setProperty('min-height', '500px', 'important');

            // Hide other children of media
            Array.from(media.children).forEach((child: any) => {
                if (child.id !== 'direct-canvas-root') {
                    child.style.display = 'none';
                }
            });

            canvasRoot = document.createElement('div');
            canvasRoot.id = 'direct-canvas-root';
            canvasRoot.style.width = '100%';
            canvasRoot.style.height = '100%';
            canvasRoot.style.minHeight = '500px';
            canvasRoot.style.display = 'block';
            canvasRoot.style.position = 'relative';
            canvasRoot.style.zIndex = '10';
            media.appendChild(canvasRoot);
        }

        // 2. Create Options Root inside Info
        let optionsRoot = document.getElementById('direct-options-root');
        if (!optionsRoot) {
            optionsRoot = document.createElement('div');
            optionsRoot.id = 'direct-options-root';
            optionsRoot.className = 'imcst-direct-options';

            // Try to find a good spot: above Add to Cart or at the end
            const atcForm = info.querySelector('form[action*="/cart/add"]');
            if (atcForm && atcForm.parentNode) {
                atcForm.parentNode.insertBefore(optionsRoot, atcForm);
            } else {
                info.appendChild(optionsRoot);
            }
        }

        return { canvas: canvasRoot, options: optionsRoot };
    }
}

// Initialize public app
async function initApp() {
    if ((window as any).IMCST_INITIALIZED) return;
    (window as any).IMCST_INITIALIZED = true;
    console.log('[IMCST] Initializing storefront loader...');
    const shop = document.querySelector('[data-shop]')?.getAttribute('data-shop') || (window as any).Shopify?.shop;
    const productId = document.querySelector('[data-product-id]')?.getAttribute('data-product-id') || (window as any).meta?.product?.id;

    if (!shop || !productId) {
        console.log('[IMCST] Missing shop or product ID, attempting legacy mount...');
        const legacyRoot = document.getElementById("imcst-public-root") || document.getElementById("imcst-root");
        if (legacyRoot) mountApp(legacyRoot);
        return;
    }

    // 1. Fetch Config to determine Layout 
    let config: any = null;
    try {
        const baseUrl = (window as any).IMCST_BASE_URL || '';
        const res = await fetch(`${baseUrl}/imcst_public_api/public/config/${productId}?shop=${shop}&t=${Date.now()}`);
        config = await res.json();
    } catch (e) {
        console.error("[IMCST] Failed to fetch config during init", e);
    }

    // 2. If it's NOT 'inline', mount to standard root with injection fallback
    if (!config || config.designerLayout !== 'inline') {
        const tryStandardMount = async () => {
            console.log(`[IMCST] Layout is ${config?.designerLayout || 'unknown'}. Finding mount...`);

            // Priority 1: Explicit root
            const legacyRoot = document.getElementById("imcst-public-root") || document.getElementById("imcst-root");
            if (legacyRoot) {
                mountApp(legacyRoot, { productId: String(productId), shop, mode: 'detector' });
                return true;
            }

            // Priority 2: Auto-inject near ATC
            const detector = new DirectCustomizerDetector();
            const containers = await detector.findContainers();
            if (containers && containers.info) {
                let standardRoot = document.getElementById('imcst-standard-root');
                if (!standardRoot) {
                    standardRoot = document.createElement('div');
                    standardRoot.id = 'imcst-standard-root';
                    const atcForm = containers.info.querySelector('form[action*="/cart/add"]');
                    if (atcForm && atcForm.parentNode) {
                        atcForm.parentNode.insertBefore(standardRoot, atcForm);
                    } else {
                        containers.info.appendChild(standardRoot);
                    }
                }
                mountApp(standardRoot, { productId: String(productId), shop, mode: 'detector' });
                return true;
            }
            return false;
        };

        if (await tryStandardMount()) return;

        // Retry for slow themes
        const standardInterval = setInterval(async () => {
            attempts++;
            if (await tryStandardMount() || attempts >= maxAttempts) {
                clearInterval(standardInterval);
            }
        }, 1000);
        return;
    }

    // 3. It IS 'inline' (Direct Customize) - Use the detector
    const detector = new DirectCustomizerDetector();
    let attempts = 0;
    const maxAttempts = 10;

    const tryDetect = async () => {
        const containers = await detector.findContainers();
        if (containers) {
            console.log('[IMCST] Direct containers detected. Mounting...');
            const roots = detector.injectRoots(containers.media, containers.info);
            mountApp(roots.canvas, { productId: String(productId), shop, mode: 'direct' });
            return true;
        }
        return false;
    };

    if (await tryDetect()) return;

    const interval = setInterval(async () => {
        attempts++;
        if (await tryDetect() || attempts >= maxAttempts) {
            clearInterval(interval);
        }
    }, 1000);
}

function mountApp(targetRoot: HTMLElement, props?: { productId: string; shop: string; mode: string }) {
    if (targetRoot.getAttribute('data-mounted') === 'true') return;
    targetRoot.setAttribute('data-mounted', 'true');

    const productId = props?.productId || targetRoot.getAttribute('data-product-id');
    const shop = props?.shop || targetRoot.getAttribute('data-shop');
    const mode = props?.mode || targetRoot.getAttribute('data-mode');

    if (productId && shop) {
        createRoot(targetRoot).render(
            <BrowserRouter>
                {mode === 'direct' ? (
                    <DirectProductDesigner productId={String(productId)} shop={shop} />
                ) : (
                    <LayoutDetector productId={String(productId)} shop={shop} />
                )}
            </BrowserRouter>
        );
    } else {
        createRoot(targetRoot).render(<PublicApp />);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
