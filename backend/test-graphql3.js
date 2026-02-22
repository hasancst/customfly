import { shopify } from './config/shopify.js';
import prisma from './config/database.js';

async function main() {
    const session = await prisma.session.findFirst({ where: { shop: 'uploadfly-lab.myshopify.com' } });
    const client = new shopify.api.clients.Graphql({ session });

    const schemaQuery2 = `
    {
      __type(name: "InventoryItemInput") {
        inputFields {
          name
        }
      }
    }
  `;
    const res2 = await client.request(schemaQuery2);
    console.log("Item Input:", JSON.stringify(res2.data.__type.inputFields.map(f => f.name)));

    await prisma.$disconnect();
}

main().catch(console.error);
