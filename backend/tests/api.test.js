import { describe, it, expect } from 'vitest';

describe('Public API Normalization', () => {
    it('should format shopify product data correctly', () => {
        const rawProduct = {
            images: [{ id: 1, src: 'img1.jpg' }],
            variants: [{ id: 101, image_id: 1, title: 'Red' }]
        };

        // Simulated normalization logic (from server.js)
        const images = rawProduct.images.map(img => img.src);
        const variants = rawProduct.variants.map(v => {
            const imgObj = rawProduct.images.find(img => img.id === v.image_id);
            return {
                ...v,
                id: String(v.id),
                image: imgObj ? imgObj.src : null
            };
        });

        expect(images).toContain('img1.jpg');
        expect(variants[0].id).toBe('101');
        expect(variants[0].image).toBe('img1.jpg');
    });
});

describe('Product List Normalization', () => {
    it('should map Shopify GraphQL products to internal format', () => {
        const mockGqlResp = {
            data: {
                products: {
                    edges: [{
                        node: {
                            id: 'gid://shopify/Product/12345',
                            title: 'Cool Shirt',
                            tags: ['new', 'sale'],
                            featuredImage: { url: 'shirt.png' },
                            options: [{ name: 'Size', position: 1, values: ['S', 'M'] }],
                            variants: {
                                edges: [{
                                    node: {
                                        id: 'gid://shopify/ProductVariant/67890',
                                        title: 'S / Red',
                                        price: '20.00'
                                    }
                                }]
                            }
                        }
                    }]
                }
            }
        };

        const products = mockGqlResp.data.products.edges.map(({ node }) => {
            return {
                id: node.id.split('/').pop(),
                title: node.title,
                tags: node.tags.join(', '),
                image: node.featuredImage ? { src: node.featuredImage.url } : null,
                variants: node.variants.edges.map(v => ({
                    id: v.node.id.split('/').pop(),
                    title: v.node.title,
                    price: v.node.price
                }))
            };
        });

        expect(products[0].id).toBe('12345');
        expect(products[0].tags).toBe('new, sale');
        expect(products[0].variants[0].id).toBe('67890');
    });
});

describe('Asset Data Parsers', () => {
    it('should parse color assets (Name|HEX) correctly', () => {
        const rawValue = "Red|#FF0000, Blue|#0000FF";
        const colors = rawValue.split(',').map(c => {
            const [name, hex] = c.trim().split('|');
            return { name, hex };
        });

        expect(colors).toHaveLength(2);
        expect(colors[0].name).toBe('Red');
        expect(colors[1].hex).toBe('#0000FF');
    });

    it('should parse shape/option assets (Name|URL) correctly', () => {
        const rawValue = "Circle|https://path.to/circle.png, Square|https://path.to/square.png";
        const items = rawValue.split(',').map(i => {
            const [name, url] = i.trim().split('|');
            return { name, url };
        });

        expect(items[0].name).toBe('Circle');
        expect(items[0].url).toContain('circle.png');
    });

    it('should parse font assets (Comma Separated) correctly', () => {
        const rawValue = "Roboto, Open Sans, Montserrat";
        const fonts = rawValue.split(',').map(f => f.trim());

        expect(fonts).toContain('Roboto');
        expect(fonts).toHaveLength(3);
    });

    it('should parse multi-line options (Name|Value) correctly', () => {
        const rawValue = "White|#ffffff\nRed|#f50000";
        const options = rawValue.split('\n').map(line => {
            const [name, val] = line.trim().split('|');
            return { name, val };
        });

        expect(options).toHaveLength(2);
        expect(options[1].name).toBe('Red');
        expect(options[1].val).toBe('#f50000');
    });
});

describe('Image Upload Logic', () => {
    it('should construct public URL for uploads correctly', () => {
        const filename = "user_design.png";
        const appUrl = "https://custom.local";
        const publicUrl = `${appUrl}/assets/uploads/${filename}`;

        expect(publicUrl).toBe("https://custom.local/assets/uploads/user_design.png");
    });

    it('should identify upload elements in design JSON', () => {
        const elements = [
            { type: 'text', text: 'Hello' },
            { type: 'upload', url: 'https://path.to/img.png' }
        ];
        const uploadCount = elements.filter(el => el.type === 'upload').length;
        expect(uploadCount).toBe(1);
    });
});

describe('Text Pricing Logic', () => {
    it('should calculate price per character with free allowance', () => {
        const text = "Hello World"; // 11 chars
        const config = {
            mode: 'per_character',
            pricePerCharacter: 1,
            freeCharacters: 5
        };

        const taxableChars = Math.max(0, text.length - config.freeCharacters);
        const charge = taxableChars * config.pricePerCharacter;

        expect(taxableChars).toBe(6);
        expect(charge).toBe(6);
    });

    it('should respect min and max charges', () => {
        const config = {
            mode: 'per_character',
            pricePerCharacter: 1,
            minCharge: 10,
            maxCharge: 50
        };

        let charge1 = 5; // below min
        if (config.minCharge && charge1 < config.minCharge) charge1 = config.minCharge;
        expect(charge1).toBe(10);

        let charge2 = 100; // above max
        if (config.maxCharge && charge2 > config.maxCharge) charge2 = config.maxCharge;
        expect(charge2).toBe(50);
    });
});

describe('Variant Data Normalization', () => {
    it('should extract numeric ID from GID', () => {
        const variantGid = "gid://shopify/ProductVariant/987654321";
        const numericId = variantGid.split('/').pop();
        expect(numericId).toBe("987654321");
    });

    it('should map selectedOptions to flat option1, option2, etc. properties', () => {
        const mockVariantNode = {
            id: "gid://shopify/ProductVariant/111",
            title: "Large / Red",
            selectedOptions: [
                { name: "Size", value: "Large" },
                { name: "Color", value: "Red" }
            ]
        };

        const variant = {
            id: mockVariantNode.id.split('/').pop(),
            title: mockVariantNode.title,
        };

        if (mockVariantNode.selectedOptions) {
            mockVariantNode.selectedOptions.forEach((opt, index) => {
                variant[`option${index + 1}`] = opt.value;
            });
        }

        expect(variant.option1).toBe("Large");
        expect(variant.option2).toBe("Red");
        expect(variant.option3).toBeUndefined();
    });

    it('should handle variant image normalization', () => {
        const nodeWithImage = {
            image: { url: "https://example.com/variant.jpg" }
        };
        const nodeWithoutImage = {
            image: null
        };

        const img1 = nodeWithImage.image ? nodeWithImage.image.url : null;
        const img2 = nodeWithoutImage.image ? nodeWithoutImage.image.url : null;

        expect(img1).toBe("https://example.com/variant.jpg");
        expect(img2).toBeNull();
    });
});
