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
  Wand2,
  Loader2,
  CloudUpload,
  Minus,
  Plus,
  ShoppingBag,
  ChevronDown
} from 'lucide-react';
import {
  Card,
} from "./ui/card";
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
  onUpdateElement: (id: string, updates: any) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showSafeArea: boolean;
  onToggleSafeArea: () => void;
  safeAreaPadding: number;
  onSafeAreaPaddingChange: (val: number) => void;
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
  onReset: () => void;
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
  activeElementPaletteColors: { name: string, value: string }[];
  onToggleSummary: () => void;
  baseImageColorEnabled: boolean;
  onBaseImageColorEnabledChange: (enabled: boolean) => void;
  baseImageColor?: string;
  onBaseImageColorChange: (color: string) => void;
  shopifyOptions?: any[];
  shopifyVariants?: any[];
  selectedVariantId?: string;
  onVariantChange?: (id: string) => void;
  productOutputSettings?: any;
  onProductOutputSettingsChange?: (settings: any) => void;
  isPublicMode?: boolean;
  onSave?: (isTemplate: boolean) => void;
  isSaving?: boolean;
  onOptionChange?: (index: number, value: string) => void;
  selectedShapeAssetId?: string | null;
  onSelectedShapeAssetIdChange?: (id: string | null) => void;
  onToggleBaseImageAsMask?: (enabled: boolean) => void;
  onToggleBaseImageMaskInvert?: (enabled: boolean) => void;
  baseImageAsMask?: boolean;
  baseImageMaskInvert?: boolean;
  baseImage?: string;
  onOpenBaseImageModal?: () => void;
  designerLayout?: string;
  onDesignerLayoutChange?: (val: string) => void;
  buttonText?: string;
  onButtonTextChange?: (val: string) => void;
}

