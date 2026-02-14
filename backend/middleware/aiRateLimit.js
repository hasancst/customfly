import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

/**
 * Rate limiter untuk AI endpoints
 * Berbeda per shop berdasarkan tier (bisa dikembangkan nanti)
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: (req, res) => {
    const shop = res.locals.shopify?.session?.shop;
    
    // Get shop tier from cache (default: free)
    const tier = cache.get(`tier:${shop}`) || 'free';
    
    // Different limits per tier
    const limits = {
      free: 20,      // 20 requests per hour
      basic: 50,     // 50 requests per hour
      premium: 100,  // 100 requests per hour
      enterprise: 500 // 500 requests per hour
    };
    
    return limits[tier] || limits.free;
  },
  message: {
    error: 'AI usage limit reached for this hour. Please try again later.',
    retryAfter: 3600 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for specific shops (testing)
  skip: (req, res) => {
    const shop = res.locals.shopify?.session?.shop;
    const whitelist = (process.env.RATE_LIMIT_WHITELIST || '').split(',');
    return whitelist.includes(shop);
  }
});

/**
 * Helper function to set shop tier
 * Bisa dipanggil dari admin panel nanti
 */
export const setShopTier = (shop, tier) => {
  cache.set(`tier:${shop}`, tier);
};

/**
 * Helper function to get shop tier
 */
export const getShopTier = (shop) => {
  return cache.get(`tier:${shop}`) || 'free';
};
