export const parseAssetColors = (value: string) => {
    if (!value) return [];
    const colors: { name: string, value: string }[] = [];
    const lines = value.split('\n').filter(Boolean);

    lines.forEach(line => {
        if (line.includes('|')) {
            const [name, val] = line.split('|');
            const cleanVal = val.trim();
            if (/^#[0-9A-Fa-f]{3,6}$/.test(cleanVal)) {
                colors.push({ name: name.trim(), value: cleanVal });
            }
        } else {
            const cleanVal = line.trim();
            if (/^#[0-9A-Fa-f]{3,6}$/.test(cleanVal)) {
                colors.push({ name: cleanVal, value: cleanVal });
            }
        }
    });

    return colors;
};
