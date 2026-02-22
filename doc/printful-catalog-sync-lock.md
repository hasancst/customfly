# Printful Catalog - Sync Lock to Prevent Rate Limits

## Problem
Error **429 Too Many Requests** muncul saat browse catalog:

```
GET /imcst_api/printful/catalog 429 (Too Many Requests)
Error loading catalog: AI usage limit reached for this hour
```

Padahal catalog sudah tersimpan di database dan seharusnya tidak hit Printful API.

## Root Cause

### Background Sync Triggered Multiple Times

```
User 1 opens catalog → Check if needs sync → Trigger background sync
User 2 opens catalog → Check if needs sync → Trigger background sync
User 3 opens catalog → Check if needs sync → Trigger background sync
...
Multiple syncs running simultaneously → Hit Printful API many times → Rate Limit!
```

### The Flow
1. User opens catalog page
2. Backend checks if catalog needs sync (older than 24 hours)
3. If yes, trigger `syncCatalogInBackground()`
4. This function hits Printful API to fetch products
5. If multiple users open catalog, multiple syncs triggered
6. Each sync makes 100+ API calls
7. Total: 100+ × N users = Rate Limit!

## Solution: Sync Lock

### 1. Global Sync Flag
Prevent multiple syncs from running simultaneously:

```javascript
let isSyncing = false;
let lastSyncAttempt = 0;
```

### 2. Check Before Sync
Only start sync if not already syncing:

```javascript
if (needsSync && !isSyncing) {
    // Prevent sync if last attempt was less than 5 minutes ago
    const timeSinceLastAttempt = Date.now() - lastSyncAttempt;
    if (timeSinceLastAttempt > 5 * 60 * 1000) {
        lastSyncAttempt = Date.now();
        syncCatalogInBackground(accessToken);
    }
}
```

### 3. Set/Unset Flag in Sync Function
```javascript
async function syncCatalogInBackground(accessToken) {
    if (isSyncing) {
        console.log('Sync already in progress, skipping...');
        return 0;
    }
    
    isSyncing = true;
    
    try {
        // Sync logic...
    } finally {
        // Always reset flag when done
        isSyncing = false;
    }
}
```

## Implementation

### Changes Made

**File:** `backend/routes/printful.routes.js`

1. **Added Sync Lock Variables:**
```javascript
// Flag to prevent multiple sync operations
let isSyncing = false;
let lastSyncAttempt = 0;
```

2. **Check Before Triggering Sync:**
```javascript
if (needsSync && !isSyncing) {
    const timeSinceLastAttempt = Date.now() - lastSyncAttempt;
    if (timeSinceLastAttempt > 5 * 60 * 1000) {
        console.log('[Printful] Catalog needs sync, syncing in background...');
        lastSyncAttempt = Date.now();
        syncCatalogInBackground(connection.accessToken);
    } else {
        console.log('[Printful] Sync already attempted recently, skipping...');
    }
}
```

3. **Set Flag at Start of Sync:**
```javascript
async function syncCatalogInBackground(accessToken) {
    if (isSyncing) {
        console.log('[Printful Sync] Sync already in progress, skipping...');
        return 0;
    }
    
    isSyncing = true;
    // ...
}
```

4. **Reset Flag When Done:**
```javascript
try {
    // Sync logic...
} finally {
    // Always reset flag when done
    isSyncing = false;
}
```

## How It Works

### Before (No Lock)
```
Request 1 → Check needs sync → Start sync (100 API calls)
Request 2 → Check needs sync → Start sync (100 API calls)
Request 3 → Check needs sync → Start sync (100 API calls)
...
Total: 300+ API calls → Rate Limit!
```

### After (With Lock)
```
Request 1 → Check needs sync → Start sync (set flag)
Request 2 → Check needs sync → Flag is set → Skip
Request 3 → Check needs sync → Flag is set → Skip
...
Total: 100 API calls → No Rate Limit!
```

## Protection Layers

### Layer 1: Sync Flag
```javascript
if (isSyncing) {
    return 0; // Skip if already syncing
}
```

