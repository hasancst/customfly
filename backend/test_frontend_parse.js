// Simulate frontend safeSplit logic
const value = "Classic Red|#FF0000, Royal Blue|#0000FF, Sunshine Yellow|#FFFF00, Emerald Green|#00FF00, Pure White|#FFFFFF, Jet Black|#000000, Charcoal Gray|#333333, Soft Pink|#FFC0CB, Violet Purple|#8A2BE2, Orange Burst|#FFA500, Teal Blue|#008080, Gold Metallic|#FFD700, Silver Gray|#C0C0C0, Navy Blue|#000080, Forest Green|#228B22, Coral Pink|#FF7F50, Sky Blue|#87CEEB, Burgundy|#800020, Beige|#F5F5DC, Lavender|#E6E6FA";

const safeSplit = (val) => {
    if (!val) return [];
    const lines = val.split('\n').map(l => l.trim()).filter(Boolean);
    console.log('Lines count:', lines.length);
    console.log('First line:', lines[0]);
    console.log('Includes base64:', lines[0].includes('base64,'));
    
    if (lines.length === 1 && !lines[0].includes('base64,')) {
        const result = lines[0].split(',').map(s => s.trim()).filter(Boolean);
        console.log('\nSplit by comma, result count:', result.length);
        return result;
    }
    return lines;
};

const parsed = safeSplit(value);
console.log('\nFinal parsed count:', parsed.length);
console.log('\nParsed items:');
parsed.forEach((pair, i) => {
    const [name, val] = pair.split('|');
    console.log(`${i + 1}. ${name?.trim()} - ${val?.trim()}`);
});
