const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestUpdateAction() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    
    const action = await prisma.aIAction.findFirst({
      where: {
        shop,
        actionType: 'UPDATE_ASSET'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!action) {
      console.log('No UPDATE_ASSET action found');
      return;
    }
    
    console.log('Action ID:', action.id);
    console.log('Type:', action.actionType);
    console.log('Status:', action.status);
    console.log('Target:', action.target);
    console.log('TargetId:', action.targetId);
    console.log('Created:', action.createdAt);
    console.log('Executed:', action.executedAt);
    console.log('\nInput:');
    console.log(JSON.stringify(action.input, null, 2));
    console.log('\nOutput:');
    console.log(JSON.stringify(action.output, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestUpdateAction();
