import { useState, useEffect } from 'react';
import { Plus, Type, ChevronDown, Layers, Settings2, Shrink, WrapText, CaseSensitive, CaseUpper, CaseLower } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { CanvasElement, MonogramType } from '@/types';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const TEXT_SHAPES = [
  {
    name: 'Curved',
    img: '/images/text-shapes/text-sample-curved.png',
    bridge: { bottom: 2, curve: -4.5, oblique: false, offsetY: 0.5, trident: false }
  },
  {
    name: 'Oblique',
    img: '/images/text-shapes/text-sample-oblique.png',
    bridge: { bottom: 4.5, curve: 10, oblique: true, offsetY: 0.5, trident: false }
  },
  {
    name: 'Bridge 1',
    img: '/images/text-shapes/text-sample-bridge-1.png',
    bridge: { bottom: 2, curve: -4.5, oblique: false, offsetY: 0.5, trident: false }
  },
  {
    name: 'Bridge 2',
    img: '/images/text-shapes/text-sample-bridge-2.png',
    bridge: { bottom: 2, curve: -2.5, oblique: false, offsetY: 0.1, trident: false }
  },
  {
    name: 'Bridge 3',
    img: '/images/text-shapes/text-sample-bridge-3.png',
    bridge: { bottom: 2, curve: -3, oblique: false, offsetY: 0.5, trident: true }
  },
  {
    name: 'Bridge 4',
    img: '/images/text-shapes/text-sample-bridge-4.png',
    bridge: { bottom: 5, curve: 5, oblique: false, offsetY: 0.5, trident: false }
  },
  {
    name: 'Bridge 5',
    img: '/images/text-shapes/text-sample-bridge-5.png',
    bridge: { bottom: 2.5, curve: 2.5, oblique: false, offsetY: 0.05, trident: false }
  },
  {
    name: 'Bridge 6',
    bridge: { bottom: 3, curve: 2.5, oblique: false, offsetY: 0.5, trident: true }
  }
];

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
}

