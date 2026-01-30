import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Trash2,
  Grid3x3,
  Ruler,
  ChevronRight,
  Palette,
  Settings,
  EyeOff,
  Check,
  ChevronDown,
  Wand2,
  FileOutput,
  TestTube
} from 'lucide-react';
import { OutputSettingsTool } from './common/OutputSettingsTool';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { CanvasElement } from '@/types';

interface ShopifyVariant {
  id: string;
  title: string;
  price: string;
  sku?: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
}

interface ShopifyOption {
  name: string;
  position: number;
  values: string[];
}

interface SummaryProps {
  showSummary?: boolean;
  onToggleSummary?: () => void;
  elements: CanvasElement[];
  selectedElement: string | null;
  onSelectElement: (id: string | null) => void;
  colorPalette?: { name: string; value: string }[];
  activePaletteColors?: { name: string; value: string }[];
  designerLayout?: string;
  onDesignerLayoutChange?: (layout: string) => void;
  buttonText?: string;
  onButtonTextChange?: (text: string) => void;
  isPublicMode?: boolean;
  variant?: any;
  baseImageAsMask?: boolean;
  onToggleBaseImageAsMask?: (enabled: boolean) => void;
  safeAreaOffset: { x: number; y: number };
  productOutputSettings?: CanvasElement['outputSettings'];
  onProductOutputSettingsChange?: (settings: any) => void;
  onUpdateElement?: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showSafeArea: boolean;
  onToggleSafeArea: (show: boolean) => void;
  safeAreaPadding: number;
  onSafeAreaPaddingChange: (value: number) => void;
  safeAreaRadius?: number;
  onSafeAreaRadiusChange?: (value: number) => void;
  onResetSafeAreaOffset: () => void;
  onReset: () => void;
  shopifyVariants?: ShopifyVariant[];
  shopifyOptions?: ShopifyOption[];
  selectedVariantId?: string;
  onVariantChange?: (variantId: string) => void;
  showRulers: boolean;
  onToggleRulers: (show: boolean) => void;
  unit: 'cm' | 'mm' | 'inch';
  onUnitChange: (unit: 'cm' | 'mm' | 'inch') => void;
  paperSize: string;
  onPaperSizeChange: (size: string) => void;
  customPaperDimensions: { width: number; height: number };
  onCustomPaperDimensionsChange: (dimensions: { width: number; height: number }) => void;
  userColors?: any[];
  selectedColorAssetId?: string | null;
  onSelectedColorAssetIdChange?: (id: string | null) => void;
  onOpenCropModal?: () => void;
  onOpenBaseImageModal?: () => void;
  baseImageColorEnabled?: boolean;
  onBaseImageColorEnabledChange?: (enabled: boolean) => void;
  baseImageColor?: string;
  onBaseImageColorChange?: (color: string) => void;
}

