import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const sessions = await prisma.session.findMany();
    sessions.forEach(s => {
        console.log(`Session ID: ${s.id}`);
        console.log(`Shop: ${s.shop}`);
        console.log(`Scope: "${s.scope}"`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
