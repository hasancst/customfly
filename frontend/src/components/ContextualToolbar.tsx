import React, { useState, useEffect, useRef } from 'react';
import {
    Bold,
    Italic,
    AlignLeft,
    AlignCenter,
    AlignRight,
    RotateCw,
    ChevronDown,
    Trash2,
    Copy,
    Minus,
    Plus,
    Shrink,
    WrapText,
    CaseSensitive,
    CaseUpper,
    CaseLower,
    Hash,
    Type as TypeIcon,
    Info,
    Underline,
    Crop
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CanvasElement } from '@/types';
import { POPULAR_GOOGLE_FONTS } from '../constants/fonts';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ContextualToolbarProps {
    selectedElement: CanvasElement | undefined;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>, skipHistory?: boolean) => void;
    onDeleteElement: (id: string) => void;
    onDuplicateElement: (id: string) => void;
    userFonts: any[];
    userColors: any[];
    onCrop?: () => void;
}

export function ContextualToolbar({
    selectedElement,
    onUpdateElement,
    onDeleteElement,
    onDuplicateElement,
    userFonts,
    userColors,
    onCrop
}: ContextualToolbarProps) {
    const [localColor, setLocalColor] = useState(selectedElement?.color || '#000000');
    const [localStrokeColor, setLocalStrokeColor] = useState(selectedElement?.strokeColor || '#000000');

    // Process available fonts based on assets config
    const availableFonts = React.useMemo(() => {
        const fonts: { name: string, value: string }[] = [];

        userFonts.forEach(asset => {
            if (asset.config?.fontType === 'google') {
                if (asset.config?.googleConfig === 'specific' && asset.config?.specificFonts) {
                    const names = asset.config.specificFonts.split(/[,\n]/).map((n: string) => n.trim()).filter(Boolean);
                    names.forEach((name: string) => fonts.push({ name, value: name }));
                } else if (asset.config?.googleConfig === 'all') {
                    POPULAR_GOOGLE_FONTS.forEach(name => fonts.push({ name, value: name }));
                }
            } else if (asset.config?.fontType === 'custom') {
                fonts.push({ name: asset.name, value: asset.name });
            } else if (asset.type === 'font') {
                // Fallback for old font assets
                fonts.push({ name: asset.name, value: asset.value || asset.name });
            }
        });

        // Default fonts if none configured
        if (fonts.length === 0) {
            POPULAR_GOOGLE_FONTS.slice(0, 20).forEach(name => fonts.push({ name, value: name }));
        }

        // Unique by name to avoid duplicates
        const seen = new Set();
        return fonts.filter(f => {
            const isDuplicate = seen.has(f.name);
            seen.add(f.name);
            return !isDuplicate;
        });
    }, [userFonts]);
    const [localStrokeWidth, setLocalStrokeWidth] = useState(selectedElement?.strokeWidth || 0);
    const updateTimeoutRef = useRef<any>(null);

    useEffect(() => {
        if (selectedElement?.strokeColor) {
            setLocalStrokeColor(selectedElement.strokeColor);
        }
        setLocalStrokeWidth(selectedElement?.strokeWidth || 0);
        setLocalColor(selectedElement?.color || '#000000');
    }, [selectedElement?.id, selectedElement?.color, selectedElement?.strokeColor, selectedElement?.strokeWidth]);

    const handleUpdate = (updates: Partial<CanvasElement>) => {
        if (!selectedElement) return;

        // Apply automatic formatting if text, type, case or maxChars are changed
        if (selectedElement.type === 'text' || selectedElement.type === 'textarea') {
            const currentText = updates.text !== undefined ? updates.text : selectedElement.text || '';
            const currentType = updates.textType !== undefined ? updates.textType : (selectedElement.textType || 'all');
            const currentCase = updates.textCase !== undefined ? updates.textCase : (selectedElement.textCase || 'none');
            const currentLimit = updates.maxChars !== undefined ? updates.maxChars : (selectedElement.maxChars || 0);

            let formatted = currentText;
            if (currentType === 'numbers') formatted = formatted.replace(/[^0-9]/g, '');
            if (currentCase === 'uppercase') formatted = formatted.toUpperCase();
            else if (currentCase === 'lowercase') formatted = formatted.toLowerCase();
            if (currentLimit > 0) formatted = formatted.substring(0, currentLimit);

            updates.text = formatted;
        }

        onUpdateElement(selectedElement.id, updates);
    };

    const handleColorChange = (color: string) => {
        if (!selectedElement) return;
        setLocalColor(color);
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = setTimeout(() => {
            onUpdateElement(selectedElement.id, { color, fillType: 'solid' });
        }, 50);
    };

    const handleGradientChange = (updates: any) => {
        if (!selectedElement) return;
        const currentGradient = selectedElement.gradient || { from: '#000000', to: '#ffffff' };
        const newGradient = { ...currentGradient, ...updates };

        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = setTimeout(() => {
            onUpdateElement(selectedElement.id, {
                fillType: 'gradient',
                gradient: newGradient
            });
        }, 50);
    };

    const handleStrokeColorChange = (color: string) => {
        if (!selectedElement) return;
        setLocalStrokeColor(color);
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = setTimeout(() => {
            onUpdateElement(selectedElement.id, { strokeColor: color });
        }, 50);
    };

    const isText = selectedElement?.type === 'text' || selectedElement?.type === 'monogram' || selectedElement?.type === 'textarea';
    const isTextArea = selectedElement?.type === 'textarea';
    const isMonogram = selectedElement?.type === 'monogram';
    const isField = selectedElement?.type === 'field' || selectedElement?.type === 'phone' || selectedElement?.type === 'date' || selectedElement?.type === 'map' || selectedElement?.type === 'swatch';

    return (
        <div className="relative h-14 bg-white border-b border-gray-200 shadow-sm z-40 flex items-center px-4 gap-2 animate-in slide-in-from-top duration-200 shrink-0">
            {selectedElement ? (
                <>
                    {/* Font Family */}
                    {(isText || isField) && (
                        <>
                            <Select
                                value={selectedElement.fontFamily || 'Inter'}
                                onValueChange={(val: string) => handleUpdate({ fontFamily: val })}
                            >
                                <SelectTrigger className="w-[150px] h-9 bg-gray-50 border-gray-100 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500">
                                    <SelectValue placeholder="Font Family" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableFonts.map((font) => (
                                        <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                            {font.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Separator orientation="vertical" className="h-6 mx-1" />
                        </>
                    )}

                    {/* Font Size */}
                    {(isText || isField) && (
                        <>
                            <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-lg h-9 px-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-md"
                                    onClick={() => handleUpdate({ fontSize: Math.max(1, (selectedElement.fontSize || 32) - 1) })}
                                >
                                    <Minus className="w-3 h-3" />
                                </Button>
                                <Input
                                    type="number"
                                    className="w-10 h-7 text-center p-0 border-0 bg-transparent text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={selectedElement.fontSize || 32}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdate({ fontSize: parseInt(e.target.value) || 1 })}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-md"
                                    onClick={() => handleUpdate({ fontSize: (selectedElement.fontSize || 32) + 1 })}
                                >
                                    <Plus className="w-3 h-3" />
                                </Button>
                            </div>
                            <Separator orientation="vertical" className="h-6 mx-1" />
                        </>
                    )}

                    {/* Text Formatting (Bold, Italic, Underline) */}
                    {(isText || isField) && (
                        <>
                            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-100 p-0.5">
                                <ToggleGroup
                                    type="multiple"
                                    value={[
                                        ...(selectedElement.fontWeight === 700 ? ['bold'] : []),
                                        ...(selectedElement.italic ? ['italic'] : []),
                                        ...(selectedElement.underline ? ['underline'] : [])
                                    ]}
                                    onValueChange={(vals: string[]) => {
                                        handleUpdate({
                                            fontWeight: vals.includes('bold') ? 700 : 400,
                                            italic: vals.includes('italic'),
                                            underline: vals.includes('underline')
                                        });
                                    }}
                                    className="h-8"
                                >
                                    <ToggleGroupItem value="bold" className="h-7 w-7 rounded-md" aria-label="Toggle bold">
                                        <Bold className="w-3.5 h-3.5" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="italic" className="h-7 w-7 rounded-md" aria-label="Toggle italic">
                                        <Italic className="w-3.5 h-3.5" />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="underline" className="h-7 w-7 rounded-md" aria-label="Toggle underline">
                                        <Underline className="w-3.5 h-3.5" />
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                            <Separator orientation="vertical" className="h-6 mx-1" />
                        </>
                    )}

                    {/* Alignment */}
                    {isText && (
                        <>
                            <ToggleGroup
                                type="single"
                                value={selectedElement.textAlign || 'center'}
                                onValueChange={(val: string) => val && handleUpdate({ textAlign: val as any })}
                            >
                                <ToggleGroupItem value="left" className="h-9 w-9 rounded-lg" aria-label="Align left">
                                    <AlignLeft className="w-4 h-4" />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="center" className="h-9 w-9 rounded-lg" aria-label="Align center">
                                    <AlignCenter className="w-4 h-4" />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="right" className="h-9 w-9 rounded-lg" aria-label="Align right">
                                    <AlignRight className="w-4 h-4" />
                                </ToggleGroupItem>
                            </ToggleGroup>
                            <Separator orientation="vertical" className="h-6 mx-1" />

                            {/* Text Mode (Shrink/Wrap) - Hide for Text Area as it's typically auto-wrap */}
                            {!isTextArea && (
                                <TooltipProvider>
                                    <ToggleGroup
                                        type="single"
                                        value={selectedElement.textMode || 'shrink'}
                                        onValueChange={(val: any) => val && handleUpdate({ textMode: val })}
                                    >
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <ToggleGroupItem value="shrink" className="h-9 w-9 rounded-lg" aria-label="Shrink to fit">
                                                    <Shrink className="w-4 h-4" />
                                                </ToggleGroupItem>
                                            </TooltipTrigger>
                                            <TooltipContent>Shrink to fit</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <ToggleGroupItem value="wrap" className="h-9 w-9 rounded-lg" aria-label="Auto wrap">
                                                    <WrapText className="w-4 h-4" />
                                                </ToggleGroupItem>
                                            </TooltipTrigger>
                                            <TooltipContent>Auto Wrap</TooltipContent>
                                        </Tooltip>
                                    </ToggleGroup>
                                    <Separator orientation="vertical" className="h-6 mx-1" />
                                </TooltipProvider>
                            )}

                            {/* Text Case & Type Buttons */}
                            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-100 p-0.5">
                                <ToggleGroup
                                    type="single"
                                    value={selectedElement.textCase || 'none'}
                                    onValueChange={(val: any) => val && handleUpdate({ textCase: val })}
                                    className="h-8"
                                >
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <ToggleGroupItem value="none" className="h-7 w-7 rounded-md" aria-label="Mixed case">
                                                    <CaseSensitive className="w-3.5 h-3.5" />
                                                </ToggleGroupItem>
                                            </TooltipTrigger>
                                            <TooltipContent>Mixed Case</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <ToggleGroupItem value="uppercase" className="h-7 w-7 rounded-md" aria-label="UPPERCASE">
                                                    <CaseUpper className="w-3.5 h-3.5" />
                                                </ToggleGroupItem>
                                            </TooltipTrigger>
                                            <TooltipContent>UPPERCASE</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <ToggleGroupItem value="lowercase" className="h-7 w-7 rounded-md" aria-label="lowercase">
                                                    <CaseLower className="w-3.5 h-3.5" />
                                                </ToggleGroupItem>
                                            </TooltipTrigger>
                                            <TooltipContent>lowercase</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </ToggleGroup>

                                {!isTextArea && (
                                    <>
                                        <Separator orientation="vertical" className="h-4 mx-1.5" />
                                        <ToggleGroup
                                            type="single"
                                            value={selectedElement.textType || 'all'}
                                            onValueChange={(val: any) => val && handleUpdate({ textType: val })}
                                            className="h-8"
                                        >
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <ToggleGroupItem value="all" className="h-7 w-7 rounded-md" aria-label="All content">
                                                            <TypeIcon className="w-3.5 h-3.5" />
                                                        </ToggleGroupItem>
                                                    </TooltipTrigger>
                                                    <TooltipContent>All Characters</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <ToggleGroupItem value="numbers" className="h-7 w-7 rounded-md" aria-label="Numbers only">
                                                            <Hash className="w-3.5 h-3.5" />
                                                        </ToggleGroupItem>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Numbers Only</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </ToggleGroup>
                                    </>
                                )}
                            </div>
                            <Separator orientation="vertical" className="h-6 mx-1" />

                            {/* Max Chars Popover */}
                            <Popover>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className={`h-9 px-2 gap-1.5 rounded-lg font-bold text-xs ${selectedElement.maxChars ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600'}`}
                                                >
                                                    <Info className="w-4 h-4" />
                                                    {selectedElement.maxChars ? `${selectedElement.maxChars} Limit` : 'No Limit'}
                                                </Button>
                                            </PopoverTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent>Character Limit</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <PopoverContent className="w-48 p-3" side="bottom">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-gray-400 uppercase">Max Characters</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                min="0"
                                                defaultValue={selectedElement.maxChars || 0}
                                                onBlur={(e) => handleUpdate({ maxChars: parseInt(e.target.value) || 0 })}
                                                className="h-8 text-xs font-bold"
                                            />
                                            <Button size="sm" className="h-8 px-2" variant="outline" onClick={() => handleUpdate({ maxChars: 0 })}>Reset</Button>
                                        </div>
                                        <p className="text-[9px] text-gray-400 italic">0 means unlimited characters.</p>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <Separator orientation="vertical" className="h-6 mx-1" />
                        </>
                    )}

                    {/* Fill Mode (Solid / Gradient) */}
                    {isText && !isTextArea && (
                        <>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 gap-2 px-2 border-gray-100 rounded-lg hover:bg-gray-50 w-[115px] justify-start"
                                    >
                                        <div
                                            className="w-4 h-4 rounded-full border border-gray-200 shrink-0"
                                            style={{
                                                background: selectedElement.fillType === 'gradient'
                                                    ? `linear-gradient(135deg, ${selectedElement.gradient?.from || '#000'}, ${selectedElement.gradient?.to || '#fff'})`
                                                    : (selectedElement.color || '#000000')
                                            }}
                                        />
                                        <span className="text-[10px] font-bold uppercase truncate flex-1 text-left">
                                            {selectedElement.fillType === 'gradient' ? 'Gradient' : (selectedElement.color || '#000')}
                                        </span>
                                        <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[280px] p-3 drop-shadow-2xl border-indigo-100 rounded-xl z-[10000]">
                                    <Tabs defaultValue={selectedElement.fillType || 'solid'} className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 mb-4 bg-gray-50 p-1 rounded-lg">
                                            <TabsTrigger value="solid" className="text-[10px] font-bold py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Solid</TabsTrigger>
                                            <TabsTrigger value="gradient" className="text-[10px] font-bold py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Gradient</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="solid" className="space-y-3 mt-0">
                                            <HexColorPicker color={localColor} onChange={handleColorChange} />
                                            <div className="grid grid-cols-5 gap-1.5 mt-3 pt-3 border-t border-gray-100">
                                                {userColors.map((c: any) => (
                                                    <button
                                                        key={c.id}
                                                        className={`w-6 h-6 rounded-full border ${localColor === c.value ? 'border-indigo-500 scale-110' : 'border-gray-200'}`}
                                                        style={{ backgroundColor: c.value }}
                                                        onClick={() => handleColorChange(c.value)}
                                                    />
                                                ))}
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="gradient" className="space-y-4 mt-0">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase font-bold text-gray-400">From</Label>
                                                    <input
                                                        type="color"
                                                        value={selectedElement.gradient?.from || '#000000'}
                                                        onChange={(e) => handleGradientChange({ from: e.target.value })}
                                                        className="w-full h-8 rounded-md border-0 p-0 cursor-pointer overflow-hidden bg-transparent"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase font-bold text-gray-400">To</Label>
                                                    <input
                                                        type="color"
                                                        value={selectedElement.gradient?.to || '#ffffff'}
                                                        onChange={(e) => handleGradientChange({ to: e.target.value })}
                                                        className="w-full h-8 rounded-md border-0 p-0 cursor-pointer overflow-hidden bg-transparent"
                                                    />
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-gray-100">
                                                <div className="flex gap-1.5">
                                                    {[
                                                        { f: '#4f46e5', t: '#9333ea' },
                                                        { f: '#f59e0b', t: '#ef4444' },
                                                        { f: '#10b981', t: '#3b82f6' }
                                                    ].map((g, i) => (
                                                        <button
                                                            key={i}
                                                            className="w-6 h-6 rounded-full border border-gray-200 shrink-0"
                                                            style={{ background: `linear-gradient(135deg, ${g.f}, ${g.t})` }}
                                                            onClick={() => handleUpdate({ fillType: 'gradient', gradient: { from: g.f, to: g.t } })}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </PopoverContent>
                            </Popover>
                            <Separator orientation="vertical" className="h-6 mx-1" />
                        </>
                    )}

                    {/* Text Area Color Picker (Solid Only) */}
                    {isTextArea && (
                        <>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 gap-2 px-2 border-gray-100 rounded-lg hover:bg-gray-50 w-[115px] justify-start"
                                    >
                                        <div
                                            className="w-4 h-4 rounded-full border border-gray-200 shrink-0"
                                            style={{ backgroundColor: selectedElement.color || '#000000' }}
                                        />
                                        <span className="text-[10px] font-bold uppercase truncate flex-1 text-left">
                                            {selectedElement.color || '#000'}
                                        </span>
                                        <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[280px] p-3 drop-shadow-2xl border-indigo-100 rounded-xl z-[10000]">
                                    <div className="space-y-3">
                                        <HexColorPicker color={localColor} onChange={handleColorChange} />
                                        <div className="grid grid-cols-5 gap-1.5 mt-3 pt-3 border-t border-gray-100">
                                            {userColors.map((c: any) => (
                                                <button
                                                    key={c.id}
                                                    className={`w-6 h-6 rounded-full border ${localColor === c.value ? 'border-indigo-500 scale-110' : 'border-gray-200'}`}
                                                    style={{ backgroundColor: c.value }}
                                                    onClick={() => handleColorChange(c.value)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <Separator orientation="vertical" className="h-6 mx-1" />
                        </>
                    )}

                    {/* Stroke Controls - Hide for Text Area and Monogram */}
                    {isText && !isTextArea && !isMonogram && (
                        <>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 gap-2 px-2 border-gray-100 rounded-lg hover:bg-gray-50 w-[105px] justify-start"
                                    >
                                        <div
                                            className="w-4 h-4 rounded-full border-2 shrink-0"
                                            style={{ borderColor: selectedElement.strokeColor || '#000000', backgroundColor: 'transparent' }}
                                        />
                                        <span className="text-[10px] font-bold uppercase truncate flex-1 text-left">
                                            {selectedElement.strokeWidth && selectedElement.strokeWidth > 0 ? `${selectedElement.strokeWidth.toFixed(1)}px` : 'No Stroke'}
                                        </span>
                                        <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[280px] p-4 drop-shadow-2xl border-indigo-100 rounded-xl space-y-4 z-[10000]">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] uppercase font-bold text-gray-400">Stroke Color</Label>
                                        <HexColorPicker color={localStrokeColor} onChange={handleStrokeColorChange} />
                                    </div>
                                    <Separator />
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] uppercase font-bold text-gray-400">Stroke Width</Label>
                                            <span className="text-[10px] font-bold text-indigo-500">{localStrokeWidth.toFixed(1)}px</span>
                                        </div>
                                        <Slider
                                            value={[localStrokeWidth]}
                                            onValueChange={(values: number[]) => {
                                                setLocalStrokeWidth(values[0]);
                                                onUpdateElement(selectedElement.id, { strokeWidth: values[0] }, true);
                                            }}
                                            min={0} max={20} step={0.1}
                                        />
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <Separator orientation="vertical" className="h-6 mx-1" />
                        </>
                    )}

                    {/* Rotation */}
                    <div className="flex items-center gap-2 px-2">
                        <RotateCw className="w-4 h-4 text-gray-400" />
                        <div className="w-24">
                            <Slider
                                value={[selectedElement.rotation || 0]}
                                onValueChange={(values: number[]) => handleUpdate({ rotation: values[0] })}
                                min={-180} max={180} step={1}
                            />
                        </div>
                    </div>

                    <Separator orientation="vertical" className="h-6 mx-1" />

                    {/* Opacity */}
                    <div className="flex items-center gap-2 px-2">
                        <div className="w-24">
                            <Slider
                                value={[selectedElement.opacity || 100]}
                                onValueChange={(values: number[]) => handleUpdate({ opacity: values[0] })}
                                min={0} max={100} step={1}
                            />
                        </div>
                    </div>

                    {selectedElement.type === 'image' && onCrop && (
                        <>
                            <Separator orientation="vertical" className="h-6 mx-1" />
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCrop();
                                            }}
                                        >
                                            <Crop className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Crop Image</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </>
                    )}

                    <div className="flex-1" />

                    {/* Actions */}
                    <div className="flex items-center gap-1 pl-4 border-l border-gray-100">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-indigo-600 rounded-lg" onClick={() => onDuplicateElement(selectedElement.id)}>
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Duplicate</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-red-600 rounded-lg" onClick={() => onDeleteElement(selectedElement.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </>
            ) : null}
        </div>
    );
}