export function TextTool({ onAddElement, selectedElement, onUpdateElement, canvasDimensions }: TextToolProps) {
  const [text, setText] = useState('');
  const [selectedMonogram, setSelectedMonogram] = useState<MonogramShape | null>(null);
  const [fontSize, setFontSize] = useState(selectedElement?.fontSize || 32);
  const [fontFamily, setFontFamily] = useState(selectedElement?.fontFamily || 'Inter');
  const [fontWeight, setFontWeight] = useState(selectedElement?.fontWeight || 400);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>(selectedElement?.textAlign || 'center');
  const [color, setColor] = useState(selectedElement?.color || '#000000');
  const [textMode, setTextMode] = useState<'shrink' | 'wrap'>(selectedElement?.textMode || 'shrink');
  const [maxChars, setMaxChars] = useState(selectedElement?.maxChars || 0);
  const [textCase, setTextCase] = useState<'none' | 'uppercase' | 'lowercase'>(selectedElement?.textCase || 'none');
  const [textType, setTextType] = useState<'all' | 'numbers'>(selectedElement?.textType || 'all');

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
      setTextCase(selectedElement.textCase || 'none');
      setTextType(selectedElement.textType || 'all');
    } else {
      setText('');
      setMaxChars(0);
      setTextCase('none');
      setTextType('all');
    }
  }, [selectedElement?.id, selectedElement?.text, selectedElement?.textMode, selectedElement?.maxChars, selectedElement?.textCase, selectedElement?.textType]);

  const handleUpdate = (updates: Partial<CanvasElement>) => {
    if (selectedElement) {
      onUpdateElement(selectedElement.id, updates);
    }
  };

  const handleAddText = (bridge?: any, isMonogram?: boolean, shape?: any) => {
    if (selectedElement && bridge && selectedElement.type === 'text') {
      onUpdateElement(selectedElement.id, { bridge });
      return;
    }

    const mmToPx = 3.7795275591;
    const canvasW = canvasDimensions ? (canvasDimensions.width * mmToPx) : 1000;
    const canvasH = canvasDimensions ? (canvasDimensions.height * mmToPx) : 1000;
    const centerX = (canvasW / 2) - 150;
    const centerY = (canvasH / 2) - 50;

    if (selectedElement && selectedElement.opacity === 0 && !isMonogram && !bridge) {
      onUpdateElement(selectedElement.id, {
        text: text || (selectedElement.type === 'textarea' ? 'New Note' : 'New Text'),
        opacity: 100,
        x: centerX,
        y: centerY,
        fontFamily,
        color,
        fontSize,
        fontWeight,
        textAlign,
        textMode,
        maxChars: maxChars > 0 ? maxChars : undefined,
        textCase: textCase !== 'none' ? textCase : undefined,
        textType: textType !== 'all' ? textType : undefined
      });
      return;
    }

    let finalText = text;
    if (isMonogram) {
      finalText = text.substring(0, 3).toUpperCase() || 'ABC';
      setText(finalText);
      if (shape) setSelectedMonogram(shape);

      if (selectedElement && selectedElement.type === 'monogram') {
        onUpdateElement(selectedElement.id, {
          monogramType: shape.id,
          text: finalText
        });
        return;
      }

      const newElement: CanvasElement = {
        id: `monogram-${Date.now()}`,
        type: 'monogram',
        monogramType: shape.id,
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
      };
      onAddElement(newElement);
      return;
    }

    if (!finalText.trim()) finalText = 'Your Text Here';

    let newX = centerX;
    let newY = centerY;

    if (selectedElement && selectedElement.opacity !== 0) {
      newX = centerX + (Math.random() * 60 - 30);
      newY = centerY + (Math.random() * 60 - 30);
    }

    const newElement: CanvasElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      text: finalText,
      x: newX,
      y: newY,
      width: 300,
      height: 100,
      fontSize: fontSize,
      fontFamily,
      fontWeight,
      textAlign,
      color,
      rotation: 0,
      opacity: 100,
      curve: 0,
      isCurved: false,
      textMode,
      maxChars: maxChars > 0 ? maxChars : undefined,
      textCase: textCase !== 'none' ? textCase : undefined,
      textType: textType !== 'all' ? textType : undefined,
      bridge: bridge || null,
      zIndex: Date.now(),
    };
    onAddElement(newElement);
  };

  const formatText = (val: string, currentTextType: string, currentTextCase: string, currentMaxChars: number) => {
    let formatted = val;
    if (currentTextType === 'numbers') formatted = formatted.replace(/[^0-9]/g, '');
    if (currentTextCase === 'uppercase') formatted = formatted.toUpperCase();
    else if (currentTextCase === 'lowercase') formatted = formatted.toLowerCase();
    if (currentMaxChars > 0) formatted = formatted.substring(0, currentMaxChars);
    return formatted;
  };

  const isMonogramSelected = selectedMonogram && !selectedElement || selectedElement?.type === 'monogram';
  const isLockedTo3 = isMonogramSelected;

  return (
    <div className="space-y-6 pb-4">
      <div className="px-1 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold text-gray-700">
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
            onChange={(e) => {
              const val = e.target.value;
              const finalVal = formatText(val, textType, textCase, maxChars);
              setText(finalVal);
              handleUpdate({ text: finalVal });
            }}
            placeholder="Type your notes here..."
            className="w-full min-h-[120px] rounded-xl bg-white border border-gray-200 p-3 font-medium text-sm focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
          />
        ) : (
          <Input
            value={text}
            maxLength={isLockedTo3 ? 3 : (maxChars > 0 ? maxChars : 100)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value;
              let finalVal = val;
              if (isLockedTo3) finalVal = val.toUpperCase().substring(0, 3);
              else finalVal = formatText(val, textType, textCase, maxChars);
              setText(finalVal);
              if (selectedElement) handleUpdate({ text: finalVal });
            }}
            placeholder={isLockedTo3 ? "Initials" : (textType === 'numbers' ? "0-9" : "Enter text here...")}
            className={`rounded-xl h-12 bg-white border-gray-200 font-bold text-center focus:ring-indigo-500 focus:border-indigo-500 transition-all ${isLockedTo3 ? 'text-lg tracking-widest' : 'text-base'}`}
          />
        )}

        <Button
          onClick={() => handleAddText()}
          className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
        >
          <Plus className="w-5 h-5" />
          {selectedElement?.opacity === 0
            ? (selectedElement.type === 'textarea' ? 'Add Note Area' : 'Add New Text')
            : (selectedElement?.type === 'textarea' ? 'Add Next Note' : 'Add Next Text')}
        </Button>

        {selectedElement && selectedElement.opacity !== 0 && (
          <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Font Size / Scale</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={Math.round(selectedElement.fontSize || 32)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) handleUpdate({ fontSize: val });
                  }}
                  className="w-14 h-7 text-[10px] font-bold text-center bg-white border-indigo-100"
                />
                <span className="text-[9px] font-bold text-indigo-400">PT</span>
              </div>
            </div>
            <Slider
              value={[selectedElement.fontSize || 32]}
              onValueChange={([val]) => handleUpdate({ fontSize: val })}
              min={8}
              max={500}
              step={1}
            />
          </div>
        )}

        <div className="mt-4 space-y-2">
          <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Text Behavior</Label>
          <ToggleGroup
            type="single"
            value={textMode}
            onValueChange={(val: any) => {
              if (val) {
                setTextMode(val);
                if (selectedElement) handleUpdate({ textMode: val });
              }
            }}
            className="w-full bg-gray-50 p-1 rounded-xl border border-gray-100"
          >
            <ToggleGroupItem value="shrink" className="flex-1 gap-2 rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
              <Shrink className="w-3.5 h-3.5" />
              Shrink
            </ToggleGroupItem>
            <ToggleGroupItem value="wrap" className="flex-1 gap-2 rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
              <WrapText className="w-3.5 h-3.5" />
              Auto Wrap
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Collapsible className="mt-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full flex items-center justify-between px-2 h-8 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 rounded-lg group">
              <div className="flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Advanced Settings</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-4 px-1">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold text-gray-400 uppercase">Max Characters</Label>
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
                    const newText = formatText(text, textType, textCase, val);
                    setText(newText);
                    handleUpdate({ maxChars: val, text: newText });
                  }
                }}
                className="h-8 rounded-lg font-bold text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-gray-400 uppercase">Text Case</Label>
              <ToggleGroup
                type="single"
                value={textCase}
                onValueChange={(val: any) => {
                  if (val) {
                    setTextCase(val);
                    if (selectedElement) {
                      const newText = formatText(text, textType, val, maxChars);
                      setText(newText);
                      handleUpdate({ textCase: val, text: newText });
                    }
                  }
                }}
                className="w-full bg-gray-50 p-0.5 rounded-lg border border-gray-100"
              >
                <ToggleGroupItem value="none" className="flex-1 h-7 rounded-md text-[10px] font-bold data-[state=active]:bg-white" title="Normal">
                  <CaseSensitive className="w-3.5 h-3.5 mr-1" /> Mixed
                </ToggleGroupItem>
                <ToggleGroupItem value="uppercase" className="flex-1 h-7 rounded-md text-[10px] font-bold data-[state=active]:bg-white" title="UPPERCASE">
                  <CaseUpper className="w-3.5 h-3.5 mr-1" /> Upper
                </ToggleGroupItem>
                <ToggleGroupItem value="lowercase" className="flex-1 h-7 rounded-md text-[10px] font-bold data-[state=active]:bg-white" title="lowercase">
                  <CaseLower className="w-3.5 h-3.5 mr-1" /> Lower
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="h-px bg-gray-100 mx-2" />
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
              <button
                key={i}
                onClick={() => handleAddText(shape.bridge)}
                className="group relative flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-gray-200 hover:border-indigo-500 transition-colors shadow-sm"
              >
                {shape.img ? (
                  <img src={shape.img} alt={shape.name} className="h-10 object-contain mb-1" />
                ) : (
                  <div className="h-10 w-full flex items-center justify-center mb-1 text-[10px] font-bold text-gray-400">ABC</div>
                )}
                <span className="text-[10px] text-gray-500">{shape.name}</span>
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible defaultOpen={false} className="space-y-2">
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
    </div>
  );
}
