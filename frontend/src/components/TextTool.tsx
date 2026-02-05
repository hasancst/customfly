import { useState, useEffect } from 'react';
import { Plus, Type, ChevronDown, Layers, Settings2, Shrink, WrapText, Move, ScanLine, Copy, Trash2, RotateCw, ArrowRightLeft, CaseSensitive, CaseUpper, CaseLower } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { CanvasElement, MonogramType } from '@/types';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';

// Lazy load images - only load when needed
const getTextShapeImage = (shapeName: string) => {
  const imageMap: Record<string, () => Promise<any>> = {
    'curved': () => import('@/assets/text-shapes/text-sample-curved.png'),
    'oblique': () => import('@/assets/text-shapes/text-sample-oblique.png'),
    'bridge1': () => import('@/assets/text-shapes/text-sample-bridge-1.png'),
    'bridge2': () => import('@/assets/text-shapes/text-sample-bridge-2.png'),
    'bridge3': () => import('@/assets/text-shapes/text-sample-bridge-3.png'),
    'bridge4': () => import('@/assets/text-shapes/text-sample-bridge-4.png'),
    'bridge5': () => import('@/assets/text-shapes/text-sample-bridge-5.png'),
  };
  return imageMap[shapeName];
};

const TEXT_SHAPES = [
  {
    name: 'Curved Up',
    imgKey: 'curved',
    isCircular: true,
    curve: 20
  },
  {
    name: 'Curved Down',
    imgKey: 'curved',
    isCircular: true,
    curve: -20
  },
  {
    name: 'Oblique',
    imgKey: 'oblique',
    bridge: { bottom: 4.5, curve: 10, oblique: true, offsetY: 0.5, trident: false }
  },
  {
    name: 'Bridge 1',
    imgKey: 'bridge1',
    bridge: { bottom: 2, curve: -4.5, oblique: false, offsetY: 0.5, trident: false }
  },
  {
    name: 'Bridge 2',
    imgKey: 'bridge2',
    bridge: { bottom: 2, curve: -2.5, oblique: false, offsetY: 0.1, trident: false }
  },
  {
    name: 'Bridge 3',
    imgKey: 'bridge3',
    bridge: { bottom: 2, curve: -3, oblique: false, offsetY: 0.5, trident: true }
  },
  {
    name: 'Bridge 4',
    imgKey: 'bridge4',
    bridge: { bottom: 5, curve: 5, oblique: false, offsetY: 0.5, trident: false }
  },
  {
    name: 'Bridge 5',
    imgKey: 'bridge5',
    bridge: { bottom: 2.5, curve: 2.5, oblique: false, offsetY: 0.05, trident: false }
  },
  {
    name: 'Bridge 6',
    bridge: { bottom: 3, curve: 2.5, oblique: false, offsetY: 0.5, trident: true }
  }
];

// Lazy loading component for shape images
const LazyShapeButton = ({ shape, onSelect }: { shape: any; onSelect: () => void }) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (shape.imgKey) {
      setIsLoading(true);
      const loader = getTextShapeImage(shape.imgKey);
      if (loader) {
        loader().then((module) => {
          setImgSrc(module.default);
          setIsLoading(false);
        }).catch(() => {
          setIsLoading(false);
        });
      }
    }
  }, [shape.imgKey]);

  return (
    <button
      onClick={onSelect}
      className="group relative flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-gray-200 hover:border-indigo-500 transition-colors shadow-sm"
    >
      {isLoading ? (
        <div className="h-10 w-full flex items-center justify-center mb-1">
          <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : imgSrc ? (
        <img src={imgSrc} alt={shape.name} className="h-10 object-contain mb-1" loading="lazy" />
      ) : (
        <div className="h-10 w-full flex items-center justify-center mb-1 text-[10px] font-bold text-gray-400">ABC</div>
      )}
      <span className="text-[10px] text-gray-500">{shape.name}</span>
    </button>
  );
};


