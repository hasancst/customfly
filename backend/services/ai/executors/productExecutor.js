import prisma from '../../../config/database.js';
import logger from '../../../config/logger.js';

/**
 * Executes product-level changes (adding elements/options).
 */
class ProductExecutor {

    /**
     * Adds a new customization element to the config's printArea AND creates Asset option.
     */
    async addElement(shopId, productId, elementData) {
        console.log('[Product Executor] addElement called', { shopId, productId, elementData });
        
        let config = await prisma.merchantConfig.findUnique({
            where: {
                shop_shopifyProductId: {
                    shop: shopId,
                    shopifyProductId: String(productId)
                }
            }
        });

        console.log('[Product Executor] Config found:', config ? 'YES' : 'NO');

        // 1. If config doesn't exist, create a default one first
        if (!config) {
            logger.info('[Product Executor] Config missing, creating default', { 
                shop: shopId, 
                productId 
            });
            config = await prisma.merchantConfig.create({
                data: {
                    shop: shopId,
                    shopifyProductId: String(productId),
                    paperSize: "Default",
                    unit: "px",
                    customPaperDimensions: { width: 1000, height: 1000 },
                    printArea: { layers: [] }
                }
            });
            console.log('[Product Executor] Default config created:', config.id);
        }

        // Parse existing printArea or initialize
        let printArea = config.printArea;
        if (typeof printArea === 'string') {
            printArea = JSON.parse(printArea);
        }
        const previousPrintArea = JSON.parse(JSON.stringify(printArea || { layers: [] }));

        if (!printArea || !printArea.layers) {
            printArea = { layers: [], ...printArea };
        }

        // Create new layer based on elementData
        const newLayer = {
            id: `layer_${Date.now()}`,
            type: elementData.type, // 'text', 'image', 'gallery', 'monogram'
            label: elementData.label || `New ${elementData.type}`,
            visible: true,
            locked: false,
            opacity: 1,
            ...this._getDefaultLayerProps(elementData.type, elementData)
        };

        printArea.layers.push(newLayer);
        console.log('[Product Executor] Layer added to printArea, total layers:', printArea.layers.length);

        // 2. Create Asset option for this element (so it appears in admin area)
        const assetData = this._createAssetData(elementData);
        
        console.log('[Product Executor] Creating asset with data:', assetData);
        
        // IMPORTANT: Asset type should be 'option' for all customization elements
        // Frontend filters by type='option' to display in admin area
        const createdAsset = await prisma.asset.create({
            data: {
                shop: shopId,
                type: 'option', // Always 'option' for frontend compatibility
                name: elementData.label || `${elementData.type}_${Date.now()}`,
                value: assetData.value,
                config: {
                    ...assetData.config,
                    elementType: elementData.type // Store actual type in config
                },
                label: elementData.label || `New ${elementData.type}`,
                isDefault: false
            }
        });
        
        console.log('[Product Executor] Asset created:', createdAsset.id);

        // 3. Update enabledTools to include this new tool type
        let enabledTools = config.enabledTools || [];
        if (typeof enabledTools === 'string') {
            enabledTools = JSON.parse(enabledTools);
        }
        if (!Array.isArray(enabledTools)) {
            enabledTools = [];
        }
        
        // Add tool type if not already enabled
        if (!enabledTools.includes(elementData.type)) {
            enabledTools.push(elementData.type);
        }

        // 4. Update database with printArea, enabledTools, and link to optionAssetId
        console.log('[Product Executor] Updating config with:', {
            printAreaLayers: printArea.layers.length,
            enabledTools,
            optionAssetId: createdAsset.id
        });
        
        const result = await prisma.merchantConfig.update({
            where: {
                shop_shopifyProductId: {
                    shop: shopId,
                    shopifyProductId: String(productId)
                }
            },
            data: {
                printArea: printArea,
                enabledTools: enabledTools,
                optionAssetId: createdAsset.id
            }
        });

        console.log('[Product Executor] Config updated successfully');

        logger.info('[Product Executor] Element added successfully', {
            shop: shopId,
            productId,
            elementType: elementData.type,
            assetId: createdAsset.id,
            enabledTools
        });

        return { 
            result, 
            previousState: { 
                printArea: previousPrintArea,
                enabledTools: config.enabledTools,
                optionAssetId: config.optionAssetId
            },
            createdAsset
        };
    }

    /**
     * Removes specific elements from the config's printArea.
     */
    async removeUnusedElements(shopId, productId, layerIds) {
        const config = await prisma.merchantConfig.findUnique({
            where: {
                shop_shopifyProductId: {
                    shop: shopId,
                    shopifyProductId: String(productId)
                }
            }
        });

        if (!config || !config.printArea) return { success: false, error: "Config not found" };

        let printArea = config.printArea;
        if (typeof printArea === 'string') {
            printArea = JSON.parse(printArea);
        }
        const previousPrintArea = JSON.parse(JSON.stringify(printArea));

        if (printArea.layers) {
            printArea.layers = printArea.layers.filter(layer => !layerIds.includes(layer.id));
        }

        const result = await prisma.merchantConfig.update({
            where: {
                shop_shopifyProductId: {
                    shop: shopId,
                    shopifyProductId: String(productId)
                }
            },
            data: {
                printArea: printArea
            }
        });

        return { result, previousState: { printArea: previousPrintArea } };
    }

    /**
     * Returns default properties for different layer types.
     */
    _getDefaultLayerProps(type, data) {
        const defaults = {
            x: 50,
            y: 50,
            width: 200,
            height: 100,
            rotation: 0,
            scale: 1
        };

        if (type === 'text') {
            return {
                ...defaults,
                text: "Your Text Here",
                fontSize: 24,
                fontFamily: data.font || "Arial",
                fill: data.color || "#000000",
                textAlign: "center"
            };
        } else if (type === 'image') {
            return {
                ...defaults,
                url: data.url || "",
                keepAspectRatio: true
            };
        } else if (type === 'gallery') {
            return {
                ...defaults,
                images: [],
                columns: 3,
                gap: 10
            };
        } else if (type === 'monogram') {
            return {
                ...defaults,
                text: "ABC",
                monogramType: "classic",
                fill: data.color || "#000000"
            };
        }

        return defaults;
    }

    /**
     * Creates Asset data for different element types.
     */
    _createAssetData(elementData) {
        const type = elementData.type;
        
        if (type === 'text') {
            return {
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
        } else if (type === 'image') {
            return {
                value: elementData.label || 'Image Option',
                config: {
                    type: 'image',
                    label: elementData.label || 'Upload Image',
                    allowedFormats: ['jpg', 'png', 'svg'],
                    maxSize: 5 * 1024 * 1024 // 5MB
                }
            };
        } else if (type === 'gallery') {
            return {
                value: elementData.label || 'Gallery Option',
                config: {
                    type: 'gallery',
                    label: elementData.label || 'Choose from Gallery',
                    images: elementData.images || []
                }
            };
        } else if (type === 'monogram') {
            return {
                value: elementData.label || 'Monogram Option',
                config: {
                    type: 'monogram',
                    label: elementData.label || 'Add Monogram',
                    style: elementData.style || 'classic',
                    maxChars: 3,
                    color: elementData.color || '#000000'
                }
            };
        }

        return {
            value: elementData.label || 'Custom Option',
            config: { type: type }
        };
    }
}

export default new ProductExecutor();
