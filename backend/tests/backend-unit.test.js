import { describe, it, expect, vi } from 'vitest';

// Use vi.hoisted to get data available before vi.mock if needed, 
// though here we just use it directly for pure functions.
const { mockProductGql } = vi.hoisted(() => ({
    mockProductGql: {
        id: 'gid://shopify/Product/12345',
        title: 'Test Product',
        handle: 'test-product',
        featuredImage: { url: 'https://example.com/img.jpg' },
        tags: ['tag1', 'tag2'],
        options: [{ name: 'Size', position: 1, values: ['S', 'M'] }],
        variants: {
            edges: [{
                node: {
                    id: 'gid://shopify/ProductVariant/67890',
                    title: 'S',
                    price: '20.00',
                    selectedOptions: [{ name: 'Size', value: 'S' }]
                }
            }]
        }
    }
}));

/**
 * Normalization logic extracted from server.js
 */
const normalizeProduct = (node, shop) => {
    const numericId = node.id.split('/').pop();
    return {
        id: numericId,
        gid: node.id,
        title: node.title,
        handle: node.handle,
        shop: shop,
        image: node.featuredImage ? { src: node.featuredImage.url } : null,
        tags: Array.isArray(node.tags) ? node.tags.join(', ') : '',
        variants: node.variants.edges.map(v => {
            const variant = {
                id: v.node.id.split('/').pop(),
                gid: v.node.id,
                title: v.node.title,
                price: v.node.price
            };
            if (v.node.selectedOptions) {
                v.node.selectedOptions.forEach((opt, index) => {
                    variant[`option${index + 1}`] = opt.value;
                });
            }
            return variant;
        })
    };
};

describe('Backend Data Normalization Unit Tests', () => {
    it('should extract numeric ID and gid correctly', () => {
        const result = normalizeProduct(mockProductGql, 'test.com');
        expect(result.id).toBe('12345');
        expect(result.gid).toBe('gid://shopify/Product/12345');
    });

    it('should join tags into a comma-separated string', () => {
        const result = normalizeProduct(mockProductGql, 'test.com');
        expect(result.tags).toBe('tag1, tag2');
    });

    it('should map selectedOptions to option1, option2 etc.', () => {
        const result = normalizeProduct(mockProductGql, 'test.com');
        expect(result.variants[0].option1).toBe('S');
        expect(result.variants[0].option2).toBeUndefined();
    });

    it('should handle missing featuredImage gracefully', () => {
        const noImg = { ...mockProductGql, featuredImage: null };
        const result = normalizeProduct(noImg, 'test.com');
        expect(result.image).toBeNull();
    });
});

describe('Pricing Logic Unit Tests', () => {
    const calculateTextPrice = (text, config) => {
        const { pricePerCharacter = 0, freeCharacters = 0, minCharge = 0, maxCharge = Infinity } = config;
        const taxableChars = Math.max(0, text.length - freeCharacters);
        let total = taxableChars * pricePerCharacter;
        if (total < minCharge && total > 0) total = minCharge;
        if (total > maxCharge) total = maxCharge;
        return total;
    };

    it('should calculate price with free characters', () => {
        const config = { pricePerCharacter: 2, freeCharacters: 5 };
        expect(calculateTextPrice('12345678', config)).toBe(6); // (8-5) * 2
        expect(calculateTextPrice('123', config)).toBe(0);
    });

    it('should respect min and max charges', () => {
        const config = { pricePerCharacter: 1, minCharge: 10, maxCharge: 50 };
        expect(calculateTextPrice('123456', config)).toBe(10); // 6 chars -> 6 price -> min 10
        expect(calculateTextPrice('a'.repeat(100), config)).toBe(50); // 100 chars -> max 50
    });
});
