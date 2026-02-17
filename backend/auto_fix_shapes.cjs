#!/usr/bin/env node
/**
 * Auto-fix script for shape assets with wrong format
 * Run this after AI creates shape assets to ensure correct format
 * 
 * Usage: node auto_fix_shapes.cjs
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function autoFixShapes() {
  try {
    console.log('🔧 Auto-fixing Shape Assets...\n');

    const allShapes = await prisma.asset.findMany({
      where: { type: 'shape' }
    });

    let fixed = 0;
    let alreadyCorrect = 0;
    
    for (const asset of allShapes) {
      // Check if format is wrong (shapes in config)
      if (asset.config?.shapes && Array.isArray(asset.config.shapes)) {
        console.log(`❌ Wrong format: ${asset.name}`);
        
        const shapesArray = asset.config.shapes;
        console.log(`   Converting ${shapesArray.length} shapes...`);
        
        // Convert to correct format
        const correctValue = shapesArray.map(shape => {
          const name = shape.name || 'Unnamed';
          let svg = shape.svg || '';
          
          // If no svg but has path and viewBox, create SVG from path
          if (!svg && shape.path && shape.viewBox) {
            svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${shape.viewBox}" width="100" height="100"><path d="${shape.path}" fill="currentColor"/></svg>`;
            console.log(`   🔧 Generated SVG for: ${name}`);
          }
          
          // Validate SVG
          if (!svg || !svg.includes('<svg')) {
            console.log(`   ⚠️  Warning: ${name} has invalid SVG, using placeholder`);
            svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="#cccccc"/></svg>';
          }
          
          return `${name}|${svg}`;
        }).join('\n');
        
        // Update the asset
        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            value: correctValue,
            config: {
              source: asset.config.source || 'ai-generated',
              imported: new Date().toISOString(),
              shapeCount: shapesArray.length,
              format: 'name|svg (newline separated)'
            }
          }
        });
        
        console.log(`   ✅ Fixed!\n`);
        fixed++;
      } else {
        // Check if value format is correct
        const lines = asset.value.split('\n').filter(Boolean);
        if (lines.length > 0) {
          const firstLine = lines[0];
          const parts = firstLine.split('|');
          if (parts.length >= 2) {
            alreadyCorrect++;
          }
        }
      }
    }
    
    console.log('═'.repeat(60));
    console.log('📊 Summary:');
    console.log('═'.repeat(60));
    console.log(`✅ Already correct: ${alreadyCorrect}`);
    console.log(`🔧 Fixed: ${fixed}`);
    console.log(`📦 Total: ${allShapes.length}`);
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

autoFixShapes()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
