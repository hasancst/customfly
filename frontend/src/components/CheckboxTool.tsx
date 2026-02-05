import { Link2, Settings2, CheckCircle2, Circle, CheckSquare } from 'lucide-react';
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

interface CheckboxToolProps {
    selectedElement: CanvasElement;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    userOptions?: any[];
    userFonts?: any[];
}

export function CheckboxTool({
    selectedElement,
    onUpdateElement,
    userOptions,
    userFonts
}: CheckboxToolProps) {
    const handleLinkOption = (val: string) => {
        if (val === 'none') {
            onUpdateElement(selectedElement.id, {
                linkedAssetId: undefined,
                checkboxOptions: [],
                enabledCheckboxOptions: []
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
                    checkboxOptions: items,
                    enabledCheckboxOptions: items,
                    label: asset.name || selectedElement.label
                });
            }
        }
    };

    const toggleOption = (opt: string) => {
        const currentEnabled = selectedElement.enabledCheckboxOptions || [];
        let newEnabled = [];

        if (currentEnabled.includes(opt)) {
            newEnabled = currentEnabled.filter(o => o !== opt);
        } else {
            newEnabled = [...currentEnabled, opt];
        }

        onUpdateElement(selectedElement.id, { enabledCheckboxOptions: newEnabled });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
                <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-sm text-gray-700">Checkbox Group Settings</span>
                </div>
            </div>

            <div className="p-4 space-y-6 flex-1 overflow-y-auto">
                {/* General Settings */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Input
                            value={selectedElement.label || ''}
                            onChange={(e) => onUpdateElement(selectedElement.id, { label: e.target.value })}
                            className="h-10"
                            placeholder="e.g. Select Extras"
                        />
                    </div>

                    {selectedElement && (
                        <div className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-amber-100/50">
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

                    <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center justify-between py-2 px-3 bg-gray-50/50 rounded-lg border border-gray-100 shadow-sm">
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-bold text-gray-700">Required Selection</Label>
                                <p className="text-[9px] text-gray-400">Forces customer to pick at least one</p>
                            </div>
                            <Switch
                                checked={!!selectedElement.isRequired}
                                onCheckedChange={(val) => onUpdateElement(selectedElement.id, { isRequired: val })}
                            />
                        </div>

                        <div className="flex items-center justify-between py-2 px-3 bg-gray-50/50 rounded-lg border border-gray-100 shadow-sm">
                            <div className="space-y-0.5">
                                <Label className="text-[11px] font-bold text-gray-700">Allow Multiple Choices</Label>
                                <p className="text-[9px] text-gray-400">Can select more than one item</p>
                            </div>
                            <Switch
                                checked={!!selectedElement.isMultiple}
                                onCheckedChange={(val) => onUpdateElement(selectedElement.id, {
                                    isMultiple: val,
                                    // Reset min/max if switching to single
                                    minSelection: val ? selectedElement.minSelection : undefined,
                                    maxSelection: val ? selectedElement.maxSelection : undefined
                                })}
                            />
                        </div>

                        {selectedElement.isMultiple && (
                            <div className="grid grid-cols-2 gap-2 p-2 bg-amber-50/30 rounded-lg border border-amber-100/50">
                                <div className="space-y-1">
                                    <Label className="text-[9px] font-bold text-amber-700">Min Select</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={selectedElement.minSelection || ''}
                                        onChange={(e) => onUpdateElement(selectedElement.id, { minSelection: parseInt(e.target.value) || 0 })}
                                        className="h-7 text-xs bg-white"
                                        placeholder="Min"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[9px] font-bold text-amber-700">Max Select</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={selectedElement.maxSelection || ''}
                                        onChange={(e) => onUpdateElement(selectedElement.id, { maxSelection: parseInt(e.target.value) || 0 })}
                                        className="h-7 text-xs bg-white"
                                        placeholder="Max"
                                    />
                                </div>
                            </div>
                        )}

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
                                value={selectedElement.fontSize || 13}
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
                                    value={selectedElement.color || '#333333'}
                                    onChange={(e) => onUpdateElement(selectedElement.id, { color: e.target.value })}
                                />
                            </div>
                        </div>
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
                    {selectedElement.checkboxOptions && selectedElement.checkboxOptions.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-bold text-gray-400">Enable/Disable Options</Label>
                            </div>
                            <ScrollArea className="h-[200px] w-full rounded-xl border border-gray-100 bg-gray-50/50 p-2">
                                <div className="space-y-1">
                                    {selectedElement.checkboxOptions.map((opt, idx) => {
                                        const label = opt.includes('|') ? opt.split('|')[0] : opt;
                                        const isEnabled = selectedElement.enabledCheckboxOptions?.includes(opt);

                                        return (
                                            <div
                                                key={`${opt}-${idx}`}
                                                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${isEnabled ? 'bg-white border-amber-200 shadow-sm' : 'bg-gray-100/50 border-transparent opacity-60'
                                                    }`}
                                                onClick={() => toggleOption(opt)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={isEnabled}
                                                        onCheckedChange={() => toggleOption(opt)}
                                                        className="border-gray-300 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                                    />
                                                    <span className={`text-xs font-medium ${isEnabled ? 'text-gray-900' : 'text-gray-400'}`}>
                                                        {label}
                                                    </span>
                                                </div>
                                                {isEnabled ? <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> : <Circle className="w-3.5 h-3.5 text-gray-300" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-amber-50/30 border-t border-amber-100">
                    <div className="flex items-start gap-2">
                        <Settings2 className="w-3.5 h-3.5 text-amber-600 mt-0.5" />
                        <p className="text-[10px] text-amber-700 leading-snug">
                            {selectedElement.linkedAssetId
                                ? `This list is synced with group. Options will appear as ${selectedElement.isMultiple ? 'checkboxes' : 'radio buttons'}.`
                                : "Connect an asset group from 'Options' to populate this list."}
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
}
