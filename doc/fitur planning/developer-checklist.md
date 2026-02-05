# Developer Checklist - Regression Testing

## 📋 Pre-Deployment Checklist

Gunakan checklist ini sebelum setiap deployment ke production.

---

## ✅ Setup (First Time Only)

- [ ] Copy `.env.test.example` to `.env.test` in `/doc` folder
- [ ] Fill in test credentials:
  - [ ] `TEST_SHOP` (your test shop domain)
  - [ ] `TEST_PRODUCT_ID` (a valid product ID)
  - [ ] `TEST_AUTH_TOKEN` (valid session token)
- [ ] Make `quick-test.sh` executable: `chmod +x /www/wwwroot/custom.local/doc/quick-test.sh`
- [ ] Verify backend is running: `systemctl status imcst-backend.service`
- [ ] Run test once to verify setup: `cd /www/wwwroot/custom.local/doc && ./quick-test.sh`

---

## 🔄 Before Every Deployment

### 1. Code Changes Review

- [ ] Review all changes to these files:
  - [ ] `/backend/server.js` (especially design/config endpoints)
  - [ ] `/frontend/src/pages/Designer.tsx`
  - [ ] `/frontend/src/pages/DesignerPublic.tsx`
  - [ ] `/backend/prisma/schema.prisma`
  - [ ] Cache-related code

### 2. Run Regression Tests

```bash
cd /www/wwwroot/custom.local/doc
./quick-test.sh
```

- [ ] All tests passed (6/6)
- [ ] No console errors
- [ ] Response times acceptable
- [ ] Cache behavior correct

### 3. Manual Verification (if tests fail)

#### Admin Designer
- [ ] Login to Shopify Admin
- [ ] Open test product in Designer
- [ ] Add/modify design element
- [ ] Click "Save"
- [ ] Verify success message
- [ ] Note the timestamp

#### Public Designer
- [ ] Open Public Designer (incognito/new session)
- [ ] Load same product
- [ ] Verify design matches Admin
- [ ] Verify all elements present
- [ ] Verify positions correct
- [ ] Check timestamp matches

#### Backend Logs
```bash
journalctl -u imcst-backend.service -n 50
```

- [ ] No error messages
- [ ] Cache invalidation logged
- [ ] Database queries successful

#### Database Verification
```bash
psql $DATABASE_URL
```

```sql
-- Check latest design
SELECT id, name, "shopifyProductId", "updatedAt", "isTemplate"
FROM "SavedDesign"
WHERE shop = 'your-shop.myshopify.com'
  AND "shopifyProductId" = 'your-product-id'
ORDER BY "updatedAt" DESC
LIMIT 1;
```

- [ ] Latest design exists
- [ ] `updatedAt` is recent
- [ ] `designJson` contains expected data

### 4. Performance Check

- [ ] Average response time < 1 second
- [ ] Cache hit time < 50ms
- [ ] No memory leaks
- [ ] No database connection issues

### 5. Documentation

- [ ] Update CHANGELOG if needed
- [ ] Document any new test cases
- [ ] Update README if behavior changed

---

## 🚨 If Tests Fail

### Step 1: Identify the Failure

- [ ] Note which test case failed
- [ ] Read error message carefully
- [ ] Check test output for details

### Step 2: Check Common Issues

#### TC-001 or TC-002 Failure (Data Sync)

**Possible causes:**
- [ ] Cache not invalidated
- [ ] Database query wrong
- [ ] Auth token expired

**Actions:**
```bash
# Restart backend to clear cache
systemctl restart imcst-backend.service

# Get fresh auth token
# (from browser DevTools)

# Re-run test
./quick-test.sh
```

#### TC-006 Failure (Cache)

**Possible causes:**
- [ ] Cache invalidation logic broken
- [ ] Wrong cache keys
- [ ] NodeCache not working

**Actions:**
```bash
# Check server.js cache invalidation
grep -n "cache.del" /www/wwwroot/custom.local/backend/server.js

# Verify keys match:
# - pub_prod_{shop}_{productId}
# - config_{shop}_{productId}
# - pub_config_{shop}_{productId}
```

#### TC-013 Failure (Performance)

**Possible causes:**
- [ ] Database slow
- [ ] Network issues
- [ ] High server load

