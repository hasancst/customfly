import React from 'react';
import {
  Layers,
  RotateCcw,
  Trash2,
  Grid3x3,
  Ruler,
  ChevronRight,
  Palette,
  Settings,
  ShoppingBag,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { CanvasElement } from '../types';

interface SummaryProps {
  elements: CanvasElement[];
  selectedElement: string | null;
  onSelectElement: (id: string | null) => void;
  onDeleteElement: (id: string) => void;
  showSafeArea: boolean;
  onToggleSafeArea: () => void;
  safeAreaPadding?: number;
  onSafeAreaPaddingChange?: (val: number) => void;
  safeAreaRadius: number;
  onSafeAreaRadiusChange: (val: number) => void;
  safeAreaOffset: { x: number, y: number };
  onResetSafeAreaOffset: () => void;
  onToggleRulers: () => void;
  showRulers: boolean;
  unit: 'cm' | 'mm' | 'inch';
  onUnitChange: (unit: 'cm' | 'mm' | 'inch') => void;
  paperSize: string;
  onPaperSizeChange: (val: string) => void;
  customPaperDimensions: { width: number, height: number };
  onCustomPaperDimensionsChange: (val: { width: number, height: number }) => void;
  onReset?: () => void;
  userColors: any[];
  userFonts?: any[];
  userOptions?: any[];
  userGalleries?: any[];
  selectedBaseColorAssetId: string | null;
  onSelectedBaseColorAssetIdChange: (id: string | null) => void;
  selectedElementColorAssetId: string | null;
  onSelectedElementColorAssetIdChange: (id: string | null) => void;
  selectedFontAssetId?: string | null;
  onSelectedFontAssetIdChange?: (id: string | null) => void;
  selectedOptionAssetId?: string | null;
  onSelectedOptionAssetIdChange?: (id: string | null) => void;
  selectedGalleryAssetId?: string | null;
  onSelectedGalleryAssetIdChange?: (id: string | null) => void;
  activeBasePaletteColors: { name: string, value: string }[];
  onToggleSummary: () => void;
  baseImageColorEnabled: boolean;
  onBaseImageColorEnabledChange?: (enabled: boolean) => void;
  baseImageColor?: string;
  onBaseImageColorChange?: (color: string) => void;
  shopifyOptions?: any[];
  shopifyVariants?: any[];
  selectedVariantId?: string;
  onVariantChange?: (id: string) => void;
  outputSettings?: any;
  onProductOutputSettingsChange?: (settings: any) => void;
  onOptionChange?: (index: number, value: string) => void;
  isPublicMode?: boolean;
  selectedShapeAssetId?: string | null;
  onSelectedShapeAssetIdChange?: (id: string | null) => void;
  onToggleBaseImageAsMask?: (enabled: boolean) => void;
  onToggleBaseImageMaskInvert?: (enabled: boolean) => void;
  baseImageAsMask?: boolean;
  baseImageMaskInvert?: boolean;
  baseImage?: string;
  onOpenBaseImageModal?: () => void;
  onRemoveBaseImage?: () => void;
  designerLayout?: string;
  onDesignerLayoutChange?: (val: string) => void;
  buttonText?: string;
  onButtonTextChange?: (val: string) => void;
  shop?: string;
  onUpdateElement?: (id: string, updates: Partial<CanvasElement>) => void;
  onSave?: (isTemplate: boolean, outputSettingsOverride?: any) => void;
  onTestExport?: () => void;
  isSaving?: boolean;
  hideSafeAreaLine?: boolean;
  onToggleHideSafeAreaLine?: () => void;
}

export const Summary: React.FC<SummaryProps> = ({
  elements = [],
  selectedElement,
  onSelectElement,
  onDeleteElement,
  showSafeArea,
  onToggleSafeArea,
  safeAreaRadius,
  onSafeAreaRadiusChange,
  safeAreaOffset,
  onResetSafeAreaOffset,
  onToggleRulers,
  onToggleSummary,
  showRulers,
  unit,
  onUnitChange,
  paperSize,
  onPaperSizeChange,
  customPaperDimensions,
  onCustomPaperDimensionsChange,
  onReset,
  userColors = [],
  selectedBaseColorAssetId,
  onSelectedBaseColorAssetIdChange,
  activeBasePaletteColors = [],
  shopifyOptions = [],
  shopifyVariants = [],
  selectedVariantId,
  onVariantChange,
  onProductOutputSettingsChange,
  isPublicMode = false,
  onOptionChange,
  outputSettings,
  onUpdateElement,
  onSave,
  onTestExport,
  isSaving,
  hideSafeAreaLine,
  onToggleHideSafeAreaLine,
  baseImageColorEnabled,
  onBaseImageColorEnabledChange,
  baseImageColor,
  onBaseImageColorChange,
  onToggleBaseImageAsMask,
  onToggleBaseImageMaskInvert,
  baseImageAsMask,
  baseImageMaskInvert,
  baseImage,
  onOpenBaseImageModal,
  onRemoveBaseImage,
}) => {
  const [isOutputOpen, setIsOutputOpen] = React.useState(false);

  const selectedVariant = shopifyVariants.find(v => {
    const vid = String(v.id).match(/\d+/)?.[0] || String(v.id);
    const svid = String(selectedVariantId).match(/\d+/)?.[0] || String(selectedVariantId);
    return vid === svid;
  });

  const hasVariants = shopifyOptions.length > 0;

  const handleOptionChange = (optionIndex: number, value: string) => {
    if (onOptionChange) {
      onOptionChange(optionIndex, value);
      return;
    }

    if (!onVariantChange) return;

    // Use current selected variant or first variant as a baseline for matching options
    const baseVariant = selectedVariant || shopifyVariants[0];
    if (!baseVariant) return;

    const currentOptions = [
      baseVariant.option1,
      baseVariant.option2,
      baseVariant.option3,
    ];

    currentOptions[optionIndex] = value;
    const match = shopifyVariants.find(v =>
      (currentOptions[0] === undefined || currentOptions[0] === null || String(v.option1) === String(currentOptions[0])) &&
      (currentOptions[1] === undefined || currentOptions[1] === null || String(v.option2) === String(currentOptions[1])) &&
      (currentOptions[2] === undefined || currentOptions[2] === null || String(v.option3) === String(currentOptions[2]))
    );
    if (match) {
      onVariantChange(String(match.id));
    } else {
      // Fallback: Find first variant that has the NEW option value at the correct position
      const fallbackMatch = shopifyVariants.find(v => String(optionIndex === 0 ? v.option1 : optionIndex === 1 ? v.option2 : v.option3) === String(value));
      if (fallbackMatch) onVariantChange(String(fallbackMatch.id));
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200 w-full">
      <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          Summary
        </h2>
        <Button variant="ghost" size="sm" onClick={onToggleSummary} className="h-8 w-8 p-0 rounded-full">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="space-y-4">
          {/* Product Variant Selection */}
          {hasVariants && (
            <div className="text-card-foreground flex flex-col gap-1 border border-gray-100 rounded-2xl p-5 bg-white">
              <div className="flex items-center gap-3 mb-1">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-normal text-gray-900">Product Variant</h3>
              </div>
              <div className={isPublicMode ? "space-y-10" : "space-y-1"}>
                {shopifyOptions.map((option, idx) => (
                  <div key={option.name}>
                    <Label className={`${isPublicMode ? 'text-sm mb-2' : 'text-[11px] mb-0.5'} font-normal text-gray-400 block tracking-wider`}>{option.name}</Label>
                    <Select value={(idx === 0 ? selectedVariant?.option1 : idx === 1 ? selectedVariant?.option2 : selectedVariant?.option3) || ""} onValueChange={(val) => handleOptionChange(idx, val)}>
                      <SelectTrigger className={`w-full ${isPublicMode ? 'h-16 text-lg py-4 px-6' : 'h-10 text-sm px-3'} rounded-xl bg-white border-gray-200 shadow-sm font-normal focus:ring-4 focus:ring-indigo-50 transition-all`}><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl border shadow-xl">
                        {option.values?.map((val: any) => (
                          <SelectItem key={val} value={val} className={`${isPublicMode ? 'text-lg py-3 px-6' : 'text-sm py-2'}`}>{val}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {selectedVariant && (
                  <div className={`flex justify-between items-center ${isPublicMode ? 'pt-8 mt-8' : 'pt-2 mt-1'} border-t border-gray-50`}>
                    <span className={`${isPublicMode ? 'text-lg' : 'text-xs'} font-normal text-gray-400`}>Current Price</span>
                    <Badge variant="secondary" className={`bg-indigo-600 text-white hover:bg-indigo-700 border-0 font-normal ${isPublicMode ? 'text-3xl px-6 py-3 rounded-2xl shadow-lg' : 'text-sm px-2 py-0.5'} transition-all`}>${selectedVariant.price}</Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Base Image / Mockup Settings */}
          {!isPublicMode && (
            <div className="text-card-foreground flex flex-col gap-1 border border-gray-100 rounded-2xl p-5 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-normal text-gray-900">Mockup</h3>
              </div>

              <div className="space-y-4">
                <div className="relative group" onClick={(e) => {
                  // Prevent click when clicking remove button
                  if ((e.target as HTMLElement).closest('.remove-btn')) return;
                  onOpenBaseImageModal?.();
                }}>
                  <div className="w-full aspect-square rounded-xl border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center relative">
                    {baseImage ? (
                      <>
                        <img src={baseImage} className="w-full h-full object-contain" alt="Mockup" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 rounded-lg text-[10px] font-bold pointer-events-auto z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenBaseImageModal?.();
                            }}
                          >
                            Change
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 rounded-lg text-[10px] font-bold remove-btn bg-red-600 hover:bg-red-700 pointer-events-auto z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Remove mockup image?')) {
                                onRemoveBaseImage?.();
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4 cursor-pointer">
                        <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <span className="text-[10px] text-gray-400">Set Base Image</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-medium text-gray-700">Mockup Color</Label>
                    <Switch
                      checked={baseImageColorEnabled}
                      onCheckedChange={onBaseImageColorEnabledChange}
                      className="scale-75"
                    />
                  </div>

                  {baseImageColorEnabled && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] text-gray-400">Palette</Label>
                        <Select
                          value={selectedBaseColorAssetId ? String(selectedBaseColorAssetId) : ""}
                          onValueChange={(val) => onSelectedBaseColorAssetIdChange(val)}
                        >
                          <SelectTrigger className="h-6 w-40 text-[10px] px-2 rounded-lg border-gray-200">
                            <SelectValue placeholder="Select Palette" />
                          </SelectTrigger>
                          <SelectContent>
                            {userColors.map((asset) => (
                              <SelectItem key={asset.id} value={String(asset.id)}>{asset.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {activeBasePaletteColors && activeBasePaletteColors.length > 0 ? (
                        <div className="grid grid-cols-6 gap-2">
                          {activeBasePaletteColors.map((c, i) => (
                            <button
                              key={i}
                              onClick={() => onBaseImageColorChange?.(c.value)}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${baseImageColor === c.value ? 'border-indigo-600 ring-2 ring-indigo-100 scale-110' : 'border-gray-200 hover:border-gray-300 hover:scale-105'}`}
                              style={{ backgroundColor: c.value }}
                              title={c.name}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <p className="text-[10px] text-gray-400">Pilih palette warna dari list</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-[11px] font-medium text-gray-700">Use as Mask</Label>
                        <p className="text-[9px] text-gray-400">Punch design through transparent areas</p>
                      </div>
                      <Switch
                        checked={baseImageAsMask}
                        onCheckedChange={onToggleBaseImageAsMask}
                        className="scale-75"
                      />
                    </div>

                    {baseImageAsMask && (
                      <div className="flex items-center justify-between pl-4 border-l-2 border-indigo-50">
                        <div className="space-y-0.5">
                          <Label className="text-[11px] font-medium text-gray-700">Invert Mask</Label>
                          <p className="text-[9px] text-gray-400">Reveal design only on mockup</p>
                        </div>
                        <Switch
                          checked={baseImageMaskInvert}
                          onCheckedChange={onToggleBaseImageMaskInvert}
                          className="scale-75"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Layers */}
          <div className="text-card-foreground flex flex-col gap-1 border border-gray-100 rounded-2xl p-5 bg-white">
            <div className="flex items-center gap-3 mb-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="text-base font-normal text-gray-900">Layers</h3>
              <span className="ml-auto text-sm font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{elements?.length || 0}</span>
            </div>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
              {elements.length === 0 ? (
                <div className="py-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-sm text-gray-400 font-medium">No elements yet</p>
                </div>
              ) : (
                elements.map((el) => (
                  <div key={el.id} onClick={() => onSelectElement(el.id)} className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedElement === el.id ? 'bg-indigo-50 border-indigo-200 ring-4 ring-indigo-500/10' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                      {el.type === 'text' ? <span className="font-black text-xl text-indigo-400">T</span> : el.type === 'image' ? <img src={el.src} className="w-full h-full object-cover rounded-lg" /> : <Palette className="w-6 h-6 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-medium text-gray-900 truncate leading-tight mb-0.5">{el.label && !(['image', 'text'].includes(el.label.toLowerCase())) ? el.label : (el.placeholder || el.type)}</div>
                      <div className="text-xs font-normal text-gray-500 truncate tracking-wide opacity-80">{(el.type === 'text' || el.type === 'textarea') ? el.text : el.type}</div>
                    </div>
                    {el.locked && <Badge variant="secondary" className="h-5 text-[9px] font-black bg-gray-100 text-gray-500 hover:bg-gray-100 border-0 tracking-widest">LOCKED</Badge>}
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateElement?.(el.id, { hideLabel: !el.hideLabel });
                        }}
                        className={`p-2 rounded-lg transition-all ${el.hideLabel ? 'text-gray-300 hover:text-gray-500 hover:bg-gray-50' : 'text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        title={el.hideLabel ? "Hidden in Public" : "Visible in Public"}
                      >
                        {el.hideLabel ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteElement(el.id); }} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Canvas Controls */}
          {/* Reset Design */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="w-full h-9 rounded-xl text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-100 bg-white transition-all tracking-wider gap-2 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Design
          </Button>

          {/* Rulers & Dimensions */}
          {!isPublicMode && (
            <div className="text-card-foreground flex flex-col gap-1 border border-gray-100 rounded-2xl p-5 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <Ruler className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-normal text-gray-900">Rulers</h3>
                <Switch checked={showRulers} onCheckedChange={onToggleRulers} className="scale-75 ml-auto" />
              </div>

              {showRulers && (
                <div className="space-y-4 pt-1">
                  {/* Unit */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-gray-400">Unit</Label>
                    <Select value={unit} onValueChange={(val: any) => onUnitChange(val)}>
                      <SelectTrigger className="h-9 rounded-xl bg-gray-50 border-gray-100 text-xs font-medium"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="mm">mm</SelectItem>
                        <SelectItem value="inch">inch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Paper Size */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-gray-400">Canvas Size</Label>
                    <Select value={paperSize} onValueChange={onPaperSizeChange}>
                      <SelectTrigger className="h-9 rounded-xl bg-gray-50 border-gray-100 text-xs font-medium"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        <SelectItem value="Default">Default (1000 × 1000 px)</SelectItem>
                        <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                        <SelectItem value="A5">A5 (148 × 210 mm)</SelectItem>
                        <SelectItem value="Letter">Letter (216 × 279 mm)</SelectItem>
                        <SelectItem value="Custom">Custom Size</SelectItem>
                      </SelectContent>
                    </Select>
                    {paperSize === 'Custom' && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Input type="number" value={customPaperDimensions.width} onChange={(e) => onCustomPaperDimensionsChange({ ...customPaperDimensions, width: Number(e.target.value) })} className="h-8 text-xs bg-gray-50" placeholder="W (mm)" />
                        <Input type="number" value={customPaperDimensions.height} onChange={(e) => onCustomPaperDimensionsChange({ ...customPaperDimensions, height: Number(e.target.value) })} className="h-8 text-xs bg-gray-50" placeholder="H (mm)" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Safe Area */}
          <div className="text-card-foreground flex flex-col gap-1 border border-gray-100 rounded-2xl p-5 bg-white">
            <div className="flex items-center gap-3 mb-2">
              <Grid3x3 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-base font-normal text-gray-900">Safe Area</h3>
              <Switch checked={showSafeArea} onCheckedChange={onToggleSafeArea} className="scale-75 ml-auto" />
            </div>

            {showSafeArea && !isPublicMode && (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-medium text-gray-500 flex items-center gap-2">
                    <Eye className="w-3 h-3" /> Hide Guide Line
                  </Label>
                  <Switch checked={hideSafeAreaLine} onCheckedChange={() => onToggleHideSafeAreaLine?.()} className="scale-75" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-medium text-gray-400">Roundness</Label>
                    <span className="text-[10px] font-medium text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">{Math.round((safeAreaRadius / 500) * 100)}%</span>
                  </div>
                  <Slider value={[safeAreaRadius]} max={500} step={10} onValueChange={(val) => onSafeAreaRadiusChange(val[0])} className="py-2" />
                </div>



                <div className="flex items-center justify-between text-[9px] text-gray-400 font-medium pt-1 bg-gray-50 p-2 rounded-lg">
                  <div className="flex gap-3">
                    <span>X: <span className="text-gray-600">{Math.round(safeAreaOffset.x)}</span></span>
                    <span>Y: <span className="text-gray-600">{Math.round(safeAreaOffset.y)}</span></span>
                  </div>
                  <button onClick={onResetSafeAreaOffset} className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline">Reset Offset</button>
                </div>
              </div>
            )}
          </div>

          {/* Product Output Settings */}
          {!isPublicMode && (
            <div className="text-card-foreground flex flex-col gap-1 border border-gray-100 rounded-2xl p-5 bg-white overflow-hidden">
              <button
                onClick={() => setIsOutputOpen(!isOutputOpen)}
                className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                type="button"
              >
                <Label className="text-sm text-gray-700 flex items-center gap-2 cursor-pointer">
                  <Settings className="w-4 h-4 text-green-600" /> Product Output Settings
                </Label>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOutputOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOutputOpen && (
                <div className="px-4 pb-4 space-y-3 pt-2 border-t border-gray-50">
                  <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                    <Label className="text-[10px] font-bold text-gray-500">Output Settings</Label>
                    <div className="flex flex-col gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onTestExport ? onTestExport() : onSave?.(false)}
                        disabled={isSaving}
                        className="w-full text-[10px] font-bold h-10 bg-white border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5 mr-2" />
                            Test Order Output
                          </>
                        )}
                      </Button>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-gray-400">File Type</Label>
                          <Select
                            value={outputSettings?.fileType || 'png'}
                            onValueChange={(val) => {
                              const newSettings = { ...outputSettings, fileType: val };
                              onProductOutputSettingsChange?.(newSettings);
                              onSave?.(false, newSettings);
                            }}
                          >
                            <SelectTrigger className="h-8 rounded-lg text-xs bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="png">PNG</SelectItem>
                              <SelectItem value="jpg">JPG</SelectItem>
                              <SelectItem value="jpeg">JPEG</SelectItem>
                              <SelectItem value="pdf">PDF</SelectItem>
                              <SelectItem value="svg">SVG</SelectItem>
                              <SelectItem value="ai">AI</SelectItem>
                              <SelectItem value="eps">EPS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-gray-400">DPI</Label>
                          <Input
                            type="number"
                            value={outputSettings?.dpi || 300}
                            onChange={(e) => {
                              const newSettings = { ...outputSettings, dpi: parseInt(e.target.value) || 300 };
                              onProductOutputSettingsChange?.(newSettings);
                              onSave?.(false, newSettings);
                            }}
                            className="h-8 text-xs"
                            min={72}
                            max={2400}
                          />
                        </div>
                      </div>

                      <div className="space-y-4 pt-1">
                        <div className="space-y-3">
                          <Label className="text-[10px] font-bold text-gray-500">Export Mode</Label>
                          <Select
                            value={
                              outputSettings?.separateFilesByType ? 'separate' :
                                (outputSettings?.includeBaseMockup ? 'include-base' : 'design-only')
                            }
                            onValueChange={(val) => {
                              const newSettings = {
                                ...outputSettings,
                                includeBaseMockup: val === 'include-base',
                                separateFilesByType: val === 'separate'
                              };
                              onProductOutputSettingsChange?.(newSettings);
                              // Auto save immediately with new settings
                              onSave?.(false, newSettings);
                            }}
                          >
                            <SelectTrigger className="h-9 rounded-xl bg-white border-gray-200 text-xs font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl">
                              <SelectItem value="design-only">Design Only (No Base Image)</SelectItem>
                              <SelectItem value="include-base">Include Base Image</SelectItem>
                              <SelectItem value="separate">Separate Files by Type</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3 pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-[11px] font-medium text-gray-700">Canvas Background</Label>
                              <p className="text-[9px] text-gray-400">
                                {outputSettings?.forceWhiteBackground ? "White background" : "Transparent (default)"}
                              </p>
                            </div>
                            <Switch
                              checked={!!outputSettings?.forceWhiteBackground}
                              onCheckedChange={(val) => {
                                const newSettings = {
                                  ...outputSettings,
                                  forceWhiteBackground: val
                                };
                                onProductOutputSettingsChange?.(newSettings);
                                onSave?.(false, newSettings);
                              }}
                              className="scale-75"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-[11px] font-medium text-gray-700">Include Original Files</Label>
                              <p className="text-[9px] text-gray-400">Include original customer uploads</p>
                            </div>
                            <Switch
                              checked={!!outputSettings?.includeOriginalImages}
                              onCheckedChange={(val) => {
                                const newSettings = {
                                  ...outputSettings,
                                  includeOriginalImages: val
                                };
                                onProductOutputSettingsChange?.(newSettings);
                                onSave?.(false, newSettings);
                              }}
                              className="scale-75"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
