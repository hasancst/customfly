const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAssets() {
  const shop = 'uploadfly-lab.myshopify.com';
  
  const fonts = await prisma.asset.findMany({
    where: { shop, type: 'font' },
    select: { id: true, name: true, value: true, config: true, label: true }
  });
  
  const colors = await prisma.asset.findMany({
    where: { shop, type: 'color' },
    select: { id: true, name: true, value: true, config: true, label: true }
  });
  
  const gallery = await prisma.asset.findMany({
    where: { shop, type: 'gallery' },
    select: { id: true, name: true, value: true, config: true, label: true }
  });
  
  const shapes = await prisma.asset.findMany({
    where: { shop, type: 'shape' },
    select: { id: true, name: true, value: true, config: true, label: true }
  });
  
  console.log('=== FONTS ===');
  console.log('Count:', fonts.length);
  fonts.slice(0, 3).forEach(f => console.log(JSON.stringify(f, null, 2)));
  
  console.log('\n=== COLORS ===');
  console.log('Count:', colors.length);
  colors.slice(0, 3).forEach(c => console.log(JSON.stringify(c, null, 2)));
  
  console.log('\n=== GALLERY ===');
  console.log('Count:', gallery.length);
  gallery.slice(0, 3).forEach(g => console.log(JSON.stringify(g, null, 2)));
  
  console.log('\n=== SHAPES ===');
  console.log('Count:', shapes.length);
  shapes.slice(0, 3).forEach(s => console.log(JSON.stringify(s, null, 2)));
  
  await prisma.$disconnect();
}

checkAssets().catch(console.error);
