window.PC = {
    shop: Shopify.shop,

    isProductPage: () => location.pathname.startsWith('/products/'),

    getProductData: async () => {
        const handle = location.pathname.split('/products/')[1];
        const res = await fetch(`/products/${handle}.js`);
        return res.json();
    },

    openCustomizer: (payload) => {
        const url =
            'https://custom.duniasantri.com/designer?data=' +
            encodeURIComponent(JSON.stringify(payload));
        window.open(url, '_blank');
    },

    interceptCart: () => {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            if (args[0].includes('/cart/add')) {
                const body = args[1]?.body;
                if (body instanceof FormData) {
                    body.append(
                        'properties[_customizer]',
                        window.__PC_CUSTOM_DATA__ || ''
                    );
                }
            }
            return originalFetch(...args);
        };
    }
};
