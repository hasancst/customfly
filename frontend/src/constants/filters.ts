export interface ImageFilter {
    id: string;
    name: string;
    filter: string;
}

export const IMAGE_PRESETS: ImageFilter[] = [
    { id: 'none', name: 'Original', filter: 'none' },
    { id: 'bnw', name: 'B&W', filter: 'grayscale(100%)' },
    { id: 'vintage', name: 'Vintage', filter: 'sepia(50%) contrast(110%) brightness(90%)' },
    { id: 'vivid', name: 'Vivid', filter: 'saturate(150%) contrast(110%)' },
    { id: 'aqua', name: 'Aqua', filter: 'hue-rotate(180deg) saturate(120%)' },
    { id: 'amber', name: 'Amber', filter: 'sepia(40%) saturate(150%) hue-rotate(-15deg)' },
    { id: 'purple', name: 'Purple', filter: 'hue-rotate(270deg) saturate(130%)' },
    { id: 'vibrant', name: 'Vibrant', filter: 'contrast(120%) saturate(180%)' },
    { id: 'cool', name: 'Cool', filter: 'hue-rotate(30deg) saturate(90%) contrast(110%)' },
    { id: 'warm', name: 'Warm', filter: 'sepia(30%) hue-rotate(-30deg) saturate(140%)' },
    { id: 'dramatic', name: 'Dramatic', filter: 'contrast(150%) brightness(80%) grayscale(20%)' },
    { id: 'retro', name: 'Retro', filter: 'sepia(80%) contrast(80%) brightness(110%)' },
    { id: 'noir', name: 'Noir', filter: 'grayscale(100%) contrast(160%) brightness(80%)' },
    { id: 'fade', name: 'Fade', filter: 'brightness(110%) saturate(70%) contrast(90%)' },
    { id: 'monochrome', name: 'Monochrome', filter: 'grayscale(100%) sepia(20%) brightness(110%)' },
];
