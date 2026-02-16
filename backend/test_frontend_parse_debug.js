// Test frontend parsing logic
const value = "Fire Engine Red|#CE2029, Cobalt Blue|#0047AB, Sunflower Yellow|#FFDA03, Emerald Green|#50C878, Royal Purple|#7851A9, Tangerine Orange|#F28500, Hot Pink|#FF69B4, Turquoise|#40E0D0, Gold|#FFD700, Silver|#C0C0C0, Navy Blue|#000080, Forest Green|#228B22, Crimson|#DC143C, Teal|#008080, Lavender|#E6E6FA, Chocolate Brown|#7B3F00, Coral|#FF7F50, Slate Gray|#708090, Ivory|#FFFFF0, Charcoal|#36454F";

const safeSplit = (val) => {
    if (!val) return [];
    const lines = val.split('\n').map(l => l.trim()).filter(Boolean);
    console.log('Lines after split by newline:', lines.length);
    console.log('First line:', lines[0]?.substring(0, 100));
    
    if (lines.length === 1 && !lines[0].includes('base64,')) {
        const result = lines[0].split(',').map(s => s.trim()).filter(Boolean);
        console.log('Split by comma, result count:', result.length);
        return result;
    }
    return lines;
};

const parsed = safeSplit(value);
console.log('\nParsed count:', parsed.length);
console.log('\nFirst 3 items:');
parsed.slice(0, 3).forEach((pair, i) => {
    const [name, val] = pair.split('|');
    console.log(`${i + 1}. "${name}" - "${val}"`);
});

// Now test the color parsing
const items = parsed.map(pair => {
    const [name, val] = pair.split('|');
    const isPattern = val?.startsWith('pattern:');
    return {
        name: name?.trim() || '',
        hex: isPattern ? undefined : (val?.trim() || ''),
        isPattern,
        patternUrl: isPattern ? val?.replace('pattern:', '').trim() : undefined,
        id: pair
    };
}).filter(i => i.name);

console.log('\n\nFinal items count:', items.length);
console.log('First 3 items:');
items.slice(0, 3).forEach((item, i) => {
    console.log(`${i + 1}. name="${item.name}", hex="${item.hex}"`);
});
