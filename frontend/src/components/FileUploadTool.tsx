import { useState, useEffect } from 'react';
import { FileText, AlertCircle, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CanvasElement } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface FileUploadToolProps {
    onAddElement: (element: CanvasElement) => void;
    selectedElement?: CanvasElement;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    isPublicMode?: boolean;
}

const COMMON_FILE_TYPES = [
    { id: '.jpg', label: 'JPG Image' },
    { id: '.png', label: 'PNG Image' },
    { id: '.pdf', label: 'PDF Document' },
    { id: '.ai', label: 'Adobe Illustrator' },
    { id: '.psd', label: 'Photoshop' },
    { id: '.eps', label: 'EPS Vector' },
    { id: '.zip', label: 'ZIP Archive' }
];

export function FileUploadTool({ onAddElement, selectedElement, onUpdateElement, isPublicMode }: FileUploadToolProps) {
    const [allowedTypes, setAllowedTypes] = useState<string[]>(
        selectedElement?.allowedFileTypes || ['.jpg', '.png', '.pdf']
    );
    const [maxSize, setMaxSize] = useState(selectedElement?.maxFileSize || 10);
    const [label, setLabel] = useState(selectedElement?.label || 'Upload your file');
    const [showLabel, setShowLabel] = useState(selectedElement?.showLabel !== false);

    useEffect(() => {
        if (selectedElement) {
            if (selectedElement.allowedFileTypes) setAllowedTypes(selectedElement.allowedFileTypes);
            if (selectedElement.maxFileSize) setMaxSize(selectedElement.maxFileSize);
            if (selectedElement.label) setLabel(selectedElement.label);
            setShowLabel(selectedElement.showLabel !== false);
        } else {
            setLabel('Upload your file');
            setShowLabel(true);
        }
    }, [selectedElement]);

    const handleUpdate = (updates: Partial<CanvasElement>) => {
        if (selectedElement) {
            onUpdateElement(selectedElement.id, updates);
        }
    };

    const toggleFileType = (type: string) => {
        const newTypes = allowedTypes.includes(type)
            ? allowedTypes.filter(t => t !== type)
            : [...allowedTypes, type];

        setAllowedTypes(newTypes);
        handleUpdate({ allowedFileTypes: newTypes });
    };

    return (
        <div className="space-y-6 pb-4">
            {/* Label Edit */}
            <div className="px-1 space-y-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-gray-400">Button Label</Label>
                    <Input
                        value={label}
                        onChange={(e) => {
                            setLabel(e.target.value);
                            handleUpdate({ label: e.target.value });
                        }}
                        className="h-9 rounded-lg"
                        placeholder="e.g. Upload Logo"
                    />
                </div>

                <div className="pt-2">
                    <Button
                        onClick={() => {
                            if (selectedElement?.id === 'draft') {
                                onAddElement({
                                    ...selectedElement as any,
                                    id: `file_upload-${Date.now()}`,
                                });
                            } else {
                                // Already being updated via handleUpdate, but provide feedback
                                toast.success('Upload option updated');
                            }
                        }}
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        {selectedElement?.id === 'draft' ? <Plus className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        {selectedElement?.id === 'draft' ? 'Create Upload Option' : 'Update Upload Option'}
                    </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                    <div className="flex flex-col">
                        <Label className="text-[10px] font-bold text-gray-700">Show label</Label>
                        <p className="text-[9px] text-gray-500">Display this title to customers</p>
                    </div>
                    <Switch
                        checked={showLabel}
                        onCheckedChange={(checked: boolean) => {
                            setShowLabel(checked);
                            handleUpdate({ showLabel: checked });
                        }}
                        className="scale-75"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-gray-400">Instruction Text</Label>
                    <Input
                        value={selectedElement?.helpText || ''}
                        onChange={(e) => handleUpdate({ helpText: e.target.value })}
                        className="h-9 rounded-lg"
                        placeholder="e.g. Min resolution 300dpi"
                    />
                </div>

                <div className="flex items-center justify-between py-2 px-3 bg-emerald-50/30 rounded-lg border border-emerald-100 shadow-sm">
                    <div className="space-y-0.5">
                        <Label className="text-[11px] font-bold text-gray-700">Required Upload</Label>
                        <p className="text-[9px] text-gray-400">Customer must attach a file</p>
                    </div>
                    <Switch
                        checked={!!selectedElement?.isRequired}
                        onCheckedChange={(val) => handleUpdate({ isRequired: val })}
                    />
                </div>
            </div>

            <Separator className="bg-gray-100" />

            {/* Allowed File Types */}
            <div className="px-1 space-y-3">
                <Label className={`${isPublicMode ? 'text-[16px]' : 'text-sm'} font-bold text-gray-700 flex items-center gap-2`}>
                    <FileText className="w-4 h-4 text-emerald-500" />
                    Allowed File Types
                </Label>
                <div className="grid grid-cols-2 gap-2">
                    {COMMON_FILE_TYPES.map((type) => (
                        <div key={type.id} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <Checkbox
                                id={`file-type-${type.id}`}
                                checked={allowedTypes.includes(type.id)}
                                onCheckedChange={() => toggleFileType(type.id)}
                                className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                            <label
                                htmlFor={`file-type-${type.id}`}
                                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer w-full"
                            >
                                {type.label}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Max File Size */}
            <div className="px-1 space-y-4">
                <div className="flex items-center justify-between">
                    <Label className={`${isPublicMode ? 'text-[16px]' : 'text-sm'} font-bold text-gray-700`}>Max File Size</Label>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                        {maxSize} MB
                    </span>
                </div>
                <Slider
                    value={[maxSize]}
                    onValueChange={([val]) => {
                        setMaxSize(val);
                        handleUpdate({ maxFileSize: val });
                    }}
                    min={1}
                    max={100}
                    step={1}
                    className="py-1"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-medium px-1">
                    <span>1 MB</span>
                    <span>100 MB</span>
                </div>
            </div>

            {/* Info Card */}
            <div className="mx-1 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div className="text-[10px] text-emerald-800 space-y-1">
                        <p className="font-bold">How File Upload works:</p>
                        <p>This button allows customers to attach a file to their order. The file is not rendered on the canvas but is sent securely with the order details.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
