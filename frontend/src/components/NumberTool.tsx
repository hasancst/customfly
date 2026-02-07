import { useState, useEffect } from 'react';
import { Plus, Check, Settings2 } from 'lucide-react';
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

interface NumberToolProps {
    onAddElement: (element: CanvasElement) => void;
    selectedElement?: CanvasElement;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    userColors?: any[];
    userFonts?: any[];
}

export function NumberTool({ onAddElement, selectedElement, onUpdateElement, userColors = [], userFonts = [] }: NumberToolProps) {
    const [defaultValue, setDefaultValue] = useState<number>(selectedElement?.defaultValue !== undefined ? Number(selectedElement.defaultValue) : 0);
    const [label, setLabel] = useState(selectedElement?.label || '');
    const [fontSize, setFontSize] = useState(selectedElement?.fontSize || 32);
    const [fontFamily, setFontFamily] = useState(selectedElement?.fontFamily || 'Inter');
    const [fontWeight, setFontWeight] = useState(selectedElement?.fontWeight || 700);
    const [italic, setItalic] = useState(selectedElement?.italic || false);
    const [color, setColor] = useState(selectedElement?.color || '#000000');
    const [numberPrefix, setNumberPrefix] = useState(selectedElement?.numberPrefix || '');
    const [numberSuffix, setNumberSuffix] = useState(selectedElement?.numberSuffix || '');
    const [minValue, setMinValue] = useState<number | undefined>(selectedElement?.minValue);
    const [maxValue, setMaxValue] = useState<number | undefined>(selectedElement?.maxValue);
    const [stepValue, setStepValue] = useState<number | undefined>(selectedElement?.stepValue);
    const [isRequired, setIsRequired] = useState(selectedElement?.isRequired || false);
    const [helpText, setHelpText] = useState(selectedElement?.helpText || '');
    const [fontAssetId, setFontAssetId] = useState(selectedElement?.fontAssetId || '');

    useEffect(() => {
        if (selectedElement) {
            setDefaultValue(selectedElement.defaultValue !== undefined ? Number(selectedElement.defaultValue) : 0);
            setLabel(selectedElement.label || '');
            setFontSize(selectedElement.fontSize || 32);
            setFontFamily(selectedElement.fontFamily || 'Inter');
            setFontWeight(selectedElement.fontWeight || 700);
            setItalic(selectedElement.italic || false);
            setColor(selectedElement.color || '#000000');
            setNumberPrefix(selectedElement.numberPrefix || '');
            setNumberSuffix(selectedElement.numberSuffix || '');
            setMinValue(selectedElement.minValue);
            setMaxValue(selectedElement.maxValue);
            setStepValue(selectedElement.stepValue);
            setIsRequired(selectedElement.isRequired || false);
            setHelpText(selectedElement.helpText || '');
            setFontAssetId(selectedElement.fontAssetId || '');
        } else {
            // Reset to defaults for new element
            setDefaultValue(0);
            setLabel('');
            setNumberPrefix('');
            setNumberSuffix('');
        }
    }, [selectedElement?.id]);

    const handleAddNumber = () => {
        const numVal = defaultValue;

        const newElement: CanvasElement = {
            id: `number-${Date.now()}`,
            type: 'number',
            x: 410, // Centered on 1000px canvas (500 - 180/2)
            y: 470, // Centered on 1000px canvas (500 - 60/2)
            width: 180,
            height: 60,
            rotation: 0,
            opacity: 100,
            zIndex: Date.now(),
            label: label || 'New Number',
            helpText,
            isRequired,
            minValue,
            maxValue,
            stepValue,
            defaultValue: numVal,
            text: String(numVal),
            numberPrefix,
            numberSuffix,
            fontSize,
            fontFamily,
            fontWeight,
            italic,
            color,
            textAlign: 'center',
            fontAssetId: fontAssetId || undefined
        };
        onAddElement(newElement);
    };

    const handleUpdate = (updates: Partial<CanvasElement>) => {
        if (selectedElement) {
            onUpdateElement(selectedElement.id, updates);

            // Sync local state for better UX
            if (updates.label !== undefined) setLabel(updates.label);
            if (updates.fontSize !== undefined) setFontSize(updates.fontSize);
            if (updates.fontFamily !== undefined) setFontFamily(updates.fontFamily);
            if (updates.fontWeight !== undefined) setFontWeight(updates.fontWeight);
            if (updates.italic !== undefined) setItalic(updates.italic);
            if (updates.color !== undefined) setColor(updates.color);
            if (updates.fontAssetId !== undefined) setFontAssetId(updates.fontAssetId || '');
            if (updates.numberPrefix !== undefined) setNumberPrefix(updates.numberPrefix);
            if (updates.numberSuffix !== undefined) setNumberSuffix(updates.numberSuffix);
            if (updates.minValue !== undefined) setMinValue(updates.minValue);
            if (updates.maxValue !== undefined) setMaxValue(updates.maxValue);
            if (updates.stepValue !== undefined) setStepValue(updates.stepValue);
            if (updates.isRequired !== undefined) setIsRequired(updates.isRequired);
            if (updates.helpText !== undefined) setHelpText(updates.helpText);
            if (updates.defaultValue !== undefined) setDefaultValue(Number(updates.defaultValue));
        }
    };

    return (
        <div className="space-y-6 pb-4">
            {/* Main Input Section */}
            <div className="px-1 space-y-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-gray-400">Title</Label>
                    <Input
                        value={label}
                        onChange={(e) => handleUpdate({ label: e.target.value })}
                        placeholder="e.g. Quantity"
                        className="h-10 rounded-xl border-gray-200 bg-white"
                    />
                </div>

                {selectedElement && (
                    <div className="flex items-center justify-between p-3 bg-teal-50/50 rounded-xl border border-teal-100/50">
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
                    <Label className="text-[10px] font-bold text-gray-400">Preview Number</Label>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            value={defaultValue}
                            onInput={(e) => {
                                const target = e.currentTarget;
                                const limit = selectedElement?.maxChars || 0;
                                if (limit > 0 && target.value.length > limit) {
                                    target.value = target.value.slice(0, limit);
                                }
                            }}
                            onChange={(e) => {
                                const valStr = e.target.value;
                                const limit = selectedElement?.maxChars || 0;
                                let finalVal = Number(valStr);

                                if (limit > 0 && valStr.length > limit) {
                                    finalVal = Number(valStr.slice(0, limit));
                                }

                                setDefaultValue(finalVal);
                                handleUpdate({ defaultValue: finalVal, text: valStr });
                            }}
                            className="h-10 font-bold text-lg text-center bg-white"
                        />
                    </div>
                </div>

                <div className="pt-0">
                    <Button
                        onClick={() => {
                            if (selectedElement?.id === 'draft') {
                                handleAddNumber();
                            } else {
                                import('sonner').then(({ toast }) => toast.success('Number updated'));
                            }
                        }}
                        className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-teal-100 flex items-center justify-center gap-2 border-b-4 border-teal-800 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        {selectedElement?.id === 'draft' ? <Plus className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        {selectedElement?.id === 'draft' ? 'Create Number Element' : 'Update Number Element'}
                    </Button>
                </div>
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
                    {/* Constraints */}
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-gray-400">Constraints</Label>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                                <Label className="text-[9px] text-gray-400">Min</Label>
                                <Input
                                    type="number"
                                    value={minValue ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : undefined;
                                        setMinValue(val);
                                        handleUpdate({ minValue: val });
                                    }}
                                    className="h-8 text-xs px-2"
                                    placeholder="-"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] text-gray-400">Max</Label>
                                <Input
                                    type="number"
                                    value={maxValue ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : undefined;
                                        setMaxValue(val);
                                        handleUpdate({ maxValue: val });
                                    }}
                                    className="h-8 text-xs px-2"
                                    placeholder="-"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] text-gray-400">Step</Label>
                                <Input
                                    type="number"
                                    value={stepValue ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : undefined;
                                        setStepValue(val);
                                        handleUpdate({ stepValue: val });
                                    }}
                                    className="h-8 text-xs px-2"
                                    placeholder="1"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] text-gray-400">Max Digits</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={selectedElement?.maxChars ?? 0}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        handleUpdate({ maxChars: val });
                                    }}
                                    className="h-8 text-xs px-2"
                                    placeholder="∞"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-[9px] text-gray-400">Prefix</Label>
                                <Input
                                    value={numberPrefix}
                                    onChange={(e) => handleUpdate({ numberPrefix: e.target.value })}
                                    className="h-8 text-xs px-2"
                                    placeholder="e.g. $"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] text-gray-400">Suffix</Label>
                                <Input
                                    value={numberSuffix}
                                    onChange={(e) => handleUpdate({ numberSuffix: e.target.value })}
                                    className="h-8 text-xs px-2"
                                    placeholder="e.g. lbs"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Font Group and Color Only */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold text-gray-400">Font Group</Label>
                        <Select
                            value={fontAssetId || "none"}
                            onValueChange={(val) => {
                                const finalVal = val === "none" ? undefined : val;
                                setFontAssetId(finalVal || '');
                                handleUpdate({ fontAssetId: finalVal });
                            }}
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
                                checked={selectedElement?.hideLabel ?? false}
                                onCheckedChange={(val) => {
                                    handleUpdate({ hideLabel: val });
                                }}
                            />
                        </div>
                    </div>

                    {/* Color Palette Selector */}
                    <div className="space-y-1.5">
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
                                {userColors?.map((asset: any) => (
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
