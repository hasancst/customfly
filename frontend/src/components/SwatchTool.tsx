import React from 'react';
import { Palette, Link2, Plus, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CanvasElement } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);

interface SwatchToolProps {
    selectedElement: CanvasElement;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    productData: any; // Using any for simplicity, ideally should match ShopifyProduct type
    userColors?: any[];
    userOptions?: any[];
    onRefreshAssets?: () => void;
    onSaveAsset?: (asset: any) => Promise<any>;
}

export function SwatchTool({ selectedElement, onUpdateElement, productData, userColors, userOptions, onRefreshAssets, onSaveAsset }: SwatchToolProps) {
    const [newColor, setNewColor] = React.useState('#000000');
    const [newItemName, setNewItemName] = React.useState('');

    // Extract available options from product data
    const productOptions = productData?.options || [];

    const [selectedAssetId, setSelectedAssetId] = React.useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
    const [newAssetName, setNewAssetName] = React.useState('');
    const [newAssetValues, setNewAssetValues] = React.useState(''); // Line separated
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [updatingIndex, setUpdatingIndex] = React.useState<number | null>(null);
    const itemFileInputRef = React.useRef<HTMLInputElement>(null);

    const handleUpdateItemValue = async (index: number, newVal: string) => {
        const currentColors = [...(selectedElement.swatchColors || [])];
        if (index < 0 || index >= currentColors.length) return;

        const parts = currentColors[index].split('|');
        const name = parts[0];
        currentColors[index] = `${name}|${newVal}`;

        onUpdateElement(selectedElement.id, { swatchColors: currentColors });

        if (selectedAssetId && onSaveAsset) {
            const asset = userOptions?.find(a => a.id === selectedAssetId);
            if (asset) {
                await onSaveAsset({ ...asset, value: currentColors.join('\n') });
                if (onRefreshAssets) onRefreshAssets();
            }
        }
    };

    const handleItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (updatingIndex === null) return;
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            await handleUpdateItemValue(updatingIndex, dataUrl);
            setUpdatingIndex(null);
        };
        reader.readAsDataURL(file);
    };

    const handleAddItemWithValues = async (newValue: string) => {
        if (selectedAssetId && onSaveAsset) {
            const asset = userOptions?.find(a => a.id === selectedAssetId);
            if (asset) {
                const updatedValue = asset.value ? `${asset.value}\n${newValue}` : newValue;
                await onSaveAsset({ ...asset, value: updatedValue });
                const lines = updatedValue.split('\n').filter(Boolean);
                onUpdateElement(selectedElement.id, { swatchColors: lines.map((l: string) => l.trim()) });
                if (onRefreshAssets) onRefreshAssets();
            }
        } else {
            const currentColors = selectedElement.swatchColors || [];
            onUpdateElement(selectedElement.id, {
                swatchColors: [...currentColors, newValue]
            });
        }
    };

    const parsePaletteColors = (assetValue: string) => {
        return assetValue.split('\n').filter(Boolean).map(line => {
            const parts = line.split('|');
            return parts.length > 1 ? parts[1].trim() : parts[0].trim();
        });
    };

    const handleCreateAsset = async () => {
        if (!newAssetName || !onSaveAsset) return;

        const newAsset = {
            name: newAssetName,
            type: 'option',
            value: newAssetValues,
            config: { productId: productData?.id }
        };

        const created = await onSaveAsset(newAsset);
        if (created) {
            setIsCreateModalOpen(false);
            setNewAssetName('');
            setNewAssetValues('');
            // Auto select
            onUpdateElement(selectedElement.id, { swatchColors: created.value.split('\n').filter(Boolean).map((l: string) => l.trim()) });
            setSelectedAssetId(created.id);
            if (onRefreshAssets) onRefreshAssets();
        }
    };

    const handleAddItemToCurrent = async () => {
        if (!newItemName) {
            alert('Please enter a name for the swatch');
            return;
        }
        const valueToSave = `${newItemName}|${newColor}`;
        await handleAddItemWithValues(valueToSave);
        setNewItemName('');
        setNewColor('#000000');
    };

    const handleLinkOption = (optionName: string) => {
        if (optionName === 'none') {
            onUpdateElement(selectedElement.id, {
                swatchColors: selectedElement.swatchColors || [] // Keep current colors or clear if desired
            });
            setSelectedAssetId(null);
            return;
        }

        const linkedOption = productOptions.find((opt: any) => opt.name === optionName);
        if (linkedOption) {
            // Find variant index for this option name
            const optionIndex = productData.options.findIndex((opt: any) => opt.name === optionName);
            const optionKey = `option${optionIndex + 1}`;

            const swatchValuesWithImages = linkedOption.values.map((val: string) => {
                // Try to find a variant that has this value and an image
                const variantWithImage = productData.variants?.find((v: any) =>
                    v[optionKey] === val && (v.image_id || v.src)
                );

                if (variantWithImage) {
                    // Check if we have the image source directly or need to lookup by ID
                    let imageSrc = variantWithImage.src;
                    if (!imageSrc && variantWithImage.image_id && productData.images) {
                        const img = productData.images.find((i: any) => i.id === variantWithImage.image_id);
                        imageSrc = img?.src;
                    }

                    if (imageSrc) {
                        return `${val}|${imageSrc}`;
                    }
                }
                return val; // Just the name/color if no image found
            });

            onUpdateElement(selectedElement.id, {
                swatchColors: swatchValuesWithImages,
            });
            setSelectedAssetId(null); // It's a shopify variant, not a local asset group
        }
    };

    // Removed unused manual add/remove color functions as they are replaced by asset/variant logic

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-orange-50/50">
                <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-orange-600" />
                    <span className="font-bold text-sm text-gray-700">Swatch Settings</span>
                </div>
            </div>

            <div className="p-4 space-y-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase">Swatch Shape</Label>
                        <Select
                            value={selectedElement.swatchShape || 'circle'}
                            onValueChange={(val: any) => onUpdateElement(selectedElement.id, { swatchShape: val })}
                        >
                            <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="circle">Circle</SelectItem>
                                <SelectItem value="square">Square</SelectItem>
                                <SelectItem value="rounded">Rounded</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Visual Preview Box */}
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                        <Label className="text-[9px] font-bold text-gray-400 uppercase">Swatch Preview</Label>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                {[1, 2, 3].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`border-2 border-white shadow-sm transition-all ${(selectedElement.swatchShape || 'circle') === 'square' ? 'rounded-none' :
                                                (selectedElement.swatchShape || 'circle') === 'rounded' ? 'rounded-lg' :
                                                    'rounded-full'
                                            } w-7 h-7`}
                                        style={{ backgroundColor: ['#ef4444', '#3b82f6', '#10b981'][i] }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className="bg-gray-100" />

                {/* Link to Product Option */}
                <div className="space-y-3">
                    <Label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <Link2 className="w-3 h-3" />
                        Import from Product Option
                    </Label>
                    <Select onValueChange={(val) => {
                        if (val.startsWith('asset:')) {
                            const assetId = val.replace('asset:', '');
                            const asset = userOptions?.find(a => a.id === assetId);
                            if (asset) {
                                // Asset value is typically newline separated 'Name|#Hex' or just '#Hex'
                                // We need just the colors/values for now.
                                // Assuming simple format for now: text lines
                                const lines = asset.value.split('\n').filter(Boolean);
                                // Keep the full "Name|Color" format if present, so we can display Name and use Color
                                // The rendering logic handles splitting.
                                onUpdateElement(selectedElement.id, { swatchColors: lines.map((l: string) => l.trim()) });
                                setSelectedAssetId(assetId);
                            }
                        } else {
                            handleLinkOption(val);
                        }
                    }}>
                        <SelectTrigger className="h-9 bg-white border-gray-200">
                            <SelectValue placeholder="Select an option source..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None (Manual Setup)</SelectItem>

                            {/* Product Options */}
                            {productOptions.length > 0 && (
                                <React.Fragment>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-400">Shopify Variant</div>
                                    {productOptions.map((opt: any) => (
                                        <SelectItem key={opt.name} value={opt.name}>
                                            {opt.name}
                                        </SelectItem>
                                    ))}
                                </React.Fragment>
                            )}

                            {/* Saved Assets Options */}
                            {userOptions && (
                                (() => {
                                    const filteredAssets = userOptions.filter(asset => {
                                        const assetPid = asset.config?.productId || asset.productId;
                                        return !assetPid || (productData?.id && String(assetPid) === String(productData.id));
                                    });

                                    if (filteredAssets.length === 0) return null;

                                    return (
                                        <React.Fragment>
                                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-400">Saved Assets (Options)</div>
                                            {filteredAssets.map((asset) => (
                                                <SelectItem key={asset.id} value={`asset:${asset.id}`}>
                                                    {asset.name || asset.optionName || 'Untitled Option'}
                                                </SelectItem>
                                            ))}
                                        </React.Fragment>
                                    );
                                })()
                            )}
                            <div className="p-2 border-t border-gray-100 mt-1">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start h-8 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsCreateModalOpen(true);
                                    }}
                                >
                                    <Plus className="w-3 h-3 mr-2" />
                                    Add New Option Group
                                </Button>
                            </div>
                        </SelectContent>
                    </Select>
                    <p className="text-[10px] text-gray-400">
                        Import from Product Options or your Saved Assets library.
                    </p>
                </div>

                {/* Color Items Preview */}
                {selectedElement.swatchColors && selectedElement.swatchColors.length > 0 ? (
                    <div className="space-y-3">
                        <Label className="text-xs font-bold text-gray-500 uppercase">Current Items</Label>
                        <ScrollArea className="h-[200px] w-full rounded-xl border border-gray-100 bg-gray-50/50 p-2">
                            <div className="space-y-1">
                                {selectedElement.swatchColors.map((color, idx) => {
                                    const parts = color.split('|');
                                    const name = parts.length > 1 ? parts[0] : '';
                                    const value = parts.length > 1 ? parts[1] : parts[0];
                                    const isImage = value.startsWith('http') || value.startsWith('data:image');

                                    return (
                                        <div key={`${color}-${idx}`} className="group flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100 shadow-sm transition-all hover:border-indigo-200">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-7 h-7 rounded-full border border-gray-200 shadow-inner overflow-hidden flex-shrink-0"
                                                    style={{ backgroundColor: isImage ? 'transparent' : value }}
                                                    title={name || value}
                                                >
                                                    {isImage && <img src={value} alt={name} className="w-full h-full object-cover" />}
                                                </div>
                                                <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
                                                    {name || value}
                                                </span>
                                            </div>
                                            {!selectedAssetId && (
                                                <div className="flex items-center gap-0.5">
                                                    <div className="relative">
                                                        <button
                                                            className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-indigo-600 transition-colors"
                                                            onClick={() => {
                                                                setUpdatingIndex(idx);
                                                                itemFileInputRef.current?.click();
                                                            }}
                                                            title="Upload Image"
                                                        >
                                                            <ImageIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <div className="relative">
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <button
                                                                    className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-orange-500 transition-colors"
                                                                    title="Select Color"
                                                                >
                                                                    <Palette className="w-3.5 h-3.5" />
                                                                </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-64 p-3 pointer-events-auto" side="left">
                                                                <div className="space-y-4">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-[10px] font-bold uppercase text-gray-500">Preset Palette</Label>
                                                                        <div className="grid grid-cols-6 gap-1.5 overflow-y-auto max-h-32">
                                                                            {userColors && userColors.length > 0 ? (
                                                                                userColors.flatMap(asset => parsePaletteColors(asset.value)).map((hex, pIdx) => (
                                                                                    <button
                                                                                        key={`${hex}-${pIdx}`}
                                                                                        className="w-7 h-7 rounded-sm border border-gray-100 shadow-sm hover:scale-110 transition-transform"
                                                                                        style={{ backgroundColor: hex }}
                                                                                        onClick={() => handleUpdateItemValue(idx, hex)}
                                                                                    />
                                                                                ))
                                                                            ) : (
                                                                                <p className="col-span-6 text-[10px] text-gray-400 italic">No palettes saved</p>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <Separator className="bg-gray-100" />

                                                                    <div className="space-y-2">
                                                                        <Label className="text-[10px] font-bold uppercase text-gray-500">Custom Color</Label>
                                                                        <div className="flex gap-2 items-center">
                                                                            <div className="relative w-8 h-8 rounded-lg border border-gray-200 shadow-inner overflow-hidden flex-shrink-0">
                                                                                <Input
                                                                                    type="color"
                                                                                    className="absolute inset-0 w-full h-full p-0 border-none cursor-pointer"
                                                                                    value={isValidHex(value) ? value : '#000000'}
                                                                                    onChange={(e) => handleUpdateItemValue(idx, e.target.value)}
                                                                                />
                                                                            </div>
                                                                            <Input
                                                                                type="text"
                                                                                className="h-8 text-xs font-mono"
                                                                                value={value}
                                                                                onChange={(e) => handleUpdateItemValue(idx, e.target.value)}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <input
                                    type="file"
                                    ref={itemFileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleItemImageUpload}
                                />
                            </div>
                        </ScrollArea>

                        <div className="space-y-2 pt-2 border-t border-gray-100">
                            <Input
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                className="h-8 text-xs"
                                placeholder="Swatch Name (e.g. Red, XL, etc.)"
                            />

                            <div className="flex gap-2 items-center">
                                <div className="relative w-8 h-8 rounded-lg border border-gray-200 shadow-inner overflow-hidden flex-shrink-0">
                                    <Input
                                        type="color"
                                        className="absolute inset-0 w-full h-full p-0 border-none cursor-pointer"
                                        value={isValidHex(newColor) ? newColor : '#000000'}
                                        onChange={(e) => setNewColor(e.target.value)}
                                    />
                                </div>

                                <Input
                                    type="text"
                                    className="h-8 text-xs font-mono flex-1"
                                    value={newColor}
                                    onChange={(e) => setNewColor(e.target.value)}
                                />

                                <button
                                    className="p-2 h-8 w-8 bg-gray-50 border border-gray-200 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors flex items-center justify-center"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Upload Image Swatch"
                                >
                                    <ImageIcon className="w-4 h-4" />
                                </button>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                const dataUrl = event.target?.result as string;
                                                setNewColor(dataUrl);
                                                if (!newItemName) {
                                                    setNewItemName(file.name.split('.')[0]);
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />

                                <Button
                                    size="sm"
                                    onClick={handleAddItemToCurrent}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-3 rounded-lg font-bold text-[10px] uppercase"
                                >
                                    Add
                                </Button>
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 italic">
                            {selectedAssetId ? "Adding here updates the Saved Asset group." : "Items added locally only."}
                        </p>
                    </div>
                ) : (
                    <div className="p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-center space-y-3">
                        <div>
                            <p className="text-xs text-gray-400">No swatch items loaded.</p>
                            <p className="text-[10px] text-gray-300 mt-1">Select a source above to populate.</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8"
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            <Plus className="w-3 h-3 mr-2" />
                            Create New Option
                        </Button>
                    </div>
                )}

            </div>

            {/* Create Asset Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Option Group</DialogTitle>
                        <DialogDescription>
                            Create a reusable group of swatch options.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Group Name</Label>
                            <Input
                                placeholder="e.g. Premium Colors"
                                value={newAssetName}
                                onChange={(e) => setNewAssetName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Initial Values</Label>
                            <Input
                                placeholder="Name|#Hex (one per line, but for now just one)"
                                value={newAssetValues}
                                onChange={(e) => setNewAssetValues(e.target.value)}
                            />
                            <p className="text-[10px] text-gray-400">Format: Color Name|#HexCode (e.g. Ruby Red|#e0115f)</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateAsset}>Create Asset</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
