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
            // Sync maxChars if needed, though mostly handled by direct update access
        } else {
            // Reset to defaults for new element
            setDefaultValue('+62 812-3456-7890');
            setLabel('');
            setHideLabel(true);
            // Keep style persistence if desired, or reset
        }
    }, [selectedElement?.id, selectedElement?.maxChars]);

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
                        className="h-9 rounded-lg text-xs"
                        placeholder="e.g. Phone Number"
                    />
                </div>

                {selectedElement && (
                    <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-100/50">
                        <div className="flex flex-col">
                            <Label className="text-[10px] font-bold text-gray-700">Show label</Label>
                            <p className="text-[9px] text-gray-500">Display this title to customers</p>
                        </div>
                        <Switch
                            checked={selectedElement.showLabel !== false}
                            onCheckedChange={(checked) => handleUpdate({ showLabel: checked })}
                            className="scale-75"
                        />
                    </div>
                )}

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-gray-400">Preview Phone Number</Label>
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            value={defaultValue}
                            maxLength={selectedElement?.maxChars && selectedElement.maxChars > 0 ? selectedElement.maxChars : undefined}
                            onChange={(e) => {
                                let val = e.target.value;
                                const limit = selectedElement?.maxChars || 0;
                                if (limit > 0 && val.length > limit) {
                                    val = val.substring(0, limit);
                                }
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
                            <span className="text-[10px] font-bold tracking-wider">Configuration</span>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-4 px-1">

                    {/* Font Group and Color Only */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold text-gray-400">Font Group</Label>
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
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-medium text-gray-400">Max Characters</Label>
                                <span className="text-[10px] text-gray-400 italic">0 = Unlimited</span>
                            </div>
                            <Input
                                type="number"
                                min="0"
                                value={selectedElement?.maxChars ?? 0}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    handleUpdate({ maxChars: val });
                                }}
                                className="h-8 rounded-lg font-bold text-xs"
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
                        <Label className="text-[10px] font-bold text-gray-400">Color Palette</Label>
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
        </div >
    );
}
