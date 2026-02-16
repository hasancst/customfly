/**
 * Standard Paper Sizes in Millimeters (ISO 216 & ANSI Standards)
 * 
 * These are the EXACT real-world dimensions for WYSIWYG (What You See Is What You Get).
 * All values are in millimeters for precision.
 * 
 * Conversion to pixels happens at render time using DPI (96 DPI standard for screens).
 */

export interface PaperSize {
  width: number;  // in millimeters
  height: number; // in millimeters
  label: string;
  description?: string;
}

export const PAPER_SIZES: Record<string, PaperSize> = {
  // Default - 1000px square (not a real paper size, for digital use)
  // Special case: stored as pixels, not millimeters
  'Default': {
    width: 1000,  // Direct pixels (no conversion)
    height: 1000, // Direct pixels (no conversion)
    label: 'Default (1000 × 1000 px)',
    description: 'Square canvas for digital designs'
  },

  // ISO 216 Standard (A Series) - Used worldwide except North America
  'A3': {
    width: 297,
    height: 420,
    label: 'A3 (297 × 420 mm)',
    description: 'Large format, 11.7 × 16.5 inches'
  },
  'A4': {
    width: 210,
    height: 297,
    label: 'A4 (210 × 297 mm)',
    description: 'Standard international paper, 8.27 × 11.69 inches'
  },
  'A5': {
    width: 148,
    height: 210,
    label: 'A5 (148 × 210 mm)',
    description: 'Half of A4, 5.83 × 8.27 inches'
  },
  'A6': {
    width: 105,
    height: 148,
    label: 'A6 (105 × 148 mm)',
    description: 'Postcard size, 4.13 × 5.83 inches'
  },

  // ANSI Standard (North America)
  'Letter': {
    width: 215.9,  // 8.5 inches × 25.4 mm/inch
    height: 279.4, // 11 inches × 25.4 mm/inch
    label: 'Letter (8.5 × 11 in)',
    description: 'US standard paper, 215.9 × 279.4 mm'
  },
  'Legal': {
    width: 215.9,  // 8.5 inches × 25.4 mm/inch
    height: 355.6, // 14 inches × 25.4 mm/inch
    label: 'Legal (8.5 × 14 in)',
    description: 'US legal paper, 215.9 × 355.6 mm'
  },
  'Tabloid': {
    width: 279.4,  // 11 inches × 25.4 mm/inch
    height: 431.8, // 17 inches × 25.4 mm/inch
    label: 'Tabloid (11 × 17 in)',
    description: 'Large format, 279.4 × 431.8 mm'
  },

  // Common Print Sizes
  '4x6': {
    width: 101.6,  // 4 inches × 25.4 mm/inch
    height: 152.4, // 6 inches × 25.4 mm/inch
    label: '4×6 Photo',
    description: 'Standard photo print, 101.6 × 152.4 mm'
  },
  '5x7': {
    width: 127,    // 5 inches × 25.4 mm/inch
    height: 177.8, // 7 inches × 25.4 mm/inch
    label: '5×7 Photo',
    description: 'Photo print, 127 × 177.8 mm'
  },
  '8x10': {
    width: 203.2,  // 8 inches × 25.4 mm/inch
    height: 254,   // 10 inches × 25.4 mm/inch
    label: '8×10 Photo',
    description: 'Large photo print, 203.2 × 254 mm'
  },

  // Business & Marketing
  'BusinessCard': {
    width: 85.6,   // 3.37 inches × 25.4 mm/inch
    height: 53.98, // 2.125 inches × 25.4 mm/inch
    label: 'Business Card (US)',
    description: 'Standard US business card, 85.6 × 53.98 mm'
  },
  'Postcard': {
    width: 101.6,  // 4 inches × 25.4 mm/inch
    height: 152.4, // 6 inches × 25.4 mm/inch
    label: 'Postcard (4×6)',
    description: 'Standard postcard, 101.6 × 152.4 mm'
  },

  // Custom - placeholder, actual dimensions set by user
  'Custom': {
    width: 210,
    height: 297,
    label: 'Custom Size',
    description: 'User-defined dimensions'
  }
};

/**
 * Get paper size dimensions in millimeters
 * Special case: Default returns pixels directly (not mm)
 */
export function getPaperSizeMM(paperSize: string): { width: number; height: number } {
  const size = PAPER_SIZES[paperSize];
  if (!size) {
    return PAPER_SIZES['Default'];
  }
  return { width: size.width, height: size.height };
}

/**
 * Get paper size dimensions in pixels (96 DPI)
 * Special case: Default is already in pixels
 */
export function getPaperSizePX(paperSize: string): { width: number; height: number } {
  // Default is special - already in pixels
  if (paperSize === 'Default') {
    return { width: 1000, height: 1000 };
  }
  
  const MM_TO_PX = 3.7795275591; // 96 DPI: 1mm = 96/25.4 px
  const sizeMM = getPaperSizeMM(paperSize);
  
  return {
    width: sizeMM.width * MM_TO_PX,
    height: sizeMM.height * MM_TO_PX
  };
}

/**
 * Convert millimeters to pixels at 96 DPI
 */
export function mmToPx(mm: number): number {
  return mm * 3.7795275591;
}

/**
 * Convert pixels to millimeters at 96 DPI
 */
export function pxToMm(px: number): number {
  return px / 3.7795275591;
}

/**
 * Convert inches to millimeters
 */
export function inchToMm(inch: number): number {
  return inch * 25.4;
}

/**
 * Convert millimeters to inches
 */
export function mmToInch(mm: number): number {
  return mm / 25.4;
}
