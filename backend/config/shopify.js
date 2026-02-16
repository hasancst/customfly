import { shopifyApp } from "@shopify/shopify-app-express";
import { restResources } from "@shopify/shopify-api/rest/admin/2026-01";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./database.js";

// Session storage with logging
const baseStorage = new PrismaSessionStorage(prisma);
const loggingStorage = {
    async storeSession(session) {
        // console.log(`[SESSION] Storing session: ${session.id} for shop: ${session.shop}`);
        return await baseStorage.storeSession(session);
    },
    async loadSession(id) {
        // console.log(`[SESSION] Loading session: ${id}`);
        const session = await baseStorage.loadSession(id);
        if (session && session.shop) {
            // console.log(`[SESSION] Loaded session for shop: ${session.shop}`);
        }
        return session;
    },
    async deleteSession(id) {
        // console.log(`[SESSION] Deleting session: ${id}`);
        return await baseStorage.deleteSession(id);
    },
    async deleteSessions(ids) {
        // console.log(`[SESSION] Deleting sessions: ${ids.join(', ')}`);
        return await baseStorage.deleteSessions(ids);
    },
    async findSessionsByShop(shop) {
        // console.log(`[SESSION] Finding sessions for shop: ${shop}`);
        return await baseStorage.findSessionsByShop(shop);
    }
};

export const shopify = shopifyApp({
    api: {
        apiVersion: "2026-01",
        apiKey: process.env.SHOPIFY_API_KEY,
        apiSecretKey: process.env.SHOPIFY_API_SECRET,
        scopes: process.env.SCOPES?.split(",") || [],
        hostName: process.env.SHOPIFY_APP_URL?.replace(/https?:\/\//, "") || "",
        restResources,
    },
    auth: {
        path: "/api/auth",
        callbackPath: "/api/auth/callback",
    },
    webhooks: {
        path: "/api/webhooks",
    },
    sessionStorage: loggingStorage,
    isEmbeddedApp: true, // Enable embedded mode for production-like development testing
    useOnlineTokens: false,
    hooks: {
        afterAuth: async ({ session }) => {
            console.log("[Auth] Completed for shop:", session.shop);
            shopify.registerWebhooks({ session });
            
            // Fetch and store shop locale for AI language detection
            try {
                const client = new shopify.clients.Graphql({ session });
                const shopQuery = `
                    query {
                        shop {
                            primaryDomain {
                                host
                            }
                            currencyCode
                            ianaTimezone
                            enabledPresentmentCurrencies
                        }
                    }
                `;
                
                const response = await client.request(shopQuery);
                
                // Store locale in session (we'll use a simple approach)
                // Note: Shopify doesn't directly expose shop language in GraphQL
                // We'll infer from shop domain or use default
                const shopDomain = response.data?.shop?.primaryDomain?.host || session.shop;
                
                // Simple heuristic: if domain contains .id or shop name suggests Indonesian
                let locale = 'en-US'; // Default to English
                if (shopDomain.includes('.id') || session.shop.includes('.id')) {
                    locale = 'id-ID';
                }
                
                // Store in database for later retrieval
                const { PrismaClient } = await import('@prisma/client');
                const prisma = new PrismaClient();
                
                await prisma.session.updateMany({
                    where: { shop: session.shop },
                    data: { locale }
                });
                
                await prisma.$disconnect();
                
                console.log("[Auth] Stored shop locale:", locale, "for shop:", session.shop);
            } catch (error) {
                console.error("[Auth] Failed to fetch/store shop locale:", error.message);
            }
        },
    },
});

export default shopify;
