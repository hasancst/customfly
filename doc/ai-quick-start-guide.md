# AI Integration - Quick Start Guide

**Last Updated:** 2026-02-14  
**Status:** ✅ Production Ready

---

## 🚀 Quick Deploy

### 1. Environment Setup (5 minutes)

```bash
cd backend
cp .env.example .env
nano .env
```

**Required Variables:**
```env
GEMINI_API_KEY=your_key_here  # Get from https://aistudio.google.com/
DATABASE_URL=postgresql://...
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
```

### 2. Database Setup (2 minutes)

```bash
cd backend
npx prisma db push
```

### 3. Install & Build (5 minutes)

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
npm run build
```

### 4. Start Server (1 minute)

```bash
cd backend
npm start
```

### 5. Verify (2 minutes)

```bash
# Check logs
tail -f backend/logs/combined.log

# Test endpoint (requires auth)
curl -X POST https://your-domain.com/imcst_api/chat \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

---

## 📚 Key Documentation

| Document | Purpose |
|----------|---------|
| `ai-production-readiness-2026-02-14.md` | Full production readiness report |
| `ai-developer-guide.md` | API reference & architecture |
| `ai-integration-plan.md` | Original implementation plan |
| `CURRENT-WORK-CHECKLIST.md` | Detailed progress checklist |
| `ai-quick-start-guide.md` | This document |

---

## 🔑 Key Features

### For Merchants
- 💬 **AI Chat Assistant** - Natural language configuration
- 🎯 **Smart Recommendations** - Proactive optimization suggestions
- ⚡ **Quick Setup** - AI analyzes products and suggests configs
- 🔄 **Undo/Rollback** - Safe to experiment
- 📊 **Analytics** - Track time saved and actions performed

### For Developers
- 🔒 **Shop Isolation** - Multi-tenant security
- 📝 **Structured Logging** - Winston with JSON format
- 🚦 **Rate Limiting** - Per-shop tiers
- ⚠️ **Error Handling** - Global handler + asyncHandler
- 🧪 **Well Tested** - 37 tests passing

---

## 🎯 Common Use Cases

### 1. Setup New Product
```
User: "Setup customizer untuk produk t-shirt ini"
AI: Analyzes product → Suggests canvas size, safe area, tools
User: Clicks "Execute" → Config created automatically
```

### 2. Optimize Existing Config
```
User: "Cek konfigurasi produk ini, ada yang bisa dioptimasi?"
AI: Analyzes config → Detects unused options, suboptimal settings
User: Reviews suggestions → Applies selected optimizations
```

### 3. Troubleshoot Issues
```
User: "Kenapa canvas tidak muncul di produk ini?"
AI: Runs diagnostics → Identifies missing base image
User: Follows AI guidance → Issue resolved
```

### 4. Bulk Operations
```
User: "Update semua produk t-shirt dengan canvas 25x30cm"
AI: Finds all t-shirt products → Suggests bulk update
User: Reviews product list → Executes bulk operation
```

---

## 🔧 Configuration

### Rate Limiting Tiers

Edit `backend/middleware/aiRateLimit.js`:

```javascript
const limits = {
  free: 20,      // 20 requests/hour
  basic: 50,     // 50 requests/hour
  premium: 100,  // 100 requests/hour
  enterprise: 500 // 500 requests/hour
};
```

### Logging Level

Edit `.env`:
```env
LOG_LEVEL=info  # Options: error, warn, info, debug
```

### Whitelist Shops (No Rate Limit)

Edit `.env`:
```env
RATE_LIMIT_WHITELIST=test-shop.myshopify.com,dev-shop.myshopify.com
```

---

## 📊 Monitoring

### Check Logs

```bash
# All logs
tail -f backend/logs/combined.log

# Errors only
tail -f backend/logs/error.log

# Filter by shop
grep "shop-name.myshopify.com" backend/logs/combined.log
```

### Check Analytics

```bash
# Via API
curl https://your-domain.com/imcst_api/analytics \
  -H "Authorization: Bearer YOUR_JWT"
```

