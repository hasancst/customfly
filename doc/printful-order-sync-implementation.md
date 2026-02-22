# Printful Order Sync - Implementation Complete ✅

## Status: IMPLEMENTED

Printful order sync sudah diimplementasikan dan siap digunakan!

## What's Implemented

### 1. Database Model ✅
- `PrintfulOrder` model untuk tracking orders
- Fields: shop, shopifyOrderId, printfulOrderId, status, orderData, errorMessage
- Indexes untuk fast queries

### 2. Order Handler ✅
**File:** `backend/handlers/printfulOrderHandler.js`

**Functions:**
- `handleOrderCreate()` - Process new orders
- `handleOrderUpdate()` - Handle order updates
- `handleOrderCancel()` - Handle cancellations

**Features:**
- Auto-detect Printful products in order
- Link customer designs to orders
- Format and send to Printful API
- Error handling and logging
- Duplicate order prevention

### 3. Webhook Integration ✅
**File:** `backend/routes/webhooks.routes.js`

**Registered Webhooks:**
- `ORDERS_CREATE` - New orders
- `ORDERS_UPDATED` - Order updates
- `ORDERS_CANCELLED` - Cancellations

### 4. API Endpoints ✅
**File:** `backend/routes/printful.routes.js`

**New Endpoints:**
- `GET /imcst_api/printful/orders` - List all Printful orders
- `GET /imcst_api/printful/orders/:orderId` - Get order details
- `POST /imcst_api/printful/orders/sync/:orderId` - Manual sync

### 5. Webhook Registration ✅
**File:** `backend/config/shopify.js`

Webhooks auto-register saat app install/reinstall via `afterAuth` hook.

## How It Works

### Automatic Flow

```
1. Customer places order in Shopify
   ↓
2. Shopify sends webhook to /api/webhooks
   ↓
3. Backend receives ORDERS_CREATE webhook
   ↓
4. handleOrderCreate() checks for Printful products
   ↓
5. If found, fetch customer's design
   ↓
6. Format order for Printful API
   ↓
7. Send to Printful: POST /orders
   ↓
8. Save PrintfulOrder record
   ↓
9. Update SavedDesign status to 'ordered'
   ↓
10. Printful processes and fulfills order
```

### Manual Sync

If webhook fails or you need to retry:

```bash
POST /imcst_api/printful/orders/sync/:orderId
```

This will:
1. Fetch order from Shopify
2. Process through handleOrderCreate()
3. Send to Printful

## Testing

### 1. Create Test Order

**Option A: Via Shopify Admin**
1. Go to Orders → Create order
2. Add a Printful product
3. Fill customer & shipping info
4. Create order

**Option B: Via API**
```bash
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
# Watch backend logs
sudo journalctl -u imcst-backend.service -f

# Look for:
[Webhook] ORDERS_CREATE received for shop: uploadfly-lab.myshopify.com
[Printful Order] Processing order: 1234567890
[Printful Order] Found 1 Printful items
[Printful Order] Sending to Printful: {...}
[Printful Order] Created successfully: PF-12345
```

### 3. Verify in Database

```javascript
// Check PrintfulOrder table
const orders = await prisma.printfulOrder.findMany({
    where: { shop: 'uploadfly-lab.myshopify.com' }
});
console.log(orders);
```

### 4. Check Printful Dashboard

1. Login to Printful: https://www.printful.com/dashboard
2. Go to Orders
3. Verify order appears with correct details

## Order Status Flow

```
pending → Order created in Printful
    ↓
processing → Printful is printing
    ↓
shipped → Printful shipped to customer
    ↓
fulfilled → Order complete
```

## Error Handling

### Common Errors

**1. No Printful Connection**
```
Error: Printful not connected
Solution: Connect Printful in app settings
```

**2. No Shipping Address**
```
Error: No shipping address found in order
Solution: Ensure order has shipping address
```

