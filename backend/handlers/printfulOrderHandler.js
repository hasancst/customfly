import prisma from '../config/database.js';
import PrintfulService from '../services/printfulService.js';
import { shopify } from '../config/shopify.js';

/**
 * Handle order creation from Shopify webhook
 * @param {string} shop - Shop domain
 * @param {object} orderData - Shopify order data
 */
export async function handleOrderCreate(shop, orderData) {
    console.log('[Printful Order] Processing order:', orderData.id, 'for shop:', shop);
    
    try {
        // 1. Check if order already processed
        const existingOrder = await prisma.printfulOrder.findUnique({
            where: {
                shop_shopifyOrderId: {
                    shop,
                    shopifyOrderId: orderData.id.toString()
                }
            }
        });
        
        if (existingOrder) {
            console.log('[Printful Order] Order already processed:', orderData.id);
            return existingOrder;
        }
        
        // 2. Get Printful connection
        const connection = await prisma.printfulConnection.findUnique({
            where: { shop }
        });
        
        if (!connection || !connection.connected) {
            console.log('[Printful Order] No Printful connection for shop:', shop);
            return null;
        }
        
        // 3. Check if order contains Printful products
        const printfulItems = [];
        
        for (const item of orderData.line_items) {
            const printfulProduct = await prisma.printfulProduct.findFirst({
                where: {
                    shop,
                    shopifyProductId: item.product_id.toString()
                }
            });
            
            if (printfulProduct) {
                // Get customer's design if exists
                const design = await prisma.savedDesign.findFirst({
                    where: {
                        shop,
                        shopifyOrderId: orderData.id.toString(),
                        lineItemId: item.id.toString()
                    },
                    orderBy: { createdAt: 'desc' }
                });
                
                // If no design linked to order, try to find by product
                const designData = design || await prisma.savedDesign.findFirst({
                    where: {
                        shop,
                        shopifyProductId: item.product_id.toString(),
                        customerEmail: orderData.email,
                        status: 'draft'
                    },
                    orderBy: { createdAt: 'desc' }
                });
                
                printfulItems.push({
                    printfulProduct,
                    lineItem: item,
                    design: designData
                });
            }
        }
        
        if (printfulItems.length === 0) {
            console.log('[Printful Order] No Printful products in order');
            return null;
        }
        
        console.log(`[Printful Order] Found ${printfulItems.length} Printful items`);
        
        // 4. Create Printful order
        const printful = new PrintfulService(connection.accessToken);
        
        // Format recipient address
        const shippingAddress = orderData.shipping_address || orderData.billing_address;
        
        if (!shippingAddress) {
            throw new Error('No shipping address found in order');
        }
        
        const printfulOrder = {
            recipient: {
                name: `${shippingAddress.first_name || ''} ${shippingAddress.last_name || ''}`.trim() || 'Customer',
                address1: shippingAddress.address1 || '',
                address2: shippingAddress.address2 || null,
                city: shippingAddress.city || '',
                state_code: shippingAddress.province_code || null,
                country_code: shippingAddress.country_code || 'US',
                zip: shippingAddress.zip || '',
                phone: shippingAddress.phone || orderData.phone || null,
                email: orderData.email || orderData.customer?.email || ''
            },
            items: printfulItems.map(item => {
                const printfulItem = {
                    sync_variant_id: parseInt(item.printfulProduct.printfulVariantId) || null,
                    quantity: item.lineItem.quantity || 1,
                    retail_price: item.lineItem.price || '0.00'
                };
                
                // Add design files if available
                if (item.design && item.design.previewUrl) {
                    printfulItem.files = [
                        {
                            type: 'default',
                            url: item.design.previewUrl
                        }
                    ];
                }
                
                return printfulItem;
            }),
            retail_costs: {
                currency: orderData.currency || 'USD',
                subtotal: orderData.subtotal_price || '0.00',
                discount: orderData.total_discounts || '0.00',
                shipping: orderData.total_shipping_price_set?.shop_money?.amount || orderData.shipping_lines?.[0]?.price || '0.00',
                tax: orderData.total_tax || '0.00'
            },
            external_id: orderData.id.toString()
        };
        
        console.log('[Printful Order] Sending to Printful:', JSON.stringify(printfulOrder, null, 2));
        
        const result = await printful.createOrder(printfulOrder);
        
        console.log('[Printful Order] Created successfully:', result.data?.id);
        
        // 5. Save order mapping
        const printfulOrderRecord = await prisma.printfulOrder.create({
            data: {
                shop,
                shopifyOrderId: orderData.id.toString(),
                printfulOrderId: result.data?.id?.toString() || null,
                status: result.data?.status || 'pending',
                orderData: result.data || result
            }
        });
        
        // 6. Update designs to link with order
        for (const item of printfulItems) {
            if (item.design) {
                await prisma.savedDesign.update({
                    where: { id: item.design.id },
                    data: {
                        shopifyOrderId: orderData.id.toString(),
                        lineItemId: item.lineItem.id.toString(),
                        status: 'ordered'
                    }
                });
            }
        }
        
        return printfulOrderRecord;
        
    } catch (error) {
        console.error('[Printful Order] Error:', error.message);
        
        // Save error to database
        try {
            await prisma.printfulOrder.create({
                data: {
                    shop,
                    shopifyOrderId: orderData.id.toString(),
                    status: 'failed',
                    errorMessage: error.message,
                    orderData: { error: error.message, order: orderData }
                }
            });
        } catch (dbError) {
            console.error('[Printful Order] Failed to save error:', dbError.message);
        }
        
        throw error;
    }
}

/**
 * Handle order update from Shopify webhook
 * @param {string} shop - Shop domain
 * @param {object} orderData - Shopify order data
 */
export async function handleOrderUpdate(shop, orderData) {
    console.log('[Printful Order] Order updated:', orderData.id);
    
    // Check if order was cancelled
    if (orderData.cancelled_at) {
        return handleOrderCancel(shop, orderData);
    }
    
    // Handle other updates if needed
    return null;
}

/**
 * Handle order cancellation from Shopify webhook
 * @param {string} shop - Shop domain
 * @param {object} orderData - Shopify order data
 */
export async function handleOrderCancel(shop, orderData) {
    console.log('[Printful Order] Order cancelled:', orderData.id);
    
    try {
        const printfulOrder = await prisma.printfulOrder.findUnique({
            where: {
                shop_shopifyOrderId: {
                    shop,
                    shopifyOrderId: orderData.id.toString()
                }
            }
        });
        
        if (!printfulOrder || !printfulOrder.printfulOrderId) {
            console.log('[Printful Order] No Printful order found to cancel');
            return null;
        }
        
        // Get Printful connection
        const connection = await prisma.printfulConnection.findUnique({
            where: { shop }
        });
        
        if (!connection || !connection.connected) {
            console.log('[Printful Order] No Printful connection');
            return null;
        }
        
        // Cancel order in Printful
        const printful = new PrintfulService(connection.accessToken);
        
        // Note: Printful API doesn't have a direct cancel endpoint
        // You need to contact support or use their dashboard
        // We'll just update our record
        
        await prisma.printfulOrder.update({
            where: { id: printfulOrder.id },
            data: {
                status: 'cancelled',
                updatedAt: new Date()
            }
        });
        
        console.log('[Printful Order] Marked as cancelled');
        
        return printfulOrder;
        
    } catch (error) {
        console.error('[Printful Order] Error cancelling:', error.message);
        throw error;
    }
}
