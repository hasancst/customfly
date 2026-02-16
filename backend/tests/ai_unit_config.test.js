import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../config/database.js';
import configExecutor from '../services/ai/executors/configExecutor.js';

const TEST_SHOP = 'test-unit-shop.myshopify.com';
const TEST_PRODUCT = 'test-product-unit-123';

describe('AI Unit Configuration', () => {
    beforeAll(async () => {
        // Clean up any existing test data
        await prisma.merchantConfig.deleteMany({
            where: { shop: TEST_SHOP }
        });
    });

    afterAll(async () => {
        // Clean up test data
        await prisma.merchantConfig.deleteMany({
            where: { shop: TEST_SHOP }
        });
        await prisma.$disconnect();
    });

    it('should set canvas size in pixels (px)', async () => {
        const changes = {
            paperSize: 'Custom',
            unit: 'px',
            customPaperDimensions: { width: 1000, height: 1000 }
        };

        const result = await configExecutor.applyChanges(TEST_SHOP, TEST_PRODUCT, changes);

        expect(result.result.paperSize).toBe('Custom');
        expect(result.result.unit).toBe('px');
        expect(result.result.customPaperDimensions.width).toBe(1000);
        expect(result.result.customPaperDimensions.height).toBe(1000);
    });

    it('should set canvas size in centimeters (cm)', async () => {
        const changes = {
            paperSize: 'Custom',
            unit: 'cm',
            customPaperDimensions: { width: 21, height: 29.7 }
        };

        const result = await configExecutor.applyChanges(TEST_SHOP, TEST_PRODUCT, changes);

        expect(result.result.paperSize).toBe('Custom');
        expect(result.result.unit).toBe('cm');
        expect(result.result.customPaperDimensions.width).toBe(21);
        expect(result.result.customPaperDimensions.height).toBe(29.7);
    });

    it('should set canvas size in millimeters (mm)', async () => {
        const changes = {
            paperSize: 'Custom',
            unit: 'mm',
            customPaperDimensions: { width: 210, height: 297 }
        };

        const result = await configExecutor.applyChanges(TEST_SHOP, TEST_PRODUCT, changes);

        expect(result.result.paperSize).toBe('Custom');
        expect(result.result.unit).toBe('mm');
        expect(result.result.customPaperDimensions.width).toBe(210);
        expect(result.result.customPaperDimensions.height).toBe(297);
    });

    it('should set canvas size in inches (inch)', async () => {
        const changes = {
            paperSize: 'Custom',
            unit: 'inch',
            customPaperDimensions: { width: 8.5, height: 11 }
        };

        const result = await configExecutor.applyChanges(TEST_SHOP, TEST_PRODUCT, changes);

        expect(result.result.paperSize).toBe('Custom');
        expect(result.result.unit).toBe('inch');
        expect(result.result.customPaperDimensions.width).toBe(8.5);
        expect(result.result.customPaperDimensions.height).toBe(11);
    });

    it('should update unit without changing dimensions', async () => {
        // First set to cm
        await configExecutor.applyChanges(TEST_SHOP, TEST_PRODUCT, {
            paperSize: 'Custom',
            unit: 'cm',
            customPaperDimensions: { width: 10, height: 10 }
        });

        // Then change only unit to mm (dimensions stay same)
        const result = await configExecutor.applyChanges(TEST_SHOP, TEST_PRODUCT, {
            unit: 'mm'
        });

        expect(result.result.unit).toBe('mm');
        expect(result.result.customPaperDimensions.width).toBe(10);
        expect(result.result.customPaperDimensions.height).toBe(10);
    });

    it('should handle previousState for rollback', async () => {
        // Set initial state
        await configExecutor.applyChanges(TEST_SHOP, TEST_PRODUCT, {
            paperSize: 'Custom',
            unit: 'cm',
            customPaperDimensions: { width: 20, height: 30 }
        });

        // Change to different unit and dimensions
        const result = await configExecutor.applyChanges(TEST_SHOP, TEST_PRODUCT, {
            unit: 'px',
            customPaperDimensions: { width: 500, height: 600 }
        });

        // Check previousState contains old values
        expect(result.previousState.unit).toBe('cm');
        expect(result.previousState.customPaperDimensions.width).toBe(20);
        expect(result.previousState.customPaperDimensions.height).toBe(30);

        // Check new values
        expect(result.result.unit).toBe('px');
        expect(result.result.customPaperDimensions.width).toBe(500);
        expect(result.result.customPaperDimensions.height).toBe(600);
    });

    it('should validate unit is in allowed list', async () => {
        const changes = {
            paperSize: 'Custom',
            unit: 'px',
            customPaperDimensions: { width: 1000, height: 1000 }
        };

        const result = await configExecutor.applyChanges(TEST_SHOP, TEST_PRODUCT, changes);
        
        // Unit should be one of: px, cm, mm, inch
        expect(['px', 'cm', 'mm', 'inch']).toContain(result.result.unit);
    });
});
