import express from "express";
import prisma from "../config/database.js";
import cache from "../config/cache.js";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";
import { transformAssetValue } from "../config/s3.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();

// Admin: Get Assets
router.get("/assets", async (req, res) => {
    try {
        const { type } = req.query;
        const shop = res.locals.shopify.session.shop;
        const cacheKey = `assets_${shop}_${type || 'all'}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const where = { shop };
        if (type) where.type = type;
        const assets = await prisma.asset.findMany({ where, orderBy: { createdAt: 'desc' } });
        const transformed = assets.map(a => ({ ...a, value: transformAssetValue(a.value) }));
        cache.set(cacheKey, transformed);
        res.json(transformed);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Create Asset
router.post("/assets", async (req, res) => {
    try {
        const { type, name, value, config } = req.body;
        const shop = res.locals.shopify.session.shop;
        if (!type || !name || value === undefined) return res.status(400).json({ error: "Type, name, and value required" });
        const asset = await prisma.asset.create({
            data: { shop, type, name, value, config: config || {} }
        });
        cache.del(`assets_${shop}_all`);
        cache.del(`assets_${shop}_${type}`);
        res.json({ ...asset, value: transformAssetValue(asset.value) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Update Asset
router.put("/assets/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, value, config } = req.body;
        const shop = res.locals.shopify.session.shop;
        const asset = await prisma.asset.findFirst({ where: { id, shop } });
        if (!asset) return res.status(404).json({ error: "Asset not found" });

        const dataToUpdate = {};
        if (name !== undefined) dataToUpdate.name = name;
        if (value !== undefined) dataToUpdate.value = value;
        if (config !== undefined) dataToUpdate.config = config;

        const updatedAsset = await prisma.asset.update({ where: { id }, data: dataToUpdate });
        cache.del(`assets_${shop}_all`);
        cache.del(`assets_${shop}_${asset.type}`);
        res.json({ ...updatedAsset, value: transformAssetValue(updatedAsset.value) });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Admin: Update Asset (Name, Value, Config)
router.put("/assets/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const shop = res.locals.shopify.session.shop;
        const { name, value, label, config } = req.body;
        
        // Find the asset
        const asset = await prisma.asset.findFirst({ where: { id, shop } });
        if (!asset) return res.status(404).json({ error: "Asset not found" });

        // Update the asset
        const updatedAsset = await prisma.asset.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(value !== undefined && { value }),
                ...(label !== undefined && { label }),
                ...(config !== undefined && { config }),
                updatedAt: new Date()
            }
        });

        // Clear cache
        cache.del(`assets_${shop}_all`);
        cache.del(`assets_${shop}_${asset.type}`);

        res.json({ 
            success: true, 
            message: `Updated ${asset.type} "${updatedAsset.name}"`,
            asset: updatedAsset
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Delete Asset (Group)
// When deleting a group, all items within it are also deleted
router.delete("/assets/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const shop = res.locals.shopify.session.shop;
        
        // Find the asset to delete
        const asset = await prisma.asset.findFirst({ where: { id, shop } });
        if (!asset) return res.status(404).json({ error: "Asset not found" });

        // Delete the asset
        await prisma.asset.delete({ where: { id } });

        // Clear cache
        cache.del(`assets_${shop}_all`);
        cache.del(`assets_${shop}_${asset.type}`);

        res.json({ 
            success: true, 
            message: `Deleted ${asset.type} group "${asset.name}"`,
            deletedAsset: asset
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Set Default Asset
router.put("/assets/:id/set-default", async (req, res) => {
    try {
        const { id } = req.params;
        const shop = res.locals.shopify.session.shop;
        
        const asset = await prisma.asset.findFirst({ where: { id, shop } });
        if (!asset) return res.status(404).json({ error: "Asset not found" });

        // Unset all other defaults of the same type
        await prisma.asset.updateMany({
            where: { shop, type: asset.type, isDefault: true },
            data: { isDefault: false }
        });

        // Set this one as default
        const updatedAsset = await prisma.asset.update({
            where: { id },
            data: { isDefault: true }
        });

        // Clear cache
        cache.del(`assets_${shop}_all`);
        cache.del(`assets_${shop}_${asset.type}`);

        res.json({ 
            success: true,
            asset: { ...updatedAsset, value: transformAssetValue(updatedAsset.value) }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
