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

interface DateToolProps {
    onAddElement: (element: CanvasElement) => void;
    selectedElement?: CanvasElement;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    userFonts?: any[];
    userColors?: any[];
}

const DATE_FORMATS = [
    { value: 'DD/MM/YYYY', label: '31/12/2025' },
    { value: 'MM/DD/YYYY', label: '12/31/2025' },
    { value: 'YYYY-MM-DD', label: '2025-12-31' },
    { value: 'D MMMM YYYY', label: '31 December 2025' },
    { value: 'MMMM D, YYYY', label: 'December 31, 2025' },
    { value: 'MMM D, YYYY', label: 'Dec 31, 2025' },
];

export function DateTool({ onAddElement, selectedElement, onUpdateElement, userFonts, userColors = [] }: DateToolProps) {
    const formatDate = (dateString: string, format: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        const d = date.getDate();
        const m = date.getMonth() + 1;
        const y = date.getFullYear();

        const dd = String(d).padStart(2, '0');
        const mm = String(m).padStart(2, '0');

        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
        const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        switch (format) {
            case 'MM/DD/YYYY': return `${mm}/${dd}/${y}`;
            case 'YYYY-MM-DD': return `${y}-${mm}-${dd}`;
            case 'D MMMM YYYY': return `${d} ${monthNames[date.getMonth()]} ${y}`;
            case 'MMMM D, YYYY': return `${monthNames[date.getMonth()]} ${d}, ${y}`;
            case 'MMM D, YYYY': return `${shortMonthNames[date.getMonth()]} ${d}, ${y}`;
            case 'DD/MM/YYYY': default: return `${dd}/${mm}/${y}`;
        }
    };

    const [dateValue, setDateValue] = useState(selectedElement?.dateValue || new Date().toISOString().split('T')[0]);
    const [dateFormat, setDateFormat] = useState(selectedElement?.dateFormat || 'DD/MM/YYYY');
    const [label, setLabel] = useState(selectedElement?.label || '');
    const [fontSize, setFontSize] = useState(selectedElement?.fontSize || 32);
    const [fontFamily, setFontFamily] = useState(selectedElement?.fontFamily || 'Inter');
    const [color, setColor] = useState(selectedElement?.color || '#000000');
    const [isRequired, setIsRequired] = useState(selectedElement?.isRequired || false);
    const [helpText, setHelpText] = useState(selectedElement?.helpText || '');


    useEffect(() => {
        if (selectedElement) {
            setDateValue(selectedElement.dateValue || new Date().toISOString().split('T')[0]);
            setDateFormat(selectedElement.dateFormat || 'DD/MM/YYYY');
            setLabel(selectedElement.label || '');
            setFontSize(selectedElement.fontSize || 32);
            setFontFamily(selectedElement.fontFamily || 'Inter');
            setColor(selectedElement.color || '#000000');
            setIsRequired(selectedElement.isRequired || false);
            setHelpText(selectedElement.helpText || '');
        } else {
            // Reset to defaults
            setDateValue(new Date().toISOString().split('T')[0]);
            setDateFormat('DD/MM/YYYY');
            setLabel('');
        }
    }, [selectedElement?.id, selectedElement?.maxChars]);

    const handleAddDate = () => {
        const formattedText = formatDate(dateValue, dateFormat);

        const newElement: CanvasElement = {
            id: `date-${Date.now()}`,
            type: 'date',
            x: 250, // Default centerish, auto-centered by logic
            y: 200,
            width: 300,
            height: 60,
            rotation: 0,
            opacity: 100,
            zIndex: Date.now(),
            label: label,
            helpText,
            isRequired,

            text: formattedText,
            dateValue,
            dateFormat,
            fontSize,
            fontFamily,
            color,
            textAlign: 'center'
        };
        onAddElement(newElement);
    };

    const handleUpdate = (updates: Partial<CanvasElement>) => {
        if (selectedElement) {
            // If dateValue or dateFormat is updated, we must re-calculate the display text
            if (updates.dateValue !== undefined || updates.dateFormat !== undefined) {
                const dVal = updates.dateValue !== undefined ? updates.dateValue : dateValue;
                const dFmt = updates.dateFormat !== undefined ? updates.dateFormat : dateFormat;
                updates.text = formatDate(dVal || '', dFmt || '');
            }
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
                            if (selectedElement) onUpdateElement(selectedElement.id, { label: e.target.value });
                        }}
                        placeholder="e.g. Select Date"
                        className="h-10 rounded-xl border-gray-200 bg-white"
                    />
                </div>

                {selectedElement && (
                    <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                        <div className="flex flex-col">
                            <Label className="text-[10px] font-bold text-gray-700">Show label</Label>
                            <p className="text-[9px] text-gray-500">Display this title to customers</p>
                        </div>
                        <Switch
                            checked={selectedElement.showLabel !== false}
                            onCheckedChange={(checked) => onUpdateElement(selectedElement.id, { showLabel: checked })}
                            className="scale-75"
                        />
                    </div>
                )}

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-gray-400">Preview Date</Label>
                    <div className="flex gap-2">
                        <Input
                            type="date"
                            value={dateValue}
                            onChange={(e) => {
                                const val = e.target.value;
                                setDateValue(val);
                                handleUpdate({ dateValue: val });
                            }}
                            className="h-10 font-bold text-center bg-white cursor-pointer"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-gray-400">Format</Label>
                    <Select
                        value={dateFormat}
                        onValueChange={(val) => {
                            setDateFormat(val);
                            handleUpdate({ dateFormat: val });
                        }}
                    >
                        <SelectTrigger className="h-9 font-bold bg-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {DATE_FORMATS.map((fmt) => (
                                <SelectItem key={fmt.value} value={fmt.value}>
                                    {fmt.label} ({fmt.value})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    onClick={handleAddDate}
                    className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-lg shadow-teal-100 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                >
                    <Plus className="w-5 h-5" />
                    Add Date
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
