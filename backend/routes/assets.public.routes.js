import express from "express";
import prisma from "../config/database.js";
import { transformAssetValue } from "../config/s3.js";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();

// Public: Get Assets
router.get("/public/assets", async (req, res) => {
    try {
        const { shop, type } = req.query;
        if (!shop) return res.status(400).json({ error: "Shop parameter required" });
        const where = { shop };
        if (type) where.type = type;
        const assets = await prisma.asset.findMany({ where, orderBy: { createdAt: 'desc' } });
        const transformed = assets.map(a => ({ ...a, value: transformAssetValue(a.value) }));
        res.json(transformed);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Asset: Background Removal (Public access allowed)
router.post("/remove-bg", async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: "No image provided" });
        let inputBuffer;
        if (image.startsWith('data:image')) {
            inputBuffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        } else {
            const resp = await fetch(image);
            inputBuffer = Buffer.from(await resp.arrayBuffer());
        }

        const pyPath = resolve(__dirname, "../venv/bin/python3");
        const scriptPath = resolve(__dirname, "../remove_bg.py");
        const pyProcess = spawn(pyPath, [scriptPath], { cwd: dirname(scriptPath) });

        let outputBuffer = Buffer.alloc(0);
        let errorOutput = "";
        pyProcess.stdin.write(inputBuffer);
        pyProcess.stdin.end();
        pyProcess.stdout.on('data', (data) => outputBuffer = Buffer.concat([outputBuffer, data]));
        pyProcess.stderr.on('data', (data) => errorOutput += data.toString());
        pyProcess.on('error', (err) => {
            console.error("Failed to start BG removal process:", err);
            if (!res.headersSent) {
                res.status(500).json({ error: "Failed to start background removal", details: err.message });
            }
        });

        pyProcess.on('close', (code) => {
            if (code !== 0) {
                if (!res.headersSent) {
                    return res.status(500).json({ error: "BG removal failed", details: errorOutput });
                }
                return;
            }
            if (!res.headersSent) {
                res.json({ image: `data:image/png;base64,${outputBuffer.toString('base64')}` });
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
