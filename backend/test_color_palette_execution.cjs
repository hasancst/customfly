// Simulate exact execution flow
const paletteData = {
  "name": "Test 15 Colors",
  "colors": [
    { "hex": "#000000", "name": "Black" },
    { "hex": "#FFFFFF", "name": "White" },
    { "hex": "#000080", "name": "Navy Blue" },
    { "hex": "#4169E1", "name": "Royal Blue" },
    { "hex": "#FF0000", "name": "Red" },
    { "hex": "#800020", "name": "Burgundy" },
    { "hex": "#228B22", "name": "Forest Green" },
    { "hex": "#4CBB17", "name": "Kelly Green" },
    { "hex": "#800080", "name": "Purple" },
    { "hex": "#E6E6FA", "name": "Lavender" },
    { "hex": "#FFD700", "name": "Gold" },
    { "hex": "#C0C0C0", "name": "Silver" },
    { "hex": "#808080", "name": "Gray" },
    { "hex": "#FFC0CB", "name": "Pink" },
    { "hex": "#FFA500", "name": "Orange" }
  ],
  "category": "Standard"
};

console.log('Input colors count:', paletteData.colors.length);

// Simulate createColorPalette logic
const colorValue = paletteData.colors
  .map(c => `${c.name}|${c.hex}`)
  .join(', ');

console.log('\nFormatted color value:');
console.log(colorValue);
console.log('\nValue length:', colorValue.length);

// Parse back
const colorPairs = colorValue.split(',').map(pair => pair.trim());
console.log('\nParsed colors count:', colorPairs.length);

console.log('\nColors:');
colorPairs.forEach((pair, i) => {
  const [name, hex] = pair.split('|').map(s => s.trim());
  console.log(`${i + 1}. ${name} - ${hex}`);
});
