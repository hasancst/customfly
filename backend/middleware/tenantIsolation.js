import { AsyncLocalStorage } from 'node:async_hooks';

export const tenantContext = new AsyncLocalStorage();

/**
 * Middleware to enforce tenant isolation by extracting and validating the shop domain.
 * This ensures that queries are automatically scoped to the current shop.
 */
export function ensureTenantIsolation(req, res, next) {
    // Extract shop from query, body, or headers
    const shop = (req.query && req.query.shop) ||
        (req.body && req.body.shop) ||
        (req.params && req.params.shop) ||
        req.get('x-shop-domain') ||
        (res.locals.shopify && res.locals.shopify.session && res.locals.shopify.session.shop) ||
        (req.session && req.session.shop);

    // Some routes might be public and not have a shop in session, but should have it in query/headers
    // For admin routes, we might want stricter validation (matching session.shop)

    if (!shop) {
        // If it's a critical imcst_api route that requires shop context
        if (req.baseUrl.startsWith('/imcst_api')) {
            return res.status(400).json({
                error: 'Shop parameter required for tenant isolation'
            });
        }
        return next();
    }

    // Security check: If session exists, verify it matches the requested shop
    if (req.session?.shop && req.session.shop !== shop) {
        console.warn(`[TenantIsolation] Shop mismatch: session(${req.session.shop}) vs request(${shop})`);
        return res.status(403).json({
            error: 'Unauthorized shop access'
        });
    }

    // Store in request for easy access
    req.tenant = { shop };

    // Run the rest of the request within the tenant context
    tenantContext.run({ shop }, () => {
        next();
    });
}
