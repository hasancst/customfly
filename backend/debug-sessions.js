import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const sessions = await prisma.session.findMany();
    console.log("Found", sessions.length, "sessions");
    sessions.forEach(s => {
        console.log(`- ID: ${s.id}, Shop: ${s.shop}, Scopes: ${s.scope}, Expires: ${s.expires}, User: ${s.userId}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
