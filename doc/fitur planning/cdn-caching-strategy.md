# CDN and Caching Strategy

## Overview

Implement CDN and intelligent caching to improve load times while maintaining real-time canvas updates and shop-specific data.

---

## CDN Strategy

### 1. CloudFront CDN for S3 Assets

**Setup:**
```bash
# AWS CloudFront distribution for S3 bucket
- Origin: S3 bucket (custom.duniasantri.com)
- Behaviors: Cache static assets, bypass for dynamic content
- SSL: Custom SSL certificate
```

**Benefits:**
- Global edge locations
- Reduced latency for image loads
- Lower S3 costs
- Automatic compression

**Configuration:**
```javascript
// S3 URLs with CloudFront
const CDN_URL = process.env.CDN_URL || 'https://cdn.custom.duniasantri.com';

// Update S3 service to return CDN URLs
export function getCDNUrl(s3Key) {
    return `${CDN_URL}/${s3Key}`;
}
```

### 2. Static Asset CDN

**Use jsDelivr or unpkg for libraries:**
```html
<!-- Instead of bundling, use CDN for stable libraries -->
<script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js"></script>
```

**Vite External Config:**
```typescript
// vite.config.ts
build: {
    rollupOptions: {
        external: ['react', 'react-dom'], // Don't bundle, use CDN
        output: {
            globals: {
                react: 'React',
                'react-dom': 'ReactDOM'
            }
        }
    }
}
```

---

## Caching Strategy

### 1. Browser Caching (Static Assets)

**Nginx Configuration:**
```nginx
# /etc/nginx/sites-available/custom.duniasantri.com

location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|webp)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}

location /imcst_assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

**Benefits:**
- Assets cached for 1 year
- Reduced server requests
- Faster repeat visits

### 2. API Response Caching (Redis)

**Install Redis:**
```bash
npm install redis
```

**Cache Configuration:**
```javascript
// backend/config/cache.js
import { createClient } from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis error:', err));
await redisClient.connect();

export default redisClient;
```

**Cache Middleware:**
```javascript
// backend/middleware/cache.js
import redisClient from '../config/cache.js';

export function cacheMiddleware(duration = 300) {
    return async (req, res, next) => {
        const key = `cache:${req.originalUrl}`;
        
        try {
            const cached = await redisClient.get(key);
            if (cached) {
                return res.json(JSON.parse(cached));
            }
            
            // Store original res.json
            const originalJson = res.json.bind(res);
            res.json = (data) => {
                redisClient.setEx(key, duration, JSON.stringify(data));
                return originalJson(data);
            };
            
            next();
        } catch (err) {
            console.error('Cache error:', err);
            next();
        }
    };
}
```

### 3. Selective Caching Rules

**What to Cache:**
```javascript
// Products (cache for 5 minutes)
app.get('/imcst_api/products', cacheMiddleware(300), getProducts);

// Assets (cache for 10 minutes)
app.get('/imcst_api/assets', cacheMiddleware(600), getAssets);

// Shop config (cache for 1 hour)
app.get('/imcst_api/shop_config', cacheMiddleware(3600), getShopConfig);
```

**What NOT to Cache:**
```javascript
// Real-time canvas updates - NO CACHE
app.post('/imcst_api/public/design', saveDesign);
app.get('/imcst_api/public/design/:id', getDesign);

// Uploads - NO CACHE
app.post('/imcst_api/public/upload/image', uploadImage);

// Shop-specific data - NO CACHE (or very short)
app.get('/imcst_api/designs', getDesigns);
```

### 4. Cache Invalidation

**Invalidate on Updates:**
```javascript
// backend/utils/cache.js
export async function invalidateCache(pattern) {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
        await redisClient.del(keys);
    }
}

// Usage in routes
app.post('/imcst_api/assets', async (req, res) => {
    // Save asset
    await saveAsset(data);
    
    // Invalidate assets cache
    await invalidateCache('cache:/imcst_api/assets*');
    
    res.json({ success: true });
});
```

### 5. Service Worker for Offline Support

**Frontend Service Worker:**
```javascript
// frontend/public/sw.js
const CACHE_NAME = 'customfly-v1';
const STATIC_ASSETS = [
    '/',
    '/imcst_assets/admin-*.js',
    '/imcst_assets/vendor-react-*.js',
    '/imcst_assets/vendor-ui-*.js'
];

// Cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip API calls and canvas data
    if (event.request.url.includes('/imcst_api/')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
```

**Register Service Worker:**
```javascript
// frontend/src/main.tsx
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('/sw.js');
}
```

---

## HTTP/2 and Compression

### 1. Enable HTTP/2 in Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name custom.duniasantri.com;
    
    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/javascript application/json;
    
    # Enable brotli (if available)
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css application/javascript 
                 application/json image/svg+xml;
}
```

