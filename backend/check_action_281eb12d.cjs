const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAction() {
  try {
    const actionId = '281eb12d-e811-4e8d-bf34-8c4e25e14ec2';
    
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
    console.log('Created:', action.createdAt);
    console.log('\nOutput:');
    console.log(JSON.stringify(action.output, null, 2));
    
    if (action.output.payload) {
      console.log('\nPayload details:');
      console.log(JSON.stringify(action.output.payload, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAction();
