# Printful Order Sync Guide

## Overview

Panduan ini menjelaskan cara mensync order dari Shopify ke Printful untuk automatic fulfillment.

## Flow Diagram

```
Customer Order di Shopify
    ↓
Shopify Webhook: orders/create
    ↓
Backend menerima webhook
    ↓
Cek: Apakah produk dari Printful?
    ↓ YES
Ambil design customer dari SavedDesign
    ↓
Format order untuk Printful API
    ↓
POST ke Printful /orders
    ↓
Printful proses & fulfill
    ↓
Update Shopify order status
```

## Prerequisites

1. ✅ Printful connection sudah setup
2. ✅ Produk sudah di-import dari Printful
3. ✅ Customer bisa customize design
4. ⏳ Webhook `orders/create` perlu di-register
5. ⏳ Order handler perlu di-implement

## Implementation Steps

### Step 1: Register Webhook

Webhook `orders/create` perlu di-register di Shopify. Ini biasanya dilakukan otomatis saat app install.

**File:** `backend/config/shopify.js`

```javascript
webhooks: {
    path: "/api/webhooks",
    // Webhooks akan auto-register saat afterAuth
}
```

**Webhook yang perlu di-register:**
- `orders/create` - Saat order baru dibuat
- `orders/updated` - Saat order di-update (optional)
- `orders/cancelled` - Saat order di-cancel (optional)

### Step 2: Create Order Handler

**File:** `backend/handlers/printfulOrderHandler.js`

```javascript
import prisma from '../config/database.js';
import PrintfulService from '../services/printfulService.js';

export async function handleOrderCreate(shop, orderData) {
    console.log('[Printful Order] Processing order:', orderData.id);
    
    try {
        // 1. Get Printful connection
        const connection = await prisma.printfulConnection.findUnique({
            where: { shop }
        });
        
        if (!connection || !connection.connected) {
            console.log('[Printful Order] No Printful connection for shop:', shop);
            return;
        }
        
        // 2. Check if order contains Printful products
        const printfulItems = [];
        
        for (const item of orderData.line_items) {
            const printfulProduct = await prisma.printfulProduct.findFirst({
                where: {
                    shop,
                    shopifyProductId: item.product_id.toString()
                }
            });
            
            if (printfulProduct) {
                // 3. Get customer's design
                const design = await prisma.savedDesign.findFirst({
                    where: {
                        shop,
                        shopifyOrderId: orderData.id.toString(),
                        lineItemId: item.id.toString()
                    }
                });
                
                printfulItems.push({
                    printfulProduct,
                    lineItem: item,
                    design: design?.designJson
                });
            }
        }
        
        if (printfulItems.length === 0) {
            console.log('[Printful Order] No Printful products in order');
            return;
        }
        
        // 4. Create Printful order
        const printful = new PrintfulService(connection.accessToken);
        
        const printfulOrder = {
            recipient: {
                name: `${orderData.shipping_address.first_name} ${orderData.shipping_address.last_name}`,
                address1: orderData.shipping_address.address1,
                address2: orderData.shipping_address.address2,
                city: orderData.shipping_address.city,
                state_code: orderData.shipping_address.province_code,
                country_code: orderData.shipping_address.country_code,
                zip: orderData.shipping_address.zip,
                phone: orderData.shipping_address.phone,
                email: orderData.email
            },
            items: printfulItems.map(item => ({
                variant_id: item.printfulProduct.printfulVariantId,
                quantity: item.lineItem.quantity,
                files: item.design ? [
                    {
                        type: 'default',
                        url: item.design.previewUrl // URL to design preview
                    }
                ] : []
            })),
            retail_costs: {
                currency: orderData.currency,
                subtotal: orderData.subtotal_price,
                discount: orderData.total_discounts,
                shipping: orderData.shipping_lines[0]?.price || 0,
                tax: orderData.total_tax
            }
        };
        
        const result = await printful.createOrder(printfulOrder);
        
        console.log('[Printful Order] Created successfully:', result.data.id);
        
        // 5. Save order mapping
        await prisma.printfulOrder.create({
            data: {
                shop,
                shopifyOrderId: orderData.id.toString(),
                printfulOrderId: result.data.id.toString(),
                status: 'pending',
                orderData: result.data
            }
        });
        
        return result;
        
    } catch (error) {
        console.error('[Printful Order] Error:', error);
        throw error;
    }
}
```

### Step 3: Update Webhook Handler

**File:** `backend/routes/webhooks.routes.js`

