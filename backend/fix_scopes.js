import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const sessions = await prisma.session.findMany();
    for (const session of sessions) {
        if (session.scope && session.scope.includes(',')) {
            const newScope = session.scope.replace(/,/g, ' ');
            console.log(`Updating session ${session.id}: "${session.scope}" -> "${newScope}"`);
            await prisma.session.update({
                where: { id: session.id },
                data: { scope: newScope }
            });
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
