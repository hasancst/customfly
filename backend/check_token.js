
import "@shopify/shopify-api/adapters/node";
import { shopifyApi } from "@shopify/shopify-api";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-10";
import { PrismaClient } from "@prisma/client";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import 'dotenv/config';

const prisma = new PrismaClient();
const storage = new PrismaSessionStorage(prisma);

const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SCOPES ? process.env.SCOPES.split(",") : [],
    hostName: process.env.SHOPIFY_APP_URL.replace(/https?:\/\//, ""),
    isEmbeddedApp: true,
    apiVersion: "2024-10",
    restResources,
});

async function check() {
    const sessionId = shopify.session.getOfflineId("uploadfly-lab.myshopify.com");
    console.log("Loading session:", sessionId);
    const session = await storage.loadSession(sessionId);
    if (!session) {
        console.log("Session not found");
        return;
    }
    console.log("Session loaded. Access Token:", session.accessToken);
    console.log("Scopes:", session.scope);

    // Check isActive
    const isActive = session.isActive(shopify.config.scopes);
    console.log("isActive(config.scopes):", isActive);
    if (!isActive) {
        console.log("Expected scopes:", shopify.config.scopes.toString());
    }

    // Check Token Validity via GraphQL
    console.log("Checking token validity with GraphQL...");
    const client = new shopify.clients.Graphql({ session });
    try {
        await client.request(`query shopifyAppShopName { shop { name } }`);
        console.log("GraphQL request SUCCEEDED. Token is Valid.");
    } catch (error) {
        console.log("GraphQL request FAILED.");
        if (error.response) {
            console.log("Status:", error.response.code);
            console.log("Errors:", error.response.errors);
        } else {
            console.log("Error:", error);
        }
    }
}

check().catch(console.error);