```javascript
import express from "express";
import { shopify } from "../config/shopify.js";
import { handleOrderCreate } from "../handlers/printfulOrderHandler.js";

const router = express.Router();

// Register webhook handlers
shopify.api.webhooks.addHandlers({
    ORDERS_CREATE: {
        deliveryMethod: 'http',
        callbackUrl: '/api/webhooks',
        callback: async (topic, shop, body) => {
            console.log('[Webhook] ORDERS_CREATE received for shop:', shop);
            
            try {
                const orderData = JSON.parse(body);
                await handleOrderCreate(shop, orderData);
            } catch (error) {
                console.error('[Webhook] Error handling order:', error);
            }
        }
    }
});

router.post("/webhooks", express.text({ type: '*/*' }), async (req, res) => {
    try {
        await shopify.api.webhooks.process({
            rawBody: req.body,
            rawRequest: req,
            rawResponse: res,
        });
        console.log(`[WEBHOOK] Processed successfully`);
    } catch (error) {
        console.error(`[WEBHOOK] Error: ${error.message}`);
        if (!res.headersSent) {
            res.status(500).send(error.message);
        }
    }
});

export default router;
```

### Step 4: Add Database Model

**File:** `backend/prisma/schema.prisma`

```prisma
model PrintfulOrder {
  id              String   @id @default(uuid())
  shop            String
  shopifyOrderId  String
  printfulOrderId String
  status          String   @default("pending")
  orderData       Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([shop, shopifyOrderId])
  @@index([shop])
  @@index([printfulOrderId])
}
```

Run migration:
```bash
cd backend
npx prisma db push
```

### Step 5: Link Design to Order

Saat customer checkout, design mereka perlu di-link ke order. Ini dilakukan di frontend saat customer add to cart.

**Frontend:** Saat add to cart, simpan design:

```javascript
// Save design before checkout
const saveDesign = async () => {
    const response = await fetch('/imcst_api/designs', {
        method: 'POST',
        body: JSON.stringify({
            shopifyProductId: productId,
            designJson: canvasData,
            previewUrl: previewImageUrl,
            status: 'pending_order'
        })
    });
    
    const { id } = await response.json();
    
    // Store design ID in cart attributes
    // This will be passed to order line items
    return id;
};
```

## Testing

### 1. Test Order Creation

```bash
# Create test order via Shopify Admin
# Or use Shopify API:

curl -X POST "https://uploadfly-lab.myshopify.com/admin/api/2024-01/orders.json" \
  -H "X-Shopify-Access-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order": {
      "line_items": [
        {
          "variant_id": 123456,
          "quantity": 1
        }
      ],
      "customer": {
        "email": "test@example.com"
      },
      "shipping_address": {
        "first_name": "John",
        "last_name": "Doe",
        "address1": "123 Main St",
        "city": "New York",
        "province": "NY",
        "country": "US",
        "zip": "10001"
      }
    }
  }'
```

### 2. Check Logs

```bash
# Backend logs
sudo journalctl -u imcst-backend.service -f

# Look for:
# [Webhook] ORDERS_CREATE received
# [Printful Order] Processing order
# [Printful Order] Created successfully
```

### 3. Verify in Printful Dashboard

1. Login ke Printful dashboard
2. Go to Orders
3. Check if order appears
4. Verify order details match

## Order Status Flow

```
Shopify Order Created
    ↓
pending (Printful order created)
    ↓
processing (Printful printing)
    ↓
shipped (Printful shipped)
    ↓
fulfilled (Shopify order fulfilled)
```

## Webhook Status Updates

Untuk update status dari Printful ke Shopify, perlu implement webhook dari Printful:

**Printful Webhooks:**
- `package_shipped` - Update Shopify order dengan tracking
- `package_returned` - Handle returns
- `order_failed` - Handle failed orders

## Error Handling

**Common Issues:**

1. **No Printful connection**
   - Solution: Ensure shop has connected Printful

2. **Missing design**
   - Solution: Save design before checkout

3. **Invalid address**
   - Solution: Validate address in checkout

4. **Printful API error**
   - Solution: Log error, notify merchant

## Manual Order Sync

Jika perlu sync order secara manual:

```javascript
// POST /imcst_api/printful/orders/sync
router.post('/orders/sync/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const shop = res.locals.shopify.session.shop;
    
    // Fetch order from Shopify
    const client = new shopify.api.clients.Rest({ session });
    const order = await client.get({
        path: `orders/${orderId}`
    });
    
    // Process order
    await handleOrderCreate(shop, order.body.order);
    
    res.json({ success: true });
});
```

## Next Steps

1. ✅ Implement order handler
2. ✅ Register webhooks
3. ✅ Add database model
4. ✅ Test with sample order
5. ⏳ Implement status updates from Printful
6. ⏳ Add order tracking UI
7. ⏳ Handle order cancellations

## Resources

- [Printful API Docs](https://developers.printful.com/docs/)
- [Shopify Webhooks](https://shopify.dev/docs/api/admin-rest/2024-01/resources/webhook)
- [Order Fulfillment](https://shopify.dev/docs/apps/fulfillment)
