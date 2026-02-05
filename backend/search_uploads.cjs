
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchUploads() {
    try {
        const query = 'upload-placeholder';
        const uploads = await prisma.designUpload.findMany();
        const matches = uploads.filter(u => JSON.stringify(u).toLowerCase().includes(query.toLowerCase()));
        if (matches.length > 0) {
            console.log(`Found in DesignUpload (${matches.length} matches):`);
            matches.forEach(m => console.log(` - ID: ${m.id}, Filename: ${m.filename}, Url: ${m.url}`));
        } else {
            console.log('Not found in DesignUpload.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

searchUploads();
