import fs from 'fs';
import { shopify } from './config/shopify.js';
import prisma from './config/database.js';

async function main() {
  const session = await prisma.session.findFirst({ where: { shop: 'uploadfly-lab.myshopify.com' } });
  const client = new shopify.api.clients.Graphql({ session });
  const query = `
    {
      __type(name: "ProductVariantsBulkInput") {
        inputFields {
          name
        }
      }
    }
  `;
  const res = await client.request(query);
  console.log(JSON.stringify(res.data.__type.inputFields.map(f => f.name)));
  await prisma.$disconnect();
}

main().catch(console.error);
