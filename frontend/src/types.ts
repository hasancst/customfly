export type MonogramType = 'Diamond' | 'Circle' | 'Round' | 'Scallop' | 'Stacked' | 'Vine';

export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'field' | 'swatch' | 'phone' | 'date' | 'map' | 'monogram' | 'gallery' | 'textarea' | 'file_upload' | 'product_color' | 'dropdown' | 'button' | 'checkbox' | 'number' | 'time' | 'shape';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  enableBounce?: boolean;
  locked?: boolean;
  lockMove?: boolean;
  lockResize?: boolean;
  lockRotate?: boolean;
  lockDelete?: boolean;
  lockDuplicate?: boolean;

  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  letterSpacing?: number;
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
  bridge?: {
    curve: number;
    offsetY: number;
    bottom: number;
    trident: boolean;
    oblique: boolean;
  };

  productId?: string;
  pricingConfigComponent?: React.ReactNode;
  handle?: string;
  shop?: string;

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
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  maskShape?: string; // Path/SVG for masking
  maskViewBox?: string; // viewBox for masking
  allowedShapeGroups?: string[];
  lockAspectRatio?: boolean;

  // Engraving specific
  isEngraved?: boolean;
  engraveThreshold?: number; // 0-255
  engraveColor?: string; // Color of the "engraving"
  engraveInvert?: boolean;

  // Field specific
  fieldType?: 'text' | 'email' | 'number' | 'textarea';
  placeholder?: string;
  label?: string;
  showLabel?: boolean; // Controls if label is shown in public frontend

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

  // File Upload specific
  allowedFileTypes?: string[]; // ['.jpg', '.png', '.pdf', '.ai', etc]
  maxFileSize?: number; // Size in MB
  // Dropdown specific
  dropdownOptions?: string[];
  linkedAssetId?: string;
  isRequired?: boolean;
  buttonOptions?: string[];
  enabledOptions?: string[];
  checkboxOptions?: string[];
  enabledCheckboxOptions?: string[];
  isMultiple?: boolean;
  minSelection?: number;
  maxSelection?: number;
  showOtherOption?: boolean;
  buttonStyle?: 'solid' | 'outline' | 'soft';
  buttonShape?: 'square' | 'rounded' | 'pill';
  dropdownStyle?: 'classic' | 'outline' | 'soft';
  isSearchable?: boolean;
  helpText?: string;
  swatchShape?: 'circle' | 'square' | 'rounded';
  minValue?: number;
  maxValue?: number;
  stepValue?: number;
  defaultValue?: number | string;
  numberPrefix?: string;
  numberSuffix?: string;
  hideLabel?: boolean;
  isEditableByCustomer?: boolean;
  logic?: ElementLogic;
  svgCode?: string;
  outputSettings?: OutputSettings;
  fontAssetId?: string;
  colorAssetId?: string;
  disableCustomColors?: boolean;
  disableGradients?: boolean;
  disableRotation?: boolean;
  disableOpacity?: boolean;
  disableTextCase?: boolean;
  disableTextAlign?: boolean;
  disableFontSize?: boolean;
  disableFontFamily?: boolean;
  disableTextDecoration?: boolean;
  disableColorPickerUI?: boolean;
}

export interface OutputSettings {
  fileType: 'png' | 'jpg' | 'jpeg' | 'pdf' | 'svg' | 'ai' | 'eps';
  dpi: number;
  includeBaseMockup: boolean; // "Full output base mockup and option" vs "Option only"
  includeOriginalFile: boolean; // Include original uploaded file
  separateFilesByType?: boolean; // Export separated files for text, images, etc.
}

export interface VisibilityRule {
  id: string;
  sourceType: 'shopify_variant' | 'shopify_option' | 'element_value';
  sourceKey: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface ElementLogic {
  rules: VisibilityRule[];
  matchType: 'all' | 'any';
  action: 'show' | 'hide';
}

export interface ShopifyVariant {
  id: string;
  title: string;
  price: string;
  sku?: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  image?: string | null;
}

export interface ShopifyOption {
  name: string;
  position: number;
  values: string[];
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle?: string;
  shop?: string;
  variants: ShopifyVariant[];
  options: ShopifyOption[];
  images: string[];
}

export interface ProductVariant {
  color: string;
  size: string;
  material: string;
}

export interface PageData {
  id: string;
  name: string;
  elements: CanvasElement[];
  baseImage?: string;
  baseImageProperties?: {
    x: number;
    y: number;
    scale: number;
    width?: number;
    height?: number;
    crop?: { x: number; y: number; width: number; height: number };
  };
  baseImageColor?: string;
  baseImageColorEnabled?: boolean;
  useVariantImage?: boolean;
  baseImageAsMask?: boolean;
  baseImageMaskInvert?: boolean;
  variantBaseImages?: Record<string, string>; // Mapping of Variant ID -> Mockup URL
}
