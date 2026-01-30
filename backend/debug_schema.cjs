const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const configs = await prisma.merchantConfig.findMany({ take: 1 });
        console.log('Sample Config:', JSON.stringify(configs[0], null, 2));

        // Check if new fields exist in the object
        if (configs[0]) {
            const fields = Object.keys(configs[0]);
            console.log('Fields in MerchantConfig:', fields.join(', '));

            const newFields = ['safeAreaRadius', 'safeAreaWidth', 'safeAreaHeight', 'safeAreaOffset'];
            newFields.forEach(f => {
                if (fields.includes(f)) {
                    console.log(`✅ Field ${f} exists`);
                } else {
                    console.log(`❌ Field ${f} MISSING`);
                }
            });
        } else {
            console.log('No configs found in database.');
        }
    } catch (err) {
        console.error('Error checking database:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
