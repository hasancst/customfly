import { vi } from 'vitest';

export const mockShopifyProductGql = {
    id: 'gid://shopify/Product/123456789',
    title: 'Test Product',
    vendor: 'Test Vendor',
    tags: ['tag1', 'tag2'],
    handle: 'test-product',
    featuredImage: { url: 'https://example.com/image.jpg' },
    options: [
        { name: 'Color', position: 1, values: ['Black', 'White'] }
    ],
    variants: {
        edges: [
            {
                node: {
                    id: 'gid://shopify/ProductVariant/v1',
                    title: 'Black',
                    sku: 'SKU-BLACK',
                    price: '20.00',
                    image: { url: 'https://example.com/black.jpg' },
                    selectedOptions: [
                        { name: 'Color', value: 'Black' }
                    ]
                }
            }
        ]
    }
};

export const mockDesignJson = {
    elements: [
        { type: 'text', text: 'Hello World', color: '#000000' },
        { type: 'image', url: 'https://example.com/logo.png' }
    ]
};

export const mockSession = {
    id: 'offline_test-shop.myshopify.com',
    shop: 'test-shop.myshopify.com',
    state: 'state',
    isOnline: false,
    scope: 'read_products,write_orders',
    accessToken: 'mock-token',
    isActive: () => true
};
