const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const sessions = await prisma.session.findMany();
    console.log(`Found ${sessions.length} sessions`);
    sessions.forEach(s => {
        console.log(`- Shop: ${s.shop}, Expires: ${s.expires}, ID: ${s.id.substring(0, 10)}...`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