### 2. Preload Critical Resources

```html
<!-- index.html -->
<link rel="preload" href="/imcst_assets/vendor-react-[hash].js" as="script">
<link rel="preload" href="/imcst_assets/admin-[hash].js" as="script">
<link rel="dns-prefetch" href="https://cdn.custom.duniasantri.com">
```

---

## Image Optimization

### 1. Responsive Images with CDN

```javascript
// Generate responsive image URLs
export function getResponsiveImageUrl(s3Key, width) {
    // Use CloudFront with image transformation
    return `${CDN_URL}/${s3Key}?w=${width}&q=85&fm=webp`;
}

// Usage in components
<img 
    src={getResponsiveImageUrl(image, 800)}
    srcSet={`
        ${getResponsiveImageUrl(image, 400)} 400w,
        ${getResponsiveImageUrl(image, 800)} 800w,
        ${getResponsiveImageUrl(image, 1200)} 1200w
    `}
    sizes="(max-width: 768px) 400px, 800px"
/>
```

### 2. Lazy Loading Images

```javascript
// Use native lazy loading
<img src={url} loading="lazy" />

// Or Intersection Observer for more control
const ImageLoader = ({ src, alt }) => {
    const [loaded, setLoaded] = useState(false);
    const imgRef = useRef();
    
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setLoaded(true);
                observer.disconnect();
            }
        });
        
        observer.observe(imgRef.current);
        return () => observer.disconnect();
    }, []);
    
    return <img ref={imgRef} src={loaded ? src : placeholder} alt={alt} />;
};
```

---

## Performance Monitoring

### 1. Cache Hit Rate Monitoring

```javascript
// backend/middleware/cache.js
let cacheHits = 0;
let cacheMisses = 0;

export function getCacheStats() {
    const total = cacheHits + cacheMisses;
    return {
        hits: cacheHits,
        misses: cacheMisses,
        hitRate: total > 0 ? (cacheHits / total * 100).toFixed(2) : 0
    };
}

// Endpoint to check cache performance
app.get('/imcst_api/cache-stats', (req, res) => {
    res.json(getCacheStats());
});
```

### 2. CDN Performance Tracking

```javascript
// Track CDN vs origin performance
const performanceObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
        if (entry.name.includes('cdn.custom.duniasantri.com')) {
            console.log('CDN load time:', entry.duration);
        }
    });
});

performanceObserver.observe({ entryTypes: ['resource'] });
```

---

## Implementation Checklist

### CDN Setup
- [ ] Configure CloudFront distribution for S3
- [ ] Update S3 service to return CDN URLs
- [ ] Test CDN asset delivery
- [ ] Configure CDN cache rules

### Caching Setup
- [ ] Install and configure Redis
- [ ] Create cache middleware
- [ ] Apply caching to appropriate routes
- [ ] Implement cache invalidation
- [ ] Test cache hit rates

### Nginx Configuration
- [ ] Enable HTTP/2
- [ ] Configure gzip/brotli compression
- [ ] Set cache headers for static assets
- [ ] Test compression ratios

### Service Worker
- [ ] Create service worker
- [ ] Register in production
- [ ] Test offline functionality
- [ ] Monitor service worker errors

### Monitoring
- [ ] Set up cache stats endpoint
- [ ] Monitor CDN performance
- [ ] Track cache hit rates
- [ ] Measure load time improvements

---

## Expected Performance Gains

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial Load | 4s | 1.2s | 70% faster |
| Image Load | 2s | 0.5s | 75% faster |
| API Response | 500ms | 50ms | 90% faster |
| Repeat Visit | 3s | 0.3s | 90% faster |
| Bandwidth | 5MB | 1MB | 80% reduction |

---

## Cache Exclusions (Real-time Data)

**Never cache:**
- Canvas state updates
- Design saves/loads (shop-specific)
- User uploads
- Session data
- Shop-specific configurations
- Real-time pricing calculations

**Short cache (30s-60s):**
- Product lists (if frequently updated)
- Asset lists (if frequently updated)

**Long cache (5min-1hr):**
- Product details (rarely change)
- Asset library (rarely change)
- Shop settings (rarely change)
- Font lists (static)
- Color palettes (static)

---

## Notes

- CDN and caching are transparent to users
- Real-time canvas updates are never cached
- Shop-specific data uses short or no cache
- Static assets cached aggressively
- Cache invalidation ensures data freshness
