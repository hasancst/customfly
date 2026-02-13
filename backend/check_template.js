import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  const template = await prisma.savedDesign.findFirst({
    where: {
      shop: 'uploadfly-lab.myshopify.com',
      shopifyProductId: '8214119219234',
      isTemplate: true
    },
    orderBy: { updatedAt: 'desc' }
  });
  
  console.log('Template found:', !!template);
  if (template) {
    console.log('Template ID:', template.id);
    console.log('Elements count:', template.designJson?.[0]?.elements?.length || 0);
    if (template.designJson?.[0]?.elements) {
      console.log('Elements:', JSON.stringify(template.designJson[0].elements.map(e => ({ 
        type: e.type, 
        label: e.label,
        id: e.id 
      })), null, 2));
    }
  } else {
    console.log('No template found for this product');
  }
  
  await prisma.$disconnect();
})();
