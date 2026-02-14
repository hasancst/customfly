import rateLimit from "express-rate-limit";

export const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: "Too many uploads from this IP, please try again after 15 minutes" }
});

export const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 requests per hour per shop/session
    message: { error: "AI usage limit reached for this hour. Please try again later." }
});
