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
    Loader2,
    Search,
    Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from './ui/skeleton';
import { useEffect } from 'react';

interface PublicCustomizationPanelProps {
    elements: CanvasElement[];
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    onSelectElement: (id: string) => void;
    onReset: () => void;
    productData?: ShopifyProduct;
    selectedVariant?: any;
    handleOptionChange?: (index: number, value: string) => void;
    userGalleries?: any[];
    selectedElement?: string | null;
    buttonText?: string;
    baseUrl?: string;
    shop?: string;
    onAddElement?: (element: CanvasElement) => void;
    onDeleteElement?: (id: string) => void;
}

export function PublicCustomizationPanel({
    elements,
    onUpdateElement,
    onSelectElement,
    onReset,
    userGalleries = [],
    productData,
    selectedVariant,
    handleOptionChange,
    baseUrl = '',
    shop = '',
    onAddElement,
    onDeleteElement
}: PublicCustomizationPanelProps) {
    const [activeGalleryTab, setActiveGalleryTab] = useState<'all' | string>('all');
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [gallerySearch, setGallerySearch] = useState('');
    const [galleryPage, setGalleryPage] = useState(1);
    const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
    const [dragActiveId, setDragActiveId] = useState<string | null>(null);
    const PAGE_SIZE = 24; // Multiplier of 4 for grid columns

    const handleDrag = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActiveId(id);
        } else if (e.type === "dragleave") {
            setDragActiveId(null);
        }
    };

    // Reset pagination when search or category changes
    useEffect(() => {
        setGalleryPage(1);
    }, [gallerySearch, activeGalleryTab]);

    const shopifyOptions = productData?.options || [];

    // Filter elements that are editable by customer and have a label
    const editableElements = useMemo(() => {
        return elements
            .filter(el => {
                // By default, allow these types if they have a non-empty label, 
                // unless explicitly hidden or marked not editable
                const isSupportedType = [
                    'text', 'monogram', 'field', 'textarea',
                    'image', 'gallery', 'dropdown', 'button',
                    'checkbox', 'number', 'time', 'file_upload',
                    'swatch', 'product_color'
                ].includes(el.type);

                return isSupportedType && !(el as any).isHiddenByLogic && !el.id.startsWith('gallery-added-');
            })
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    }, [elements]);

    return (
        <div className="flex flex-col h-full bg-white p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter italic">Your Customization</h2>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-8 custom-scrollbar">
                {/* Product Variant Options (Shopify) */}
                {shopifyOptions.length > 0 && (
                    <div className="space-y-6 pb-6 border-b border-gray-100">
                        {shopifyOptions.map((option, idx) => (
                            <div key={option.name} className="space-y-3">
                                <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                                    {option.name}
                                </Label>
                                <Select
                                    value={(idx === 0 ? selectedVariant?.option1 : idx === 1 ? selectedVariant?.option2 : selectedVariant?.option3) || ""}
                                    onValueChange={(val) => handleOptionChange?.(idx, val)}
                                >
                                    <SelectTrigger className="h-14 rounded-2xl border-2 border-gray-100 bg-white px-5 text-base font-bold text-indigo-950 shadow-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border shadow-2xl p-2">
                                        {option.values?.map((val: any) => (
                                            <SelectItem key={val} value={val} className="rounded-xl py-3 font-medium cursor-pointer">
                                                {val}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                )}

                {editableElements.length === 0 && shopifyOptions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <Database className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-gray-500 font-bold">No customizable options for this product.</p>
                    </div>
                ) : (
                    editableElements.map((el) => {
                        const labelText = el.label || (el.type === 'gallery' ? 'Choose your image' : el.type.charAt(0).toUpperCase() + el.type.slice(1));

                        return (
                            <div key={el.id} className="space-y-3 group animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center justify-between px-1">
                                    <Label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                                        {labelText}
                                    </Label>
                                    {onDeleteElement && (el.type === 'image' || el.type === 'text') && el.id.includes('added-') && (
                                        <button
                                            onClick={() => onDeleteElement(el.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Remove"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
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
                                                {el.dropdownOptions?.map((opt: string) => {
                                                    const display = opt.includes('|') ? opt.split('|')[0] : opt;
                                                    return (
                                                        <SelectItem key={opt} value={display} className="rounded-xl py-3 font-medium cursor-pointer">
                                                            {display}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    )}

                                    {el.type === 'checkbox' && (
                                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border-2 border-gray-100">
                                            <input
                                                type="checkbox"
                                                checked={!!el.checked}
                                                onChange={(e) => onUpdateElement(el.id, { checked: e.target.checked })}
                                                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm font-bold text-indigo-950">{el.placeholder || labelText}</span>
                                        </div>
                                    )}

                                    {el.type === 'button' && (
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap gap-2">
                                                {el.enabledOptions?.map((opt: string) => {
                                                    const display = opt.includes('|') ? opt.split('|')[0] : opt;
                                                    const isSelected = el.text === display;

                                                    const buttonStyle = el.buttonStyle || 'solid';
                                                    const baseClasses = "px-4 py-2.5 rounded-lg font-bold text-sm transition-all cursor-pointer border-2";

                                                    let styleClasses = "";
                                                    if (buttonStyle === 'outline') {
                                                        styleClasses = isSelected
                                                            ? "bg-indigo-50 border-indigo-600 text-indigo-700"
                                                            : "bg-white border-gray-300 text-gray-700 hover:border-indigo-400";
                                                    } else if (buttonStyle === 'soft') {
                                                        styleClasses = isSelected
                                                            ? "bg-indigo-100 border-indigo-200 text-indigo-700"
                                                            : "bg-gray-50 border-gray-100 text-gray-700 hover:bg-indigo-50";
                                                    } else {
                                                        styleClasses = isSelected
                                                            ? "bg-indigo-600 border-indigo-700 text-white shadow-lg"
                                                            : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-indigo-500 hover:text-white hover:border-indigo-600";
                                                    }

                                                    return (
                                                        <button
                                                            key={opt}
                                                            onClick={() => onUpdateElement(el.id, { text: display })}
                                                            className={`${baseClasses} ${styleClasses}`}
                                                        >
                                                            {display}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {el.isRequired && !el.text && (
                                                <p className="text-xs text-red-600 font-medium">Please select an option</p>
                                            )}
                                        </div>
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
                                                        <p className="text-[10px] text-gray-400 font-medium">Click to upload</p>
                                                    </div>
                                                    <CloudUpload className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
                                                </div>
                                            </div>

                                            <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 flex flex-col gap-3">
                                                <label
                                                    className={`cursor-pointer flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed rounded-xl transition-all group relative ${dragActiveId === el.id ? 'border-indigo-500 bg-indigo-50' : 'border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'}`}
                                                    onDragOver={(e) => handleDrag(e, el.id)}
                                                    onDragEnter={(e) => handleDrag(e, el.id)}
                                                    onDragLeave={(e) => handleDrag(e, el.id)}
                                                    onDrop={async (e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setDragActiveId(null);
                                                        const file = e.dataTransfer.files?.[0];
                                                        if (file && file.type.startsWith('image/')) {
                                                            setUploadingId(el.id);
                                                            const formData = new FormData();
                                                            formData.append('image', file);
                                                            try {
                                                                const response = await fetch(`${baseUrl}/imcst_api/public/upload/image?folder=customer-uploads&shop=${encodeURIComponent(shop)}&webp=true`, {
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
                                                        } else if (file) {
                                                            toast.error('Please upload an image file');
                                                        }
                                                    }}
                                                >
                                                    <CloudUpload className={`w-8 h-8 mb-2 transition-transform ${dragActiveId === el.id ? 'scale-110 text-indigo-600' : 'text-indigo-500 group-hover:scale-110'}`} />
                                                    <span className={`text-sm font-bold ${dragActiveId === el.id ? 'text-indigo-800' : 'text-indigo-700'}`}>
                                                        {dragActiveId === el.id ? 'Drop image here' : 'Upload New Image'}
                                                    </span>
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

                                                                try {
                                                                    const response = await fetch(`${baseUrl}/imcst_api/public/upload/image?folder=customer-uploads&shop=${encodeURIComponent(shop)}&webp=true`, {
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
                                            <label
                                                className={`cursor-pointer flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed rounded-2xl transition-all group relative ${dragActiveId === el.id ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'}`}
                                                onDragOver={(e) => handleDrag(e, el.id)}
                                                onDragEnter={(e) => handleDrag(e, el.id)}
                                                onDragLeave={(e) => handleDrag(e, el.id)}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setDragActiveId(null);
                                                    const file = e.dataTransfer.files?.[0];
                                                    if (file) {
                                                        // Check file type if defined
                                                        if (el.allowedFileTypes && el.allowedFileTypes.length > 0) {
                                                            const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
                                                            if (!el.allowedFileTypes.includes(ext)) {
                                                                toast.error(`Invalid file type. Allowed: ${el.allowedFileTypes.join(', ')}`);
                                                                return;
                                                            }
                                                        }
                                                        // Check file size
                                                        const maxSize = (el.maxFileSize || 10) * 1024 * 1024;
                                                        if (file.size > maxSize) {
                                                            toast.error(`File too large. Max: ${el.maxFileSize || 10}MB`);
                                                            return;
                                                        }
                                                        onUpdateElement(el.id, { fileName: file.name, fileSize: file.size });
                                                        toast.success('File attached successfully');
                                                    }
                                                }}
                                            >
                                                <CloudUpload className={`w-10 h-10 mb-3 transition-transform ${dragActiveId === el.id ? 'scale-110 text-emerald-600' : 'text-emerald-500 group-hover:scale-110'}`} />
                                                <span className={`text-base font-black ${dragActiveId === el.id ? 'text-emerald-800' : 'text-emerald-700'}`}>{dragActiveId === el.id ? 'Drop file here' : (el.label || 'Select File')}</span>
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
                                                let allImages: { url: string, label: string, galleryName: string }[] = [];
                                                targetedSourceGalleries.forEach((g: any) => {
                                                    const images = (g.value || '').split(/[\n,]/).filter(Boolean).map((raw: string) => {
                                                        const trimRaw = raw.trim();
                                                        // Handle "Label|URL" format
                                                        const label = trimRaw.includes('|') ? trimRaw.split('|')[0].trim() : '';
                                                        const url = trimRaw.includes('|') ? trimRaw.split('|')[1].trim() : trimRaw;
                                                        return {
                                                            url: url,
                                                            label: label,
                                                            galleryName: g.name
                                                        };
                                                    });
                                                    allImages.push(...images);
                                                });

                                                // Filter by Category and Search
                                                const filteredImages = allImages.filter(img => {
                                                    const matchesTab = !isCategorized || activeGalleryTab === 'all' || img.galleryName === activeGalleryTab;
                                                    const matchesSearch = !gallerySearch ||
                                                        img.label.toLowerCase().includes(gallerySearch.toLowerCase()) ||
                                                        img.galleryName.toLowerCase().includes(gallerySearch.toLowerCase());
                                                    return matchesTab && matchesSearch;
                                                });

                                                // Limit images - replaced with pagination
                                                const displayedCount = galleryPage * PAGE_SIZE;
                                                const limit = el.galleryMaxImages || 1000; // Increase default limit as we have pagination now
                                                const totalToDisplay = Math.min(filteredImages.length, limit);
                                                const displayedImages = filteredImages.slice(0, Math.min(displayedCount, totalToDisplay));
                                                const hasMore = totalToDisplay > displayedImages.length;

                                                return (
                                                    <div className="space-y-4">
                                                        <div className="relative">
                                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                            <Input
                                                                placeholder="Search images..."
                                                                value={gallerySearch}
                                                                onChange={(e) => setGallerySearch(e.target.value)}
                                                                className="h-10 pl-10 rounded-xl border-gray-100 bg-gray-50/50 text-xs font-medium focus:bg-white transition-all shadow-inner"
                                                            />
                                                        </div>

                                                        {isCategorized && targetedSourceGalleries.length > 1 && (
                                                            <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                                                                <button
                                                                    onClick={() => setActiveGalleryTab('all')}
                                                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all shrink-0 ${activeGalleryTab === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                                >
                                                                    All
                                                                </button>
                                                                {targetedSourceGalleries.map(g => (
                                                                    <button
                                                                        key={g.id}
                                                                        onClick={() => setActiveGalleryTab(g.name)}
                                                                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all shrink-0 ${activeGalleryTab === g.name ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                                    >
                                                                        {g.name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div
                                                            className="grid grid-cols-4 gap-2 pr-1"
                                                            style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: 'repeat(4, 1fr)',
                                                                gap: '8px'
                                                            }}
                                                        >
                                                            {displayedImages.length === 0 ? (
                                                                <div className="col-span-4 py-10 text-center text-gray-400 italic text-xs">
                                                                    No images found matching your search.
                                                                </div>
                                                            ) : (
                                                                displayedImages.map((img, i) => {
                                                                    const isLoaded = loadedImages[img.url];
                                                                    return (
                                                                        <button
                                                                            key={i}
                                                                            onClick={() => {
                                                                                if (el.maxSelection && el.maxSelection > 1 && onAddElement) {
                                                                                    const existingAddons = elements.filter(e => e.id.startsWith('gallery-added-')).length;
                                                                                    onAddElement({
                                                                                        id: `gallery-added-${Date.now()}`,
                                                                                        type: 'image',
                                                                                        src: img.url,
                                                                                        label: img.label || `Addon Image ${existingAddons + 1}`,
                                                                                        isEditableByCustomer: true,
                                                                                        isVisible: true,
                                                                                        x: el.x + 10,
                                                                                        y: el.y + 10,
                                                                                        width: el.width || 200,
                                                                                        height: el.height || 200,
                                                                                        rotation: 0,
                                                                                        opacity: 100,
                                                                                        zIndex: Date.now()
                                                                                    });
                                                                                    toast.success("Added to canvas");
                                                                                } else {
                                                                                    onUpdateElement(el.id, { src: img.url });
                                                                                    onSelectElement(el.id);
                                                                                }
                                                                            }}
                                                                            className={`group relative w-full rounded-lg border-2 overflow-hidden transition-all shadow-sm ${el.src === img.url ? 'border-indigo-600 ring-4 ring-indigo-50/50' : 'border-gray-50 hover:border-indigo-200'}`}
                                                                            style={{
                                                                                aspectRatio: '1/1',
                                                                                padding: 0,
                                                                                height: 'auto'
                                                                            }}
                                                                            title={img.label || img.galleryName}
                                                                        >
                                                                            {!isLoaded && <Skeleton className="w-full h-full absolute inset-0" />}
                                                                            <img
                                                                                src={img.url}
                                                                                loading="lazy"
                                                                                onLoad={() => setLoadedImages(prev => ({ ...prev, [img.url]: true }))}
                                                                                className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-110 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                                                                                alt="Gallery"
                                                                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                                                            />
                                                                            {el.src === img.url && (
                                                                                <div className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-200 z-10">
                                                                                    <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                                                                </div>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                        {hasMore && (
                                                            <div className="pt-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setGalleryPage(prev => prev + 1)}
                                                                    className="w-full text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 h-9"
                                                                >
                                                                    Load More Images ({totalToDisplay - displayedImages.length} remaining)
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {(el.type === 'swatch' || el.type === 'product_color') && (
                                        <div className="flex flex-wrap gap-3">
                                            {el.swatchColors?.map((rawVal, i) => {
                                                const parts = rawVal.split('|');
                                                const name = parts[0];
                                                const value = parts[1] || parts[0];
                                                const isImage = value.startsWith('http') || value.includes('.jpg') || value.includes('.png') || value.includes('.svg') || value.includes('webp');
                                                const isSelected = el.selectedColor === value || el.src === value;

                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            if (isImage) {
                                                                onUpdateElement(el.id, { src: value, selectedColor: name });
                                                            } else {
                                                                onUpdateElement(el.id, { selectedColor: value });
                                                            }
                                                        }}
                                                        className={`relative group w-12 h-12 rounded-full border-2 transition-all hover:scale-110 active:scale-95 flex items-center justify-center overflow-hidden ${isSelected ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-lg' : 'border-gray-100 hover:border-indigo-200 shadow-sm'}`}
                                                        style={{ backgroundColor: isImage ? '#f3f4f6' : value }}
                                                        title={name}
                                                    >
                                                        {isImage ? (
                                                            <img src={value} alt={name} className="w-full h-full object-cover" />
                                                        ) : null}
                                                        {isSelected && (
                                                            <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                                                                <CheckCircle2 className="w-5 h-5 text-white drop-shadow-md" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                                                    </button>
                                                );
                                            })}
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
            </div>
        </div>
    );
}