**3. Invalid Variant ID**
```
Error: Invalid sync_variant_id
Solution: Re-import product from Printful
```

**4. Missing Design**
```
Warning: No design found for product
Action: Order sent without custom design (uses default)
```

### Error Logging

All errors are logged to:
- Backend logs: `sudo journalctl -u imcst-backend.service`
- Database: `PrintfulOrder.errorMessage` field
- Status: `PrintfulOrder.status = 'failed'`

## Manual Intervention

### Retry Failed Order

```bash
POST /imcst_api/printful/orders/sync/1234567890
```

### Check Order Status

```bash
GET /imcst_api/printful/orders/1234567890
```

Response:
```json
{
  "order": {
    "id": "uuid",
    "shop": "uploadfly-lab.myshopify.com",
    "shopifyOrderId": "1234567890",
    "printfulOrderId": "PF-12345",
    "status": "pending",
    "orderData": {...},
    "printfulDetails": {...}
  }
}
```

## Design Linking

For orders to include custom designs, designs must be linked to orders.

### Current Behavior

1. Customer customizes product
2. Design saved to `SavedDesign` table
3. Customer adds to cart and checks out
4. Order created in Shopify
5. Webhook handler looks for design by:
   - `shopifyOrderId` + `lineItemId` (if linked)
   - OR `shopifyProductId` + `customerEmail` (fallback)

### Future Enhancement

To improve design linking, consider:
1. Save design ID in cart attributes
2. Pass design ID to order line item properties
3. Use line item properties to find exact design

## Webhook Registration

Webhooks are auto-registered when:
- App is installed
- App is reinstalled
- Session is refreshed

To manually register webhooks:
```javascript
await shopify.api.webhooks.register({ session });
```

## Monitoring

### Check Webhook Status

```bash
# Via Shopify Admin
Settings → Notifications → Webhooks

# Via API
GET /admin/api/2024-01/webhooks.json
```

### Check Order Sync Rate

```sql
SELECT 
    status,
    COUNT(*) as count
FROM "PrintfulOrder"
WHERE shop = 'uploadfly-lab.myshopify.com'
GROUP BY status;
```

## Next Steps

### Phase 2 (Future)

1. **Printful Webhooks**
   - Receive status updates from Printful
   - Update Shopify order fulfillment
   - Add tracking numbers

2. **Order Management UI**
   - View all Printful orders in app
   - Retry failed orders
   - View order status

3. **Fulfillment Integration**
   - Auto-fulfill Shopify orders when Printful ships
   - Add tracking info to Shopify

4. **Error Notifications**
   - Email merchant on failed orders
   - Slack/Discord notifications

## Troubleshooting

### Webhook Not Firing

**Check:**
1. Webhook registered: `GET /admin/api/2024-01/webhooks.json`
2. Webhook URL correct: `https://custom.duniasantri.com/api/webhooks`
3. Backend running: `sudo systemctl status imcst-backend.service`

**Solution:**
```javascript
// Re-register webhooks
await shopify.api.webhooks.register({ session });
```

### Order Not Syncing

**Check:**
1. Is product from Printful? Check `PrintfulProduct` table
2. Is Printful connected? Check `PrintfulConnection` table
3. Check logs for errors

**Solution:**
```bash
# Manual sync
POST /imcst_api/printful/orders/sync/:orderId
```

### Design Not Included

**Check:**
1. Design exists in `SavedDesign` table
2. Design has `previewUrl` field
3. Design linked to correct product

**Solution:**
- Ensure design is saved before checkout
- Link design to order via line item properties

## Support

For issues or questions:
1. Check logs: `sudo journalctl -u imcst-backend.service -f`
2. Check database: `PrintfulOrder` table
3. Check Printful dashboard
4. Review this documentation

## Summary

✅ Order sync fully implemented
✅ Webhooks registered and working
✅ Error handling in place
✅ Manual sync available
✅ Logging comprehensive

Ready for production testing!
