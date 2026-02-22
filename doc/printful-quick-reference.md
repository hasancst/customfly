# Printful Integration - Quick Reference

## 🚀 Quick Start

### For Users

1. **Connect Printful**
   - Go to Settings page
   - Scroll to "Printful Integration"
   - Enter API key from [Printful Dashboard](https://www.printful.com/dashboard/store)
   - Click "Connect Printful"

2. **Import Products**
   - Click "Browse Printful Catalog" in Settings
   - Browse products (71+ available)
   - Click "Import" on desired product
   - Configure margin and variants
   - Click "Import Product"

3. **Orders Auto-Sync**
   - Orders automatically sent to Printful
   - Customer designs included
   - Tracking updates via webhooks

---

## 📁 File Structure

```
backend/
├── services/
│   └── printfulService.js          # Printful API client
├── routes/
│   └── printful.routes.js          # API endpoints
├── handlers/
│   └── printfulOrderHandler.js     # Webhook handlers
├── config/
│   ├── shopify.js                  # Webhook registration
│   └── database.js                 # Prisma middleware
└── prisma/
    └── schema.prisma               # Database models

frontend/
├── src/
│   ├── pages/
│   │   ├── Settings.tsx            # Connection UI
│   │   └── PrintfulPage.tsx       # Full Printful page
│   └── components/
│       └── printful/
│           ├── CatalogTab.tsx      # Browse catalog
│           ├── ProductsTab.tsx     # Imported products
│           └── ImportModal.tsx     # Import dialog
```

---

## 🔌 API Endpoints

### Connection
```
GET    /imcst_api/printful/status
POST   /imcst_api/printful/connect
DELETE /imcst_api/printful/disconnect
```

### Catalog
```
GET    /imcst_api/printful/catalog
POST   /imcst_api/printful/catalog/sync
GET    /imcst_api/printful/catalog/:id
GET    /imcst_api/printful/catalog/:id/mockups
```

### Products
```
GET    /imcst_api/printful/products
POST   /imcst_api/printful/import
POST   /imcst_api/printful/sync/:productId
DELETE /imcst_api/printful/products/:id
```

### Orders
```
GET    /imcst_api/printful/orders
GET    /imcst_api/printful/orders/:orderId
POST   /imcst_api/printful/orders/sync/:orderId
```

---

## 🗄️ Database Models

### PrintfulConnection
- Stores API key per shop
- Tracks connection status
- Stores Printful store ID

### PrintfulCatalog
- Global catalog cache
- 71+ products
- Auto-syncs every 24 hours
- **Not shop-scoped** (excluded from tenant isolation)

### PrintfulProduct
- Maps Printful products to Shopify
- Stores print area configuration
- Tracks mockup URLs (S3)

### PrintfulOrder
- Links Shopify orders to Printful
- Tracks fulfillment status
- Stores error messages

---

## 🔄 Order Flow

```
1. Customer places order in Shopify
   ↓
2. Webhook: ORDERS_CREATE
   ↓
3. Check if order has Printful products
   ↓
4. Get customer's design (SavedDesign)
   ↓
5. Format order for Printful API
   ↓
6. Submit to Printful
   ↓
7. Save PrintfulOrder record
   ↓
8. Update design status to "ordered"
```

---

## 🛠️ Common Tasks

### Restart Backend
```bash
sudo systemctl restart imcst-backend.service
```

### View Logs
```bash
# Real-time logs
sudo journalctl -u imcst-backend.service -f

# Last 100 lines
sudo journalctl -u imcst-backend.service -n 100
```

### Check Connection Status
```bash
# In backend directory
node -e "
const prisma = require('./config/database.js').default;
prisma.printfulConnection.findMany().then(console.log);
"
```

### Manual Catalog Sync
```bash
curl -X POST https://custom.duniasantri.com/imcst_api/printful/catalog/sync \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

---

## 🐛 Debugging

### Check Printful Connection
1. Go to Settings page
2. Check "Printful Integration" section
3. Status should show "Connected" (green badge)
4. Store ID should be displayed

### Check Webhooks
1. Go to Shopify Admin
2. Settings → Notifications
3. Scroll to "Webhooks"
4. Should see:
   - `orders/create`
   - `orders/updated`
   - `orders/cancelled`
5. All pointing to: `https://custom.duniasantri.com/api/webhooks`

### Check Catalog Sync
```sql
-- In PostgreSQL
SELECT COUNT(*) FROM "PrintfulCatalog";
-- Should return 71+

SELECT "syncedAt" FROM "PrintfulCatalog" 
ORDER BY "syncedAt" DESC LIMIT 1;
-- Should be within last 24 hours
```

### Check Order Sync
```sql
-- In PostgreSQL
SELECT * FROM "PrintfulOrder" 
WHERE shop = 'uploadfly-lab.myshopify.com'
ORDER BY "createdAt" DESC LIMIT 10;
```

---

## ⚠️ Important Notes

### Tenant Isolation
- `PrintfulCatalog` is **excluded** from tenant isolation
- It's a global catalog shared across all shops
- Added to skip list in `backend/config/database.js`:
  ```javascript
  if (shop && model !== 'Session' && 
      model !== 'GoogleFont' && 
      model !== 'PrintfulCatalog' && ...)
  ```

### CORS Resolution
- Printful CDN images cause CORS errors
- Solution: Download and upload to S3
- Function: `downloadAndUploadToS3()` in `printful.routes.js`
- All mockup images stored in S3

### Rate Limits
- Printful: 120 requests/minute
- Catalog sync: 500ms delay between batches
- Avoid frequent manual syncs

### Webhook Registration
- Auto-registered after OAuth
- Configured in `backend/config/shopify.js`
- Uses `afterAuth` hook
- No manual registration needed

---

## 📊 Status Check

### ✅ Completed Features
- [x] Connection management
- [x] Catalog browsing with pagination
- [x] Product import to Shopify
- [x] Automatic order sync
- [x] CORS resolution (S3 upload)
- [x] Database caching
- [x] UI integration in Settings
- [x] Webhook handlers
- [x] Error handling
- [x] Tenant isolation

### 🔮 Future Enhancements
- [ ] Bulk import
- [ ] Price sync
- [ ] Inventory tracking
- [ ] Order tracking UI
- [ ] Shipping estimates
- [ ] Multi-store support
- [ ] Analytics dashboard

---

## 🆘 Quick Fixes

### "Printful not connected" error
```bash
# Check database
psql $DATABASE_URL -c "SELECT * FROM \"PrintfulConnection\";"

# Reconnect in UI
# Go to Settings → Printful Integration → Enter API key → Connect
```

### "Catalog not loading" error
```bash
# Manual sync
curl -X POST https://custom.duniasantri.com/imcst_api/printful/catalog/sync

# Check sync status
psql $DATABASE_URL -c "SELECT COUNT(*), MAX(\"syncedAt\") FROM \"PrintfulCatalog\";"
```

### "Order not syncing" error
```bash
# Check webhooks registered
curl https://custom.duniasantri.com/api/webhooks

# Manual order sync
curl -X POST https://custom.duniasantri.com/imcst_api/printful/orders/sync/ORDER_ID

# Check logs
sudo journalctl -u imcst-backend.service | grep "Printful Order"
```

---

## 📞 Support Resources

- **Printful API Docs**: https://developers.printful.com/docs/
- **Shopify API Docs**: https://shopify.dev/docs/api
- **Backend Logs**: `backend/out.log`, `backend/err.log`
- **Frontend Logs**: Browser DevTools Console

---

## 🎯 Key Files to Know

| File | Purpose |
|------|---------|
| `backend/services/printfulService.js` | Printful API client |
| `backend/routes/printful.routes.js` | All API endpoints |
| `backend/handlers/printfulOrderHandler.js` | Order webhook logic |
| `backend/config/database.js` | Tenant isolation (PrintfulCatalog excluded) |
| `frontend/src/pages/Settings.tsx` | Connection UI |
| `frontend/src/pages/PrintfulPage.tsx` | Full Printful interface |
| `doc/printful-integration-complete.md` | Complete documentation |

---

## 💡 Pro Tips

1. **Always check logs first** when debugging
2. **Use manual sync** sparingly (rate limits)
3. **Test with small orders** before going live
4. **Monitor webhook delivery** in Shopify Admin
5. **Keep API key secure** (never commit to git)
6. **Check S3 storage** periodically (images accumulate)
7. **Review PrintfulOrder table** for failed orders

---

## ✨ Success Indicators

Your Printful integration is working correctly if:

- ✅ Settings page shows "Connected" status
- ✅ Catalog loads with 71+ products
- ✅ Products import successfully to Shopify
- ✅ Mockup images display without CORS errors
- ✅ Orders appear in PrintfulOrder table
- ✅ Webhooks show "Success" in Shopify Admin
- ✅ No errors in backend logs

---

**Last Updated**: February 21, 2026
**Status**: Production Ready ✅
