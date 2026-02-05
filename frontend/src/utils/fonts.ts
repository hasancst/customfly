/**
 * Cleans an asset or font name by removing raw data fragments (e.g., base64 strings after |)
 * and trimming whitespace.
 */
export const cleanAssetName = (name: string): string => {
    if (!name) return "";
    // Remove everything after the pipe if it exists
    let cleaned = name.split('|')[0].trim();

    // Hard check for raw data fingerprints
    if (cleaned.startsWith('data:') ||
        cleaned.includes('application/') ||
        cleaned.includes(';base64') ||
        (cleaned.length > 50 && !cleaned.includes(' '))) {
        return ""; // Return empty to indicate invalid/garbage
    }

    return cleaned;
};

/**
 * Validates if a string is a credible font name and not raw data.
 */
export const isValidFontName = (name: string): boolean => {
    const n = name.trim();
    if (!n || n.startsWith('data:') || n.length > 60) return false;
    // Strict check: Raw data fragments are long and lack spaces.
    if (n.length > 30 && !n.includes(' ')) return false;
    // Also reject if it looks like raw data
    if (n.includes(';base64')) return false;
    return true;
};

/**
 * Parses font variations from an asset value.
 * ULTRA STRICT: Only accept variations from lines that contain a pipe metadata separator.
 */
export const parseFontVariations = (assetValue: string, assetDefaultName: string) => {
    const variations: { name: string, value: string }[] = [];
    if (!assetValue) return variations;

    const lines = assetValue.split('\n').map((l: string) => l.trim()).filter(Boolean);
    lines.forEach((line: string) => {
        if (line.includes('|')) {
            const [namePart] = line.split('|');
            const name = namePart.trim();
            if (isValidFontName(name)) {
                // IMPORTANT: If cleanAssetName returns empty, we skip it
                const cn = cleanAssetName(name);
                if (cn) {
                    variations.push({ name: cn, value: cn });
                }
            }
        }
    });

    return variations;
};
