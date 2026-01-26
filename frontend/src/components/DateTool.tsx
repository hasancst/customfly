import { useState, useEffect } from 'react';
import { Plus, Settings2, Calendar } from 'lucide-react';
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

interface DateToolProps {
    onAddElement: (element: CanvasElement) => void;
    selectedElement?: CanvasElement;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
}

const DATE_FORMATS = [
    { value: 'DD/MM/YYYY', label: '31/12/2025' },
    { value: 'MM/DD/YYYY', label: '12/31/2025' },
    { value: 'YYYY-MM-DD', label: '2025-12-31' },
    { value: 'D MMMM YYYY', label: '31 December 2025' },
    { value: 'MMMM D, YYYY', label: 'December 31, 2025' },
    { value: 'MMM D, YYYY', label: 'Dec 31, 2025' },
];

export function DateTool({ onAddElement, selectedElement, onUpdateElement }: DateToolProps) {
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
    }, [selectedElement?.id]);

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
                    <Label className="text-sm font-bold text-gray-700">Field Label</Label>
                    <Input
                        value={label}
                        onChange={(e) => {
                            setLabel(e.target.value);
                            handleUpdate({ label: e.target.value });
                        }}
                        placeholder="e.g. Delivery Date"
                        className="h-9 font-bold bg-white"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Preview Date</Label>
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
                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Format</Label>
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
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