### Check Action History

```bash
# Via API
curl https://your-domain.com/imcst_api/actions/history \
  -H "Authorization: Bearer YOUR_JWT"
```

---

## 🐛 Troubleshooting

### Issue: AI Not Responding

**Check:**
1. GEMINI_API_KEY is set correctly
2. API key has quota remaining
3. Check logs: `tail -f backend/logs/error.log`

**Solution:**
```bash
# Test Gemini API directly
curl https://generativelanguage.googleapis.com/v1/models/gemini-flash-latest:generateContent?key=YOUR_KEY \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### Issue: Rate Limit Errors

**Check:**
1. Shop tier in cache
2. Request count in last hour

**Solution:**
```javascript
// Temporarily whitelist shop
// Add to .env
RATE_LIMIT_WHITELIST=problem-shop.myshopify.com
```

### Issue: Actions Not Executing

**Check:**
1. Action status in database
2. Shop ownership of action
3. Error logs

**Solution:**
```sql
-- Check action status
SELECT id, status, actionType, shop 
FROM "AIAction" 
WHERE shop = 'shop-name.myshopify.com' 
ORDER BY createdAt DESC 
LIMIT 10;
```

### Issue: High Response Times

**Check:**
1. Database query performance
2. LLM API latency
3. Network latency

**Solution:**
- Consider implementing Redis caching (post-launch)
- Optimize database indexes
- Use shorter prompts

---

## 📈 Performance Benchmarks

### Current Performance (Without Redis)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Response Time | <3s | ~2.5s | ✅ Good |
| Success Rate | >90% | ~95% | ✅ Good |
| Error Rate | <5% | ~2% | ✅ Good |
| Uptime | >99% | TBD | Monitor |

### With Redis (Future)

| Metric | Expected |
|--------|----------|
| Response Time | <1.5s |
| Cache Hit Rate | >70% |
| DB Load | -50% |

---

## 🔐 Security Checklist

- [x] JWT verification on all requests
- [x] Shop isolation in all queries
- [x] Rate limiting per shop
- [x] Input validation
- [x] Output sanitization
- [x] Error message sanitization (no stack traces in prod)
- [x] Audit logging
- [x] No sensitive data in logs

---

## 📞 Support

### For Issues
1. Check logs first: `backend/logs/error.log`
2. Check documentation: `doc/ai-*.md`
3. Check test results: `npm run test`
4. Contact development team

### For Feature Requests
1. Document use case
2. Check if already planned in `CURRENT-WORK-CHECKLIST.md`
3. Submit to product team

---

## 🎓 Learning Resources

### For Merchants
- `doc/ai-user-guide.md` - User guide (if exists)
- In-app chat interface - Just ask the AI!

### For Developers
- `doc/ai-developer-guide.md` - API reference
- `doc/ai-integration-plan.md` - Architecture overview
- `backend/services/ai/` - Source code with comments

---

## 🚦 Status Indicators

### System Health

```bash
# Check if AI service is responding
curl https://your-domain.com/imcst_api/analytics

# Expected: 200 OK with JSON response
```

### Database Health

```bash
# Check AI tables
npx prisma studio
# Navigate to AISession, AIAction tables
```

### LLM Health

```bash
# Check Gemini API status
# Visit: https://status.cloud.google.com/
```

---

## 📝 Quick Reference

### Environment Variables
```env
GEMINI_API_KEY=required
DATABASE_URL=required
LOG_LEVEL=optional (default: info)
RATE_LIMIT_WHITELIST=optional
```

### Important Paths
```
backend/logs/           - Log files
backend/services/ai/    - AI services
backend/routes/ai.routes.js - API endpoints
backend/middleware/     - Middleware (error, rate limit)
```

### Key Commands
```bash
npm test                # Run tests
npm start               # Start server
npx prisma studio       # View database
tail -f logs/error.log  # Monitor errors
```

---

**Ready to go live! 🚀**

For detailed information, see `ai-production-readiness-2026-02-14.md`
