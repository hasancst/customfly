import { useState, useEffect } from 'react';
import { Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { CanvasElement } from '@/types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { POPULAR_GOOGLE_FONTS } from '../constants/fonts';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface PhoneToolProps {
    onAddElement: (element: CanvasElement) => void;
    selectedElement?: CanvasElement;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    userFonts?: any[];
    userColors?: any[];
}

export function PhoneTool({ onAddElement, selectedElement, onUpdateElement, userFonts, userColors = [] }: PhoneToolProps) {
    const [defaultValue, setDefaultValue] = useState(selectedElement?.text || '+62 812-3456-7890');
    const [label, setLabel] = useState(selectedElement?.label || '');
    const [fontSize, setFontSize] = useState(selectedElement?.fontSize || 32);
    const [fontFamily, setFontFamily] = useState(selectedElement?.fontFamily || 'Inter');
    const [color, setColor] = useState(selectedElement?.color || '#000000');
    const [isRequired, setIsRequired] = useState(selectedElement?.isRequired || false);
    const [helpText, setHelpText] = useState(selectedElement?.helpText || '');
    const [hideLabel, setHideLabel] = useState(selectedElement?.hideLabel ?? true);

    useEffect(() => {
        if (selectedElement) {
            setDefaultValue(selectedElement.text || '+62 812-3456-7890');
            setLabel(selectedElement.label || '');
            setFontSize(selectedElement.fontSize || 32);
            setFontFamily(selectedElement.fontFamily || 'Inter');
            setColor(selectedElement.color || '#000000');
            setIsRequired(selectedElement.isRequired || false);
            setHelpText(selectedElement.helpText || '');
            setHideLabel(selectedElement.hideLabel ?? true);
        } else {
            // Reset to defaults for new element
            setDefaultValue('+62 812-3456-7890');
            setLabel('');
            setHideLabel(true);
            // Keep style persistence if desired, or reset
        }
    }, [selectedElement?.id]);

    const handleAddPhone = () => {
        const phoneVal = defaultValue;

        const newElement: CanvasElement = {
            id: `phone-${Date.now()}`,
            type: 'phone', // Make sure 'phone' type is supported in CanvasElement type
            x: 250, // Default centerish position, will be autocentered by Designer
            y: 200,
            width: 300,
            height: 60,
            rotation: 0,
            opacity: 100,
            zIndex: Date.now(),
            label: label || 'Phone Number',
            helpText,
            isRequired,
            hideLabel,
            text: phoneVal,
            fontSize,
            fontFamily,
            color,
            textAlign: 'center'
        };
        onAddElement(newElement);
    };

    const handleUpdate = (updates: Partial<CanvasElement>) => {
        if (selectedElement) {
            onUpdateElement(selectedElement.id, updates);
        }
    };

    return (
        <div className="space-y-6 pb-4">
            {/* Main Input Section */}
            <div className="px-1 space-y-4">
                <div className="space-y-1.5">
                    <Label className="text-sm font-bold text-gray-700">Title</Label>
                    <Input
                        value={label}
                        onChange={(e) => {
                            setLabel(e.target.value);
                            handleUpdate({ label: e.target.value });
                        }}
                        placeholder="e.g. WhatsApp Number"
                        className="h-9 font-bold bg-white"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Preview Phone Number</Label>
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            value={defaultValue}
                            onChange={(e) => {
                                const val = e.target.value;
                                setDefaultValue(val);
                                handleUpdate({ text: val });
                            }}
                            placeholder="+1 234-567-8900"
                            className="h-10 font-bold text-lg text-center bg-white"
                        />
                    </div>
                </div>

                <Button
                    onClick={handleAddPhone}
                    className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-lg shadow-teal-100 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                >
                    <Plus className="w-5 h-5" />
                    Add Phone Number
                </Button>
            </div>

            <Separator className="bg-gray-100" />

            {/* Advanced Settings */}
            <Collapsible defaultOpen={true}>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full flex items-center justify-between px-2 h-8 hover:bg-teal-50 text-gray-500 hover:text-teal-600 rounded-lg group">
                        <div className="flex items-center gap-2">
                            <Settings2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Configuration</span>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-4 px-1">

                    {/* Visual Styling */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase">Visual Style</Label>
                        <Select
                            value={fontFamily}
                            onValueChange={(val) => {
                                setFontFamily(val);
                                handleUpdate({ fontFamily: val });
                            }}
                        >
                            <SelectTrigger className="h-9 text-xs bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {POPULAR_GOOGLE_FONTS.map((font) => (
                                    <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                                        {font}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-gray-400 uppercase">Font Group</Label>
                            <Select
                                value={selectedElement?.fontAssetId || "none"}
                                onValueChange={(val) => handleUpdate({ fontAssetId: val === "none" ? undefined : val })}
                            >
                                <SelectTrigger className="h-8 text-xs bg-white rounded-lg">
                                    <SelectValue placeholder="Global Default" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Global Default</SelectItem>
                                    {userFonts?.map((asset: any) => (
                                        <SelectItem key={asset.id} value={asset.id}>
                                            {asset.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-3">
                            <Input
                                type="number"
                                value={fontSize}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setFontSize(val);
                                    handleUpdate({ fontSize: val });
                                }}
                                className="h-9 w-20 text-xs"
                            />
                            <div className="flex-1 flex gap-2 items-center">
                                <div className="relative w-9 h-9 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                                    <Input
                                        type="color"
                                        className="absolute inset-0 w-full h-full p-0 border-none cursor-pointer"
                                        value={color}
                                        onChange={(e) => {
                                            setColor(e.target.value);
                                            handleUpdate({ color: e.target.value });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Extra Info */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold text-gray-500">Instruction Text</Label>
                            <Input
                                value={helpText}
                                onChange={(e) => {
                                    setHelpText(e.target.value);
                                    handleUpdate({ helpText: e.target.value });
                                }}
                                className="h-8 text-xs"
                                placeholder="Helpful hint..."
                            />
                        </div>
                        <div className="flex items-center justify-between py-2 px-1">
                            <Label className="text-[10px] font-bold text-gray-600">Required Field</Label>
                            <Switch
                                checked={isRequired}
                                onCheckedChange={(val) => {
                                    setIsRequired(val);
                                    handleUpdate({ isRequired: val });
                                }}
                            />
                        </div>
                        <div className="flex items-center justify-between py-2 px-1">
                            <Label className="text-[10px] font-bold text-gray-600">Hide Label on Canvas</Label>
                            <Switch
                                checked={hideLabel}
                                onCheckedChange={(val) => {
                                    setHideLabel(val);
                                    handleUpdate({ hideLabel: val });
                                }}
                            />
                        </div>
                    </div>

                    {/* Color Palette Selector */}
                    <div className="space-y-1.5 pt-2">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase">Color Palette</Label>
                        <Select
                            value={selectedElement?.colorAssetId || "none"}
                            onValueChange={(val) => {
                                const finalVal = val === "none" ? undefined : val;
                                onUpdateElement(selectedElement!.id, { colorAssetId: finalVal });
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
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