interface MonogramShape {
  name: string;
  id: MonogramType;
  isMonogram: boolean;
  bridge?: any;
  img?: string;
}

const MONOGRAM_SHAPES: MonogramShape[] = [
  {
    name: 'Diamond',
    id: 'Diamond',
    isMonogram: true,
  },
  {
    name: 'Interlocking Vine',
    id: 'Vine',
    isMonogram: true,
  },
  {
    name: 'Master Circle',
    id: 'Circle',
    isMonogram: true,
  },
  {
    name: 'Scallop Circle',
    id: 'Scallop',
    isMonogram: true,
  },
  {
    name: 'Stacked Solid',
    id: 'Stacked',
    isMonogram: true,
  },
  {
    name: 'Traditional Circle',
    id: 'Round',
    isMonogram: true,
  }
];

interface TextToolProps {
  onAddElement: (element: CanvasElement) => void;
  selectedElement?: CanvasElement;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  canvasDimensions?: { width: number; height: number };
  userFonts?: any[];
  userColors?: any[];
  isPublicMode?: boolean;
}

export function TextTool({ onAddElement, selectedElement, onUpdateElement, canvasDimensions, userFonts = [], userColors = [], isPublicMode }: TextToolProps) {
  const [text, setText] = useState('');
  const [selectedMonogram, setSelectedMonogram] = useState<MonogramShape | null>(null);
  const [fontSize, setFontSize] = useState(selectedElement?.fontSize || 32);
  const [fontFamily, setFontFamily] = useState(selectedElement?.fontFamily || 'Inter');
  const [fontWeight, setFontWeight] = useState(selectedElement?.fontWeight || 400);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>(selectedElement?.textAlign || 'center');
  const [color, setColor] = useState(selectedElement?.color || '#000000');
  const [textMode, setTextMode] = useState<'shrink' | 'wrap'>(selectedElement?.textMode || 'shrink');
  const [maxChars, setMaxChars] = useState(selectedElement?.maxChars || 0);
  const [letterSpacing, setLetterSpacing] = useState(selectedElement?.letterSpacing || 0);
  const [textCase, setTextCase] = useState<'none' | 'uppercase' | 'lowercase'>(selectedElement?.textCase || 'none');
  const [fontAssetId, setFontAssetId] = useState(selectedElement?.fontAssetId || '');
  const [colorAssetId, setColorAssetId] = useState(selectedElement?.colorAssetId || '');
  const [label, setLabel] = useState(selectedElement?.label || '');
  const [showLabel, setShowLabel] = useState(selectedElement?.showLabel !== false);

  useEffect(() => {
    if (selectedElement) {
      setText(selectedElement.text || '');
      setFontSize(selectedElement.fontSize || 32);
      setFontFamily(selectedElement.fontFamily || 'Inter');
      setColor(selectedElement.color || '#000000');
      setFontWeight(selectedElement.fontWeight || 400);
      setTextAlign(selectedElement.textAlign || 'center');
      setTextMode(selectedElement.textMode || 'shrink');
      setMaxChars(selectedElement.maxChars || 0);
      setLetterSpacing(selectedElement.letterSpacing || 0);
      setTextCase(selectedElement.textCase || 'none');
      setFontAssetId(selectedElement.fontAssetId || '');
      setColorAssetId(selectedElement.colorAssetId || '');
      setLabel(selectedElement.label || '');
      setShowLabel(selectedElement.showLabel !== false);
    } else {
      setText('');
      setLabel('');
      setShowLabel(true);
    }
  }, [
    selectedElement?.id,
    selectedElement?.text,
    selectedElement?.type,
    selectedElement?.textMode,
    selectedElement?.maxChars,
    selectedElement?.letterSpacing,
    selectedElement?.fontSize,
    selectedElement?.fontFamily,
    selectedElement?.color,
    selectedElement?.fontWeight,
    selectedElement?.textAlign,
    selectedElement?.fontAssetId,
    selectedElement?.colorAssetId,
    selectedElement?.label,
    selectedElement?.showLabel,
  ]);

  const handleUpdate = (updates: Partial<CanvasElement>) => {
    if (selectedElement) {
      onUpdateElement(selectedElement.id, updates);
    }
  };

  const isMonogramSelected = selectedElement?.type === 'monogram';
  const isLockedTo3 = isMonogramSelected;

  const handleAddText = (bridge?: any, isMonogramParam?: boolean, shape?: any) => {
    const isMonogram = isMonogramParam ?? isMonogramSelected;

    // If applying circular curve to existing text element
    if (selectedElement && shape?.isCircular && selectedElement.type === 'text') {
      onUpdateElement(selectedElement.id, {
        isCurved: true,
        curve: typeof shape.curve === 'number' ? shape.curve : 20,
        bridge: undefined,
        height: 200, // Default height for curved text
        letterSpacing: (selectedElement.letterSpacing || 0) === 0 ? 2 : selectedElement.letterSpacing,
        textCase: textCase !== 'none' ? textCase : undefined,
      });
      return;
    }

    // If applying bridge to existing text element
    if (selectedElement && bridge && selectedElement.type === 'text') {
      // Calculate height based on fontSize to prevent clipping
      // Use a fixed multiplier based on font size, not existing height
      const baseFontSize = selectedElement.fontSize || 32;
      const newHeight = baseFontSize * 8; // Increased to 8x to match DraggableElement rendering
      onUpdateElement(selectedElement.id, {
        bridge,
        height: newHeight,
        isCurved: false // Disable circular curve if bridge is applied
      });
      return;
    }

    const canvasW = canvasDimensions?.width || 1000;
    const canvasH = canvasDimensions?.height || 1000;

    let baseHeight = 100;
    if (isMonogram) baseHeight = 300;
    if (shape?.isCircular) baseHeight = 200;
    else if (bridge) baseHeight = fontSize * 8;

    const centerX = (canvasW / 2) - 150;
    const centerY = (canvasH / 2) - (baseHeight / 2);

    // If we have an element currently off-canvas or at default position, center it
    const isOffCanvas = selectedElement && (selectedElement.x < -500 || (selectedElement.x === 100 && selectedElement.y === 100));

    if (selectedElement && selectedElement.id !== 'draft' && (selectedElement.opacity === 0 || isOffCanvas) && !isMonogram && !bridge) {
      const elementWidth = selectedElement.width || 300;
      const elementHeight = selectedElement.height || 100;
      const finalCenterX = (canvasW / 2) - (elementWidth / 2);
      const finalCenterY = (canvasH / 2) - (elementHeight / 2);

      onUpdateElement(selectedElement.id, {
        text: text || (selectedElement.type === 'textarea' ? 'New Note' : 'New Text'),
        opacity: 100,
        x: finalCenterX,
        y: finalCenterY,
        fontFamily,
        color,
        fontSize,
        fontWeight,
        textAlign,
        textMode,
        maxChars: maxChars > 0 ? maxChars : undefined,
        textCase: textCase !== 'none' ? textCase : undefined,
        letterSpacing: letterSpacing,
        fontAssetId: fontAssetId || undefined,
        colorAssetId: colorAssetId || undefined,
      });
      return;
    }

    // If we have a visible element selected, DON'T add new text
    // User must click "Add More Tools" to add new text
    if (selectedElement && selectedElement.id !== 'draft' && selectedElement.opacity !== 0 && !isMonogram && !bridge) {
      // Just update the existing element's text
      onUpdateElement(selectedElement.id, {
        text: text || selectedElement.text,
        fontFamily,
        color,
        fontSize,
        fontWeight,
        textAlign,
        textMode,
        maxChars: maxChars > 0 ? maxChars : undefined,
        textCase: textCase !== 'none' ? textCase : undefined,
        letterSpacing: letterSpacing,
        fontAssetId: fontAssetId || undefined,
        colorAssetId: colorAssetId || undefined,
      });
      return;
    }

    let finalText = text;
    if (isMonogram) {
      finalText = text.substring(0, 3).toUpperCase() || '';
      setText(finalText);
      if (shape) setSelectedMonogram(shape);

      if (selectedElement && selectedElement.type === 'monogram' && selectedElement.id !== 'draft') {
        onUpdateElement(selectedElement.id, {
          monogramType: shape?.id || selectedElement.monogramType || 'Vine',
          text: finalText,
          colorAssetId: colorAssetId || undefined,
        });
        return;
      }

      const newElement: CanvasElement = {
        id: `monogram-${Date.now()}`,
        type: (selectedElement?.type as any) || 'monogram',
        monogramType: shape?.id || selectedMonogram?.id || 'Vine',
        text: finalText,
        x: centerX,
        y: centerY,
        width: 300,
        height: 100,
        fontSize: 100,
        rotation: 0,
        opacity: 100,
        zIndex: Date.now(),
        color,
        colorAssetId: colorAssetId || undefined,
        label: label || undefined,
        showLabel: showLabel,
      };
      onAddElement(newElement);
      toast.success('text has been added');
      return;
    }

    if (!finalText.trim()) finalText = 'Your Text Here';

    // Only add new text if no element is selected (user clicked Add More Tools)
    // We already calculated baseHeight, centerX, centerY above

    const newElement: CanvasElement = {
      id: `${selectedElement?.type || 'text'}-${Date.now()}`,
      type: (selectedElement?.type as any) || 'text',
      text: finalText,
      x: centerX,
      y: centerY,
      width: 300,
      height: baseHeight,
      fontSize: fontSize,
      fontFamily,
      fontWeight,
      textAlign,
      textMode,
      color,
      rotation: 0,
      opacity: 100,
      curve: shape?.isCircular ? (typeof shape.curve === 'number' ? shape.curve : 20) : 0,
      isCurved: !!shape?.isCircular,
      letterSpacing: shape?.isCircular ? 2 : letterSpacing,
      maxChars: maxChars > 0 ? maxChars : undefined,
      textCase: textCase !== 'none' ? textCase : undefined,
      bridge: bridge || null,
      zIndex: Date.now(),
      fontAssetId: fontAssetId || undefined,
      colorAssetId: colorAssetId || undefined,
      label: label || undefined,
      showLabel: showLabel,
    };
    onAddElement(newElement);
    toast.success('text has been added');
  };

  const formatText = (val: string, currentCase: 'none' | 'uppercase' | 'lowercase', currentMaxChars: number) => {
    let formatted = val;
    if (currentCase === 'uppercase') formatted = formatted.toUpperCase();
    else if (currentCase === 'lowercase') formatted = formatted.toLowerCase();
    if (currentMaxChars > 0) formatted = formatted.substring(0, currentMaxChars);
    return formatted;
  };



  return (
    <div className="space-y-6 pb-4">
      <div className="px-1 space-y-4">
        {!isLockedTo3 && (
          <>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-medium text-gray-400">Title</Label>
              <Input
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  if (selectedElement) handleUpdate({ label: e.target.value });
                }}
                placeholder="e.g. Personalize Your Message"
                className="h-10 rounded-xl border-gray-200 bg-white"
              />
            </div>


          </>
        )}

        {!isLockedTo3 && (
          <div className="flex items-center justify-between p-3 bg-violet-50/50 rounded-xl border border-violet-100/50">
            <div className="flex flex-col">
              <Label className="text-[10px] font-medium text-gray-700">Show label</Label>
              <p className="text-[9px] text-gray-500">Display this title to customers</p>
            </div>
            <Switch
              checked={showLabel}
              onCheckedChange={(checked) => {
                setShowLabel(checked);
                if (selectedElement) handleUpdate({ showLabel: checked });
              }}
              className="scale-75"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Label className={`${isPublicMode ? 'text-[16px]' : 'text-sm'} font-bold text-gray-700`}>
            {isLockedTo3 ? 'Monogram Initials' : (selectedElement?.type === 'textarea' ? 'Note Details' : 'Text Content')}
          </Label>
          <div className="flex items-center gap-2">
            {maxChars > 0 && !isLockedTo3 && (
              <span className={`text-[10px] font-bold ${text.length >= maxChars ? 'text-red-500' : 'text-indigo-600'}`}>
                {text.length}/{maxChars}
              </span>
            )}
            <span className={`text-[10px] font-medium ${text.length > 3 && isLockedTo3 ? 'text-red-500' : 'text-gray-400'}`}>
              {isLockedTo3 ? `${Math.max(0, 3 - text.length)} left` : `${text.length} chars`}
            </span>
          </div>
        </div>
        {selectedElement?.type === 'textarea' ? (
          <textarea
            value={text}
            maxLength={maxChars > 0 ? maxChars : undefined}
            onChange={(e) => {
              const val = e.target.value;
              const finalVal = formatText(val, textCase, maxChars);
              setText(finalVal);
              if (selectedElement) handleUpdate({ text: finalVal });
            }}
            placeholder="Type your notes here..."
            className={`w-full min-h-[120px] rounded-xl bg-white border border-gray-200 p-3 font-medium ${isPublicMode ? 'text-[16px]' : 'text-sm'} focus:ring-2 focus:ring-indigo-500 transition-all resize-none`}
          />
        ) : (
          <Input
            value={text}
            maxLength={isLockedTo3 ? 3 : (maxChars > 0 ? maxChars : undefined)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value;
              let finalVal = val;
              if (isLockedTo3) finalVal = val.toUpperCase().substring(0, 3);
              else finalVal = formatText(val, textCase, maxChars);
              setText(finalVal);
              if (selectedElement) handleUpdate({ text: finalVal });
            }}
            placeholder="Enter text here..."
            className={`rounded-xl h-12 bg-white border-gray-200 font-bold text-center focus:ring-indigo-500 focus:border-indigo-500 transition-all ${isLockedTo3 ? 'text-lg tracking-widest' : 'text-base'}`}
          />
        )}

        <Button
          onClick={() => handleAddText()}
          className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
        >
          <Plus className="w-5 h-5" />
          {selectedElement?.opacity !== 0 ? 'Update' : 'Add'}
        </Button>

        {!isLockedTo3 && (
          <div className="mt-4 space-y-2">
            <Label className="text-[10px] font-medium text-gray-400">Text Behavior</Label>
            <ToggleGroup
              type="single"
              value={textMode}
              onValueChange={(val: any) => {
                if (val) {
                  setTextMode(val);
                  if (selectedElement) {
                    const updates: Partial<CanvasElement> = { textMode: val };
                    if (val === 'shrink') updates.height = (selectedElement.fontSize || 32) * 1.5;
                    handleUpdate(updates);
                  }
                }
              }}
              className="w-full bg-gray-50 p-1 rounded-xl border border-gray-100"
            >
              <ToggleGroupItem value="shrink" className="flex-1 gap-2 rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                <Shrink className="w-3.5 h-3.5" />
                Shrink
              </ToggleGroupItem>
              <ToggleGroupItem value="wrap" className="flex-1 gap-2 rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                <WrapText className="w-3.5 h-3.5" />
                Auto Wrap
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}

        <Collapsible className="mt-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full flex items-center justify-between px-2 h-8 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 rounded-lg group">
              <div className="flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium">Advanced Settings</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-4 px-1">

            {/* Interaction Settings */}
            <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-medium text-gray-500 flex items-center gap-2">
                  <Move className="w-3 h-3" /> Lock Position
                </Label>
                <Switch
                  checked={selectedElement?.lockMove}
                  onCheckedChange={(c) => handleUpdate({ lockMove: c })}
                  className="scale-75"
                />
              </div>
              <div className="bg-gray-200 h-px w-full" />
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-medium text-gray-500 flex items-center gap-2">
                  <ScanLine className="w-3 h-3" /> Lock Resize
                </Label>
                <Switch
                  checked={selectedElement?.lockResize}
                  onCheckedChange={(c) => handleUpdate({ lockResize: c })}
                  className="scale-75"
                />
              </div>
              <div className="bg-gray-200 h-px w-full" />
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-medium text-gray-500 flex items-center gap-2">
                  <RotateCw className="w-3 h-3" /> Lock Rotate
                </Label>
                <Switch
                  checked={selectedElement?.lockRotate}
                  onCheckedChange={(c) => handleUpdate({ lockRotate: c })}
                  className="scale-75"
                />
              </div>
              <div className="bg-gray-200 h-px w-full" />
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-medium text-gray-500 flex items-center gap-2">
                  <Trash2 className="w-3 h-3" /> Lock Delete
                </Label>
                <Switch
                  checked={selectedElement?.lockDelete}
                  onCheckedChange={(c) => handleUpdate({ lockDelete: c })}
                  className="scale-75"
                />
              </div>
              <div className="bg-gray-200 h-px w-full" />
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-medium text-gray-500 flex items-center gap-2">
                  <Copy className="w-3 h-3" /> Lock Duplicate
                </Label>
                <Switch
                  checked={selectedElement?.lockDuplicate}
                  onCheckedChange={(c) => handleUpdate({ lockDuplicate: c })}
                  className="scale-75"
                />
              </div>
            </div>

            {!isLockedTo3 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-medium text-gray-400">Max Characters</Label>
                  <span className="text-[10px] text-gray-400 italic">0 = Unlimited</span>
                </div>
                <Input
                  type="number"
                  min="0"
                  value={maxChars}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setMaxChars(val);
                    if (selectedElement) {
                      const newText = formatText(text, textCase, val);
                      setText(newText);
                      handleUpdate({ maxChars: val, text: newText });
                    }
                  }}
                  className="h-8 rounded-lg font-bold text-xs"
                />
              </div>
            )}

            {/* Text Case */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-medium text-gray-400">Text Case</Label>
              <ToggleGroup
                type="single"
                value={textCase}
                onValueChange={(val: any) => {
                  if (val) {
                    setTextCase(val);
                    if (selectedElement) {
                      const newText = formatText(text, val, maxChars);
                      setText(newText);
                      handleUpdate({ textCase: val, text: newText });
                    }
                  }
                }}
                className="bg-white border border-gray-100 p-0.5 rounded-lg h-8"
              >
                <ToggleGroupItem value="none" className="flex-1 h-7 rounded-md data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
                  <CaseSensitive className="w-3.5 h-3.5" />
                </ToggleGroupItem>
                <ToggleGroupItem value="" className="flex-1 h-7 rounded-md data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
                  <CaseUpper className="w-3.5 h-3.5" />
                </ToggleGroupItem>
                <ToggleGroupItem value="lowercase" className="flex-1 h-7 rounded-md data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
                  <CaseLower className="w-3.5 h-3.5" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Letter Spacing Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-medium text-gray-400 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3 h-3" /> Letter Spacing
                </Label>
                <span className="text-[10px] font-bold text-indigo-500">{(selectedElement?.letterSpacing || 0)}px</span>
              </div>
              <Slider
                data-testid="letter-spacing-slider"
                value={[selectedElement?.letterSpacing || 0]}
                onValueChange={([val]) => {
                  setLetterSpacing(val);
                  handleUpdate({ letterSpacing: val });
                }}
                min={-10}
                max={50}
                step={1}
                className="py-2"
              />
            </div>

            {!isLockedTo3 && (
              <>
                {/* Font Group Selector */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-gray-400">Font Group</Label>
                  <Select
                    value={fontAssetId || "none"}
                    onValueChange={(val) => {
                      const finalVal = val === "none" ? undefined : val;
                      setFontAssetId(finalVal || '');
                      if (selectedElement) handleUpdate({ fontAssetId: finalVal });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white rounded-lg">
                      <SelectValue placeholder="Global Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Global Default</SelectItem>
                      {userFonts?.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Color Palette Selector */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-medium text-gray-400">Color Palette</Label>
                  <Select
                    value={colorAssetId || "none"}
                    onValueChange={(val) => {
                      const finalVal = val === "none" ? undefined : val;
                      setColorAssetId(finalVal || '');
                      if (selectedElement) handleUpdate({ colorAssetId: finalVal });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white rounded-lg">
                      <SelectValue placeholder="Global Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Global Default</SelectItem>
                      {userColors?.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="h-px bg-gray-100 mx-2" />
      {
        !isLockedTo3 && (
          <Collapsible defaultOpen={false} className="space-y-2">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-3 p-2.5 w-full rounded-xl bg-gray-50 hover:bg-indigo-50 transition-all cursor-pointer group border border-gray-100 hover:border-indigo-200">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100 group-hover:border-indigo-100">
                  <Type className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex flex-col items-start flex-1">
                  <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-900">Text Shapes</span>
                  <span className="text-[10px] text-gray-500 font-medium">Add curved or warped text</span>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-transform duration-300 group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                {TEXT_SHAPES.map((shape, i) => (
                  <LazyShapeButton
                    key={i}
                    shape={shape}
                    onSelect={() => handleAddText(shape.bridge, false, shape)}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )
      }

      {
        isMonogramSelected && (
          <Collapsible defaultOpen={true} className="space-y-2 mt-4">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-3 p-2.5 w-full rounded-xl bg-gray-50 hover:bg-indigo-50 transition-all cursor-pointer group border border-gray-100 hover:border-indigo-200">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100 group-hover:border-indigo-100">
                  <Layers className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex flex-col items-start flex-1">
                  <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-900">Monogram Styles</span>
                  <span className="text-[10px] text-gray-500 font-medium">Classic 3-letter designs</span>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-transform duration-300 group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <div className="grid grid-cols-3 gap-2">
                {MONOGRAM_SHAPES.map((shape) => (
                  <button
                    key={shape.id}
                    onClick={() => {
                      setSelectedMonogram(shape);
                      const limitedText = text.substring(0, 3).toUpperCase();
                      setText(limitedText);
                      handleAddText(shape.bridge, true, shape);
                    }}
                    className={`group relative flex flex-col items-center justify-center p-2 bg-white rounded-lg border transition-all shadow-sm ${selectedMonogram?.id === shape.id ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-gray-200 hover:border-indigo-400'}`}
                  >
                    <div className="h-10 w-full flex items-center justify-center mb-1">
                      {shape.id === 'Circle' && <div className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-[8px] font-bold text-gray-600">ABC</div>}
                      {shape.id === 'Diamond' && <div className="w-8 h-8 rotate-45 border border-gray-300 flex items-center justify-center text-[7px] font-bold text-gray-600"><span className="-rotate-45">ABC</span></div>}
                      {shape.id === 'Vine' && <div className="text-[14px] italic font-serif text-gray-600 flex items-center tracking-tighter"><span className="translate-x-1 opacity-60">A</span><span className="text-lg z-10 scale-125">B</span><span className="-translate-x-1 opacity-60">C</span></div>}
                      {shape.id === 'Scallop' && <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-[8px] font-bold text-gray-600">ABC</div>}
                      {shape.id === 'Stacked' && <div className="flex items-center gap-1"><div className="flex flex-col text-[6px] gap-0.5"><span>A</span><span>B</span></div><div className="text-sm font-bold">C</div></div>}
                      {shape.id === 'Round' && <div className="w-8 h-8 rounded-full border-2 border-double border-gray-300 flex items-center justify-center text-[8px] font-bold text-gray-600">ABC</div>}
                    </div>
                    <span className="text-[8px] text-gray-500 font-medium truncate w-full text-center">{shape.name}</span>
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )
      }
    </div >
  );
}
