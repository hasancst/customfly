import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSessions() {
    try {
        const sessions = await prisma.session.findMany({
            select: {
                id: true,
                shop: true,
                state: true,
                isOnline: true,
                expires: true
            }
        });
        
        console.log(`Found ${sessions.length} sessions:`);
        sessions.forEach(session => {
            console.log({
                id: session.id,
                shop: session.shop,
                isOnline: session.isOnline,
                expires: session.expires,
                expired: session.expires ? new Date(session.expires) < new Date() : 'N/A'
            });
        });
        
    } catch (error) {
        console.error('Error checking sessions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSessions();
