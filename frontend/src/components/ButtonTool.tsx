import { MousePointer2, Link2, Settings2, CheckCircle2, Circle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { CanvasElement } from '@/types';
import { Separator } from '@/components/ui/separator';
import { POPULAR_GOOGLE_FONTS } from '../constants/fonts';

interface ButtonToolProps {
    selectedElement: CanvasElement;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    userOptions?: any[];
    userFonts?: any[];
}

export function ButtonTool({
    selectedElement,
    onUpdateElement,
    userOptions,
    userFonts
}: ButtonToolProps) {
    const handleLinkOption = (val: string) => {
        if (val === 'none') {
            onUpdateElement(selectedElement.id, {
                linkedAssetId: undefined,
                buttonOptions: [],
                enabledOptions: []
            });
            return;
        }

        if (val.startsWith('asset:')) {
            const assetId = val.replace('asset:', '');
            const asset = userOptions?.find(a => String(a.id) === String(assetId));
            if (asset) {
                const items = asset.value.split('\n').filter(Boolean).map((l: string) => l.trim());
                onUpdateElement(selectedElement.id, {
                    linkedAssetId: assetId,
                    buttonOptions: items,
                    enabledOptions: items, // Enable all by default when picking a source
                    label: asset.name || selectedElement.label
                });
            }
        }
    };

    const toggleOption = (opt: string) => {
        const currentEnabled = selectedElement.enabledOptions || [];
        let newEnabled = [];

        if (currentEnabled.includes(opt)) {
            newEnabled = currentEnabled.filter(o => o !== opt);
        } else {
            newEnabled = [...currentEnabled, opt];
        }

        onUpdateElement(selectedElement.id, { enabledOptions: newEnabled });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-rose-50/50">
                <div className="flex items-center gap-2">
                    <MousePointer2 className="w-4 h-4 text-rose-600" />
                    <span className="font-bold text-sm text-gray-700">Button Selection Settings</span>
                </div>
            </div>

            <div className="p-4 space-y-6 flex-1 overflow-y-auto">
                {/* General Settings */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-gray-400">Field Label</Label>
                        <Input
                            value={selectedElement.label || ''}
                            onChange={(e) => onUpdateElement(selectedElement.id, { label: e.target.value })}
                            className="h-9"
                            placeholder="e.g. Select Finish"
                        />
                    </div>

                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50/50 rounded-lg border border-gray-100 shadow-sm">
                        <div className="space-y-0.5">
                            <Label className="text-[11px] font-bold text-gray-700">Required Selection</Label>
                            <p className="text-[9px] text-gray-400">Customer must pick an option</p>
                        </div>
                        <Switch
                            checked={!!selectedElement.isRequired}
                            onCheckedChange={(val) => onUpdateElement(selectedElement.id, { isRequired: val })}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-gray-400">Button Style</Label>
                            <Select
                                value={selectedElement.buttonStyle || 'solid'}
                                onValueChange={(val: any) => onUpdateElement(selectedElement.id, { buttonStyle: val })}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="solid">Solid</SelectItem>
                                    <SelectItem value="outline">Outline</SelectItem>
                                    <SelectItem value="soft">Soft</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Font Configuration */}
                <div className="space-y-3 pt-2 border-t border-gray-100">
                    <Label className="text-[10px] font-bold text-gray-400">Typography</Label>
                    <Select
                        value={selectedElement.fontFamily || 'Inter'}
                        onValueChange={(val) => onUpdateElement(selectedElement.id, { fontFamily: val })}
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
                        <Label className="text-[10px] font-bold text-gray-400">Font Group</Label>
                        <Select
                            value={selectedElement.fontAssetId || "none"}
                            onValueChange={(val) => onUpdateElement(selectedElement.id, { fontAssetId: val === "none" ? undefined : val })}
                        >
                            <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue placeholder="Global Default" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Global Default</SelectItem>
                                {userFonts?.map((asset) => (
                                    <SelectItem key={asset.id} value={asset.id}>
                                        {asset.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-3">
                        <div className="space-y-1 flex-1">
                            <Label className="text-[9px] text-gray-400">Size</Label>
                            <Input
                                type="number"
                                value={selectedElement.fontSize || 14}
                                onChange={(e) => onUpdateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[9px] text-gray-400">Color</Label>
                            <div className="relative w-8 h-8 rounded-lg border border-gray-200 overflow-hidden">
                                <Input
                                    type="color"
                                    className="absolute inset-0 w-full h-full p-0 border-none cursor-pointer"
                                    value={selectedElement.color || '#ffffff'}
                                    onChange={(e) => onUpdateElement(selectedElement.id, { color: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visual Preview Box */}
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-2">
                    <Label className="text-[9px] font-bold text-gray-400">Style Preview</Label>
                    <div className="flex flex-wrap gap-2 justify-center py-2">
                        {(selectedElement.enabledOptions && selectedElement.enabledOptions.length > 0 ? selectedElement.enabledOptions.slice(0, 3) : ['Option 1', 'Option 2']).map((opt, i) => (
                            <div key={i} className={`${(selectedElement.buttonStyle || 'solid') === 'outline' ? 'bg-white border border-gray-300 text-gray-700' :
                                (selectedElement.buttonStyle || 'solid') === 'soft' ? 'bg-rose-50 border border-rose-100 text-rose-700' :
                                    'bg-rose-600 border border-rose-700 text-white'
                                } ${(selectedElement.buttonShape || 'rounded') === 'square' ? 'rounded-none' :
                                    (selectedElement.buttonShape || 'rounded') === 'pill' ? 'rounded-full' :
                                        'rounded-lg'
                                } px-3 py-1.5 text-[10px] font-bold shadow-sm inline-block transition-all`}>
                                {opt.includes('|') ? opt.split('|')[0] : opt}
                            </div>
                        ))}
                        {selectedElement.enabledOptions && selectedElement.enabledOptions.length > 3 && (
                            <span className="text-[8px] text-gray-400 self-end mb-1">+{selectedElement.enabledOptions.length - 3} more</span>
                        )}
                    </div>

                    <Separator className="bg-gray-100" />

                    {/* Source Selection */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                            <Link2 className="w-3 h-3" />
                            Group Options
                        </Label>
                        <Select
                            value={selectedElement.linkedAssetId ? `asset:${selectedElement.linkedAssetId}` : 'none'}
                            onValueChange={handleLinkOption}
                        >
                            <SelectTrigger className="h-9 bg-white border-gray-200">
                                <SelectValue placeholder="Select asset group..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No Source (Static)</SelectItem>
                                {userOptions && userOptions.length > 0 && (
                                    <>
                                        <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 bg-gray-50/50 mt-1">Saved Asset Groups</div>
                                        {userOptions.map((asset) => (
                                            <SelectItem key={asset.id} value={`asset:${asset.id}`}>
                                                {asset.name}
                                            </SelectItem>
                                        ))}
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Filter Items */}
                    {selectedElement.buttonOptions && selectedElement.buttonOptions.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-bold text-gray-400">Enable/Disable Options</Label>
                                <span className="text-[10px] text-gray-400 italic">Select which to show</span>
                            </div>
                            <ScrollArea className="h-[200px] w-full rounded-xl border border-gray-100 bg-gray-50/50 p-2">
                                <div className="space-y-1">
                                    {selectedElement.buttonOptions.map((opt, idx) => {
                                        const label = opt.includes('|') ? opt.split('|')[0] : opt;
                                        const isEnabled = selectedElement.enabledOptions?.includes(opt);

                                        return (
                                            <div
                                                key={`${opt}-${idx}`}
                                                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${isEnabled ? 'bg-white border-rose-200 shadow-sm' : 'bg-gray-100/50 border-transparent opacity-60'
                                                    }`}
                                                onClick={() => toggleOption(opt)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={isEnabled}
                                                        onCheckedChange={() => toggleOption(opt)}
                                                        className="border-gray-300 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                                                    />
                                                    <span className={`text-xs font-medium ${isEnabled ? 'text-gray-900' : 'text-gray-400'}`}>
                                                        {label}
                                                    </span>
                                                </div>
                                                {isEnabled ? <CheckCircle2 className="w-3.5 h-3.5 text-rose-500" /> : <Circle className="w-3.5 h-3.5 text-gray-300" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-rose-50/30 border-t border-rose-100">
                    <div className="flex items-start gap-2">
                        <Settings2 className="w-3.5 h-3.5 text-rose-600 mt-0.5" />
                        <p className="text-[10px] text-rose-700 leading-snug">
                            {selectedElement.linkedAssetId
                                ? "Buttons will be generated based on the enabled items above."
                                : "Connect an asset group from the 'Options' tab to populate this list."}
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
}
