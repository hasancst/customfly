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
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { CanvasElement } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ShopifyVariant {
  id: string;
  title: string;
  price: string;
  sku?: string;
}

interface SummaryProps {
  elements: CanvasElement[];
  selectedElement: string | null;
  onSelectElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showSafeArea: boolean;
  onToggleSafeArea: (show: boolean) => void;
  safeAreaPadding: number;
  onSafeAreaPaddingChange: (value: number) => void;
  safeAreaShape: 'rectangle' | 'circle' | 'oval';
  onSafeAreaShapeChange: (value: 'rectangle' | 'circle' | 'oval') => void;
  onResetSafeAreaOffset: () => void;
  onReset: () => void;
  shopifyVariants?: ShopifyVariant[];
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
  baseImageColorEnabled?: boolean;
  onToggleBaseImageColor?: (enabled: boolean) => void;
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
  safeAreaShape,
  onSafeAreaShapeChange,
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
  baseImageColorEnabled = true,
  onToggleBaseImageColor,
  onToggleSummary,
}: SummaryProps & { onToggleSummary?: () => void }) {

  // Helper function to determine if we should show variants
  const shouldShowVariants = () => {
    if (shopifyVariants.length === 0) return false;
    if (shopifyVariants.length > 1) return true;
    // Only one variant - check if it's not the default
    const variant = shopifyVariants[0];
    return variant.title.toLowerCase() !== 'default title';
  };

  const hasVariants = shouldShowVariants();

  return (
    <div className="w-full h-full bg-white/80 backdrop-blur-xl border-l border-gray-200 flex flex-col relative">
      {/* Hide Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSummary}
        className="absolute -left-4 top-1/2 -translate-y-1/2 z-50 h-8 w-8 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-400 hover:text-indigo-600"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Product Variants (Shopify) */}
          {hasVariants && (
            <Card className="border-0 shadow-lg rounded-2xl p-4 bg-white">
              <h3 className="font-semibold text-gray-900 mb-4">Product Variants</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-700 mb-2">Select Variant</Label>
                  <Select
                    value={selectedVariantId}
                    onValueChange={(value: string) => onVariantChange?.(value)}
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shopifyVariants.map((variant) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.title} - ${variant.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          )}


          {/* Canvas Controls */}
          <Card className="border-0 shadow-lg rounded-2xl p-4 bg-white">
            <h3 className="font-semibold text-gray-900 mb-4">Canvas Controls</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onZoomChange(Math.max(50, zoom - 10))}
                  className="rounded-lg flex-1"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-gray-700 min-w-16 text-center">
                  {zoom}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onZoomChange(Math.min(200, zoom + 10))}
                  className="rounded-lg flex-1"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Grid3x3 className="w-4 h-4 text-gray-600" />
                    <Label className="text-sm text-gray-700">Safe Area</Label>
                  </div>
                  <Switch checked={showSafeArea} onCheckedChange={onToggleSafeArea} />
                </div>

                {showSafeArea && (
                  <div className="space-y-3 pt-2 border-t border-gray-200">
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Shape</Label>
                      <Select value={safeAreaShape} onValueChange={(v: string) => onSafeAreaShapeChange(v as 'rectangle' | 'circle' | 'oval')}>
                        <SelectTrigger className="h-8 text-xs bg-white rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rectangle">Rectangle</SelectItem>
                          <SelectItem value="circle">Circle</SelectItem>
                          <SelectItem value="oval">Oval (Elliptical)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs text-gray-500">Inset Padding</Label>
                        <span className="text-xs font-medium text-gray-700">{safeAreaPadding}%</span>
                      </div>
                      <Slider
                        value={[safeAreaPadding]}
                        onValueChange={([v]: number[]) => onSafeAreaPaddingChange(v)}
                        min={0}
                        max={45}
                        step={1}
                        className="py-1"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-[10px] h-7 font-bold text-indigo-600 hover:text-indigo-700 hover:bg-white rounded-md transition-all gap-1.5"
                      onClick={onResetSafeAreaOffset}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset Position
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-gray-600" />
                  <Label className="text-sm text-gray-700">Rulers</Label>
                </div>
                <Switch checked={showRulers} onCheckedChange={onToggleRulers} />
              </div>

              {showRulers && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Measurement Unit</Label>
                  <Select
                    value={unit}
                    onValueChange={(value: any) => onUnitChange(value)}
                  >
                    <SelectTrigger className="h-8 rounded-lg text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cm">cm</SelectItem>
                      <SelectItem value="mm">mm</SelectItem>
                      <SelectItem value="inch">inch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Paper Size</Label>
                <Select
                  value={paperSize}
                  onValueChange={(value: string) => onPaperSizeChange(value)}
                >
                  <SelectTrigger className="h-8 rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                    <SelectItem value="A3">A3 (297 × 420 mm)</SelectItem>
                    <SelectItem value="A5">A5 (148 × 210 mm)</SelectItem>
                    <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                    <SelectItem value="Legal">Legal (8.5 × 14 in)</SelectItem>
                    <SelectItem value="Tabloid">Tabloid (11 × 17 in)</SelectItem>
                    <SelectItem value="Custom">Custom Size...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paperSize === 'Custom' && (
                <div className="grid grid-cols-2 gap-2 pb-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-400">Width (mm)</Label>
                    <Input
                      type="number"
                      value={customPaperDimensions.width}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCustomPaperDimensionsChange({ ...customPaperDimensions, width: Number(e.target.value) })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-400">Height (mm)</Label>
                    <Input
                      type="number"
                      value={customPaperDimensions.height}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCustomPaperDimensionsChange({ ...customPaperDimensions, height: Number(e.target.value) })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="w-full rounded-lg"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Design
              </Button>
            </div>
          </Card>

          {/* Base Color Settings */}
          {userColors.length > 0 && (
            <Card className="border-0 shadow-lg rounded-2xl p-4 bg-indigo-50/50 border-indigo-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-semibold text-indigo-900">Base Color Settings</h3>
                </div>
                <Switch
                  checked={baseImageColorEnabled}
                  onCheckedChange={onToggleBaseImageColor}
                />
              </div>
              <div className={`space-y-3 transition-opacity duration-200 ${!baseImageColorEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-indigo-400 uppercase">Base Color Source</Label>
                  <Select
                    value={selectedColorAssetId || ""}
                    onValueChange={(val) => onSelectedColorAssetIdChange?.(val)}
                  >
                    <SelectTrigger className="h-8 rounded-lg bg-white border-indigo-100 text-xs">
                      <SelectValue placeholder="Choose color asset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {userColors.map((asset: any) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-indigo-400 italic">This palette will appear in the top header for base mockup color.</p>
                </div>
              </div>
            </Card>
          )}

          {/* Layers */}
          <Card className="border-0 shadow-lg rounded-2xl p-4 bg-white">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Layers</h3>
              <span className="ml-auto text-xs text-gray-500">{elements.length}</span>
            </div>

            {elements.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No elements added yet
              </p>
            ) : (
              <div className="space-y-2">
                {[...elements]
                  .sort((a, b) => b.zIndex - a.zIndex)
                  .map((element, index) => (
                    <div
                      key={element.id}
                      onClick={() => onSelectElement(element.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${selectedElement === element.id
                        ? 'bg-indigo-50 border-2 border-indigo-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {element.type === 'text'
                              ? element.text
                              : element.type === 'image'
                                ? 'Image'
                                : element.type === 'field'
                                  ? element.label || 'Custom Field'
                                  : element.type === 'swatch'
                                    ? 'Color Swatch'
                                    : element.type === 'phone'
                                      ? 'Phone Number'
                                      : element.type === 'date'
                                        ? 'Date Picker'
                                        : element.type === 'gallery'
                                          ? 'Gallery'
                                          : element.type === 'textarea'
                                            ? 'Text Area'
                                            : element.type === 'file_upload'
                                              ? 'File Upload'
                                              : element.type === 'product_color'
                                                ? 'Product Color'
                                                : element.type === 'dropdown'
                                                  ? 'Drop Down'
                                                  : element.type === 'button'
                                                    ? 'Button'
                                                    : element.type === 'checkbox'
                                                      ? 'Check Box'
                                                      : element.type === 'number'
                                                        ? 'Number Input'
                                                        : element.type === 'time'
                                                          ? 'Time Picker'
                                                          : element.type === 'map'
                                                            ? element.mapLocation || 'Map'
                                                            : element.type
                            }
                          </p>
                          <p className="text-xs text-gray-500">
                            {element.type} • Layer {elements.length - index}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            onDeleteElement(element.id);
                          }}
                          className="rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="text-xs text-indigo-700 text-center font-medium">
            Personalize this product and visualize your creation.
          </p>
        </div>
      </div>
    </div>
  );
}
