import { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronDown, Layers, Settings2, Move, ScanLine, Copy, Trash2, RotateCw, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

import { CanvasElement, MonogramType } from '@/types';
import { toast } from 'sonner';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from '@/components/ui/switch';
import { cleanAssetName, parseFontVariations } from '../utils/fonts';

interface MonogramShape {
    name: string;
    id: MonogramType;
    isMonogram: boolean;
    bridge?: any;
}

const MONOGRAM_SHAPES: MonogramShape[] = [
    { name: 'Diamond', id: 'Diamond', isMonogram: true },
    { name: 'Interlocking Vine', id: 'Vine', isMonogram: true },
    { name: 'Master Circle', id: 'Circle', isMonogram: true },
    { name: 'Scallop Circle', id: 'Scallop', isMonogram: true },
    { name: 'Stacked Solid', id: 'Stacked', isMonogram: true },
    { name: 'Traditional Circle', id: 'Round', isMonogram: true }
];

interface MonogramToolProps {
    onAddElement: (element: CanvasElement) => void;
    selectedElement?: CanvasElement;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    canvasDimensions?: { width: number; height: number };
    userColors?: any[];
    userFonts?: any[];
}

export function MonogramTool({ onAddElement, selectedElement, onUpdateElement, canvasDimensions, userFonts = [] }: MonogramToolProps) {
    const [text, setText] = useState(selectedElement?.text || 'ABC');
    const [label, setLabel] = useState(selectedElement?.label || '');
    const [showLabel, setShowLabel] = useState(selectedElement?.showLabel !== false);
    const [selectedMonogram, setSelectedMonogram] = useState<MonogramShape | null>(null);
    const [color, setColor] = useState(selectedElement?.color || '#000000');
    const [maxChars, setMaxChars] = useState(selectedElement?.maxChars || 3);
    const [fontMode, setFontMode] = useState<'fixed' | 'custom'>('fixed');
    const [selectedFontId, setSelectedFontId] = useState<string>('');
    const flatCustomFonts = useMemo(() => {
        const fonts: { name: string, value: string, assetId: string, assetName: string }[] = [];

        userFonts.forEach((asset: any) => {
            const assetName = cleanAssetName(asset.name || '');
            if (!assetName) return;

            const variations = parseFontVariations(asset.value || '', assetName);

            if (variations.length > 0) {
                variations.forEach(v => {
                    fonts.push({
                        name: cleanAssetName(v.name),
                        value: cleanAssetName(v.value),
                        assetId: asset.id,
                        assetName: assetName
                    });
                });
            } else {
                const cleanVal = cleanAssetName(assetName);
                if (cleanVal) {
                    fonts.push({
                        name: cleanVal,
                        value: cleanVal,
                        assetId: asset.id,
                        assetName: assetName
                    });
                }
            }
        });
        return fonts;
    }, [userFonts]);

    const groupedFonts = useMemo(() => {
        const groups: Record<string, { label: string, fonts: any[], assetId: string }> = {};
        flatCustomFonts.forEach((f: any) => {
            if (!groups[f.assetId]) {
                groups[f.assetId] = { label: f.assetName, fonts: [], assetId: f.assetId };
            }
            groups[f.assetId].fonts.push(f);
        });
        return Object.values(groups);
    }, [flatCustomFonts]);

    useEffect(() => {
        if (selectedElement && selectedElement.type === 'monogram') {
            setText(selectedElement.text || 'ABC');
            setLabel(selectedElement.label || '');
            setShowLabel(selectedElement.showLabel !== false);
            setColor(selectedElement.color || '#000000');
            setMaxChars(selectedElement.maxChars || 3);

            if (selectedElement.fontAssetId || (selectedElement.fontFamily && !selectedElement.monogramType)) {
                setFontMode('custom');
                if (selectedElement.fontAssetId) {
                    setSelectedFontId(String(selectedElement.fontAssetId));
                } else if (selectedElement.fontFamily) {
                    const matched = flatCustomFonts.find(f => f.value === selectedElement.fontFamily);
                    if (matched) setSelectedFontId(matched.assetId);
                }
            } else {
                setFontMode('fixed');
                const shape = MONOGRAM_SHAPES.find(s => s.id === selectedElement.monogramType);
                if (shape) setSelectedMonogram(shape);
            }
        }
    }, [
        selectedElement?.id,
        selectedElement?.text,
        selectedElement?.monogramType,
        selectedElement?.fontFamily,
        selectedElement?.fontAssetId,
        selectedElement?.color,
        selectedElement?.maxChars,
        userFonts,
        flatCustomFonts
    ]);

    const handleUpdate = (updates: Partial<CanvasElement>) => {
        if (selectedElement) {
            onUpdateElement(selectedElement.id, updates);
        }
    };

    const handleAddMonogram = () => {
        if (selectedElement && selectedElement.type === 'monogram' && selectedElement.id !== 'draft') {
            const updates: Partial<CanvasElement> = {
                text: text.substring(0, 3).toUpperCase(),
            };

            // Mode is already set by button clicks or font selection
            // Just update the text
            onUpdateElement(selectedElement.id, updates);
            return;
        }

        const canvasW = canvasDimensions?.width || 1000;
        const canvasH = canvasDimensions?.height || 1000;
        const centerX = (canvasW / 2) - 50;
        const centerY = (canvasH / 2) - 50;

        let fontFamily: string | undefined = undefined;
        let fontAssetId: string | undefined = undefined;
        let monogramType: MonogramType | undefined = selectedMonogram?.id || 'Vine';

        if (fontMode === 'custom' && selectedFontId) {
            const matched = flatCustomFonts.find((f: any) => String(f.assetId) === String(selectedFontId));
            console.log('[MonogramTool] Creating with custom font:', {
                fontMode,
                selectedFontId,
                matched,
                fontFamily: matched?.value,
                fontAssetId: matched?.assetId,
                flatCustomFontsCount: flatCustomFonts.length
            });
            if (matched) {
                fontFamily = matched.value;
                fontAssetId = matched.assetId;
                monogramType = undefined;
            }
        }

        const newElement: CanvasElement = {
            id: `monogram-${Date.now()}`,
            type: 'monogram',
            monogramType,
            fontFamily,
            fontAssetId,
            text: text.toUpperCase() || 'ABC',
            x: centerX,
            y: centerY,
            width: 100,
            height: 100,
            fontSize: 100,
            rotation: 0,
            opacity: 100,
            zIndex: Date.now(),
            color,
            label,
            showLabel,
            isEditableByCustomer: true,
        };
        onAddElement(newElement);
        toast.success('Monogram added');
    };

    return (
        <div className="space-y-6 pb-4">
            <div className="px-1 space-y-4">
                <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <Label className="text-[14px] font-bold text-gray-700">Title</Label>
                        <Input
                            value={label}
                            onChange={(e) => {
                                setLabel(e.target.value);
                                if (selectedElement) handleUpdate({ label: e.target.value });
                            }}
                            placeholder="e.g. Monogram Initials"
                            className="h-10 rounded-xl border-gray-200 bg-white"
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                        <Label className="text-[12px] font-medium text-gray-700 leading-relaxed max-w-[200px]">
                            Toggle visibility of title in customer panel
                        </Label>
                        <Switch
                            checked={showLabel}
                            onCheckedChange={(checked) => {
                                setShowLabel(checked);
                                if (selectedElement) handleUpdate({ showLabel: checked });
                            }}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                    <Label className="text-[14px] font-bold text-gray-700">Monogram Initials</Label>
                    <span className="text-[12px] font-medium text-gray-400">
                        {maxChars ? `${text.length}/${maxChars}` : `${text.length} chars`}
                    </span>
                </div>

                <Input
                    value={text}
                    maxLength={maxChars || 3}
                    onChange={(e) => {
                        const limit = maxChars || 3;
                        let val = e.target.value.toUpperCase();
                        // Strictly enforce the limit
                        if (val.length > limit) {
                            val = val.substring(0, limit);
                        }
                        setText(val);
                        if (selectedElement) handleUpdate({ text: val });
                    }}
                    onInput={(e: React.FormEvent<HTMLInputElement>) => {
                        // Additional enforcement on input event
                        const target = e.currentTarget;
                        const limit = maxChars || 3;
                        if (target.value.length > limit) {
                            target.value = target.value.substring(0, limit);
                        }
                    }}
                    placeholder="ABC"
                    className="rounded-xl h-12 bg-white border-gray-200 font-bold text-center focus:ring-indigo-500 focus:border-indigo-500 transition-all text-[14px] tracking-widest"
                />

                <Button
                    onClick={() => handleAddMonogram()}
                    className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4 text-[12px]"
                >
                    <Plus className="w-5 h-5" />
                    {selectedElement?.opacity !== 0 ? 'Update' : 'Add'}
                </Button>

            </div>

            <div className="h-px bg-gray-100 mx-2" />

            {/* Font Mode Toggle */}
            <div className="px-1 space-y-3 mt-4">
                <Label className="text-[14px] font-bold text-gray-700">Font Source</Label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => {
                            setFontMode('fixed');
                            if (selectedElement) {
                                // Switch to fixed mode: clear custom font, set default monogram
                                handleUpdate({
                                    monogramType: selectedMonogram?.id || 'Vine',
                                    fontFamily: undefined,
                                    fontAssetId: undefined
                                });
                            }
                        }}
                        className={`px-3 py-2 text-[14px] font-medium rounded-lg transition-all ${fontMode === 'fixed'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Fixed Fonts
                    </button>
                    <button
                        onClick={() => {
                            setFontMode('custom');
                            // Don't auto-update when switching to custom mode
                            // User needs to select a font group first
                        }}
                        className={`px-3 py-2 text-[14px] font-medium rounded-lg transition-all ${fontMode === 'custom'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Custom Fonts
                    </button>
                </div>

                {fontMode === 'custom' && (
                    <div className="space-y-2">
                        <Label className="text-[14px] font-bold text-gray-700">Select Font Group</Label>
                        <select
                            value={selectedFontId}
                            onChange={(e) => {
                                const assetId = e.target.value;
                                setSelectedFontId(assetId);

                                if (assetId && selectedElement) {
                                    // Find the first valid font in this group to set as default
                                    const group = groupedFonts.find(g => g.assetId === assetId);
                                    const firstFont = group?.fonts[0]?.value;

                                    handleUpdate({
                                        fontAssetId: assetId,
                                        fontFamily: firstFont,
                                        monogramType: undefined
                                    });
                                }
                            }}
                            className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">Select a font group...</option>
                            {groupedFonts.map((group: any) => (
                                <option key={group.assetId} value={group.assetId}>
                                    {group.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-[14px] text-gray-400 px-1 italic">
                            Select a group here, then pick specific fonts from the top toolbar.
                        </p>
                    </div>
                )}
            </div>

            <div className="h-px bg-gray-100 mx-2 mt-4" />

            {
                fontMode === 'fixed' && (
                    <div className="space-y-2 mt-4">
                        <div className="flex items-center gap-3 p-2.5 w-full rounded-xl bg-gray-50 border border-gray-100">
                            <Layers className="w-5 h-5 text-indigo-600" />
                            <span className="text-[14px] font-bold text-gray-900">Monogram Styles</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 px-1">
                            {MONOGRAM_SHAPES.map((shape: any) => (
                                <button
                                    key={shape.id}
                                    onClick={() => {
                                        handleUpdate({ monogramType: shape.id, fontFamily: undefined, fontAssetId: undefined });
                                        setSelectedMonogram(shape);
                                    }}
                                    className={`group relative flex flex-col items-center justify-center p-2 bg-white rounded-lg border transition-all shadow-sm ${selectedElement?.monogramType === shape.id ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-gray-200 hover:border-indigo-400'}`}
                                >
                                    <div className="h-10 w-full flex items-center justify-center mb-1">
                                        {shape.id === 'Circle' && <div className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-[8px] font-bold text-gray-600">ABC</div>}
                                        {shape.id === 'Diamond' && <div className="w-8 h-8 rotate-45 border border-gray-300 flex items-center justify-center text-[7px] font-bold text-gray-600"><span className="-rotate-45">ABC</span></div>}
                                        {shape.id === 'Vine' && <div className="text-[18px] italic font-serif text-gray-600 flex items-center tracking-tighter"><span className="translate-x-1 opacity-60">A</span><span className="text-lg z-10 scale-125">B</span><span className="-translate-x-1 opacity-60">C</span></div>}
                                        {shape.id === 'Scallop' && <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-[8px] font-bold text-gray-600">ABC</div>}
                                        {shape.id === 'Stacked' && <div className="flex items-center gap-1"><div className="flex flex-col text-[6px] gap-0.5"><span>A</span><span>B</span></div><div className="text-sm font-bold">C</div></div>}
                                        {shape.id === 'Round' && <div className="w-8 h-8 rounded-full border-2 border-double border-gray-300 flex items-center justify-center text-[8px] font-bold text-gray-600">ABC</div>}
                                    </div>
                                    <span className="text-[12px] text-gray-500 font-medium truncate w-full text-center">{shape.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )
            }

            <div className="px-1 mt-6">
                <Collapsible>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full flex items-center justify-between px-2 h-10 hover:bg-gray-50 text-gray-500 hover:text-indigo-600 rounded-lg group">
                            <div className="flex items-center gap-2">
                                <Settings2 className="w-5 h-5" />
                                <span className="text-[14px] font-bold text-gray-700">Advanced settings</span>
                            </div>
                            <ChevronDown className="w-5 h-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3 space-y-4 px-1">
                        <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            {['lockMove', 'lockResize', 'lockRotate', 'lockDelete', 'lockDuplicate'].map((lock) => (
                                <div key={lock} className="flex items-center justify-between">
                                    <Label className="text-[14px] font-medium text-gray-600 flex items-center gap-2 capitalize">
                                        {lock === 'lockMove' && <Move className="w-4 h-4" />}
                                        {lock === 'lockResize' && <ScanLine className="w-4 h-4" />}
                                        {lock === 'lockRotate' && <RotateCw className="w-4 h-4" />}
                                        {lock === 'lockDelete' && <Trash2 className="w-4 h-4" />}
                                        {lock === 'lockDuplicate' && <Copy className="w-4 h-4" />}
                                        {lock.replace('lock', 'Lock ').toLowerCase()}
                                    </Label>
                                    <Switch
                                        checked={(selectedElement as any)?.[lock]}
                                        onCheckedChange={(c) => handleUpdate({ [lock]: c })}
                                        className="scale-75"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center justify-between">
                                <Label className="text-[14px] font-medium text-gray-600">Max characters</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={selectedElement?.maxChars || 3}
                                    onChange={(e) => handleUpdate({ maxChars: parseInt(e.target.value) || 1 })}
                                    className="w-16 h-8 text-[14px] bg-white text-right font-bold"
                                />
                            </div>
                        </div>

                        {/* Default Text Visibility */}
                        <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100 mt-2">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <Label className="text-[10px] font-medium text-gray-500 flex items-center gap-2">
                                        <EyeOff className="w-3 h-3" /> Hide Default Text on Public
                                    </Label>
                                    <p className="text-[9px] text-gray-400 mt-0.5 ml-5">
                                        Hidden until customer types
                                    </p>
                                </div>
                                <Switch
                                    checked={selectedElement?.hideTextPreview}
                                    onCheckedChange={(c) => handleUpdate({ hideTextPreview: c })}
                                    className="scale-75"
                                />
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </div >
    );
}