### Layer 2: Time-Based Throttle
```javascript
const timeSinceLastAttempt = Date.now() - lastSyncAttempt;
if (timeSinceLastAttempt > 5 * 60 * 1000) {
    // Only sync if last attempt was > 5 minutes ago
}
```

### Layer 3: 24-Hour Check
```javascript
const needsSync = !latestSync || 
    (Date.now() - latestSync.syncedAt.getTime()) > 24 * 60 * 60 * 1000;
```

## Sync Frequency

### Normal Operation
- Catalog synced once every 24 hours
- Only one sync at a time
- Minimum 5 minutes between attempts

### Multiple Users
- First user triggers sync
- Other users get data from database
- No duplicate syncs

### Rate Limit Protection
- Maximum 1 sync per 5 minutes
- Even if 100 users open catalog
- Only 1 sync runs

## Benefits

### 1. Prevents Rate Limits
- Only one sync at a time
- No duplicate API calls
- Respects Printful limits

### 2. Better Performance
- Database queries are fast
- No waiting for API
- Instant catalog display

### 3. Resource Efficient
- No wasted API calls
- Lower server load
- Better scalability

## Testing

### Test Case 1: Single User
1. User opens catalog
2. Sync triggered (if needed)
3. Catalog loads from database
4. No rate limit

### Test Case 2: Multiple Users
1. User 1 opens catalog → Sync starts
2. User 2 opens catalog → Sync skipped (flag set)
3. User 3 opens catalog → Sync skipped (flag set)
4. All users see catalog from database
5. No rate limit

### Test Case 3: Rapid Reloads
1. User reloads catalog 10 times
2. First reload: Check sync (skip if recent)
3. Other reloads: Skip sync (time throttle)
4. All loads from database
5. No rate limit

### Test Case 4: Sync Completion
1. Sync starts (flag = true)
2. Sync completes successfully
3. Flag reset (flag = false)
4. Next sync can run (after 5 minutes)

### Test Case 5: Sync Error
1. Sync starts (flag = true)
2. Sync encounters error
3. Flag reset in finally block
4. Next sync can run (after 5 minutes)

## Monitoring

### Check Sync Status
```bash
# Backend logs
sudo journalctl -u imcst-backend.service -f | grep "Printful Sync"
```

### Expected Logs
```
[Printful] Catalog needs sync, syncing in background...
[Printful Sync] Starting catalog sync...
[Printful Sync] Synced 71 products...
[Printful Sync] Completed! Total synced: 71 products
```

### Skipped Syncs
```
[Printful] Sync already attempted recently, skipping...
[Printful Sync] Sync already in progress, skipping...
```

## Edge Cases

### Case 1: Server Restart
- Flags reset to initial values
- First request after restart can trigger sync
- Normal operation resumes

### Case 2: Long-Running Sync
- Flag prevents new syncs
- Other requests use database
- Flag reset when sync completes

### Case 3: Sync Failure
- Flag reset in finally block
- Next request can retry (after 5 minutes)
- No permanent lock

## Future Improvements

### 1. Redis Lock (Multi-Server)
For distributed systems:
```javascript
const redis = new Redis();
const lock = await redis.set('printful-sync-lock', '1', 'EX', 300, 'NX');
if (lock) {
    // Sync
}
```

### 2. Queue System
Use job queue for syncs:
```javascript
import Bull from 'bull';
const syncQueue = new Bull('printful-sync');
syncQueue.process(async (job) => {
    // Sync logic
});
```

### 3. Webhook Updates
Get updates from Printful instead of polling:
```javascript
// Printful webhook
app.post('/webhooks/printful', (req, res) => {
    // Update catalog when Printful changes
});
```

## Summary

✅ **Sync lock** prevents multiple syncs
✅ **Time throttle** (5 minutes) prevents rapid retries
✅ **Database-first** approach for fast loading
✅ **Rate limit protection** for Printful API
✅ **Scalable** for multiple users

Catalog now loads instantly from database without hitting rate limits! 🎉

---

**Date:** February 21, 2026
**Status:** Fixed ✅
**Files Changed:** `backend/routes/printful.routes.js`
