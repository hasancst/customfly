import { useState, useMemo } from 'react';
import { CanvasElement, ShopifyProduct } from '../types';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
    RotateCcw,
    ImageIcon,
    CloudUpload,
    Database,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface PublicCustomizationPanelProps {
    elements: CanvasElement[];
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    onSelectElement: (id: string) => void;
    onReset: () => void;
    onSave?: (isManual: boolean) => void;
    isSaving?: boolean;
    productData?: ShopifyProduct;
    selectedVariant?: any;
    handleOptionChange?: (index: number, value: string) => void;
    userGalleries?: any[];
    selectedElement?: string | null;
    buttonText?: string;
}

export function PublicCustomizationPanel({
    elements,
    onUpdateElement,
    onSelectElement,
    onReset,
    onSave,
    isSaving,
    productData,
    selectedElement,
    userGalleries = []
}: PublicCustomizationPanelProps) {
    const [activeGalleryTab, setActiveGalleryTab] = useState<'all' | string>('all');
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    useMemo(() => {
        console.log("[PublicPanel] userGalleries received:", userGalleries);
    }, [userGalleries]);

    // Filter elements that are editable by customer and have a label
    const editableElements = useMemo(() => {
        return elements
            .filter(el => {
                // By default, allow these types if they have a non-empty label, 
                // unless explicitly hidden or marked not editable
                const isSupportedType = [
                    'text', 'monogram', 'field', 'textarea',
                    'image', 'gallery', 'dropdown', 'button',
                    'checkbox', 'number', 'time', 'file_upload'
                ].includes(el.type);

                return isSupportedType && !(el as any).isHiddenByLogic;
            })
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    }, [elements]);



    return (
        <div className="flex flex-col h-full bg-white p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter italic">Your Customization</h2>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-8 custom-scrollbar">
                {editableElements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <Database className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-gray-500 font-bold">No customizable options for this product.</p>
                    </div>
                ) : (
                    editableElements.map((el) => {
                        const labelText = el.label || (el.type === 'gallery' ? 'Image Gallery' : el.type.charAt(0).toUpperCase() + el.type.slice(1));

                        return (
                            <div key={el.id} className="space-y-3 group animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center justify-between px-1">
                                    <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                                        {labelText}
                                    </Label>
                                </div>

                                {/* Input Types Rendering */}
                                <div className="relative">
                                    {(el.type === 'text' || el.type === 'monogram' || el.type === 'field' || el.type === 'number' || el.type === 'time') && (
                                        <div className="space-y-2">
                                            <Input
                                                value={el.text || ""}
                                                onChange={(e) => {
                                                    let newVal = e.target.value;
                                                    if (el.type === 'monogram') {
                                                        newVal = newVal.toUpperCase();
                                                        const limit = el.maxChars || 3;
                                                        if (newVal.length > limit) return;
                                                    } else if (el.maxChars && el.maxChars > 0 && newVal.length > el.maxChars) {
                                                        return;
                                                    }
                                                    onUpdateElement(el.id, { text: newVal });
                                                }}
                                                placeholder={el.placeholder || `Enter ${labelText.toLowerCase()}...`}
                                                className="h-14 rounded-2xl border-2 border-gray-100 bg-white px-5 text-base font-bold text-indigo-950 shadow-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-gray-300"
                                            />
                                            {((el.type === 'text' || el.type === 'monogram' || el.type === 'field') && (el.maxChars || el.type === 'monogram')) && (
                                                <div className="flex justify-end px-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(el.text?.length || 0) >= (el.type === 'monogram' ? (el.maxChars || 3) : (el.maxChars || 0))
                                                        ? 'bg-red-100 text-red-600'
                                                        : (el.text?.length || 0) >= (el.type === 'monogram' ? (el.maxChars || 3) : (el.maxChars || 0)) * 0.8
                                                            ? 'bg-amber-100 text-amber-600'
                                                            : 'bg-gray-100 text-gray-400'}`}>
                                                        {el.text?.length || 0} / {el.type === 'monogram' ? (el.maxChars || 3) : el.maxChars}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {el.type === 'textarea' && (
                                        <div className="space-y-2">
                                            <Textarea
                                                value={el.text || ""}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    if (el.maxChars && el.maxChars > 0 && newVal.length > el.maxChars) return;
                                                    onUpdateElement(el.id, { text: newVal });
                                                }}
                                                placeholder={el.placeholder || `Enter ${labelText.toLowerCase()}...`}
                                                className="min-h-[120px] rounded-2xl border-2 border-gray-100 bg-white p-5 text-base font-bold text-indigo-950 shadow-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-gray-300 resize-none"
                                            />
                                            {el.maxChars && (
                                                <div className="flex justify-end px-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(el.text?.length || 0) >= (el.maxChars || 0)
                                                        ? 'bg-red-100 text-red-600'
                                                        : (el.text?.length || 0) >= (el.maxChars || 0) * 0.8
                                                            ? 'bg-amber-100 text-amber-600'
                                                            : 'bg-gray-100 text-gray-400'}`}>
                                                        {el.text?.length || 0} / {el.maxChars}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {el.type === 'dropdown' && (
                                        <Select
                                            value={el.text || ""}
                                            onValueChange={(val) => onUpdateElement(el.id, { text: val })}
                                        >
                                            <SelectTrigger className="h-14 rounded-2xl border-2 border-gray-100 bg-white px-5 text-base font-bold text-indigo-950 shadow-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all">
                                                <SelectValue placeholder={el.placeholder || "Select an option..."} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border shadow-2xl p-2">
                                                {el.dropdownOptions?.map((opt: string) => (
                                                    <SelectItem key={opt} value={opt} className="rounded-xl py-3 font-medium cursor-pointer">
                                                        {opt}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}

                                    {el.type === 'image' && (
                                        <div className="space-y-4">
                                            <div className="p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-200 transition-all cursor-pointer group" onClick={() => onSelectElement(el.id)}>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 bg-white rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                                                        {el.src ? (
                                                            <img src={el.src} className="w-full h-full object-cover" alt="Preview" />
                                                        ) : (
                                                            <ImageIcon className="w-8 h-8 text-gray-200" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-gray-900">Select Image</p>
                                                        <p className="text-[10px] text-gray-400 font-medium">Click to upload or choose from library</p>
                                                    </div>
                                                    <CloudUpload className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
                                                </div>
                                            </div>

                                            <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 flex flex-col gap-3">
                                                <label className="cursor-pointer flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-indigo-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all group">
                                                    <CloudUpload className="w-8 h-8 text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
                                                    <span className="text-sm font-bold text-indigo-700">Upload New Image</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                setUploadingId(el.id);
                                                                const formData = new FormData();
                                                                formData.append('image', file);
                                                                const shop = new URLSearchParams(window.location.search).get('shop') || '';

                                                                try {
                                                                    const response = await fetch(`/imcst_api/public/upload/image?folder=customer-uploads&shop=${encodeURIComponent(shop)}&webp=true`, {
                                                                        method: 'POST',
                                                                        body: formData,
                                                                    });

                                                                    if (!response.ok) throw new Error('Upload failed');

                                                                    const data = await response.json();
                                                                    onUpdateElement(el.id, { src: data.url });
                                                                    toast.success('Image uploaded successfully');
                                                                } catch (err) {
                                                                    console.error('Upload error:', err);
                                                                    toast.error('Failed to upload image');
                                                                } finally {
                                                                    setUploadingId(null);
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    {uploadingId === el.id && (
                                                        <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                                                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                                        </div>
                                                    )}
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {el.type === 'file_upload' && (
                                        <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 flex flex-col gap-3">
                                            <label className="cursor-pointer flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-emerald-200 rounded-2xl hover:bg-emerald-50 hover:border-emerald-300 transition-all group">
                                                <CloudUpload className="w-10 h-10 text-emerald-500 mb-3 group-hover:scale-110 transition-transform" />
                                                <span className="text-base font-black text-emerald-700">{el.label || 'Select File'}</span>
                                                <span className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider">Max {el.maxFileSize || 10}MB</span>
                                                <input
                                                    type="file"
                                                    accept={el.allowedFileTypes?.join(',')}
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            onUpdateElement(el.id, { fileName: file.name, fileSize: file.size });
                                                        }
                                                    }}
                                                />
                                            </label>
                                            {el.fileName && (
                                                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-emerald-100 animate-in fade-in zoom-in duration-200">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <div className="w-8 h-8 bg-emerald-100 rounded flex items-center justify-center shrink-0">
                                                            <ImageIcon className="w-4 h-4 text-emerald-600" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-bold text-gray-900 truncate">{el.fileName}</p>
                                                            <p className="text-[8px] text-gray-400">{(el.fileSize || 0) / 1024 > 1024 ? `${((el.fileSize || 0) / 1024 / 1024).toFixed(1)} MB` : `${((el.fileSize || 0) / 1024).toFixed(1)} KB`}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {el.type === 'gallery' && (
                                        <div className="space-y-4">
                                            {(() => {
                                                // Prepare source galleries
                                                const targetedSourceGalleries = el.gallerySourceIds && el.gallerySourceIds.length > 0
                                                    ? userGalleries.filter(g => el.gallerySourceIds?.includes(g.id))
                                                    : userGalleries;

                                                if (targetedSourceGalleries.length === 0) {
                                                    return (
                                                        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                                            <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                            <p className="text-xs text-gray-400 italic">No images available for selection.</p>
                                                        </div>
                                                    );
                                                }

                                                const isCategorized = el.galleryMode === 'categorized';

                                                // Prepare images
                                                let allImages: { url: string, galleryName: string }[] = [];
                                                targetedSourceGalleries.forEach((g: any) => {
                                                    const images = (g.value || '').split(/[\n,]/).filter(Boolean).map((url: string) => ({
                                                        url: url.trim(),
                                                        galleryName: g.name
                                                    }));
                                                    allImages.push(...images);
                                                });

                                                // Limit images
                                                const limit = el.galleryMaxImages || 50;
                                                const displayedImages = isCategorized && activeGalleryTab !== 'all'
                                                    ? allImages.filter(img => img.galleryName === activeGalleryTab).slice(0, limit)
                                                    : allImages.slice(0, limit);

                                                return (
                                                    <div className="space-y-4">
                                                        {isCategorized && targetedSourceGalleries.length > 1 && (
                                                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                                                <button
                                                                    onClick={() => setActiveGalleryTab('all')}
                                                                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${activeGalleryTab === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                                >
                                                                    All
                                                                </button>
                                                                {targetedSourceGalleries.map(g => (
                                                                    <button
                                                                        key={g.id}
                                                                        onClick={() => setActiveGalleryTab(g.name)}
                                                                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${activeGalleryTab === g.name ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                                    >
                                                                        {g.name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="grid grid-cols-3 gap-3">
                                                            {displayedImages.length === 0 ? (
                                                                <div className="col-span-3 py-10 text-center text-gray-400 italic text-xs">
                                                                    No images found in this category.
                                                                </div>
                                                            ) : (
                                                                displayedImages.map((img, i) => (
                                                                    <button
                                                                        key={i}
                                                                        onClick={() => {
                                                                            // Selecting updates the gallery element itself
                                                                            onUpdateElement(el.id, { src: img.url });
                                                                            onSelectElement(el.id);
                                                                        }}
                                                                        className={`group relative aspect-square bg-white rounded-xl border-2 overflow-hidden transition-all shadow-sm ${el.src === img.url ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-gray-50 hover:border-indigo-200'}`}
                                                                    >
                                                                        <img src={img.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Gallery" />
                                                                        {el.src === img.url && (
                                                                            <div className="absolute top-1 right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
                                                                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="pt-6 mt-auto border-t border-gray-100 space-y-4">
                <Button variant="outline" size="sm" onClick={onReset} className="w-full h-12 rounded-xl text-indigo-600 border-indigo-100 hover:bg-indigo-50 font-bold text-sm">
                    <RotateCcw className="w-5 h-5 mr-2" /> Reset Design
                </Button>

                <Button
                    onClick={() => onSave?.(false)}
                    disabled={isSaving}
                    className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]"
                >
                    {isSaving ? 'Saving...' : 'Add to Cart'}
                </Button>
            </div>
        </div>
    );
}
