
import { PrismaClient } from "@prisma/client";
import 'dotenv/config';

const prisma = new PrismaClient();

async function run() {
    const id = "offline_uploadfly-lab.myshopify.com";
    console.log("Deleting session:", id);
    try {
        await prisma.session.delete({
            where: { id }
        });
        console.log("Deleted successfully.");
    } catch (e) {
        console.log("Error deleting (maybe not found):", e.message);
    }
}

run();
