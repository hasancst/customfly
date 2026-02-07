import React from 'react';
import { Plus, ChevronDown, Link2, Trash2, Settings2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { CanvasElement } from '@/types';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

interface DropdownToolProps {
    selectedElement: CanvasElement;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    productData?: any;
    userOptions?: any[];
    onAddElement: (element: CanvasElement) => void;
}

export function DropdownTool({
    selectedElement,
    onUpdateElement,
    productData,
    userOptions,
    onAddElement
}: DropdownToolProps) {
    const [newItem, setNewItem] = React.useState('');
    const productOptions = productData?.options || [];

    const handleLinkOption = (val: string) => {
        if (val === 'none') {
            onUpdateElement(selectedElement.id, { linkedAssetId: undefined });
            return;
        }

        if (val.startsWith('asset:')) {
            const assetId = val.replace('asset:', '');
            const asset = userOptions?.find(a => a.id === assetId);
            if (asset) {
                const lines = asset.value.split('\n').filter(Boolean).map((l: string) => l.trim());
                onUpdateElement(selectedElement.id, {
                    dropdownOptions: lines,
                    linkedAssetId: assetId,
                    label: asset.name || selectedElement.label
                });
            }
        } else {
            // Shopify Variant Option
            const linkedOption = productOptions.find((opt: any) => opt.name === val);
            if (linkedOption) {
                onUpdateElement(selectedElement.id, {
                    dropdownOptions: linkedOption.values,
                    linkedAssetId: `shopify:${val}`,
                    label: val
                });
            }
        }
    };

    const handleAddItem = () => {
        if (!newItem.trim()) return;
        const currentOptions = selectedElement.dropdownOptions || [];
        onUpdateElement(selectedElement.id, {
            dropdownOptions: [...currentOptions, newItem.trim()]
        });
        setNewItem('');
    };

    const handleRemoveItem = (index: number) => {
        const currentOptions = [...(selectedElement.dropdownOptions || [])];
        currentOptions.splice(index, 1);
        onUpdateElement(selectedElement.id, { dropdownOptions: currentOptions });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-cyan-50/50">
                <div className="flex items-center gap-2">
                    <ChevronDown className="w-4 h-4 text-cyan-600" />
                    <span className="font-bold text-sm text-gray-700">Dropdown Settings</span>
                </div>
            </div>

            <div className="p-4 space-y-6 flex-1 overflow-y-auto">
                {/* General Settings */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-gray-400">Title</Label>
                        <Input
                            value={selectedElement.label || ''}
                            onChange={(e) => onUpdateElement(selectedElement.id, { label: e.target.value })}
                            className="h-10"
                            placeholder="e.g. Choose Material"
                        />
                    </div>

                    {selectedElement && (
                        <div className="flex items-center justify-between p-3 bg-cyan-50/50 rounded-xl border border-cyan-100/50">
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

                    <div className="pt-0">
                        <Button
                            onClick={() => {
                                if (selectedElement?.id === 'draft') {
                                    onAddElement({
                                        ...selectedElement as any,
                                        id: `dropdown-${Date.now()}`,
                                    });
                                } else {
                                    import('sonner').then(({ toast }) => toast.success('Dropdown option updated'));
                                }
                            }}
                            className="w-full h-11 bg-cyan-600 hover:bg-cyan-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-cyan-100 flex items-center justify-center gap-2 border-b-4 border-cyan-800 active:border-b-0 active:translate-y-1 transition-all"
                        >
                            {selectedElement?.id === 'draft' ? <Plus className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            {selectedElement?.id === 'draft' ? 'Create Dropdown Option' : 'Update Dropdown Option'}
                        </Button>
                    </div>



                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-gray-400">Help Text (Sub-label)</Label>
                        <Input
                            value={selectedElement.helpText || ''}
                            onChange={(e) => onUpdateElement(selectedElement.id, { helpText: e.target.value })}
                            className="h-9"
                            placeholder="Explainer text below field..."
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-gray-400">Visual Style</Label>
                            <Select
                                value={selectedElement.dropdownStyle || 'classic'}
                                onValueChange={(val: any) => onUpdateElement(selectedElement.id, { dropdownStyle: val })}
                            >
                                <SelectTrigger className="h-8 text-xs bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="classic">Classic</SelectItem>
                                    <SelectItem value="outline">Modern Outline</SelectItem>
                                    <SelectItem value="soft">Soft Fill</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50/50 rounded-lg border border-gray-100 shadow-sm">
                        <div className="space-y-0.5">
                            <Label className="text-[11px] font-bold text-gray-700">Required Selection</Label>
                            <p className="text-[9px] text-gray-400">Forces customer to pick an option</p>
                        </div>
                        <Switch
                            checked={!!selectedElement.isRequired}
                            onCheckedChange={(val) => onUpdateElement(selectedElement.id, { isRequired: val })}
                        />
                    </div>

                    {/* Visual Preview Box */}
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                        <Label className="text-[9px] font-bold text-gray-400">Dropdown Preview</Label>
                        <div className="space-y-1.5">
                            {selectedElement.label && (
                                <p className="text-[10px] font-bold text-gray-600 flex items-center gap-1">
                                    {selectedElement.label}
                                    {selectedElement.isRequired && <span className="text-red-500">*</span>}
                                </p>
                            )}
                            <div className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${(selectedElement.dropdownStyle || 'classic') === 'outline' ? 'bg-white border-2 border-cyan-400 shadow-sm shadow-cyan-50' :
                                (selectedElement.dropdownStyle || 'classic') === 'soft' ? 'bg-cyan-50/50 border border-cyan-100 text-cyan-900' :
                                    'bg-white border border-gray-200 shadow-sm'
                                }`}>
                                <span className="text-xs text-gray-400 truncate">
                                    {selectedElement.placeholder || 'Select option...'}
                                </span>
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            </div>
                            {selectedElement.helpText && (
                                <p className="text-[9px] text-gray-400 italic px-1">{selectedElement.helpText}</p>
                            )}
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
                        value={selectedElement.linkedAssetId?.startsWith('shopify:') ? selectedElement.linkedAssetId.replace('shopify:', '') : (selectedElement.linkedAssetId ? `asset:${selectedElement.linkedAssetId}` : 'none')}
                        onValueChange={handleLinkOption}
                    >
                        <SelectTrigger className="h-9 bg-white border-gray-200">
                            <SelectValue placeholder="Manual Entry" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Manual Entry</SelectItem>

                            {productOptions.length > 0 && (
                                <>
                                    <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 bg-gray-50/50">Shopify Options</div>
                                    {productOptions.map((opt: any) => (
                                        <SelectItem key={opt.name} value={opt.name}>{opt.name}</SelectItem>
                                    ))}
                                </>
                            )}

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

                {/* Current Items List */}
                <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-gray-400">Current Items</Label>
                    <ScrollArea className="h-[200px] w-full rounded-xl border border-gray-100 bg-gray-50/50 p-2">
                        <div className="space-y-1">
                            {selectedElement.dropdownOptions && selectedElement.dropdownOptions.length > 0 ? (
                                selectedElement.dropdownOptions.map((opt, idx) => (
                                    <div key={`${opt}-${idx}`} className="group flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100 shadow-sm transition-all hover:border-cyan-200">
                                        <span className="text-xs font-medium text-gray-700 truncate flex-1">
                                            {opt.includes('|') ? opt.split('|')[0] : opt}
                                        </span>
                                        {!selectedElement.linkedAssetId && (
                                            <button
                                                onClick={() => handleRemoveItem(idx)}
                                                className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center">
                                    <p className="text-[10px] text-gray-400 italic">No items added yet</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {!selectedElement.linkedAssetId && (
                        <div className="flex gap-2 pt-1">
                            <Input
                                value={newItem}
                                onChange={(e) => setNewItem(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                placeholder="Add new option..."
                                className="h-9 text-xs"
                            />
                            <Button
                                onClick={handleAddItem}
                                size="icon"
                                className="h-9 w-9 bg-cyan-600 hover:bg-cyan-700 flex-shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 bg-cyan-50/30 border-t border-cyan-100">
                <div className="flex items-start gap-2">
                    <Settings2 className="w-3.5 h-3.5 text-cyan-600 mt-0.5" />
                    <p className="text-[10px] text-cyan-700 leading-snug">
                        {selectedElement.linkedAssetId
                            ? "This dropdown is synchronized with your selected source."
                            : "Manage your dropdown options manually or link to a saved group above."}
                    </p>
                </div>
            </div>

        </div>
    );
}
