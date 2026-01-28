/**
 * CUSTOM DESIGNER STOREFRONT SDK
 * Detects #imcst-designer-root and injects the designer interface.
 */
(function () {
    const SCRIPT_NAME = 'storefront-sdk.js';
    const BASE_URL = 'https://custom.duniasantri.com';

    function init() {
        const root = document.getElementById('imcst-designer-root');
        if (!root) {
            console.log('[IMCST] No #imcst-designer-root found. Skipping injection.');
            return;
        }

        const productId = root.dataset.productId;
        const variantId = root.dataset.variantId;
        const shop = root.dataset.shop;

        if (!productId || !shop) {
            console.error('[IMCST] Missing productId or shop in dataset.');
            return;
        }

        console.log('[IMCST] Initializing designer for product:', productId);

        // Create iframe for isolation
        const iframe = document.createElement('iframe');
        iframe.src = `${BASE_URL}/storefront/${productId}?shop=${shop}&variant=${variantId || ''}`;
        iframe.style.width = '100%';
        iframe.style.height = '800px'; // Increased default height
        iframe.style.border = 'none';
        iframe.style.overflow = 'hidden';
        iframe.id = 'imcst-designer-iframe';

        root.appendChild(iframe);

        // Listen for messages from iframe
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'IMCST_RESIZE') {
                iframe.style.height = `${event.data.height}px`;
            }

            if (event.data && event.data.type === 'IMCST_ADD_TO_CART') {
                const props = {
                    '_custom_design_id': event.data.designId,
                    '_custom_design_preview': event.data.previewUrl,
                    '_custom_design_name': event.data.designName || 'Custom Design'
                };
                addToCart(event.data.variantId, props);
            }
        });
    }

    function addToCart(variantId, properties) {
        console.log('[IMCST] Adding to cart:', variantId, properties);
        fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: variantId, // Shopify AJAX API item id is variantId
                quantity: 1,
                properties: properties
            })
        })
            .then(response => response.json())
            .then(data => {
                console.log('[IMCST] Success:', data);
                window.location.href = '/cart'; // Redirect to cart
            })
            .catch((error) => {
                console.error('[IMCST] Error:', error);
                alert('Failed to add to cart. Please try again.');
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
