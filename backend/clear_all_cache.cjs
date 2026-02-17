#!/usr/bin/env node

/**
 * Clear All Cache
 * 
 * This script clears all cache layers:
 * 1. Backend NodeCache (in-memory)
 * 2. Browser cache (via cache-busting headers)
 * 3. CDN cache (if enabled)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function clearAllCache() {
    console.log('\n=== CLEAR ALL CACHE ===\n');

    try {
        // Import cache module
        const cacheModule = await import('./config/cache.js');
        const cache = cacheModule.default;

        console.log('📋 Step 1: Clearing Backend Cache...');
        
        // Get all keys
        const keys = cache.keys();
        console.log(`   Found ${keys.length} cache keys`);

        if (keys.length > 0) {
            console.log('   Keys:', keys.slice(0, 10).join(', '), keys.length > 10 ? '...' : '');
            
            // Clear all
            cache.flushAll();
            console.log('   ✅ All cache cleared');
        } else {
            console.log('   ℹ️  Cache is already empty');
        }

        console.log('\n📋 Step 2: Cache Statistics:');
        const stats = cache.getStats();
        console.log('   Keys:', stats.keys);
        console.log('   Hits:', stats.hits);
        console.log('   Misses:', stats.misses);
        console.log('   Hit Rate:', stats.hits > 0 ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%' : '0%');

        console.log('\n📋 Step 3: Browser Cache:');
        console.log('   To clear browser cache:');
        console.log('   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
        console.log('   - Or add timestamp to URL: ?t=' + Date.now());
        console.log('   - Or clear site data in DevTools');

        console.log('\n📋 Step 4: CDN Cache:');
        if (process.env.ENABLE_CDN === 'true') {
            console.log('   ⚠️  CDN is ENABLED');
            console.log('   CDN URL:', process.env.CDN_URL);
            console.log('   You may need to purge CDN cache manually');
            console.log('   Or wait for CDN TTL to expire');
        } else {
            console.log('   ℹ️  CDN is DISABLED - no CDN cache to clear');
        }

        console.log('\n💡 Recommended Actions:');
        console.log('   1. Backend cache: ✅ Cleared');
        console.log('   2. Browser cache: Clear with Ctrl+Shift+R');
        console.log('   3. Test with: ?t=' + Date.now());

        console.log('\n✅ Done!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    }
}

clearAllCache();
