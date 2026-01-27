const { PrismaClient } = require('@prisma/client');
const { shopifyApi } = require('@shopify/shopify-api');
require('dotenv').config();

const prisma = new PrismaClient();

async function test() {
    const sessionData = await prisma.session.findFirst({
        where: { shop: 'uploadfly-lab.myshopify.com', isOnline: false }
    });

    if (!sessionData) {
        console.log("No session found");
        return;
    }

    const shopify = shopifyApi({
        apiKey: process.env.SHOPIFY_API_KEY,
        apiSecretKey: process.env.SHOPIFY_API_SECRET,
        scopes: process.env.SCOPES.split(','),
        hostName: 'custom.duniasantri.com',
        apiVersion: '2024-10',
        isEmbeddedApp: true
    });

    const session = new (require('@shopify/shopify-api').Session)(sessionData);
    const client = new shopify.clients.Graphql({ session });

    const queryString = `
            query {
                products(first: 50) {
                    edges {
                        node {
                            id
                            title
                            status
                        }
                    }
                }
            }
        `;

    try {
        const response = await client.request(queryString);
        console.log("GraphQL Response edges length:", response.data.products.edges.length);
        response.data.products.edges.forEach(e => {
            console.log(`- ${e.node.title} (${e.node.status})`);
        });
    } catch (e) {
        console.error("Test failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

test();
