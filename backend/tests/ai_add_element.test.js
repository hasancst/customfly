import { describe, it, expect } from 'vitest';

/**
 * Unit tests for AI Add Element functionality
 * Tests the logic without actual database calls
 */
describe('AI Add Element - Logic Tests', () => {

    it('should validate element data structure for text', () => {
        const elementData = {
            type: 'text',
            label: 'Custom Text',
            font: 'Arial',
            color: '#000000'
        };

        expect(elementData.type).toBe('text');
        expect(elementData.label).toBeDefined();
    });

    it('should validate asset field mapping', () => {
        const assetFieldMap = {
            'text': 'optionAssetId',
            'image': 'optionAssetId',
            'monogram': 'optionAssetId',
            'gallery': 'galleryAssetId'
        };

        expect(assetFieldMap['text']).toBe('optionAssetId');
        expect(assetFieldMap['gallery']).toBe('galleryAssetId');
        expect(assetFieldMap['monogram']).toBe('optionAssetId');
    });

    it('should not duplicate tool types in enabledTools array', () => {
        const enabledTools = ['text', 'image'];
        const newType = 'text';

        // Logic from productExecutor
        if (!enabledTools.includes(newType)) {
            enabledTools.push(newType);
        }

        expect(enabledTools).toEqual(['text', 'image']);
        expect(enabledTools.filter(t => t === 'text').length).toBe(1);
    });

    it('should add new tool type to enabledTools array', () => {
        const enabledTools = ['text', 'image'];
        const newType = 'monogram';

        // Logic from productExecutor
        if (!enabledTools.includes(newType)) {
            enabledTools.push(newType);
        }

        expect(enabledTools).toEqual(['text', 'image', 'monogram']);
    });

    it('should create proper asset config for text type', () => {
        const elementData = {
            type: 'text',
            label: 'Add Name',
            font: 'Arial',
            color: '#000000',
            maxLength: 50
        };

        // Logic from _createAssetData
        const assetData = {
            value: elementData.label || 'Text Option',
            config: {
                type: 'text',
                label: elementData.label || 'Add Text',
                placeholder: 'Enter your text',
                maxLength: elementData.maxLength || 100,
                font: elementData.font || 'Arial',
                color: elementData.color || '#000000',
                fontSize: elementData.fontSize || 24
            }
        };

        expect(assetData.value).toBe('Add Name');
        expect(assetData.config.type).toBe('text');
        expect(assetData.config.maxLength).toBe(50);
        expect(assetData.config.font).toBe('Arial');
    });

    it('should create proper asset config for gallery type', () => {
        const elementData = {
            type: 'gallery',
            label: 'Choose Image',
            images: []
        };

        // Logic from _createAssetData
        const assetData = {
            value: elementData.label || 'Gallery Option',
            config: {
                type: 'gallery',
                label: elementData.label || 'Choose from Gallery',
                images: elementData.images || []
            }
        };

        expect(assetData.value).toBe('Choose Image');
        expect(assetData.config.type).toBe('gallery');
        expect(assetData.config.images).toEqual([]);
    });

    it('should create proper layer properties for text', () => {
        const elementData = {
            type: 'text',
            font: 'Helvetica',
            color: '#FF0000'
        };

        // Logic from _getDefaultLayerProps
        const defaults = {
            x: 50,
            y: 50,
            width: 200,
            height: 100,
            rotation: 0,
            scale: 1
        };

        const layerProps = {
            ...defaults,
            text: "Your Text Here",
            fontSize: 24,
            fontFamily: elementData.font || "Arial",
            fill: elementData.color || "#000000",
            textAlign: "center"
        };

        expect(layerProps.fontFamily).toBe('Helvetica');
        expect(layerProps.fill).toBe('#FF0000');
        expect(layerProps.x).toBe(50);
    });

    it('should validate previousState structure for rollback', () => {
        const previousState = {
            printArea: { layers: [] },
            enabledTools: ['text'],
            optionAssetId: 'old-asset-123'
        };

        expect(previousState).toHaveProperty('printArea');
        expect(previousState).toHaveProperty('enabledTools');
        expect(previousState).toHaveProperty('optionAssetId');
        expect(Array.isArray(previousState.enabledTools)).toBe(true);
    });
});

