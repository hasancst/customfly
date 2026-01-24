
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function renameColorGroup() {
    try {
        const shop = 'uploadfly-lab.myshopify.com';
        const oldName = 'Standard Colors';
        const newGroupName = 'Customfly Colors';

        console.log(`Updating color group to "${newGroupName}"...`);

        const group = await prisma.asset.findFirst({
            where: {
                shop,
                name: oldName,
                type: 'color'
            }
        });

        if (group) {
            const newConfig = { ...group.config, group: newGroupName };
            await prisma.asset.update({
                where: { id: group.id },
                data: {
                    name: newGroupName, // Update asset name
                    config: newConfig     // Update category group in config
                }
            });
            console.log("Success: Asset name and category group updated.");
        } else {
            // Check if it's already renamed but category is different
            const alreadyRenamed = await prisma.asset.findFirst({
                where: { shop, name: newGroupName, type: 'color' }
            });
            if (alreadyRenamed) {
                const newConfig = { ...alreadyRenamed.config, group: newGroupName };
                await prisma.asset.update({
                    where: { id: alreadyRenamed.id },
                    data: { config: newConfig }
                });
                console.log("Success: Category group updated for already renamed asset.");
            } else {
                console.log(`Error: Group not found.`);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

renameColorGroup();