export function Summary({
  elements,
  selectedElement,
  onSelectElement,
  onDeleteElement,
  zoom,
  onZoomChange,
  showSafeArea,
  onToggleSafeArea,
  safeAreaPadding,
  onSafeAreaPaddingChange,
  onResetSafeAreaOffset,
  onReset,
  shopifyVariants = [],
  selectedVariantId = '',
  onVariantChange,
  showRulers,
  onToggleRulers,
  unit,
  onUnitChange,
  paperSize,
  onPaperSizeChange,
  customPaperDimensions,
  onCustomPaperDimensionsChange,
  userColors = [],
  selectedColorAssetId,
  onSelectedColorAssetIdChange,
  shopifyOptions = [],
  onToggleSummary,
  safeAreaOffset = { x: 0, y: 0 },
  baseImageColorEnabled = true,
  onBaseImageColorEnabledChange,
  baseImageColor = '',
  onBaseImageColorChange,
  activePaletteColors = [],
  designerLayout = 'redirect',
  onDesignerLayoutChange,
  buttonText = 'Design It',
  onButtonTextChange,
  isPublicMode = false,
  baseImageAsMask = false,
  onToggleBaseImageAsMask,
  productOutputSettings,
  onProductOutputSettingsChange,
}: SummaryProps) {
  const selectedVariant = React.useMemo(() =>
    (shopifyVariants || []).find(v => v.id === selectedVariantId),
    [shopifyVariants, selectedVariantId]
  );

  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);

  const handleOptionChange = (optionIndex: number, value: string) => {
    if (!selectedVariant || !onVariantChange) return;
    const currentOptions = [
      selectedVariant.option1,
      selectedVariant.option2,
      selectedVariant.option3,
    ];

    currentOptions[optionIndex] = value;
    const match = shopifyVariants.find(v =>
      (currentOptions[0] === undefined || currentOptions[0] === null || v.option1 === currentOptions[0]) &&
      (currentOptions[1] === undefined || currentOptions[1] === null || v.option2 === currentOptions[1]) &&
      (currentOptions[2] === undefined || currentOptions[2] === null || v.option3 === currentOptions[2])
    );
    if (match) onVariantChange(match.id);
  };

  const hasVariants = React.useMemo(() => {
    if (!shopifyVariants || shopifyVariants.length === 0) return false;
    if (shopifyVariants.length > 1) return true;
    return shopifyVariants[0].title.toLowerCase() !== 'default title';
  }, [shopifyVariants]);

  return (
    <div className="w-full h-full bg-white/80 backdrop-blur-xl border-l border-gray-200 flex flex-col relative shrink-0">
      <Button variant="ghost" size="icon" onClick={onToggleSummary} className="absolute -left-4 top-1/2 -translate-y-1/2 z-50 h-8 w-8 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-400 hover:text-indigo-600">
        <ChevronRight className="w-4 h-4" />
      </Button>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="space-y-4">
          {hasVariants && (
            <Card className="border-0 shadow-lg rounded-2xl p-4 bg-white">
              <h3 className="font-semibold text-gray-900 mb-4">Product Variants</h3>
              <div className="space-y-4">
                {shopifyOptions.map((option, idx) => (
                  <div key={option.name}>
                    <Label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">{option.name}</Label>
                    <Select value={(idx === 0 ? selectedVariant?.option1 : idx === 1 ? selectedVariant?.option2 : selectedVariant?.option3) || ""} onValueChange={(val) => handleOptionChange(idx, val)}>
                      <SelectTrigger className="h-9 rounded-lg text-sm bg-gray-50 border-gray-100"><SelectValue /></SelectTrigger>
                      <SelectContent>{option.values?.map(val => <SelectItem key={val} value={val}>{val}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
                {selectedVariant && (
                  <div className="pt-2 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Price</span>
                    <span className="text-sm font-bold text-indigo-600">${selectedVariant.price}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Advanced Config Section */}
          {!isPublicMode && (
            <Collapsible
              open={isAdvancedOpen}
              onOpenChange={setIsAdvancedOpen}
              className="w-full space-y-2"
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm cursor-pointer group hover:bg-indigo-50/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <Wand2 className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600">Advanced Config</h3>
                      <p className="text-[10px] text-gray-500">Paper, Masking & Mockup</p>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isAdvancedOpen ? 'rotate-180 text-indigo-500' : ''}`} />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                {/* 1. Mockup Color Settings */}
                <div className="p-4 bg-white rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-indigo-500" />
                      <Label className="text-xs font-bold text-gray-700 uppercase">Mockup Color</Label>
                    </div>
                    <Switch checked={baseImageColorEnabled} onCheckedChange={onBaseImageColorEnabledChange} />
                  </div>

                  <div className={`space-y-3 pt-2 transition-opacity ${!baseImageColorEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                    <Select
                      value={selectedColorAssetId || ""}
                      onValueChange={(val) => onSelectedColorAssetIdChange?.(val)}
                    >
                      <SelectTrigger className="h-8 rounded-lg bg-gray-50 border-gray-200 text-xs font-medium">
                        <SelectValue placeholder="Select palette..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(userColors || []).map((asset: any) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {(activePaletteColors && activePaletteColors.length > 0) && (
                      <div className="grid grid-cols-6 gap-2">
                        {activePaletteColors.map((c, i) => (
                          <button
                            key={i}
                            onClick={() => onBaseImageColorChange?.(c.value)}
                            className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center ${baseImageColor === c.value ? 'border-indigo-500 scale-110 shadow-md' : 'border-white hover:border-indigo-200'}`}
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                          >
                            {baseImageColor === c.value && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Mask Mode Settings */}
                <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <EyeOff className="w-4 h-4 text-indigo-500" />
                      <Label className="text-xs font-bold text-gray-700 uppercase leading-none">Use Base as Mask</Label>
                    </div>
                    <Switch
                      checked={baseImageAsMask}
                      onCheckedChange={onToggleBaseImageAsMask}
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-2 leading-tight">Clip design elements within base image boundaries.</p>
                </div>

                {/* 3. Product Output Settings */}
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center">
                      <FileOutput className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <Label className="text-xs font-bold text-emerald-900 uppercase">Product Output Settings</Label>
                  </div>
                  {productOutputSettings ? (
                    <OutputSettingsTool
                      element={{ outputSettings: productOutputSettings } as any}
                      onUpdate={(updates) => onProductOutputSettingsChange?.(updates.outputSettings)}
                    />
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onProductOutputSettingsChange?.({ fileType: 'png', dpi: 300, includeBaseMockup: true, includeOriginalFile: false })}
                      className="w-full text-xs"
                    >
                      Enable Custom Output Settings
                    </Button>
                  )}
                  {productOutputSettings && (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        onClick={async () => {
                          const node = document.getElementById('design-canvas');
                          if (!node || !productOutputSettings) return;

                          const btn = document.activeElement as HTMLButtonElement;
                          const originalText = btn.innerText;
                          btn.innerText = 'Generating...';
                          btn.disabled = true;
                          try {
                            // Placeholder for generation logic
                            alert("Testing Output Generation...");
                          } catch (err) {
                            console.error(err);
                          } finally {
                            btn.innerText = originalText;
                            btn.disabled = false;
                          }
                        }}
                      >
                        <TestTube className="w-3 h-3 mr-2" />
                        Test Output Config
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Storefront Layout Settings */}
          {!isPublicMode && (
            <Card className="border-0 shadow-lg rounded-2xl p-4 bg-amber-50 border-amber-100">
              <h3 className="font-semibold text-amber-900 mb-4 flex items-center gap-2"><Settings className="w-4 h-4" /> Storefront Layout</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-amber-700 font-bold uppercase">Layout Mode</Label>
                  <Select value={designerLayout} onValueChange={onDesignerLayoutChange}>
                    <SelectTrigger className="h-9 rounded-lg bg-white border-amber-200 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="redirect">Open Designer</SelectItem>
                      <SelectItem value="inline">Inline on Product Page</SelectItem>
                      <SelectItem value="modal">Modal Popup</SelectItem>
                      <SelectItem value="wizard">Step-by-Step Wizard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 pt-2 border-t border-amber-200/50">
                  <Label className="text-xs text-amber-700 font-bold uppercase">Button Text</Label>
                  <Input value={buttonText} onChange={(e) => onButtonTextChange?.(e.target.value)} placeholder="e.g. Design It" className="h-9 rounded-lg bg-white border-amber-200 text-sm" />
                </div>
              </div>
            </Card>
          )}

          {/* Canvas Controls */}
          <Card className="border-0 shadow-lg rounded-2xl p-4 bg-white">
            <h3 className="font-semibold text-gray-900 mb-4">Canvas Controls</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onZoomChange(Math.max(50, zoom - 10))} className="rounded-lg flex-1"><ZoomOut className="w-4 h-4" /></Button>
                <span className="text-sm font-medium text-gray-700 min-w-16 text-center">{zoom}%</span>
                <Button variant="outline" size="sm" onClick={() => onZoomChange(Math.min(200, zoom + 10))} className="rounded-lg flex-1"><ZoomIn className="w-4 h-4" /></Button>
              </div>

              {!isPublicMode && (
                <>
                  <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between"><Label className="text-sm text-gray-700 flex items-center gap-2"><Grid3x3 className="w-4 h-4" /> Safe Area</Label><Switch checked={showSafeArea} onCheckedChange={onToggleSafeArea} /></div>
                    {showSafeArea && (
                      <div className="space-y-3 pt-2 border-t border-gray-200">
                        <Slider value={[safeAreaPadding]} onValueChange={([v]) => onSafeAreaPaddingChange(v)} min={0} max={45} step={1} />
                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium"><span>Offset: {Math.round(safeAreaOffset.x)}, {Math.round(safeAreaOffset.y)}</span><button onClick={onResetSafeAreaOffset} className="text-indigo-600 hover:underline">Reset</button></div>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between"><Label className="text-sm text-gray-700 flex items-center gap-2"><Ruler className="w-4 h-4" /> Rulers</Label><Switch checked={showRulers} onCheckedChange={onToggleRulers} /></div>
                    {showRulers && (
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
                              <Input type="number" value={customPaperDimensions.width} onChange={(e) => onCustomPaperDimensionsChange({ ...customPaperDimensions, width: Number(e.target.value) })} className="h-7 text-[10px]" placeholder="W (mm)" />
                              <Input type="number" value={customPaperDimensions.height} onChange={(e) => onCustomPaperDimensionsChange({ ...customPaperDimensions, height: Number(e.target.value) })} className="h-7 text-[10px]" placeholder="H (mm)" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button variant="outline" size="sm" onClick={onReset} className="w-full rounded-lg text-indigo-600 border-indigo-100 hover:bg-indigo-50"><RotateCcw className="w-4 h-4 mr-2" /> Reset Design</Button>
                </>
              )}
            </div>
          </Card>

          <Card className="border-0 shadow-lg rounded-2xl p-4 bg-white">
            <div className="flex items-center gap-2 mb-4"><Layers className="w-4 h-4 text-gray-700" /> <h3 className="font-semibold text-gray-900">Layers</h3> <span className="ml-auto text-xs text-gray-500">{elements?.length || 0}</span></div>
            <div className="space-y-2">
              {(elements || [])
                .filter(el => !!el && (!isPublicMode || el.isEditableByCustomer))
                .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
                .map((element, index, filteredArr) => (
                  <div key={element.id} onClick={() => onSelectElement(element.id)} className={`p-3 rounded-lg cursor-pointer transition-all ${selectedElement === element.id ? 'bg-indigo-50 border-2 border-indigo-500' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{element.type === 'text' ? element.text : element.type === 'image' ? 'Image' : 'Element'}</p>
                        <p className="text-xs text-gray-500">{element.type} • Layer {filteredArr.length - index}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDeleteElement(element.id); }} className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              {(elements || []).filter(el => !!el && (!isPublicMode || el.isEditableByCustomer)).length === 0 && <p className="text-xs text-gray-400 text-center py-4">No editable layers yet</p>}
            </div>
          </Card>

          <p className="text-xs text-indigo-700 text-center font-medium">
            Personalize this product and visualize your creation.
          </p>
        </div>
      </div>
    </div >
  );
}
