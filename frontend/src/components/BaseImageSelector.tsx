import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Image as ImageIcon, Package } from 'lucide-react';
import { toast } from 'sonner';

interface BaseImageSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectImage: (imageUrl: string, properties?: any) => void;
    shopifyProduct: any;
    selectedVariantId: string;
    currentBaseImage?: string;
    shop: string;
}

export function BaseImageSelector({
    isOpen,
    onClose,
    shopifyProduct,
    selectedVariantId,
    onSelectImage,
    currentBaseImage,
    shop
}: BaseImageSelectorProps) {
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'product' | 'variant' | 'upload'>('product');

    // Get product images
    const productImages = shopifyProduct?.images || [];

    // Get current variant
    const currentVariant = shopifyProduct?.variants?.find((v: any) =>
        String(v.id) === selectedVariantId
    );

    // Get variant image
    const variantImage = currentVariant?.image;
    const variantImageUrl = typeof variantImage === 'string'
        ? variantImage
        : (variantImage?.url || variantImage?.src);

    const handleSelectProductImage = (image: any) => {
        const imageUrl = typeof image === 'string' ? image : (image?.url || image?.src);
        if (imageUrl) {
            onSelectImage(imageUrl);
            toast.success('Product image selected');
            onClose();
        }
    };

    const handleSelectVariantImage = () => {
        if (variantImageUrl) {
            onSelectImage(variantImageUrl);
            toast.success('Variant image selected');
            onClose();
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image size must be less than 10MB');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);
        formData.append('shop', shop);

        try {
            const baseUrl = (window as any).IMCST_BASE_URL || '';
            const response = await fetch(`${baseUrl}/imcst_api/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            onSelectImage(data.url);
            toast.success('Image uploaded successfully');
            onClose();
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Select Base Image</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="product" className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            <span>Product Images</span>
                        </TabsTrigger>
                        <TabsTrigger value="variant" className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            <span>Variant Image</span>
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            <span>Upload Custom</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Product Images Tab */}
                    <TabsContent value="product" className="flex-1 overflow-y-auto mt-0">
                        {productImages.length > 0 ? (
                            <div className="grid grid-cols-3 gap-4 p-4">
                                {productImages.map((image: any, index: number) => {
                                    const imageUrl = typeof image === 'string' ? image : (image?.url || image?.src);
                                    const isCurrent = imageUrl === currentBaseImage;

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleSelectProductImage(image)}
                                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${isCurrent
                                                    ? 'border-indigo-500 ring-2 ring-indigo-200'
                                                    : 'border-gray-200 hover:border-indigo-300'
                                                }`}
                                        >
                                            <img
                                                src={imageUrl}
                                                alt={`Product ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            {isCurrent && (
                                                <div className="absolute top-2 right-2 bg-indigo-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                                                    Current
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <Package className="w-16 h-16 mb-4 opacity-50" />
                                <p className="text-sm font-medium">No product images available</p>
                            </div>
                        )}
                    </TabsContent>

                    {/* Variant Image Tab */}
                    <TabsContent value="variant" className="flex-1 overflow-y-auto mt-0">
                        {variantImageUrl ? (
                            <div className="p-4">
                                <div className="max-w-md mx-auto">
                                    <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 mb-4">
                                        <img
                                            src={variantImageUrl}
                                            alt="Variant"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="space-y-2 mb-4">
                                        <p className="text-sm font-bold text-gray-700">
                                            {currentVariant?.title || 'Current Variant'}
                                        </p>
                                        {currentVariant?.option1 && (
                                            <p className="text-xs text-gray-500">
                                                {currentVariant.option1}
                                                {currentVariant.option2 && ` / ${currentVariant.option2}`}
                                                {currentVariant.option3 && ` / ${currentVariant.option3}`}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handleSelectVariantImage}
                                        className="w-full"
                                        disabled={variantImageUrl === currentBaseImage}
                                    >
                                        {variantImageUrl === currentBaseImage ? 'Currently Selected' : 'Use This Image'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                                <p className="text-sm font-medium">This variant has no image</p>
                                <p className="text-xs mt-2">Try selecting from product images or upload custom</p>
                            </div>
                        )}
                    </TabsContent>

                    {/* Upload Custom Tab */}
                    <TabsContent value="upload" className="flex-1 overflow-y-auto mt-0">
                        <div className="p-4">
                            <div className="max-w-md mx-auto">
                                <label
                                    htmlFor="base-image-upload"
                                    className={`
                                        flex flex-col items-center justify-center
                                        aspect-square rounded-lg border-2 border-dashed
                                        transition-all cursor-pointer
                                        ${uploading
                                            ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                                            : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                                        }
                                    `}
                                >
                                    <Upload className={`w-16 h-16 mb-4 ${uploading ? 'text-gray-400 animate-pulse' : 'text-gray-400'}`} />
                                    <p className="text-sm font-bold text-gray-700 mb-2">
                                        {uploading ? 'Uploading...' : 'Click to upload image'}
                                    </p>
                                    <p className="text-xs text-gray-500 text-center px-4">
                                        PNG, JPG, GIF up to 10MB
                                    </p>
                                    <input
                                        id="base-image-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                        className="hidden"
                                    />
                                </label>

                                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-xs text-blue-800 font-medium mb-2">💡 Tips:</p>
                                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                                        <li>Use high-resolution images for best quality</li>
                                        <li>Transparent PNG works great for mockups</li>
                                        <li>Image will be automatically optimized</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
