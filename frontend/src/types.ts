export type MonogramType = 'Diamond' | 'Circle' | 'Round' | 'Scallop' | 'Stacked' | 'Vine';

export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'field' | 'swatch' | 'phone' | 'date' | 'map' | 'monogram' | 'gallery' | 'textarea' | 'file_upload' | 'product_color' | 'dropdown' | 'button' | 'checkbox' | 'number' | 'time';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  enableBounce?: boolean;

  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  italic?: boolean;
  underline?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  fillType?: 'solid' | 'gradient';
  gradient?: {
    from: string;
    to: string;
  };
  strokeColor?: string;
  strokeWidth?: number;
  curve?: number;
  isCurved?: boolean;
  textMode?: 'shrink' | 'wrap';
  maxChars?: number;
  textCase?: 'none' | 'uppercase' | 'lowercase';
  textType?: 'all' | 'numbers';
  bridge?: {
    curve: number;
    offsetY: number;
    bottom: number;
    trident: boolean;
    oblique: boolean;
  };

  // Image specific
  src?: string;
  removeBg?: boolean;
  removeBgDeep?: number;
  removeBgMode?: 'light' | 'dark';
  removeBgType?: 'js' | 'rembg';
  imageFilters?: {
    brightness?: number; // 0 to 200, default 100
    contrast?: number;   // 0 to 200, default 100
    saturate?: number;   // 0 to 200, default 100
    hueRotate?: number;  // 0 to 360, default 0
    sepia?: number;      // 0 to 100, default 0
    grayscale?: number;  // 0 to 100, default 0
    preset?: string;     // 'bnw', 'vintage', etc.
  };

  // Field specific
  fieldType?: 'text' | 'email' | 'number' | 'textarea';
  placeholder?: string;
  label?: string;

  // Swatch specific
  swatchColors?: string[];
  selectedColor?: string;

  // Phone specific
  phoneNumber?: string;
  countryCode?: string;

  // Date specific
  dateValue?: string;
  dateFormat?: string;

  // Map specific
  mapLocation?: string;
  mapZoom?: number;
  latitude?: number;
  longitude?: number;
  // Monogram specific
  monogramType?: MonogramType;

  // Gallery specific
  galleryMode?: 'all' | 'categorized';
  galleryMaxImages?: number;
  gallerySourceIds?: string[]; // IDs of selected gallery assets
}

export interface ProductVariant {
  color: string;
  size: string;
  material: string;
}
