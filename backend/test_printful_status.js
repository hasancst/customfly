import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testStatus() {
  try {
    const shop = 'uploadfly-lab.myshopify.com';
    
    console.log('Testing Printful status for shop:', shop);
    console.log('');
    
    // Test 1: Direct query without middleware
    console.log('=== Test 1: Direct Query ===');
    const connection = await prisma.printfulConnection.findUnique({
      where: { shop }
    });
    console.log('Connection found:', !!connection);
    console.log('Connection data:', JSON.stringify(connection, null, 2));
    console.log('');
    
    // Test 2: Query with select (like in API)
    console.log('=== Test 2: Query with Select ===');
    const connectionSelect = await prisma.printfulConnection.findUnique({
      where: { shop },
      select: {
        connected: true,
        storeId: true,
        createdAt: true,
        updatedAt: true
      }
    });
    console.log('Connection found:', !!connectionSelect);
    console.log('Connection data:', JSON.stringify(connectionSelect, null, 2));
    console.log('');
    
    // Test 3: List all connections
    console.log('=== Test 3: All Connections ===');
    const allConnections = await prisma.printfulConnection.findMany();
    console.log('Total connections:', allConnections.length);
    allConnections.forEach((conn, i) => {
      console.log(`Connection ${i + 1}:`, {
        shop: conn.shop,
        connected: conn.connected,
        storeId: conn.storeId
      });
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testStatus();
