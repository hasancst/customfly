import express from "express";
import prisma from "../config/database.js";

const router = express.Router();

// Get all promo codes
router.get("/promo_codes", async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const codes = await prisma.promoCode.findMany({
            where: { shop },
            orderBy: { createdAt: 'desc' }
        });
        res.json(codes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create or Update promo code
router.post("/promo_codes", async (req, res) => {
    try {
        const shop = res.locals.shopify.session.shop;
        const { id, code, discountType, discountValue, active, minOrderAmount, usageLimit } = req.body;

        if (!code) return res.status(400).json({ error: "Code is required" });

        if (id) {
            const updated = await prisma.promoCode.update({
                where: { id },
                data: {
                    code: code.toUpperCase(),
                    discountType,
                    discountValue: parseFloat(discountValue) || 0,
                    active: active !== undefined ? active : true,
                    minOrderAmount: parseFloat(minOrderAmount) || null,
                    usageLimit: parseInt(usageLimit) || null
                }
            });
            return res.json(updated);
        } else {
            const created = await prisma.promoCode.create({
                data: {
                    shop,
                    code: code.toUpperCase(),
                    discountType,
                    discountValue: parseFloat(discountValue) || 0,
                    active: active !== undefined ? active : true,
                    minOrderAmount: parseFloat(minOrderAmount) || null,
                    usageLimit: parseInt(usageLimit) || null
                }
            });
            return res.json(created);
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete promo code
router.delete("/promo_codes/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const shop = res.locals.shopify.session.shop;
        await prisma.promoCode.deleteMany({ where: { id, shop } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