**Actions:**
```bash
# Check server resources
top
free -h
df -h

# Check database
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('your_db'));"

# Check network
ping localhost
```

### Step 3: Fix and Re-test

- [ ] Apply fix
- [ ] Restart backend if needed
- [ ] Re-run full test suite
- [ ] Verify all tests pass

### Step 4: Document

- [ ] Document the issue
- [ ] Document the fix
- [ ] Update troubleshooting guide if needed

---

## 📊 Test Results Log

Keep a log of test results:

```
Date: 2026-02-02
Time: 14:30
Commit: abc123
Tester: [Your Name]
Result: ✅ PASS (6/6)
Notes: All tests passed, ready for deployment

Date: 2026-02-03
Time: 10:15
Commit: def456
Tester: [Your Name]
Result: ❌ FAIL (5/6)
Failed: TC-002 (Cache not invalidated)
Fix: Added missing cache.del() in server.js line 1293
Retest: ✅ PASS (6/6)
Notes: Fixed and deployed
```

---

## 🎯 Deployment Decision

### ✅ DEPLOY if:

- [x] All regression tests passed
- [x] Manual verification successful
- [x] No critical errors in logs
- [x] Performance acceptable
- [x] Database healthy
- [x] Documentation updated

### ❌ DO NOT DEPLOY if:

- [ ] Any test failed
- [ ] Manual verification shows issues
- [ ] Critical errors in logs
- [ ] Performance degraded
- [ ] Database issues
- [ ] Unresolved bugs

---

## 📝 Post-Deployment

### Immediate (within 5 minutes)

- [ ] Verify production backend running
- [ ] Check production logs for errors
- [ ] Test one product manually:
  - [ ] Admin save works
  - [ ] Public loads correctly
  - [ ] Data synchronized

### Within 1 hour

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify cache hit rates
- [ ] Review user feedback (if any)

### Within 24 hours

- [ ] Full regression test on production
- [ ] Review all logs
- [ ] Check database performance
- [ ] Verify no regressions

---

## 🔧 Emergency Rollback

If critical issues found after deployment:

### Step 1: Immediate Actions

```bash
# Rollback to previous version
git checkout <previous-commit>

# Rebuild
cd frontend && npm run build
cd ../backend && systemctl restart imcst-backend.service

# Verify
./quick-test.sh
```

### Step 2: Notify Team

- [ ] Alert team of rollback
- [ ] Document the issue
- [ ] Create incident report

### Step 3: Fix and Redeploy

- [ ] Fix the issue in development
- [ ] Run full test suite
- [ ] Manual verification
- [ ] Deploy fix

---

## 📚 Quick Reference

### Run Tests
```bash
cd /www/wwwroot/custom.local/backend
./quick-test.sh
```

### Check Backend
```bash
systemctl status imcst-backend.service
journalctl -u imcst-backend.service -f
```

### Check Database
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"SavedDesign\";"
```

### Restart Backend
```bash
systemctl restart imcst-backend.service
```

### View Test Documentation
```bash
cat /www/wwwroot/custom.local/backend/TEST-README.md
```

---

## ✨ Best Practices

1. **Always run tests before deployment**
2. **Never skip failed tests** - investigate and fix
3. **Keep test credentials secure** - don't commit to git
4. **Update tests when adding features**
5. **Document all failures and fixes**
6. **Monitor production after deployment**
7. **Run tests daily** (automated via cron)

---

## 🎓 Training Checklist

For new team members:

- [ ] Read `/backend/TEST-README.md`
- [ ] Read `/doc/realtime-sync-fix.md`
- [ ] Setup test environment
- [ ] Run tests successfully
- [ ] Understand test output
- [ ] Know how to troubleshoot
- [ ] Practice manual verification
- [ ] Review this checklist

---

## 📞 Support

If you need help:

1. **Check documentation:**
   - `/backend/TEST-README.md`
   - `/doc/regression-test-realtime-sync.md`
   - `/doc/regression-testing-summary.md`

2. **Check logs:**
   - Backend: `journalctl -u imcst-backend.service`
   - Frontend: Browser console

3. **Ask team:**
   - Share test output
   - Share error messages
   - Share what you've tried

---

**Last Updated:** 2026-02-02  
**Version:** 1.0  
**Maintainer:** Development Team
