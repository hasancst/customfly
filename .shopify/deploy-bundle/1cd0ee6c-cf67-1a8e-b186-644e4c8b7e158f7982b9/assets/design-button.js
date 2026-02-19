(async () => {
    const root = document.getElementById('pc-design-button');
    if (!root || !PC.isProductPage()) return;

    const product = await PC.getProductData();

    const btn = document.createElement('button');
    btn.innerText = root.dataset.label || 'Design it';
    btn.type = 'button';
    btn.style.padding = '12px 20px';
    btn.style.cursor = 'pointer';

    btn.onclick = () => {
        PC.interceptCart();
        PC.openCustomizer({
            mode: 'button',
            shop: PC.shop,
            product_id: product.id,
            variant_id: product.variants[0].id
        });
    };

    root.appendChild(btn);
})();
