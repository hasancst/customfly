import React, { useState, useEffect, useMemo } from 'react';
import {
    Type,
    Palette,
    Image as ImageIcon,
    Settings2,
    ChevronDown,
    Plus,
    Check,
    Search
} from 'lucide-react';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { POPULAR_GOOGLE_FONTS } from '../constants/fonts';
import { CanvasElement } from '@/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from '@/components/ui/scroll-area';

interface AssetsToolProps {
    onAddElement: (element: CanvasElement) => void;
    selectedElement?: CanvasElement;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
}

export function AssetsTool({ onAddElement, selectedElement, onUpdateElement }: AssetsToolProps) {
    const [fonts, setFonts] = useState<any[]>([]);
    const [colors, setColors] = useState<any[]>([]);
    const [images, setImages] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const fetch = useAuthenticatedFetch();

    useEffect(() => {
        async function fetchAssets() {
            try {
                const [fontsRes, colorsRes, imagesRes] = await Promise.all([
                    fetch('/imcst_api/assets?type=font'),
                    fetch('/imcst_api/assets?type=color'),
                    fetch('/imcst_api/assets?type=image')
                ]);
                if (fontsRes.ok) setFonts(await fontsRes.json());
                if (colorsRes.ok) setColors(await colorsRes.json());
                if (imagesRes.ok) setImages(await imagesRes.json());
            } catch (err) {
                console.error("Failed to fetch assets in AssetsTool:", err);
            }
        }
        fetchAssets();
    }, [fetch]);

    // Process available fonts based on assets config
    const availableFonts = useMemo(() => {
        const fontItems: { name: string, id: string }[] = [];
        fonts.forEach(asset => {
            if (asset.config?.fontType === 'google') {
                if (asset.config?.googleConfig === 'specific' && asset.config?.specificFonts) {
                    const names = asset.config.specificFonts.split(/[,\n]/).map((n: string) => n.trim()).filter(Boolean);
                    names.forEach((name: string) => fontItems.push({ name, id: `${asset.id}-${name}` }));
                } else if (asset.config?.googleConfig === 'all') {
                    POPULAR_GOOGLE_FONTS.forEach((name: string) => fontItems.push({ name, id: `${asset.id}-${name}` }));
                }
            } else if (asset.config?.fontType === 'custom') {
                fontItems.push({ name: asset.name, id: asset.id });
            } else if (asset.type === 'font') {
                fontItems.push({ name: asset.name, id: asset.id });
            }
        });

        if (fontItems.length === 0) {
            POPULAR_GOOGLE_FONTS.slice(0, 20).forEach((name: string) => fontItems.push({ name, id: name }));
        }

        const seen = new Set();
        return fontItems.filter(f => {
            if (seen.has(f.name)) return false;
            seen.add(f.name);
            return true;
        });
    }, [fonts]);

    const handleAddTextWithFont = (fontFamily: string) => {
        const newElement: CanvasElement = {
            id: `text-${Date.now()}`,
            type: 'text',
            text: 'New Text',
            x: 100,
            y: 100,
            width: 200,
            height: 40,
            fontSize: 32,
            fontFamily,
            fontWeight: 400,
            textAlign: 'center',
            color: '#000000',
            rotation: 0,
            opacity: 100,
            zIndex: Date.now(),
            textMode: 'shrink'
        };
        onAddElement(newElement);
    };

    const handleApplyColor = (colorValue: string) => {
        if (selectedElement && (selectedElement.type === 'text' || selectedElement.type === 'monogram')) {
            onUpdateElement(selectedElement.id, { color: colorValue, fillType: 'solid' });
        }
    };

    const handleAddImage = (url: string) => {
        const newElement: CanvasElement = {
            id: `image-${Date.now()}`,
            type: 'image',
            src: url,
            x: 150,
            y: 150,
            width: 200,
            height: 200,
            rotation: 0,
            opacity: 100,
            zIndex: Date.now(),
        };
        onAddElement(newElement);
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 rounded-xl bg-gray-50 border-gray-100 focus:bg-white transition-all text-sm"
                />
            </div>

            <ScrollArea className="h-[calc(100vh-280px)] pr-4">
                <div className="space-y-3">
                    {/* FONT SECTION */}
                    <Collapsible defaultOpen>
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center gap-3 p-3 w-full rounded-xl bg-gray-50 hover:bg-indigo-50 transition-all cursor-pointer group border border-gray-100 hover:border-indigo-200">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100 group-hover:border-indigo-100">
                                    <Type className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div className="flex flex-col items-start flex-1">
                                    <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-900">Fonts</span>
                                    <span className="text-[10px] text-gray-500 font-medium">{fonts.length} styles available</span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 space-y-1">
                            <div className="grid grid-cols-1 gap-1">
                                {availableFonts.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map((font) => (
                                    <button
                                        key={font.id}
                                        onClick={() => handleAddTextWithFont(font.name)}
                                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-100 text-left group transition-all"
                                    >
                                        <span className="text-sm font-medium text-gray-700" style={{ fontFamily: font.name }}>{font.name}</span>
                                        <Plus className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* COLOR SECTION */}
                    <Collapsible>
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center gap-3 p-3 w-full rounded-xl bg-gray-50 hover:bg-indigo-50 transition-all cursor-pointer group border border-gray-100 hover:border-indigo-200">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100 group-hover:border-indigo-100">
                                    <Palette className="w-4 h-4 text-pink-600" />
                                </div>
                                <div className="flex flex-col items-start flex-1">
                                    <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-900">Colors</span>
                                    <span className="text-[10px] text-gray-500 font-medium">Global palette</span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                            <div className="grid grid-cols-5 gap-2 p-2">
                                {colors.map((color) => (
                                    <button
                                        key={color.id}
                                        onClick={() => handleApplyColor(color.value)}
                                        className="aspect-square rounded-full border-2 border-white shadow-sm ring-1 ring-gray-100 hover:ring-indigo-300 transition-all relative group"
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                    >
                                        {selectedElement?.color === color.value && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white mix-blend-difference" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                                {colors.length === 0 && (
                                    ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'].map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => handleApplyColor(c)}
                                            className="aspect-square rounded-full border-2 border-white shadow-sm ring-1 ring-gray-100 hover:ring-indigo-300 transition-all"
                                            style={{ backgroundColor: c }}
                                        />
                                    ))
                                )}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* GALLERY SECTION */}
                    <Collapsible>
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center gap-3 p-3 w-full rounded-xl bg-gray-50 hover:bg-indigo-50 transition-all cursor-pointer group border border-gray-100 hover:border-indigo-200">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100 group-hover:border-indigo-100">
                                    <ImageIcon className="w-4 h-4 text-amber-600" />
                                </div>
                                <div className="flex flex-col items-start flex-1">
                                    <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-900">Gallery</span>
                                    <span className="text-[10px] text-gray-500 font-medium">{images.length} assets available</span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                            <div className="grid grid-cols-3 gap-2 p-2">
                                {images.filter(img => img.name.toLowerCase().includes(searchQuery.toLowerCase())).map((img) => (
                                    <button
                                        key={img.id}
                                        onClick={() => handleAddImage(img.value)}
                                        className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-500 transition-all bg-white shadow-sm"
                                    >
                                        <img src={img.value} alt={img.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                                            <Plus className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 shadow-sm" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* OPTION SECTION */}
                    <Collapsible>
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center gap-3 p-3 w-full rounded-xl bg-gray-50 hover:bg-indigo-50 transition-all cursor-pointer group border border-gray-100 hover:border-indigo-200">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100 group-hover:border-indigo-100">
                                    <Settings2 className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div className="flex flex-col items-start flex-1">
                                    <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-900">Options</span>
                                    <span className="text-[10px] text-gray-500 font-medium">Quick settings</span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 space-y-3 px-2">
                            <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Auto-Save</Label>
                                    <div className="w-8 h-4 bg-indigo-600 rounded-full relative px-1 flex items-center justify-end">
                                        <div className="w-3 h-3 bg-white rounded-full" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase">High Quality Previews</Label>
                                    <div className="w-8 h-4 bg-gray-200 rounded-full relative px-1 flex items-center">
                                        <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
                                    </div>
                                </div>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </div>
            </ScrollArea>
        </div>
    );
}
