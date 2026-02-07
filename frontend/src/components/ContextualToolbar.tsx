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
    ArrowRightLeft,
    Underline,
    Crop,
    Filter,
    CaseSensitive,
    CaseUpper,
    CaseLower,
    Settings,
    Upload,
    Sliders,
    Wand2,
    Eraser,
    Image as ImageIcon
} from 'lucide-react';
import { IMAGE_PRESETS } from '../constants/filters';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
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
import { cleanAssetName, parseFontVariations } from '../utils/fonts';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { parseAssetColors } from '../utils/colors';
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
    isPublicMode?: boolean;
    shop?: string;
}

export function ContextualToolbar({
    selectedElement,
    onUpdateElement,
    onDeleteElement,
    onDuplicateElement,
    userFonts,
    userColors,
    onCrop,
    isPublicMode = false,
    shop
}: ContextualToolbarProps) {
    const [localColor, setLocalColor] = useState(selectedElement?.color || '#000000');
    const [localStrokeColor, setLocalStrokeColor] = useState(selectedElement?.strokeColor || '#000000');
    const [isRemovingBg, setIsRemovingBg] = useState(false);

    const handleRemoveBg = async () => {
        if (!selectedElement) return;

        setIsRemovingBg(true);
        const toastId = toast.loading("AI is removing background...");

        try {
            let imageData = selectedElement.src || '';
            if (imageData.startsWith('blob:')) {
                const response = await fetch(imageData);
                const blob = await response.blob();
                imageData = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            }

            const resp = await fetch('/imcst_api/remove-bg', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageData })
            });

            if (!resp.ok) {
                const errorData = await resp.json();
                throw new Error(errorData.error || "Failed to remove background");
            }

            const data = await resp.json();
            onUpdateElement(selectedElement.id, { src: data.image, removeBg: false });
            toast.success("Background removed successfully!", { id: toastId });
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Error removing background", { id: toastId });
        } finally {
            setIsRemovingBg(false);
        }
    };

    // Process available fonts based on assets config
    const availableFonts = React.useMemo(() => {
        const groups: { label: string; fonts: { name: string; value: string }[] }[] = [];

        const isMonogram = selectedElement?.type === 'monogram';
        const hasCustomFont = isMonogram && selectedElement?.fontAssetId;

        // 1. Determine which assets to process
        let targetAssets = [];
        if (isMonogram) {
            // Monogram with custom font: Only show fonts from that asset
            if (hasCustomFont) {
                targetAssets = userFonts.filter((asset: any) => String(asset.id) === String(selectedElement.fontAssetId));
            }
            // Monogram without custom font (Fixed mode): Don't show any custom fonts, only Standard Styles below
        } else {
            // Regular text: Show all fonts or filtered by fontAssetId
            if (selectedElement?.fontAssetId) {
                targetAssets = userFonts.filter((asset: any) => String(asset.id) === String(selectedElement.fontAssetId));
            } else {
                targetAssets = userFonts;
            }
        }

        // 2. Add Standard Monogram Styles ONLY for Monograms in Fixed mode (no fontAssetId)
        if (isMonogram && !hasCustomFont) {
            groups.push({
                label: 'Standard Monogram Styles',
                fonts: [
                    { name: 'Diamond', value: 'Diamond' },
                    { name: 'Circle', value: 'Circle' },
                    { name: 'Round', value: 'Round' },
                    { name: 'Scallop', value: 'Scallop' },
                    { name: 'Stacked', value: 'Stacked' },
                    { name: 'Vine', value: 'Vine' }
                ]
            });
        }

        // 3. Process custom font assets
        targetAssets.forEach((asset: any) => {
            const assetDisplayName = cleanAssetName(asset.name || '');
            if (!assetDisplayName) return;

            let assetFonts: { name: string; value: string }[] = [];

            if (asset.config?.fontType === 'google') {
                if (asset.config?.googleConfig === 'specific' && asset.config?.specificFonts) {
                    const names = asset.config.specificFonts.split(/[,\n]/).map((n: string) => n.trim()).filter(Boolean);
                    names.forEach((name: string) => {
                        const cleanVal = cleanAssetName(name);
                        if (cleanVal) assetFonts.push({ name: cleanVal, value: cleanVal });
                    });
                } else if (asset.config?.googleConfig === 'all') {
                    POPULAR_GOOGLE_FONTS.forEach(name => {
                        const cleanVal = cleanAssetName(name);
                        if (cleanVal) assetFonts.push({ name: cleanVal, value: cleanVal });
                    });
                }
            } else if (asset.type === 'font') {
                const variations = parseFontVariations(asset.value || '', assetDisplayName);
                variations.forEach(v => {
                    const cleanVal = cleanAssetName(v.value);
                    if (cleanVal) assetFonts.push({ name: cleanAssetName(v.name), value: cleanVal });
                });
            }

            if (assetFonts.length === 0) {
                const cleanVal = cleanAssetName(assetDisplayName);
                if (cleanVal) assetFonts.push({ name: cleanVal, value: cleanVal });
            }

            assetFonts = assetFonts.filter(f => f.name && f.value);

            if (assetFonts.length > 0) {
                const seen = new Set();
                const unique = assetFonts.filter(f => {
                    const isDuplicate = seen.has(f.name);
                    seen.add(f.name);
                    return !isDuplicate;
                });
                groups.push({ label: assetDisplayName, fonts: unique });
            }
        });

        return groups;
    }, [userFonts, selectedElement?.fontAssetId, selectedElement?.type, selectedElement?.fontFamily, selectedElement?.monogramType]);

    // Optimize Font->Asset Lookup
    const fontToAssetMap = React.useMemo(() => {
        const map: Record<string, string> = {};
        userFonts.forEach((asset: any) => {
            if (asset.config?.fontType === 'google') {
                if (asset.config?.googleConfig === 'specific' && asset.config?.specificFonts) {
                    const names = asset.config.specificFonts.split(/[,\n]/).map((n: string) => n.trim()).filter(Boolean);
                    names.forEach((name: string) => map[name] = asset.id);
                } else if (asset.config?.googleConfig === 'all') {
                    POPULAR_GOOGLE_FONTS.forEach(name => map[name] = asset.id);
                }
            } else if (asset.type === 'font') {
                const variations = parseFontVariations(asset.value || '', asset.name);
                if (variations.length > 0) {
                    variations.forEach(f => map[f.value] = String(asset.id));
                } else {
                    map[cleanAssetName(asset.name || '')] = String(asset.id);
                }
            } else {
                map[cleanAssetName(asset.name || '')] = String(asset.id);
            }
        });
        return map;
    }, [userFonts]);

    const availableColors = React.useMemo(() => {
        const colors: { name: string, value: string }[] = [];
        const targetAssets = selectedElement?.colorAssetId
            ? userColors.filter(asset => asset.id === selectedElement.colorAssetId)
            : userColors;

        targetAssets.forEach(asset => {
            const parsed = parseAssetColors(asset.value || '');
            colors.push(...parsed);
        });

        const seen = new Set();
        return colors.filter(c => {
            const isDuplicate = seen.has(c.value);
            seen.add(c.value);
            return !isDuplicate;
        });
    }, [userColors, selectedElement?.colorAssetId]);

    const updateTimeoutRef = useRef<any>(null);

    useEffect(() => {
        setLocalColor(selectedElement?.color || '#000000');
        setLocalStrokeColor(selectedElement?.strokeColor || '#000000');
    }, [selectedElement?.id, selectedElement?.color, selectedElement?.strokeColor, selectedElement?.strokeWidth]);

    const handleUpdate = (updates: Partial<CanvasElement>) => {
        if (!selectedElement) return;

        const isTextUpdate = updates.text !== undefined || updates.textCase !== undefined || updates.maxChars !== undefined;

        if (isTextUpdate) {
            const currentText = updates.text !== undefined ? updates.text : selectedElement.text || '';
            const currentCase = updates.textCase !== undefined ? updates.textCase : (selectedElement.textCase || 'none');
            const currentLimit = updates.maxChars !== undefined ? updates.maxChars : (selectedElement.maxChars || 0);

            let formatted = currentText;
            if (currentCase === 'uppercase') formatted = formatted.toUpperCase();
            else if (currentCase === 'lowercase') formatted = formatted.toLowerCase();

            // For monograms, default to a larger limit if none set
            const limit = currentLimit > 0 ? currentLimit : (selectedElement.type === 'monogram' ? 100 : 0);
            if (limit > 0) formatted = formatted.substring(0, limit);

            updates.text = formatted;
        }

        // Two-way synchronization for Monogram:
        // If fontSize changes (via input/buttons), update the box dimensions
        if (selectedElement.type === 'monogram' && updates.fontSize) {
            // Enforce 1:1 aspect ratio for Monograms to "fit the line"
            updates.width = updates.fontSize;
            updates.height = updates.fontSize;
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

    const isText = selectedElement?.type === 'text' || selectedElement?.type === 'monogram' || selectedElement?.type === 'textarea' || selectedElement?.type === 'number' || selectedElement?.type === 'phone' || selectedElement?.type === 'date' || selectedElement?.type === 'time' || selectedElement?.type === 'field';
    const isNumber = selectedElement?.type === 'number';
    const isPhone = selectedElement?.type === 'phone';
    const isDate = selectedElement?.type === 'date';
    const isTime = selectedElement?.type === 'time';
    const isTextArea = selectedElement?.type === 'textarea';
    const isField = selectedElement?.type === 'field' || selectedElement?.type === 'phone' || selectedElement?.type === 'date' || selectedElement?.type === 'map' || selectedElement?.type === 'swatch';

    return (
        <TooltipProvider delayDuration={150}>
            <div className={`relative ${isPublicMode ? 'h-24' : 'h-10'} bg-white ${isPublicMode ? 'border-b-2' : 'border-b'} border-gray-100 z-40 flex items-center ${isPublicMode ? 'px-10 gap-8' : 'px-3 gap-1.5'} shrink-0 overflow-visible`}>
                {selectedElement ? (
                    <>
                        {/* Font Family */}
                        {(isText || isField) && !selectedElement.disableFontFamily && (
                            <>
                                <Select
                                    value={selectedElement.type === 'monogram' ? (selectedElement.monogramType || selectedElement.fontFamily || 'Vine') : (selectedElement.fontFamily || 'Inter')}
                                    onValueChange={(val: string) => {
                                        if (selectedElement.type === 'monogram') {
                                            const isFixedStyle = ['Diamond', 'Circle', 'Round', 'Scallop', 'Stacked', 'Vine'].includes(val);

                                            if (isFixedStyle) {
                                                handleUpdate({ monogramType: val as any, fontFamily: undefined, fontAssetId: undefined });
                                            } else {
                                                const currentAssetId = selectedElement.fontAssetId;
                                                const cleanVal = cleanAssetName(val);
                                                const assetId = currentAssetId || fontToAssetMap[cleanVal] || fontToAssetMap[val];

                                                handleUpdate({ fontFamily: cleanVal, monogramType: undefined, fontAssetId: assetId });
                                            }
                                        } else {
                                            const cleanVal = cleanAssetName(val);
                                            const assetId = fontToAssetMap[cleanVal] || fontToAssetMap[val];
                                            handleUpdate({ fontFamily: cleanVal, fontAssetId: assetId });
                                        }
                                    }}
                                >
                                    <SelectTrigger className={`${isPublicMode ? 'w-[250px] h-18 text-2xl' : 'w-[140px] h-7 text-[11px]'} bg-gray-50 border-gray-100 rounded-lg font-bold shadow-sm focus:ring-2 focus:ring-indigo-500`}>
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {selectedElement.fontAssetId && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span data-testid="font-filter-tooltip-trigger" className="bg-indigo-100/50 p-1 rounded-sm shrink-0 cursor-help flex items-center justify-center">
                                                            <Filter className="w-3.5 h-3.5 text-indigo-600" />
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" className="z-[1000003]">
                                                        Filtered by Element Font Group
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            <div className="truncate">
                                                <SelectValue placeholder="Font Family" />
                                            </div>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="z-[1000004] max-h-[400px]">
                                        {availableFonts.map((group) => (
                                            <SelectGroup key={group.label}>
                                                <SelectLabel className="text-[12px] font-medium text-indigo-600/50 px-2 py-1.5 bg-gray-50/50">
                                                    {group.label}
                                                </SelectLabel>
                                                {group.fonts.map((f) => (
                                                    <SelectItem
                                                        key={`${group.label}-${f.value}`}
                                                        value={f.value}
                                                        className="text-[14px] py-2 focus:bg-indigo-50 focus:text-indigo-700"
                                                    >
                                                        {cleanAssetName(f.name)}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Separator orientation="vertical" className="h-6 mx-1" />
                            </>
                        )}

                        {/* Font Size */}
                        {(isText || isField) && !selectedElement.disableFontSize && (
                            <>
                                <div className={`flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-md ${isPublicMode ? 'h-16 px-3' : 'h-7 px-1'}`}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`${isPublicMode ? 'h-12 w-12' : 'h-6 w-6'} rounded-md`}
                                                onClick={() => handleUpdate({ fontSize: Math.max(1, (selectedElement.fontSize || 32) - 1) })}
                                            >
                                                <Minus className={`${isPublicMode ? 'w-6 h-6' : 'w-3 h-3'}`} />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Decrease Font Size</TooltipContent>
                                    </Tooltip>
                                    <Input
                                        type="number"
                                        className={`${isPublicMode ? 'w-20 h-12 text-2xl' : 'w-9 h-6 text-[11px]'} text-center p-0 border-0 bg-transparent font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                        value={selectedElement.fontSize || 32}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdate({ fontSize: parseInt(e.target.value) || 1 })}
                                    />
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`${isPublicMode ? 'h-12 w-12' : 'h-6 w-6'} rounded-md`}
                                                onClick={() => handleUpdate({ fontSize: (selectedElement.fontSize || 32) + 1 })}
                                            >
                                                <Plus className={`${isPublicMode ? 'w-6 h-6' : 'w-3 h-3'}`} />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Increase Font Size</TooltipContent>
                                    </Tooltip>
                                </div>
                                <Separator orientation="vertical" className="h-6 mx-1" />
                            </>
                        )}

                        {/* Text Formatting */}
                        {(isText || isField) && selectedElement.type !== 'monogram' && !selectedElement.disableTextDecoration && (
                            <>
                                <div className="flex items-center bg-gray-50 rounded-xl border border-gray-100 p-1">
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
                                        className="h-10"
                                    >
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="flex">
                                                    <ToggleGroupItem value="bold" className={`${isPublicMode ? 'h-14 w-14' : 'h-6 w-6'} rounded-md`} aria-label="Toggle bold">
                                                        <Bold className={`${isPublicMode ? 'w-6 h-6' : 'w-3 h-3'}`} />
                                                    </ToggleGroupItem>
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Bold</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="flex">
                                                    <ToggleGroupItem value="italic" className={`${isPublicMode ? 'h-14 w-14' : 'h-6 w-6'} rounded-md`} aria-label="Toggle italic">
                                                        <Italic className={`${isPublicMode ? 'w-6 h-6' : 'w-3 h-3'}`} />
                                                    </ToggleGroupItem>
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Italic</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="flex">
                                                    <ToggleGroupItem value="underline" className={`${isPublicMode ? 'h-14 w-14' : 'h-6 w-6'} rounded-md`} aria-label="Toggle underline">
                                                        <Underline className={`${isPublicMode ? 'w-6 h-6' : 'w-3 h-3'}`} />
                                                    </ToggleGroupItem>
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Underline</TooltipContent>
                                        </Tooltip>
                                    </ToggleGroup>
                                </div>
                                <Separator orientation="vertical" className="h-6 mx-1" />
                            </>
                        )}

                        {/* Letter Spacing */}
                        {isText && (
                            <>
                                <Popover modal={true}>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className={`${isPublicMode ? 'h-12 w-12' : 'h-8 w-8'} text-gray-400 hover:text-indigo-600 rounded-lg relative z-50`}>
                                            <ArrowRightLeft className={`${isPublicMode ? 'w-6 h-6' : 'w-4 h-4'}`} />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        disablePortal={true}
                                        className="w-64 p-4 drop-shadow-2xl border-indigo-100 rounded-xl space-y-3 bg-white"
                                        side="bottom"
                                        align="center"
                                    >
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[14px] font-medium text-gray-400">Letter Spacing</Label>
                                            <span className="text-[14px] font-medium text-indigo-500">{(selectedElement.letterSpacing || 0)}px</span>
                                        </div>
                                        <Slider
                                            value={[selectedElement.letterSpacing || 0]}
                                            onValueChange={([val]) => handleUpdate({ letterSpacing: val })}
                                            min={-10} max={50} step={1}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Separator orientation="vertical" className="h-6 mx-1" />
                            </>
                        )}

                        {/* Fill Color / Gradient */}
                        {isText && !isTextArea && !selectedElement.disableColorPickerUI && (
                            <>
                                <Popover modal={true}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={`${isPublicMode ? 'h-16 w-[200px] px-5' : 'h-7 w-[100px] px-1.5'} gap-1.5 border-gray-100 rounded-md hover:bg-gray-50 justify-start shadow-sm`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                        >
                                            <div className="relative shrink-0">
                                                <div
                                                    className={`${isPublicMode ? 'w-10 h-10' : 'w-4 h-4'} rounded-full border border-gray-200`}
                                                    style={{
                                                        background: selectedElement.fillType === 'gradient'
                                                            ? `linear-gradient(135deg, ${selectedElement.gradient?.from || '#000'}, ${selectedElement.gradient?.to || '#fff'})`
                                                            : (selectedElement.color || '#000000')
                                                    }}
                                                />
                                                {selectedElement.colorAssetId && (
                                                    <div className="absolute -top-1.5 -right-1.5 bg-indigo-600 rounded-full p-0.5 border border-white">
                                                        <Filter className="w-2 h-2 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`${isPublicMode ? 'text-lg' : 'text-[10px]'} font-medium truncate flex-1 text-left uppercase`}>
                                                {selectedElement.fillType === 'gradient' ? 'Grad' : (selectedElement.color || '#000')}
                                            </span>
                                            <ChevronDown className={`${isPublicMode ? 'w-6 h-6' : 'w-3 h-3'} text-gray-400 shrink-0`} />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        disablePortal={true}
                                        className="w-[280px] p-3 drop-shadow-2xl border-indigo-100 rounded-xl bg-white"
                                        side="bottom"
                                        align="start"
                                        sideOffset={5}
                                    >
                                        <Tabs defaultValue={selectedElement.fillType || 'solid'} className="w-full">
                                            <TabsList className={`grid w-full ${selectedElement.disableGradients ? 'grid-cols-1' : 'grid-cols-2'} mb-4 bg-gray-50 p-1.5 rounded-lg h-11`}>
                                                <TabsTrigger value="solid" className="text-base font-bold py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Solid</TabsTrigger>
                                                {!selectedElement.disableGradients && (
                                                    <TabsTrigger value="gradient" className="text-base font-bold py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Gradient</TabsTrigger>
                                                )}
                                            </TabsList>
                                            <TabsContent value="solid" className="space-y-3 mt-0">
                                                {!selectedElement.disableCustomColors && (
                                                    <HexColorPicker color={localColor} onChange={handleColorChange} />
                                                )}
                                                <div className={`grid grid-cols-5 gap-1.5 ${!selectedElement.disableCustomColors ? 'mt-3 pt-3 border-t border-gray-100' : ''}`}>
                                                    {availableColors.map((c: any) => (
                                                        <button key={`${c.id}-${c.value}`} className={`w-6 h-6 rounded-full border ${localColor === c.value ? 'border-indigo-500 scale-110' : 'border-gray-200'}`} style={{ backgroundColor: c.value }} onClick={() => handleColorChange(c.value)} />
                                                    ))}
                                                </div>
                                                {selectedElement.disableCustomColors && availableColors.length === 0 && (
                                                    <div className="py-4 text-center text-gray-400 text-xs italic">
                                                        Custom colors are disabled and no palette is selected.
                                                    </div>
                                                )}
                                            </TabsContent>
                                            {!selectedElement.disableGradients && (
                                                <TabsContent value="gradient" className="space-y-4 mt-0">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-[14px] uppercase font-bold text-gray-400">From</Label>
                                                            <input type="color" value={selectedElement.gradient?.from || '#000000'} onChange={(e) => handleGradientChange({ from: e.target.value })} className="w-full h-10 rounded-md border-0 p-0 cursor-pointer overflow-hidden bg-transparent" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[14px] uppercase font-bold text-gray-400">To</Label>
                                                            <input type="color" value={selectedElement.gradient?.to || '#ffffff'} onChange={(e) => handleGradientChange({ to: e.target.value })} className="w-full h-10 rounded-md border-0 p-0 cursor-pointer overflow-hidden bg-transparent" />
                                                        </div>
                                                    </div>
                                                </TabsContent>
                                            )}
                                        </Tabs>
                                    </PopoverContent>
                                </Popover>
                                <Separator orientation="vertical" className="h-6 mx-1" />
                            </>
                        )}

                        {/* Alignment */}
                        {isText && selectedElement.type !== 'monogram' && !selectedElement.disableTextAlign && (
                            <>
                                <ToggleGroup
                                    type="single"
                                    value={selectedElement.textAlign || 'center'}
                                    onValueChange={(val: string) => val && handleUpdate({ textAlign: val as any })}
                                >
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="flex">
                                                <ToggleGroupItem value="left" className={`${isPublicMode ? 'h-14 w-14' : 'h-7 w-7'} rounded-md`} aria-label="Align left">
                                                    <AlignLeft className={`${isPublicMode ? 'w-6 h-6' : 'w-4 h-4'}`} />
                                                </ToggleGroupItem>
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Align Left</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="flex">
                                                <ToggleGroupItem value="center" className={`${isPublicMode ? 'h-14 w-14' : 'h-7 w-7'} rounded-md`} aria-label="Align center">
                                                    <AlignCenter className={`${isPublicMode ? 'w-6 h-6' : 'w-4 h-4'}`} />
                                                </ToggleGroupItem>
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Align Center</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="flex">
                                                <ToggleGroupItem value="right" className={`${isPublicMode ? 'h-14 w-14' : 'h-7 w-7'} rounded-md`} aria-label="Align right">
                                                    <AlignRight className={`${isPublicMode ? 'w-6 h-6' : 'w-4 h-4'}`} />
                                                </ToggleGroupItem>
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Align Right</TooltipContent>
                                    </Tooltip>
                                </ToggleGroup>
                                <Separator orientation="vertical" className="h-6 mx-1" />

                                {/* Text Mode */}
                                {!isTextArea && !isNumber && !isPhone && !isDate && !isTime && (
                                    <>
                                        <ToggleGroup
                                            type="single"
                                            value={selectedElement.textMode || 'shrink'}
                                            onValueChange={(val: any) => val && handleUpdate({ textMode: val })}
                                        >
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="flex">
                                                        <ToggleGroupItem value="shrink" className={`${isPublicMode ? 'h-14 w-14' : 'h-7 w-7'} rounded-md`} aria-label="Shrink to fit">
                                                            <Shrink className={`${isPublicMode ? 'w-6 h-6' : 'w-4 h-4'}`} />
                                                        </ToggleGroupItem>
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">Shrink to fit</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="flex">
                                                        <ToggleGroupItem value="wrap" className={`${isPublicMode ? 'h-14 w-14' : 'h-7 w-7'} rounded-md`} aria-label="Auto wrap">
                                                            <WrapText className={`${isPublicMode ? 'w-6 h-6' : 'w-4 h-4'}`} />
                                                        </ToggleGroupItem>
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">Auto Wrap</TooltipContent>
                                            </Tooltip>
                                        </ToggleGroup>
                                        <Separator orientation="vertical" className="h-6 mx-1" />
                                    </>
                                )}

                                {isText && !isNumber && !isPhone && !isDate && !isTime && !selectedElement.disableTextCase && (
                                    <>
                                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-100 p-0.5">
                                            <ToggleGroup
                                                type="single"
                                                value={selectedElement.textCase || 'none'}
                                                onValueChange={(val: any) => val && handleUpdate({ textCase: val })}
                                                className="h-8"
                                            >
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="flex">
                                                            <ToggleGroupItem value="none" className="h-9 w-9 rounded-lg" aria-label="Mixed Case">
                                                                <CaseSensitive className="w-5 h-5" />
                                                            </ToggleGroupItem>
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">Mixed Case</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="flex">
                                                            <ToggleGroupItem value="uppercase" className="h-9 w-9 rounded-lg" aria-label="Uppercase">
                                                                <CaseUpper className="w-5 h-5" />
                                                            </ToggleGroupItem>
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">UPPERCASE</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="flex">
                                                            <ToggleGroupItem value="lowercase" className="h-9 w-9 rounded-lg" aria-label="Lowercase">
                                                                <CaseLower className="w-5 h-5" />
                                                            </ToggleGroupItem>
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">lowercase</TooltipContent>
                                                </Tooltip>
                                            </ToggleGroup>
                                        </div>
                                        <Separator orientation="vertical" className="h-6 mx-1" />
                                    </>
                                )}
                            </>
                        )}

                        {/* Stroke Controls */}
                        {(isText || isField) && (
                            <>
                                <Popover modal={true}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={`${isPublicMode ? 'h-16 w-[200px] px-5' : 'h-7 w-[100px] px-1.5'} gap-1.5 border-gray-100 rounded-md hover:bg-gray-50 justify-start shadow-sm z-50 relative`}
                                        >
                                            <div className="relative shrink-0">
                                                <div
                                                    className={`${isPublicMode ? 'w-10 h-10' : 'w-4 h-4'} rounded-full border border-gray-200`}
                                                    style={{
                                                        backgroundColor: 'transparent',
                                                        borderColor: selectedElement.strokeColor || '#000000',
                                                        borderWidth: Math.min(3, Math.max(1, selectedElement.strokeWidth || 0))
                                                    }}
                                                />
                                            </div>
                                            <span className={`${isPublicMode ? 'text-lg' : 'text-[10px]'} font-medium truncate flex-1 text-left uppercase`}>
                                                {(selectedElement.strokeWidth || 0) > 0 ? (selectedElement.strokeColor || '#000') : 'Stroke'}
                                            </span>
                                            <ChevronDown className={`${isPublicMode ? 'w-6 h-6' : 'w-3 h-3'} text-gray-400 shrink-0`} />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        disablePortal={true}
                                        className="w-[280px] p-3 drop-shadow-2xl border-indigo-100 rounded-xl bg-white"
                                        side="bottom"
                                        align="start"
                                        sideOffset={5}
                                    >
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[12px] font-bold text-gray-700">Stroke Width</Label>
                                                    <span className="text-[12px] text-indigo-600 font-bold">{selectedElement.strokeWidth || 0}px</span>
                                                </div>
                                                <Slider
                                                    value={[selectedElement.strokeWidth || 0]}
                                                    onValueChange={([val]) => handleUpdate({ strokeWidth: val })}
                                                    min={0} max={20} step={1}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[12px] font-bold text-gray-700">Stroke Color</Label>
                                                {!selectedElement.disableCustomColors && (
                                                    <HexColorPicker color={localStrokeColor} onChange={handleStrokeColorChange} />
                                                )}
                                                <div className={`grid grid-cols-5 gap-1.5 ${!selectedElement.disableCustomColors ? 'mt-3 pt-3 border-t border-gray-100' : ''}`}>
                                                    {availableColors.map((c: any) => (
                                                        <button
                                                            key={`stroke-${c.id}-${c.value}`}
                                                            className={`w-6 h-6 rounded-full border ${localStrokeColor === c.value ? 'border-indigo-500 scale-110' : 'border-gray-200'}`}
                                                            style={{ backgroundColor: c.value }}
                                                            onClick={() => handleStrokeColorChange(c.value)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <Separator orientation="vertical" className="h-6 mx-1" />
                            </>
                        )}

                        {/* Rotation */}
                        {!selectedElement.disableRotation && (
                            <>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-3 px-2 cursor-help group/rotate">
                                            <RotateCw className="w-5 h-5 text-gray-400 group-hover/rotate:text-indigo-500 transition-colors" />
                                            <div className="w-24">
                                                <Slider value={[selectedElement.rotation || 0]} onValueChange={(values: number[]) => handleUpdate({ rotation: values[0] })} min={-180} max={180} step={1} />
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Rotation</TooltipContent>
                                </Tooltip>
                                <Separator orientation="vertical" className="h-6 mx-1" />
                            </>
                        )
                        }

                        {/* Opacity */}
                        {
                            !selectedElement.disableOpacity && (
                                <>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center gap-2 px-2 cursor-help group/opacity">
                                                <span className="text-[12px] font-bold text-gray-400 w-8 group-hover/opacity:text-indigo-500 transition-colors">Op</span>
                                                <div className="w-24">
                                                    <Slider value={[selectedElement.opacity || 100]} onValueChange={(values: number[]) => handleUpdate({ opacity: values[0] })} min={0} max={100} step={1} />
                                                </div>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Opacity</TooltipContent>
                                    </Tooltip>
                                </>
                            )
                        }

                        {
                            selectedElement.type === 'image' && onCrop && (
                                <>
                                    <Separator orientation="vertical" className="h-6 mx-1" />

                                    {/* Maintain Aspect Ratio */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-9 w-9 ${selectedElement.lockAspectRatio !== false ? 'text-indigo-600 bg-indigo-50 border border-indigo-100' : 'text-gray-400 hover:text-gray-600'} rounded-lg mx-1`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onUpdateElement(selectedElement.id, { lockAspectRatio: selectedElement.lockAspectRatio === false });
                                                    }}
                                                >
                                                    <Shrink className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Maintain Aspect Ratio ({selectedElement.lockAspectRatio !== false ? 'On' : 'Off'})</TooltipContent>
                                    </Tooltip>

                                    <Separator orientation="vertical" className="h-6 mx-1" />

                                    {/* Reset Crop */}
                                    {selectedElement.crop && (
                                        <>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg mx-1"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onUpdateElement(selectedElement.id, { crop: undefined, width: 200, height: 200 });
                                                        }}
                                                    >
                                                        <RotateCw className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">Reset Crop</TooltipContent>
                                            </Tooltip>
                                            <Separator orientation="vertical" className="h-6 mx-1" />
                                        </>
                                    )}

                                    {/* Crop Button */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg mx-1" onClick={(e) => { e.stopPropagation(); onCrop(); }}>
                                                <Crop className="w-4 h-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Crop Image</TooltipContent>
                                    </Tooltip>

                                    <Separator orientation="vertical" className="h-6 mx-1" />

                                    {/* Size Control with Popover */}
                                    <Popover modal={true}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 w-[180px] px-3 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 rounded-lg mx-1 gap-2"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <span className="uppercase tracking-wider text-[10px] text-gray-400">Size</span>
                                                <span className="text-indigo-600">{Math.round(selectedElement.width || 0)} x {Math.round(selectedElement.height || 0)}</span>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            disablePortal={true}
                                            className="w-64 p-4 drop-shadow-2xl border-indigo-100 rounded-xl bg-white space-y-4"
                                            side="bottom"
                                            align="center"
                                            sideOffset={5}
                                        >
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[12px] font-bold text-gray-900">Dimensions</Label>
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-[10px] text-gray-500">Auto-Resize</Label>
                                                    <Switch
                                                        checked={selectedElement.lockAspectRatio !== false}
                                                        onCheckedChange={(checked) => handleUpdate({ lockAspectRatio: checked })}
                                                        className="scale-75"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-[10px] font-bold text-gray-500">Width</Label>
                                                        <span className="text-[9px] text-indigo-400 font-bold">PX</span>
                                                    </div>
                                                    <Input
                                                        type="number"
                                                        value={Math.round(selectedElement.width || 200)}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            if (!isNaN(val)) {
                                                                if (selectedElement.lockAspectRatio !== false) {
                                                                    const ratio = (selectedElement.height || 200) / (selectedElement.width || 200);
                                                                    handleUpdate({ width: val, height: val * ratio });
                                                                } else {
                                                                    handleUpdate({ width: val });
                                                                }
                                                            }
                                                        }}
                                                        className="h-8 text-[11px] font-bold text-center bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-[10px] font-bold text-gray-500">Height</Label>
                                                        <span className="text-[9px] text-indigo-400 font-bold">PX</span>
                                                    </div>
                                                    <Input
                                                        type="number"
                                                        value={Math.round(selectedElement.height || 200)}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            if (!isNaN(val)) {
                                                                if (selectedElement.lockAspectRatio !== false) {
                                                                    const ratio = (selectedElement.width || 200) / (selectedElement.height || 200);
                                                                    handleUpdate({ height: val, width: val * ratio });
                                                                } else {
                                                                    handleUpdate({ height: val });
                                                                }
                                                            }
                                                        }}
                                                        className="h-8 text-[11px] font-bold text-center bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                                    />
                                                </div>
                                            </div>

                                            <Separator className="bg-gray-100" />

                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-[10px] font-bold text-gray-500">Width Scale</Label>
                                                        <span className="text-[10px] text-gray-400">{Math.round(selectedElement.width || 0)}px</span>
                                                    </div>
                                                    <Slider
                                                        value={[selectedElement.width || 200]}
                                                        onValueChange={([val]) => {
                                                            const newWidth = val;
                                                            if (selectedElement.lockAspectRatio !== false) {
                                                                const ratio = (selectedElement.height || 200) / (selectedElement.width || 200);
                                                                handleUpdate({ width: newWidth, height: newWidth * ratio });
                                                            } else {
                                                                handleUpdate({ width: newWidth });
                                                            }
                                                        }}
                                                        min={10}
                                                        max={1200}
                                                        step={1}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-[10px] font-bold text-gray-500">Height Scale</Label>
                                                        <span className="text-[10px] text-gray-400">{Math.round(selectedElement.height || 0)}px</span>
                                                    </div>
                                                    <Slider
                                                        value={[selectedElement.height || 200]}
                                                        onValueChange={([val]) => {
                                                            const newHeight = val;
                                                            if (selectedElement.lockAspectRatio !== false) {
                                                                const ratio = (selectedElement.width || 200) / (selectedElement.height || 200);
                                                                handleUpdate({ height: newHeight, width: newHeight * ratio });
                                                            } else {
                                                                handleUpdate({ height: newHeight });
                                                            }
                                                        }}
                                                        min={10}
                                                        max={1200}
                                                        step={1}
                                                    />
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>

                                    <Separator orientation="vertical" className="h-6 mx-1" />

                                    {/* Background Removal */}
                                    <Popover modal={true}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`h-9 w-9 ${selectedElement.removeBg ? 'text-indigo-600 bg-indigo-50 border border-indigo-100' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'} rounded-lg mx-1`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                }}
                                            >
                                                <Eraser className="w-4 h-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            disablePortal={true}
                                            className="w-72 p-4 drop-shadow-2xl border-indigo-100 rounded-xl bg-white space-y-4"
                                            side="bottom"
                                            align="center"
                                            sideOffset={5}
                                        >
                                            <div className="flex flex-col gap-1 mb-2">
                                                <h4 className="text-[12px] font-bold text-gray-900">Background Removal</h4>
                                                <p className="text-[10px] text-gray-400">Select removal method</p>
                                            </div>



                                            <Tabs
                                                defaultValue={selectedElement.removeBgType || 'js'}
                                                className="w-full"
                                                onValueChange={(val: string) => onUpdateElement(selectedElement.id, { removeBgType: val as 'js' | 'rembg' })}
                                            >
                                                <TabsList className="grid w-full grid-cols-2 mb-4 h-8 bg-gray-50 p-1">
                                                    <TabsTrigger value="js" className="text-[10px] font-bold">Live Filter</TabsTrigger>
                                                    <TabsTrigger value="rembg" className="text-[10px] font-bold">AI Rem</TabsTrigger>
                                                </TabsList>

                                                <TabsContent value="js" className="space-y-4 mt-0">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-[10px] font-bold text-gray-500">Enable Filter</Label>
                                                        <Switch
                                                            checked={!!(selectedElement.removeBg && selectedElement.removeBgType === 'js')}
                                                            onCheckedChange={(checked) => onUpdateElement(selectedElement.id, { removeBg: checked, removeBgType: 'js' })}
                                                            className="scale-75"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-[10px] font-bold text-gray-500">Sensitivity</Label>
                                                            <span className="text-[9px] font-bold text-indigo-500">{selectedElement.removeBgDeep || 0}</span>
                                                        </div>
                                                        <Slider
                                                            value={[selectedElement.removeBgDeep || 0]}
                                                            onValueChange={([val]) => onUpdateElement(selectedElement.id, { removeBgDeep: val, removeBgType: 'js', removeBg: true })}
                                                            min={0}
                                                            max={200}
                                                            step={1}
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-bold text-gray-500">Target Color</Label>
                                                        <Select
                                                            value={selectedElement.removeBgMode || 'light'}
                                                            onValueChange={(val) => onUpdateElement(selectedElement.id, { removeBgMode: val as 'light' | 'dark', removeBgType: 'js', removeBg: true })}
                                                        >
                                                            <SelectTrigger className="w-full h-8 text-[10px] font-bold border-indigo-100">
                                                                <SelectValue placeholder="Select Target" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="light" className="text-[10px] font-bold text-gray-700">Remove Whites/Light</SelectItem>
                                                                <SelectItem value="dark" className="text-[10px] font-bold text-gray-700">Remove Blacks/Dark</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </TabsContent>

                                                <TabsContent value="rembg" className="space-y-4 mt-0">
                                                    <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50 text-center space-y-2">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 mx-auto flex items-center justify-center">
                                                            <Eraser className="w-4 h-4 text-indigo-600" />
                                                        </div>
                                                        <p className="text-[10px] text-indigo-800 leading-tight">
                                                            AI will automatically detect and remove the background.
                                                        </p>
                                                    </div>
                                                    <Button
                                                        className="w-full h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 gap-2"
                                                        onClick={handleRemoveBg}
                                                        disabled={isRemovingBg}
                                                    >
                                                        {isRemovingBg ? (
                                                            <RotateCw className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <Upload className="w-3 h-3" />
                                                        )}
                                                        {isRemovingBg ? "Processing..." : "Remove Background Now"}
                                                    </Button>
                                                </TabsContent>
                                            </Tabs>
                                        </PopoverContent>
                                    </Popover>

                                    <Separator orientation="vertical" className="h-6 mx-1" />

                                    {/* Adjustments */}
                                    <Popover modal={true}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg mx-1"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Sliders className="w-4 h-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            disablePortal={true}
                                            className="w-72 p-4 drop-shadow-2xl border-indigo-100 rounded-xl bg-white space-y-4"
                                            side="bottom"
                                            align="center"
                                            sideOffset={5}
                                        >
                                            <div className="flex flex-col gap-1 mb-2">
                                                <h4 className="text-[12px] font-bold text-gray-900">Image Adjustments</h4>
                                                <p className="text-[10px] text-gray-400">Fine tune your image</p>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <Label className="text-[10px] font-bold text-gray-500">Brightness</Label>
                                                        <span className="text-[10px] font-bold text-indigo-600">{selectedElement.imageFilters?.brightness ?? 100}%</span>
                                                    </div>
                                                    <Slider
                                                        value={[selectedElement.imageFilters?.brightness ?? 100]}
                                                        onValueChange={([val]) => onUpdateElement(selectedElement.id, {
                                                            imageFilters: { ...selectedElement.imageFilters, brightness: val, preset: selectedElement.imageFilters?.preset || 'none' }
                                                        })}
                                                        min={0} max={200} step={1}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <Label className="text-[10px] font-bold text-gray-500">Contrast</Label>
                                                        <span className="text-[10px] font-bold text-indigo-600">{selectedElement.imageFilters?.contrast ?? 100}%</span>
                                                    </div>
                                                    <Slider
                                                        value={[selectedElement.imageFilters?.contrast ?? 100]}
                                                        onValueChange={([val]) => onUpdateElement(selectedElement.id, {
                                                            imageFilters: { ...selectedElement.imageFilters, contrast: val, preset: selectedElement.imageFilters?.preset || 'none' }
                                                        })}
                                                        min={0} max={200} step={1}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <Label className="text-[10px] font-bold text-gray-500">Saturation</Label>
                                                        <span className="text-[10px] font-bold text-indigo-600">{selectedElement.imageFilters?.saturate ?? 100}%</span>
                                                    </div>
                                                    <Slider
                                                        value={[selectedElement.imageFilters?.saturate ?? 100]}
                                                        onValueChange={([val]) => onUpdateElement(selectedElement.id, {
                                                            imageFilters: { ...selectedElement.imageFilters, saturate: val, preset: selectedElement.imageFilters?.preset || 'none' }
                                                        })}
                                                        min={0} max={200} step={1}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <Label className="text-[10px] font-bold text-gray-500">Hue Rotate</Label>
                                                        <span className="text-[10px] font-bold text-indigo-600">{selectedElement.imageFilters?.hueRotate ?? 0}°</span>
                                                    </div>
                                                    <Slider
                                                        value={[selectedElement.imageFilters?.hueRotate ?? 0]}
                                                        onValueChange={([val]) => onUpdateElement(selectedElement.id, {
                                                            imageFilters: { ...selectedElement.imageFilters, hueRotate: val, preset: selectedElement.imageFilters?.preset || 'none' }
                                                        })}
                                                        min={0} max={360} step={1}
                                                    />
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full h-8 text-[10px] font-bold text-red-500 border-red-100 hover:bg-red-50"
                                                    onClick={() => onUpdateElement(selectedElement.id, {
                                                        imageFilters: {
                                                            brightness: 100, contrast: 100, saturate: 100, hueRotate: 0, sepia: 0, grayscale: 0, preset: 'none'
                                                        }
                                                    })}
                                                >
                                                    Reset Adjustments
                                                </Button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>

                                    {/* Artistic Filters */}
                                    <Popover modal={true}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg mx-1"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Wand2 className="w-4 h-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            disablePortal={true}
                                            className="w-72 p-4 drop-shadow-2xl border-indigo-100 rounded-xl bg-white space-y-4"
                                            side="bottom"
                                            align="center"
                                            sideOffset={5}
                                        >
                                            <div className="flex flex-col gap-1 mb-2">
                                                <h4 className="text-[12px] font-bold text-gray-900">Artistic Filters</h4>
                                                <p className="text-[10px] text-gray-400">Apply instant photo effects</p>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2">
                                                {IMAGE_PRESETS.map((preset) => (
                                                    <button
                                                        key={preset.id}
                                                        onClick={() => onUpdateElement(selectedElement.id, {
                                                            imageFilters: { ...selectedElement.imageFilters, preset: preset.id }
                                                        })}
                                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-[10px] font-bold ${(selectedElement.imageFilters?.preset || 'none') === preset.id
                                                            ? 'bg-indigo-600 border-indigo-600 text-white'
                                                            : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-400'
                                                            }`}
                                                    >
                                                        <div
                                                            className="w-8 h-8 rounded-sm mb-1 border border-black/10 overflow-hidden"
                                                            style={{
                                                                background: 'linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%), linear-gradient(45deg, #eee 25%, white 25%, white 75%, #eee 75%)',
                                                                backgroundSize: '10px 10px',
                                                                backgroundPosition: '0 0, 5px 5px'
                                                            }}
                                                        >
                                                            <div
                                                                className="w-full h-full bg-indigo-400"
                                                                style={{ filter: preset.filter }}
                                                            />
                                                        </div>
                                                        {preset.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </>
                            )
                        }



                        <div className="flex-1" />

                        {/* Advanced Settings */}
                        {
                            !isPublicMode && (
                                <Popover>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-11 w-11 text-gray-400 hover:text-indigo-600 rounded-xl">
                                                    <Settings className="w-5 h-5" />
                                                </Button>
                                            </PopoverTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Advanced Settings</TooltipContent>
                                    </Tooltip>
                                    <PopoverContent className="w-64 p-4 z-[1000004] drop-shadow-2xl border-indigo-100 rounded-xl space-y-4">
                                        <div className="flex flex-col gap-1">
                                            <h4 className="text-[14px] font-medium text-gray-900">Advanced Settings</h4>
                                            <p className="text-[14px] text-gray-400 font-medium leading-tight">Configure specific permissions for this element.</p>
                                        </div>
                                        <Separator className="bg-gray-100" />

                                        <div className="space-y-2">
                                            <Label className="text-[12px] font-medium text-gray-400">Available Color Palette</Label>
                                            <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 min-h-[48px] flex flex-wrap gap-2">
                                                {availableColors.length > 0 ? (
                                                    availableColors.map((c: any) => (
                                                        <div key={c.value} className="w-6 h-6 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: c.value }} title={c.name} />
                                                    ))
                                                ) : (
                                                    <span className="text-[14px] text-gray-400 italic">No palette selected</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2 pb-1">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[11px] font-medium text-gray-700">Rotation</Label>
                                                <Switch
                                                    checked={!selectedElement.disableRotation}
                                                    onCheckedChange={(checked) => handleUpdate({ disableRotation: !checked })}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[11px] font-medium text-gray-700">Opacity</Label>
                                                <Switch
                                                    checked={!selectedElement.disableOpacity}
                                                    onCheckedChange={(checked) => handleUpdate({ disableOpacity: !checked })}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[11px] font-medium text-gray-700">Font Size</Label>
                                                <Switch
                                                    checked={!selectedElement.disableFontSize}
                                                    onCheckedChange={(checked) => handleUpdate({ disableFontSize: !checked })}
                                                />
                                            </div>
                                            {selectedElement.type !== 'monogram' && (
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[11px] font-medium text-gray-700">Font Family</Label>
                                                    <Switch
                                                        checked={!selectedElement.disableFontFamily}
                                                        onCheckedChange={(checked) => handleUpdate({ disableFontFamily: !checked })}
                                                    />
                                                </div>
                                            )}
                                            {selectedElement.type !== 'monogram' && (
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[11px] font-medium text-gray-700">Alignment</Label>
                                                    <Switch
                                                        checked={!selectedElement.disableTextAlign}
                                                        onCheckedChange={(checked) => handleUpdate({ disableTextAlign: !checked })}
                                                    />
                                                </div>
                                            )}
                                            {selectedElement.type !== 'monogram' && (
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[11px] font-medium text-gray-700">Text Case</Label>
                                                    <Switch
                                                        checked={!selectedElement.disableTextCase}
                                                        onCheckedChange={(checked) => handleUpdate({ disableTextCase: !checked })}
                                                    />
                                                </div>
                                            )}
                                            {selectedElement.type !== 'monogram' && (
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[11px] font-medium text-gray-700">Formatting</Label>
                                                    <Switch
                                                        checked={!selectedElement.disableTextDecoration}
                                                        onCheckedChange={(checked) => handleUpdate({ disableTextDecoration: !checked })}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <Label className={`${isPublicMode ? 'text-base' : 'text-[11px]'} font-medium text-gray-700`}>Fill Color</Label>
                                                <Switch
                                                    checked={!selectedElement.disableColorPickerUI}
                                                    onCheckedChange={(checked) => handleUpdate({ disableColorPickerUI: !checked })}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label className={`${isPublicMode ? 'text-base' : 'text-[11px]'} font-medium text-gray-700`}>Gradient</Label>
                                                <Switch
                                                    checked={!selectedElement.disableGradients}
                                                    onCheckedChange={(checked) => {
                                                        handleUpdate({
                                                            disableGradients: !checked,
                                                            fillType: !checked && selectedElement.fillType === 'gradient' ? 'solid' : selectedElement.fillType
                                                        });
                                                    }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[11px] font-medium text-gray-700">Color Picker</Label>
                                                <Switch
                                                    checked={!selectedElement.disableCustomColors}
                                                    onCheckedChange={(checked) => handleUpdate({ disableCustomColors: !checked })}
                                                />
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )
                        }

                        <div className={`flex items-center ${isPublicMode ? 'gap-3 pl-8' : 'gap-0 pl-1.5'} border-l border-gray-100`}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className={`${isPublicMode ? 'h-12 w-12' : 'h-7 w-7'} text-gray-400 hover:text-indigo-600 rounded-md`} onClick={() => onDuplicateElement(selectedElement.id)}>
                                        <Copy className={`${isPublicMode ? 'w-6 h-6' : 'w-3 h-3'}`} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Duplicate</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className={`${isPublicMode ? 'h-12 w-12' : 'h-7 w-7'} text-gray-400 hover:text-red-600 rounded-md`} onClick={() => onDeleteElement(selectedElement.id)}>
                                        <Trash2 className={`${isPublicMode ? 'w-6 h-6' : 'w-3 h-3'}`} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Delete</TooltipContent>
                            </Tooltip>
                        </div>
                    </>
                ) : (
                    <div className="flex-1" />
                )}
            </div >
        </TooltipProvider >
    );
}
