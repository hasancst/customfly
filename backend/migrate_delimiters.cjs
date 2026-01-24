
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAssetDelimiters() {
    try {
        console.log("Migrating asset delimiters from comma to newline for base64 safety...");
        const assets = await prisma.asset.findMany({
            where: {
                OR: [
                    { type: 'gallery' },
                    { type: 'color' },
                    { type: 'font' }
                ]
            }
        });

        for (const asset of assets) {
            let value = asset.value;
            if (!value) continue;

            // Pattern: if it's already using newlines, it's mostly fine
            // If it uses commas and contains base64, we need to be careful

            let items = [];
            if (value.includes('base64,')) {
                // Heuristic: split by what looks like an item start "Name|" or "Font Name"
                // For gallery: "Name|data:..."
                // For color: "Name|#hex" or "Name|pattern:data:..."

                // Since this is tricky, let's use a simpler approach:
                // We know items are separated by ", " (comma space) usually
                // Base64 comma is NEVER followed by a space in our code (canvas.toDataURL)

                if (value.includes(', ')) {
                    items = value.split(', ');
                } else {
                    // Fallback to split by newline if already migrated
                    items = value.split('\n').map(i => i.trim()).filter(Boolean);
                }
            } else {
                // Legacy non-base64 data
                items = value.split(/[,\n]/).map(i => i.trim()).filter(Boolean);
            }

            const newValue = items.join('\n');

            if (newValue !== value) {
                console.log(`Updating asset ${asset.id} (${asset.name}): Commas -> Newlines`);
                await prisma.asset.update({
                    where: { id: asset.id },
                    data: { value: newValue }
                });
            }
        }
        console.log("Migration complete.");
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fixAssetDelimiters();
