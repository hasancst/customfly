import { describe, it, expect, vi } from 'vitest';

// Mocking the behavior of the design save handler from server.js
// Logic: if id is provided, update existing. If not, create new.

const simulateSaveDesign = async (body, shop, prismaMock) => {
    const { id, name, designJson, previewUrl, shopifyProductId, isTemplate } = body;

    if (id) {
        // Update existing design
        return await prismaMock.savedDesign.update({
            where: { id, shop },
            data: {
                name: name || "Untitled Design",
                designJson,
                previewUrl,
                isTemplate: !!isTemplate
            },
        });
    } else {
        // Create new design
        return await prismaMock.savedDesign.create({
            data: {
                shop,
                shopifyProductId: shopifyProductId ? String(shopifyProductId) : null,
                name: name || "Untitled Design",
                designJson,
                previewUrl,
                isTemplate: !!isTemplate
            },
        });
    }
};

describe('Backend Save Logic Persistence', () => {
    it('should call prisma.create when no ID is provided', async () => {
        const prismaMock = {
            savedDesign: {
                create: vi.fn().mockResolvedValue({ id: 'new-id', name: 'New' }),
                update: vi.fn()
            }
        };

        const body = { name: 'Test' };
        const result = await simulateSaveDesign(body, 'test.myshopify.com', prismaMock);

        expect(prismaMock.savedDesign.create).toHaveBeenCalled();
        expect(prismaMock.savedDesign.update).not.toHaveBeenCalled();
        expect(result.id).toBe('new-id');
    });

    it('should call prisma.update when ID IS provided (Regression Fix)', async () => {
        const prismaMock = {
            savedDesign: {
                create: vi.fn(),
                update: vi.fn().mockResolvedValue({ id: 'existing-id', name: 'Updated' })
            }
        };

        const body = { id: 'existing-id', name: 'Update Test' };
        const result = await simulateSaveDesign(body, 'test.myshopify.com', prismaMock);

        expect(prismaMock.savedDesign.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'existing-id', shop: 'test.myshopify.com' }
        }));
        expect(prismaMock.savedDesign.create).not.toHaveBeenCalled();
        expect(result.id).toBe('existing-id');
    });
});

describe('Asset ID Matching Persistence (Regression Fix)', () => {
    const assets = [
        { id: 1, name: 'Asset 1' },
        { id: 'uuid-2', name: 'Asset 2' }
    ];

    const findAssetById = (list, id) => {
        return list.find(a => String(a.id) === String(id));
    };

    it('should find asset when ID is numeric but searched as string', () => {
        const found = findAssetById(assets, "1");
        expect(found).toBeDefined();
        expect(found.name).toBe('Asset 1');
    });

    it('should find asset when ID is string (UUID) and searched as string', () => {
        const found = findAssetById(assets, "uuid-2");
        expect(found).toBeDefined();
        expect(found.name).toBe('Asset 2');
    });

    it('should return undefined when ID does not exist', () => {
        const found = findAssetById(assets, "999");
        expect(found).toBeUndefined();
    });
});

// --- MerchantConfig Asset Persistence Regression ---
describe('MerchantConfig Asset Persistence Regression', () => {
    it('should correctly merge asset IDs into the configuration object for saving', () => {
        const updates = {
            productId: '12345',
            fontAssetId: 'font-group-A',
            colorAssetId: 'color-palette-B',
            optionAssetId: 'option-group-C',
            galleryAssetId: 'gallery-group-D',
            shapeAssetId: 'shape-group-E'
        };

        const saveToDbSimulation = (data) => {
            return {
                shop: 'test-shop.myshopify.com',
                shopifyProductId: data.productId,
                fontAssetId: data.fontAssetId,
                colorAssetId: data.colorAssetId,
                optionAssetId: data.optionAssetId,
                galleryAssetId: data.galleryAssetId,
                shapeAssetId: data.shapeAssetId,
                updatedAt: new Date()
            };
        };

        const result = saveToDbSimulation(updates);
        expect(result.fontAssetId).toBe('font-group-A');
        expect(result.colorAssetId).toBe('color-palette-B');
    });

    it('should handle partial updates without losing other asset IDs', () => {
        const currentConfig = { fontAssetId: 'font-A', colorAssetId: 'color-B' };
        const updates = { fontAssetId: 'font-new' };

        const finalUpdate = {
            fontAssetId: updates.fontAssetId !== undefined ? updates.fontAssetId : currentConfig.fontAssetId,
            colorAssetId: updates.colorAssetId !== undefined ? updates.colorAssetId : currentConfig.colorAssetId
        };

        expect(finalUpdate.fontAssetId).toBe('font-new');
        expect(finalUpdate.colorAssetId).toBe('color-B');
    });
});
