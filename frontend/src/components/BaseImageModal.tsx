import React, { useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageIcon, CloudUpload, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ShopifyVariant {
    id: string;
    title: string;
    image?: string | null;
}

interface ShopifyProduct {
    id: string;
    title: string;
    variants: ShopifyVariant[];
    images: string[];
}

interface BaseImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    productData: ShopifyProduct | null;
    selectedVariantId: string;
    onSelectImage: (url: string, isVariantImage?: boolean, applyToVariant?: boolean) => void;
    currentBaseImage?: string;
}

export function BaseImageModal({
    isOpen,
    onClose,
    productData,
    selectedVariantId,
    onSelectImage,
    currentBaseImage
}: BaseImageModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [applyToVariant, setApplyToVariant] = React.useState(false);

    const selectedVariant = productData?.variants.find(v => v.id === selectedVariantId);
    const variantImage = selectedVariant?.image;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const url = event.target?.result as string;
            onSelectImage(url, false, applyToVariant);
            onClose();
        };
        reader.readAsDataURL(file);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl flex flex-col max-h-[85vh]" aria-describedby="base-image-description">
                <div className="sr-only" id="base-image-description">Select a base image from store gallery or upload your own.</div>
                <DialogHeader className="p-6 pb-2 border-b border-gray-100 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                        <ImageIcon className="w-5 h-5 text-indigo-600" />
                        Setup Base Mockup Image
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Choose a base image for your design from the available options or upload a custom one.
                    </DialogDescription>
                    <p className="text-sm text-gray-500">Choose how you want to set the background product image.</p>
                </DialogHeader>

                <Tabs defaultValue="shopify" className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                        <TabsList className="bg-gray-100 p-1 rounded-xl">
                            <TabsTrigger value="shopify" className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <ShoppingBag className="w-3.5 h-3.5" />
                                Store Images
                            </TabsTrigger>
                            <TabsTrigger value="upload" className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <CloudUpload className="w-3.5 h-3.5" />
                                Custom Upload
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                            <Label className="text-[10px] font-bold text-indigo-700 uppercase cursor-pointer" htmlFor="apply-variant">
                                Assign to {selectedVariant?.title || 'Current Variant'} only
                            </Label>
                            <Switch
                                id="apply-variant"
                                checked={applyToVariant}
                                onCheckedChange={setApplyToVariant}
                            />
                        </div>
                    </div>

                    <ScrollArea className="flex-1 p-6">
                        <TabsContent value="shopify" className="m-0 space-y-6">
                            {/* 1. Variant Specific Image */}
                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Current Variant Image</h4>
                                {variantImage ? (
                                    <div
                                        onClick={() => { onSelectImage(variantImage!, true, applyToVariant); onClose(); }}
                                        className={`group relative aspect-square w-32 rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${currentBaseImage === variantImage ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-100 hover:border-indigo-300'}`}
                                    >
                                        <img src={variantImage} className="w-full h-full object-cover" alt="Variant" />
                                        <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm p-1.5 text-center">
                                            <span className="text-[9px] text-white font-bold truncate block">Use Selected Variant</span>
                                        </div>
                                        {currentBaseImage === variantImage && (
                                            <div className="absolute top-1 right-1 bg-indigo-500 text-white rounded-full p-0.5 shadow-lg">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl border-2 border-dashed border-gray-200 text-center">
                                        <p className="text-xs text-gray-500 font-medium">No image assigned to this variant in Shopify.</p>
                                    </div>
                                )}
                            </div>

                            {/* 2. Product Gallery */}
                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">All Product Images ({productData?.images.length || 0})</h4>
                                <div className="grid grid-cols-4 gap-3">
                                    {productData?.images.map((img, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => { onSelectImage(img, false, applyToVariant); onClose(); }}
                                            className={`group relative aspect-square rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${currentBaseImage === img ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-100 hover:border-indigo-300'}`}
                                        >
                                            <img src={img} className="w-full h-full object-cover" alt={`Product ${idx} `} />
                                            {currentBaseImage === img && (
                                                <div className="absolute top-1 right-1 bg-indigo-500 text-white rounded-full p-0.5 shadow-lg">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors" />
                                        </div>
                                    ))}
                                    {(!productData?.images || productData.images.length === 0) && (
                                        <div className="col-span-4 py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <p className="text-xs text-gray-500">No product images found.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="upload" className="m-0">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group cursor-pointer"
                            >
                                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <CloudUpload className="w-8 h-8 text-indigo-600" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-gray-900">Upload high-res mockup</p>
                                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-tight font-medium">Drag & drop or click to browse</p>
                                </div>
                            </div>

                            <div className="mt-8 space-y-3">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Guidelines:</h4>
                                <ul className="text-[10px] text-gray-500 space-y-1 ml-4 list-disc font-medium">
                                    <li>Use images with high contrast and clear product edges.</li>
                                    <li>PNG or JPG format supported (Max 10MB).</li>
                                    <li>Optimized for resolution 1000px and above.</li>
                                </ul>
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <Button variant="ghost" className="rounded-xl font-bold px-6" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
