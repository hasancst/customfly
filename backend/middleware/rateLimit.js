import rateLimit from "express-rate-limit";

export const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: "Too many uploads from this IP, please try again after 15 minutes" }
});
