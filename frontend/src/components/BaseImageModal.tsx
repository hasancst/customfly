import React, { useRef, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageIcon, CloudUpload, ShoppingBag, CheckCircle2, LayoutGrid, Layers, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { ShopifyProduct } from '../types';

interface BaseImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    productData: ShopifyProduct | null;
    selectedVariantId: string;
    onSelectImage: (url: string, isVariantImage?: boolean, targetVariantId?: string | 'all') => void;
    variantBaseImages?: Record<string, string | undefined>;
    currentBaseImage?: string;
}

export function BaseImageModal({
    isOpen,
    onClose,
    productData,
    selectedVariantId,
    onSelectImage,
    variantBaseImages = {},
    currentBaseImage
}: BaseImageModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTargetId, setActiveTargetId] = useState<string | 'all'>(selectedVariantId || 'all');
    const [isUploading, setIsUploading] = useState(false);

    // Sync active target with selected variant when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setActiveTargetId(selectedVariantId || 'all');
        }
    }, [isOpen, selectedVariantId]);

    const activeTargetTitle = activeTargetId === 'all'
        ? 'All Variants (Global)'
        : productData?.variants.find(v => String(v.id) === String(activeTargetId))?.title || 'Selected Variant';

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        // Extract shop from URL params
        const shop = new URLSearchParams(window.location.search).get('shop') || '';

        try {
            const response = await fetch(`/imcst_api/public/upload/image?folder=base-images&shop=${encodeURIComponent(shop)}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            onSelectImage(data.url, false, activeTargetId);
            toast.success('Base image uploaded successfully');
            onClose();
        } catch (err) {
            console.error('Upload error:', err);
            toast.error('Failed to upload base image');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSelect = (url: string, isVariantImage = false) => {
        onSelectImage(url, isVariantImage, activeTargetId);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl flex flex-col h-[85vh]" aria-describedby="base-image-description">
                <div className="sr-only" id="base-image-description">Assign base images to specific product variants or globally.</div>

                <DialogHeader className="p-6 pb-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                                <Layers className="w-5 h-5 text-indigo-600" />
                                Mockup Manager
                            </DialogTitle>
                            <DialogDescription className="text-sm text-gray-500 mt-1">
                                Assign mockups to specific variants to automate scene changes.
                            </DialogDescription>
                        </div>
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold px-3 py-1">
                            Targeting: {activeTargetTitle}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="flex-1 flex min-h-0 overflow-hidden">
                    {/* Left Sidebar: Variants List */}
                    <div className="w-64 bg-gray-50/50 border-r border-gray-100 flex flex-col">
                        <div className="p-4 bg-white border-b border-gray-100 shrink-0">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <LayoutGrid className="w-3 h-3" />
                                Assignment Targets
                            </h4>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-1">
                                <button
                                    onClick={() => setActiveTargetId('all')}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 ${activeTargetId === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'hover:bg-gray-100 text-gray-600'}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${activeTargetId === 'all' ? 'bg-white/20 border-white/30' : 'bg-gray-100 border-gray-200'}`}>
                                        <Layers className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[11px] font-bold truncate">Global Base</div>
                                        <div className={`text-[9px] ${activeTargetId === 'all' ? 'text-indigo-100' : 'text-gray-400'}`}>Default mockup</div>
                                    </div>
                                    {currentBaseImage && !variantBaseImages['all'] && (
                                        <CheckCircle2 className={`w-3.5 h-3.5 ${activeTargetId === 'all' ? 'text-white' : 'text-green-500'}`} />
                                    )}
                                </button>

                                <div className="h-px bg-gray-100 my-2" />

                                {productData?.variants.map((variant) => {
                                    const assignedImage = variantBaseImages[variant.id] || variant.image;
                                    const isSelected = String(activeTargetId) === String(variant.id);

                                    return (
                                        <button
                                            key={variant.id}
                                            onClick={() => setActiveTargetId(String(variant.id))}
                                            className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-gray-50 text-gray-700'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg shrink-0 overflow-hidden border ${isSelected ? 'border-indigo-400/50' : 'border-gray-200'}`}>
                                                {assignedImage ? (
                                                    <img src={assignedImage} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                                        <ImageIcon className="w-4 h-4 text-gray-300" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[11px] font-bold truncate">{variant.title}</div>
                                                <div className={`text-[9px] truncate ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>
                                                    {(variantBaseImages[variant.id] || variantBaseImages[String(variant.id).match(/\d+/)?.[0] || '']) ? 'Custom Assignment' : (variant.image ? 'Standard Image' : 'No Mockup')}
                                                </div>
                                            </div>
                                            {(variantBaseImages[variant.id] || variantBaseImages[String(variant.id).match(/\d+/)?.[0] || '']) && (
                                                <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-indigo-500'}`} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                        <div className="p-4 border-t border-gray-100 bg-white">
                            <Button
                                variant="ghost"
                                className="w-full text-[10px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 h-8 rounded-lg"
                                onClick={() => onSelectImage('', false, activeTargetId)}
                            >
                                Clear Target Assignment
                            </Button>
                        </div>
                    </div>

                    {/* Right Pane: Image Selection */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white">
                        <Tabs defaultValue="shopify" className="flex-1 flex flex-col min-h-0">
                            <div className="px-6 py-2 bg-gray-50/50 border-b border-gray-100">
                                <TabsList className="bg-gray-100 p-1 rounded-xl w-fit">
                                    <TabsTrigger value="shopify" className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                        <ShoppingBag className="w-3.5 h-3.5" />
                                        Store Gallery
                                    </TabsTrigger>
                                    <TabsTrigger value="upload" className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                        <CloudUpload className="w-3.5 h-3.5" />
                                        Manual Upload
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <ScrollArea className="flex-1">
                                <TabsContent value="shopify" className="m-0 p-6 space-y-6">
                                    {/* Variant Images First */}
                                    {activeTargetId !== 'all' && (
                                        <div>
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Shopify Assigned Image</h4>
                                            {(() => {
                                                const v = productData?.variants.find(v => String(v.id) === String(activeTargetId));
                                                return v?.image ? (
                                                    <div
                                                        onClick={() => handleSelect(v.image!, true)}
                                                        className={`group relative aspect-square w-32 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${(variantBaseImages[activeTargetId] === v.image || variantBaseImages[String(activeTargetId).match(/\d+/)?.[0] || ''] === v.image) ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-gray-100 hover:border-indigo-300 shadow-sm'}`}
                                                    >
                                                        <img src={v.image} className="w-full h-full object-cover" alt="Variant" />
                                                        <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm p-1.5 text-center">
                                                            <span className="text-[9px] text-white font-bold block">Standard Variant</span>
                                                        </div>
                                                        {(variantBaseImages[activeTargetId] === v.image || variantBaseImages[String(activeTargetId).match(/\d+/)?.[0] || ''] === v.image) && (
                                                            <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-1 shadow-lg animate-in zoom-in-50 duration-200">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="p-4 rounded-2xl border-2 border-dashed border-gray-200 text-center bg-gray-50/50">
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">No image in Shopify for this variant.</p>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* All Gallery */}
                                    <div>
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">All Product Media ({productData?.images.length || 0})</h4>
                                        <div className="grid grid-cols-4 gap-4">
                                            {productData?.images.map((img, idx) => {
                                                const isGlobalActive = activeTargetId === 'all' && currentBaseImage === img;
                                                const isVariantActive = activeTargetId !== 'all' && (variantBaseImages[activeTargetId] === img || variantBaseImages[String(activeTargetId).match(/\d+/)?.[0] || ''] === img);
                                                const isActive = isGlobalActive || isVariantActive;

                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={() => handleSelect(img, false)}
                                                        className={`group relative aspect-square rounded-2xl border-2 transition-all cursor-pointer overflow-hidden bg-gray-50 ${isActive ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-gray-100 hover:border-indigo-300 shadow-sm'}`}
                                                    >
                                                        <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={`Product ${idx} `} />
                                                        {isActive && (
                                                            <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-1 shadow-lg animate-in zoom-in-50 duration-200">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="upload" className="m-0 p-6">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                    />
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-gray-200 rounded-[2rem] h-64 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group cursor-pointer bg-gray-50/30"
                                    >
                                        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                            {isUploading ? (
                                                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                            ) : (
                                                <CloudUpload className="w-10 h-10 text-indigo-600" />
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-base font-bold text-gray-900">Upload high-res mockup</p>
                                            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Drag & drop or click to browse</p>
                                        </div>
                                    </div>

                                    <div className="mt-8 grid grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-900 uppercase tracking-tight">Clarity</p>
                                            <p className="text-[9px] text-gray-500 leading-relaxed font-medium">Use high contrast images with clear edges for better alignment.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                                <Layers className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-900 uppercase tracking-tight">Format</p>
                                            <p className="text-[9px] text-gray-500 leading-relaxed font-medium">PNG or JPG supported. Transparent PNGs work best for layering.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                                                <ImageIcon className="w-4 h-4 text-purple-600" />
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-900 uppercase tracking-tight">Size</p>
                                            <p className="text-[9px] text-gray-500 leading-relaxed font-medium">Max 10MB. Optimized for 1000px width and above.</p>
                                        </div>
                                    </div>
                                </TabsContent>
                            </ScrollArea>
                        </Tabs>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        Hint: Pick a target on the left, then pick an image on the right.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="ghost" className="rounded-xl font-bold px-6 border border-gray-200 bg-white" onClick={onClose}>
                            Done / Save Changes
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
