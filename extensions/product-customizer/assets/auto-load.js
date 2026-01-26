(async () => {
    if (!PC.isProductPage()) return;
    if (document.getElementById('pc-design-button')) return;

    try {
        const product = await PC.getProductData();

        PC.interceptCart();

        PC.openCustomizer({
            mode: 'auto',
            shop: PC.shop,
            product_id: product.id,
            variant_id: product.variants[0].id
        });
    } catch (e) {
        console.warn('Customizer auto-load failed', e);
    }
})();
