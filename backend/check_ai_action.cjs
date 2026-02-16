const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAction() {
  try {
    const action = await prisma.aIAction.findUnique({
      where: { id: '01d7c02a-2937-4b91-af1c-2b01d64b808c' }
    });

    console.log('Action Details:');
    console.log(JSON.stringify(action, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAction();
