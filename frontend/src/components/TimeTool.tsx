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

interface TimeToolProps {
    onAddElement: (element: CanvasElement) => void;
    selectedElement?: CanvasElement;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
}

const TIME_FORMATS = [
    { value: 'HH:mm', label: '14:30 (24 Hour)' },
    { value: 'hh:mm a', label: '02:30 PM (12 Hour)' },
];

export function TimeTool({ onAddElement, selectedElement, onUpdateElement }: TimeToolProps) {
    const formatTime = (timeString: string, format: string) => {
        if (!timeString) return '';
        // timeString expected in HH:mm format (from input type="time")
        const [hoursStr, minutesStr] = timeString.split(':');
        let hours = parseInt(hoursStr, 10);
        const minutes = minutesStr;

        if (isNaN(hours)) return timeString;

        if (format === 'hh:mm a') {
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
            return strTime;
        }

        // Default HH:mm
        return timeString;
    };

    const [timeValue, setTimeValue] = useState(selectedElement?.text || '12:00'); // Store raw time in text or specific field? 
    // Wait, element.text usually holds the DISPLAY text. We need to store raw value separately probably, or parse it back.
    // DateTool stored dateValue. Let's start using specific fields if added to types.
    // For now I'll use separate state but if types don't support timeValue, I might need to rely on text parsing or add it.
    // Let's assume I can add timeValue to types, or just stick to text if simple. Re-parsing "02:30 PM" to "14:30" is annoying.
    // I'll add timeValue to types later or rely on state persistence.
    // Actually, DateTool used dateValue. Let's use timeValue.

    const [rawTime, setRawTime] = useState('12:00'); // HH:mm format
    const [timeFormat, setTimeFormat] = useState(selectedElement?.dateFormat || 'HH:mm'); // Reuse dateFormat or add timeFormat? 
    // Let's reuse dateFormat property since they are mutually exclusive types, OR allow 'timeFormat' in generic sense?
    // Looking at types.ts, there is 'dateFormat'. I'll add 'timeFormat' to types to be clean.

    const [label, setLabel] = useState(selectedElement?.label || '');
    const [fontSize, setFontSize] = useState(selectedElement?.fontSize || 32);
    const [fontFamily, setFontFamily] = useState(selectedElement?.fontFamily || 'Inter');
    const [color, setColor] = useState(selectedElement?.color || '#000000');
    const [isRequired, setIsRequired] = useState(selectedElement?.isRequired || false);
    const [helpText, setHelpText] = useState(selectedElement?.helpText || '');

    useEffect(() => {
        if (selectedElement) {
            // Try to recover raw time from somewhere? Or just default.
            setRawTime(selectedElement.defaultValue as string || '12:00');
            setTimeFormat(selectedElement.dateFormat || 'HH:mm'); // Using dateFormat field for simplicity as it's a string format
            setLabel(selectedElement.label || '');
            setFontSize(selectedElement.fontSize || 32);
            setFontFamily(selectedElement.fontFamily || 'Inter');
            setColor(selectedElement.color || '#000000');
            setIsRequired(selectedElement.isRequired || false);
            setHelpText(selectedElement.helpText || '');
        } else {
            setRawTime('12:00');
            setTimeFormat('HH:mm');
            setLabel('');
        }
    }, [selectedElement?.id]);

    const handleAddTime = () => {
        const formattedText = formatTime(rawTime, timeFormat);

        const newElement: CanvasElement = {
            id: `time-${Date.now()}`,
            type: 'time',
            x: 250,
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
            defaultValue: rawTime, // Store raw HH:mm here
            dateFormat: timeFormat, // Store format here
            fontSize,
            fontFamily,
            color,
            textAlign: 'center'
        };
        onAddElement(newElement);
    };

    const handleUpdate = (updates: Partial<CanvasElement>) => {
        if (selectedElement) {
            if (updates.defaultValue !== undefined || updates.dateFormat !== undefined) {
                const rTime = updates.defaultValue !== undefined ? (updates.defaultValue as string) : rawTime;
                const tFmt = updates.dateFormat !== undefined ? updates.dateFormat : timeFormat;
                updates.text = formatTime(rTime, tFmt);
            }
            onUpdateElement(selectedElement.id, updates);
        }
    };

    return (
        <div className="space-y-6 pb-4">
            <div className="px-1 space-y-4">
                <div className="space-y-1.5">
                    <Label className="text-sm font-bold text-gray-700">Field Label</Label>
                    <Input
                        value={label}
                        onChange={(e) => {
                            setLabel(e.target.value);
                            handleUpdate({ label: e.target.value });
                        }}
                        placeholder="e.g. Appointment Time"
                        className="h-9 font-bold bg-white"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Preview Time</Label>
                    <div className="flex gap-2">
                        <Input
                            type="time"
                            value={rawTime}
                            onChange={(e) => {
                                const val = e.target.value;
                                setRawTime(val);
                                handleUpdate({ defaultValue: val });
                            }}
                            className="h-10 font-bold text-center bg-white cursor-pointer"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Format</Label>
                    <Select
                        value={timeFormat}
                        onValueChange={(val) => {
                            setTimeFormat(val);
                            handleUpdate({ dateFormat: val });
                        }}
                    >
                        <SelectTrigger className="h-9 font-bold bg-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TIME_FORMATS.map((fmt) => (
                                <SelectItem key={fmt.value} value={fmt.value}>
                                    {fmt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    onClick={handleAddTime}
                    className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-lg shadow-teal-100 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                >
                    <Plus className="w-5 h-5" />
                    Add Time
                </Button>
            </div>

            <Separator className="bg-gray-100" />

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
