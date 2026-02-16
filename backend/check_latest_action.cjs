const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAction() {
  try {
    const actionId = '709a740a-bf9c-4939-9275-b5701395f3b2';
    
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
    console.log('\nOutput:');
    console.log(JSON.stringify(action.output, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAction();
