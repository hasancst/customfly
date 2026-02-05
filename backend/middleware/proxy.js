import crypto from "crypto";

export function verifyShopifyProxy(req, res, next) {
    const { signature, ...params } = req.query;

    if (!signature) {
        // console.warn("[PROXY] Missing signature");
        return next();
    }

    // Sort parameters alphabetically
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('');

    const hash = crypto
        .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
        .update(sortedParams)
        .digest('hex');

    if (hash !== signature) {
        console.error("[PROXY] Invalid signature verification failed");
        return res.status(401).json({ error: "Invalid signature" });
    }

    // console.log("[PROXY] Signature verified for shop:", params.shop);
    next();
}
