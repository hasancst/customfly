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
  galleryMode?: 'categorized' | 'all';
  galleryCategories?: string[]; // Array of category names
  galleryMaxImages?: number;
  gallerySource?: 'user_upload' | 'predefined' | 'both'; // Source of images
  gallerySourceIds?: string[]; // IDs of selected gallery assets (if predefined)
}

export interface ProductVariant {
  color: string;
  size: string;
  material: string;
}
