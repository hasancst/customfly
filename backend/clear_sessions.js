import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearSessions() {
    try {
        console.log('Clearing all sessions...');
        
        const result = await prisma.session.deleteMany({});
        
        console.log(`✅ Cleared ${result.count} sessions`);
        console.log('Users will need to reinstall or reauthorize the app');
        
    } catch (error) {
        console.error('Error clearing sessions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearSessions();