export const Summary: React.FC<SummaryProps> = ({
  elements = [],
  selectedElement,
  onSelectElement,
  onDeleteElement,
  onUpdateElement,
  showSafeArea,
  onToggleSafeArea,
  safeAreaRadius,
  onSafeAreaRadiusChange,
  safeAreaOffset,
  onResetSafeAreaOffset,
  onToggleRulers,
  showRulers,
  unit,
  onUnitChange,
  paperSize,
  onPaperSizeChange,
  customPaperDimensions,
  onCustomPaperDimensionsChange,
  onReset,
  userColors,
  userFonts,
  userOptions,
  userGalleries,
  selectedBaseColorAssetId,
  onSelectedBaseColorAssetIdChange,
  selectedElementColorAssetId,
  onSelectedElementColorAssetIdChange,
  selectedFontAssetId,
  onSelectedFontAssetIdChange,
  selectedOptionAssetId,
  onSelectedOptionAssetIdChange,
  selectedGalleryAssetId,
  onSelectedGalleryAssetIdChange,
  activeBasePaletteColors,
  onToggleSummary,
  baseImageColorEnabled,
  onBaseImageColorEnabledChange,
  baseImageColor,
  onBaseImageColorChange,
  productOutputSettings,
  onProductOutputSettingsChange,
  isPublicMode,
  onSave,
  isSaving,
  shopifyOptions = [],
  shopifyVariants = [],
  selectedVariantId,
  onVariantChange,
  onOptionChange,
  selectedShapeAssetId,
  onSelectedShapeAssetIdChange,
  onToggleBaseImageAsMask,
  onToggleBaseImageMaskInvert,
  baseImageAsMask,
  baseImageMaskInvert,
  baseImage,
  onOpenBaseImageModal,
  designerLayout,
  onDesignerLayoutChange,
  buttonText,
  onButtonTextChange,
}) => {
  const [isCanvasOpen, setIsCanvasOpen] = React.useState(false);
  const [isSafeAreaOpen, setIsSafeAreaOpen] = React.useState(false);
  const [isRulersOpen, setIsRulersOpen] = React.useState(false);
  const [isOutputOpen, setIsOutputOpen] = React.useState(false);

  const selectedVariant = shopifyVariants.find(v => String(v.id) === String(selectedVariantId));
  const hasVariants = shopifyOptions.length > 0;

  const handleOptionChange = (optionIndex: number, value: string) => {
    if (onOptionChange) {
      onOptionChange(optionIndex, value);
      return;
    }

    if (!selectedVariant || !onVariantChange) return;
    const currentOptions = [
      selectedVariant.option1,
      selectedVariant.option2,
      selectedVariant.option3,
    ];

    currentOptions[optionIndex] = value;
    const match = shopifyVariants.find(v =>
      (currentOptions[0] === undefined || currentOptions[0] === null || String(v.option1) === String(currentOptions[0])) &&
      (currentOptions[1] === undefined || currentOptions[1] === null || String(v.option2) === String(currentOptions[1])) &&
      (currentOptions[2] === undefined || currentOptions[2] === null || String(v.option3) === String(currentOptions[2]))
    );
    if (match) onVariantChange(String(match.id));
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/50 border-l border-gray-200 shadow-xl">
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
          {/* Product Variant Selection - Top */}
          {hasVariants && (
            <Card className="border-0 shadow-lg rounded-2xl p-4 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-gray-900 uppercase">Product Variant</span>
              </div>
              <div className="space-y-3">
                {shopifyOptions.map((option, idx) => (
                  <div key={option.name}>
                    <Label className="text-xs font-bold text-gray-400 uppercase mb-1 block">{option.name}</Label>
                    <Select value={(idx === 0 ? selectedVariant?.option1 : idx === 1 ? selectedVariant?.option2 : selectedVariant?.option3) || ""} onValueChange={(val) => handleOptionChange(idx, val)}>
                      <SelectTrigger className="h-9 rounded-lg text-sm bg-gray-50 border-gray-100"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {option.values?.map(val => (
                          <SelectItem key={val} value={val}>{val}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {selectedVariant && (
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs font-bold text-gray-400 uppercase">Current Price</span>
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-0 font-bold">${selectedVariant.price}</Badge>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Canvas Management */}
          {!isPublicMode && (
            <Card className="border-0 shadow-lg rounded-2xl bg-white overflow-hidden">
              <button
                onClick={() => setIsCanvasOpen(!isCanvasOpen)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                type="button"
              >
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-gray-900">Canvas Management</h3>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCanvasOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCanvasOpen && (
                <div className="px-4 pb-4 space-y-4 pt-2 border-t border-gray-50">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Base Product Palette</Label>
                      <Select value={selectedBaseColorAssetId || "none"} onValueChange={(val) => onSelectedBaseColorAssetIdChange(val === "none" ? null : val)}>
                        <SelectTrigger className="h-9 rounded-lg text-sm bg-gray-50 border-gray-100"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Palette</SelectItem>
                          {userColors.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {activeBasePaletteColors.length > 0 && (
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-[10px] font-bold text-gray-400 uppercase">Base Colors</Label>
                          <Switch checked={baseImageColorEnabled} onCheckedChange={onBaseImageColorEnabledChange} />
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          {activeBasePaletteColors.map((color, i) => (
                            <button
                              key={`${color.value}-${i}`}
                              onClick={() => {
                                onBaseImageColorChange(color.value);
                                onBaseImageColorEnabledChange(true);
                              }}
                              className={`w-7 h-7 rounded-full border-2 transition-all ${baseImageColor === color.value && baseImageColorEnabled ? 'border-indigo-500 scale-110 shadow-md' : 'border-white hover:border-gray-200'}`}
                              style={{ backgroundColor: color.value }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Element Color Palette</Label>
                      <Select value={selectedElementColorAssetId || "none"} onValueChange={(val) => onSelectedElementColorAssetIdChange(val === "none" ? null : val)}>
                        <SelectTrigger className="h-9 rounded-lg text-sm bg-gray-50 border-gray-100"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Palette</SelectItem>
                          {userColors.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Font Group</Label>
                      <Select value={selectedFontAssetId || "none"} onValueChange={(val) => onSelectedFontAssetIdChange?.(val === "none" ? null : val)}>
                        <SelectTrigger className="h-9 rounded-lg text-sm bg-gray-50 border-gray-100"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Default Fonts</SelectItem>
                          {userFonts?.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Options Group</Label>
                      <Select value={selectedOptionAssetId || "none"} onValueChange={(val) => onSelectedOptionAssetIdChange?.(val === "none" ? null : val)}>
                        <SelectTrigger className="h-9 rounded-lg text-sm bg-gray-50 border-gray-100"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Default Options</SelectItem>
                          {userOptions?.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedElement && elements.find(el => el.id === selectedElement)?.type === 'gallery' && (
                      <div>
                        <Label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Gallery Group</Label>
                        <Select value={selectedGalleryAssetId || "none"} onValueChange={(val) => onSelectedGalleryAssetIdChange?.(val === "none" ? null : val)}>
                          <SelectTrigger className="h-9 rounded-lg text-sm bg-gray-50 border-gray-100"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Default Gallery</SelectItem>
                            {userGalleries?.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

          {!isPublicMode && (
            <>
              <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                <button
                  onClick={() => setIsSafeAreaOpen(!isSafeAreaOpen)}
                  className="w-full p-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
                  type="button"
                >
                  <Label className="text-sm text-gray-700 flex items-center gap-2 cursor-pointer">
                    <Grid3x3 className="w-4 h-4 text-indigo-600" /> Safe Area
                  </Label>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={showSafeArea}
                      onCheckedChange={(checked) => {
                        onToggleSafeArea();
                        if (checked) setIsSafeAreaOpen(true);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isSafeAreaOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isSafeAreaOpen && (
                  <div className="p-3 pt-0 space-y-3">
                    {showSafeArea ? (
                      <div className="space-y-4 pt-2 border-t border-gray-200">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs text-gray-400 uppercase font-bold">Edit Zone Radius</Label>
                            <button onClick={() => onSafeAreaRadiusChange(0)} className="text-[10px] text-indigo-600 hover:underline font-bold uppercase">Reset Radius</button>
                          </div>
                          <div className="flex items-center gap-3">
                            <Slider className="flex-1" value={[safeAreaRadius]} onValueChange={([v]) => onSafeAreaRadiusChange(v)} min={0} max={500} step={1} />
                            <span className="text-xs font-bold text-gray-400 w-8 text-right">{safeAreaRadius}px</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
                          <div className="flex flex-col">
                            <span className="font-bold opacity-70">X: {Math.round(safeAreaOffset.x)}</span>
                            <span className="font-bold opacity-70">Y: {Math.round(safeAreaOffset.y)}</span>
                          </div>
                          <button onClick={onResetSafeAreaOffset} className="text-indigo-600 hover:underline font-bold uppercase text-[9px]">Reset Offset</button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-400 text-center py-2 bg-white/50 rounded border border-dashed">
                        Switch ON to see settings
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                <button
                  onClick={() => setIsRulersOpen(!isRulersOpen)}
                  className="w-full p-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
                  type="button"
                >
                  <Label className="text-sm text-gray-700 flex items-center gap-2 cursor-pointer">
                    <Ruler className="w-4 h-4 text-indigo-600" /> Rulers
                  </Label>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={showRulers}
                      onCheckedChange={(checked) => {
                        onToggleRulers();
                        if (checked) setIsRulersOpen(true);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isRulersOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isRulersOpen && (
                  <div className="p-3 pt-0 space-y-3">
                    {showRulers ? (
                      <div className="space-y-3 pt-2 border-t border-gray-200">
                        <Select value={unit} onValueChange={(val: any) => onUnitChange(val)}>
                          <SelectTrigger className="h-8 rounded-lg text-xs bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="cm">cm</SelectItem><SelectItem value="mm">mm</SelectItem><SelectItem value="inch">inch</SelectItem></SelectContent>
                        </Select>
                        <div className="space-y-2">
                          <Label className="text-[10px] text-gray-400 uppercase font-bold">Paper Size</Label>
                          <Select value={paperSize} onValueChange={onPaperSizeChange}>
                            <SelectTrigger className="h-8 rounded-lg text-xs bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Default">Default (1000 × 1000 px)</SelectItem>
                              <SelectItem value="A4">A4 (210x297mm)</SelectItem>
                              <SelectItem value="A3">A3 (297x420mm)</SelectItem>
                              <SelectItem value="A5">A5 (148x210mm)</SelectItem>
                              <SelectItem value="Letter">Letter</SelectItem>
                              <SelectItem value="Custom">Custom Size...</SelectItem>
                            </SelectContent>
                          </Select>
                          {paperSize === 'Custom' && (
                            <div className="grid grid-cols-2 gap-2">
                              <Input type="number" value={customPaperDimensions.width} onChange={(e) => onCustomPaperDimensionsChange({ ...customPaperDimensions, width: Number(e.target.value) })} className="h-9 text-sm" placeholder="W (mm)" />
                              <Input type="number" value={customPaperDimensions.height} onChange={(e) => onCustomPaperDimensionsChange({ ...customPaperDimensions, height: Number(e.target.value) })} className="h-9 text-sm" placeholder="H (mm)" />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-400 text-center py-2 bg-white/50 rounded border border-dashed">
                        Switch ON to see settings
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <Button variant="outline" size="sm" onClick={onReset} className="w-full rounded-lg text-indigo-600 border-indigo-100 hover:bg-indigo-50"><RotateCcw className="w-4 h-4 mr-2" /> Reset Design</Button>

          {!isPublicMode && productOutputSettings !== undefined && (
            <Card className="border-0 shadow-lg rounded-2xl bg-white overflow-hidden">
              <button
                onClick={() => setIsOutputOpen(!isOutputOpen)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                type="button"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Product Output Settings</h3>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOutputOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOutputOpen && (
                <div className="px-4 pb-4 space-y-3 pt-2 border-t border-gray-50">
                  <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                    <Label className="text-[10px] font-bold text-gray-500 uppercase">Output Settings</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-400 uppercase">File Type</Label>
                        <Select
                          value={productOutputSettings?.fileType || 'png'}
                          onValueChange={(val) => onProductOutputSettingsChange?.({ ...productOutputSettings, fileType: val })}
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
                        <Label className="text-[10px] text-gray-400 uppercase">DPI</Label>
                        <Input
                          type="number"
                          value={productOutputSettings?.dpi || 300}
                          onChange={(e) => onProductOutputSettingsChange?.({ ...productOutputSettings, dpi: parseInt(e.target.value) || 300 })}
                          className="h-8 text-xs"
                          min={72}
                          max={2400}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="flex flex-col">
                        <Label className="text-sm text-gray-700">Include base product</Label>
                        <span className="text-xs text-gray-400">Add mockup to output</span>
                      </div>
                      <Switch
                        checked={productOutputSettings?.includeBaseMockup ?? true}
                        onCheckedChange={(checked) => onProductOutputSettingsChange?.({ ...productOutputSettings, includeBaseMockup: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Label className="text-sm text-gray-700">Add to output</Label>
                        <span className="text-xs text-gray-400">Include original files</span>
                      </div>
                      <Switch
                        checked={productOutputSettings?.includeOriginalFile ?? false}
                        onCheckedChange={(checked) => onProductOutputSettingsChange?.({ ...productOutputSettings, includeOriginalFile: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Label className="text-sm text-gray-700">Separate files for Text</Label>
                        <span className="text-xs text-gray-400">Export text separately</span>
                      </div>
                      <Switch
                        checked={productOutputSettings?.separateFilesByType ?? false}
                        onCheckedChange={(checked) => onProductOutputSettingsChange?.({ ...productOutputSettings, separateFilesByType: checked })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          <Card className="border-0 shadow-lg rounded-2xl p-4 bg-white">
            <div className="flex items-center gap-2 mb-4"><Layers className="w-4 h-4 text-gray-700" /> <h3 className="font-semibold text-gray-900">Layers</h3> <span className="ml-auto text-xs text-gray-500">{elements?.length || 0}</span></div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {elements.length === 0 ? (
                <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Wand2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No elements yet</p>
                </div>
              ) : (
                elements.map((el) => (
                  <div key={el.id} onClick={() => onSelectElement(el.id)} className={`group relative flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${selectedElement === el.id ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/10' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                      {el.type === 'text' ? <span className="font-bold text-sm text-gray-400">T</span> : el.type === 'image' ? <img src={el.src} className="w-full h-full object-cover rounded-lg" /> : <Palette className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate uppercase tracking-wide">{el.type}</div>
                      <div className="text-xs text-gray-400 truncate tracking-tight">{el.type === 'text' ? el.text : el.id}</div>
                    </div>
                    {el.locked && <Badge variant="secondary" className="h-4 text-[8px] bg-gray-100 text-gray-500 hover:bg-gray-100 border-0">LOCKED</Badge>}
                    <button onClick={(e) => { e.stopPropagation(); onDeleteElement(el.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))
              )}
            </div>
          </Card>

          {isPublicMode && (
            <div className="pt-2">
              <Button
                onClick={() => onSave?.(false)}
                disabled={isSaving}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CloudUpload className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span>{buttonText || 'Add to Cart'}</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
