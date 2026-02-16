const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAction() {
  try {
    const actionId = '2faa9646-8d37-4c81-98d5-332c321e8ee1';
    
    const action = await prisma.aIAction.findUnique({
      where: { id: actionId }
    });
    
    if (!action) {
      console.log('Action not found');
      return;
    }
    
    console.log('Action Details:');
    console.log('ID:', action.id);
    console.log('Type:', action.actionType);
    console.log('Status:', action.status);
    console.log('Output:', JSON.stringify(action.output, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAction();
