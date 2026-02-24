const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateDefault() {
    try {
        console.log('\n=== Updating baseImageLocked Default Value ===\n');

        // Execute raw SQL to change default value
        await prisma.$executeRaw`
            ALTER TABLE "MerchantConfig" 
            ALTER COLUMN "baseImageLocked" 
            SET DEFAULT true;
        `;

        console.log('✅ Successfully changed baseImageLocked default to true');
        console.log('\nNote: This only affects NEW records.');
        console.log('Existing records with NULL will still be NULL.');
        console.log('Frontend should handle NULL as true (locked by default).\n');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateDefault();
