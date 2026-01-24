import { useState, useEffect } from 'react';
import { Images, Plus, X, FolderOpen, Grid3x3, Upload, Database, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CanvasElement } from '@/types';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

interface GalleryToolProps {
    onAddElement: (element: CanvasElement) => void;
    selectedElement?: CanvasElement;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
}

export function GalleryTool({ onAddElement, selectedElement, onUpdateElement }: GalleryToolProps) {
    const [galleryMode, setGalleryMode] = useState<'categorized' | 'all'>(
        selectedElement?.galleryMode || 'all'
    );
    const [gallerySource, setGallerySource] = useState<'user_upload' | 'predefined' | 'both'>(
        selectedElement?.gallerySource || 'user_upload'
    );
    const [categories, setCategories] = useState<string[]>(
        selectedElement?.galleryCategories || []
    );
    const [newCategory, setNewCategory] = useState('');
    const [maxImages, setMaxImages] = useState(selectedElement?.galleryMaxImages || 10);
    const [availableGalleries, setAvailableGalleries] = useState<any[]>([]);
    const [selectedGalleries, setSelectedGalleries] = useState<string[]>(
        selectedElement?.gallerySourceIds || []
    );
    const fetch = useAuthenticatedFetch();

    useEffect(() => {
        if (selectedElement?.type === 'gallery') {
            setGalleryMode(selectedElement.galleryMode || 'all');
            setGallerySource(selectedElement.gallerySource || 'user_upload');
            setCategories(selectedElement.galleryCategories || []);
            setMaxImages(selectedElement.galleryMaxImages || 10);
            setSelectedGalleries(selectedElement.gallerySourceIds || []);
        }
    }, [selectedElement]);

    // Fetch available galleries from assets
    useEffect(() => {
        async function fetchGalleries() {
            try {
                const res = await fetch('/imcst_api/assets?type=gallery');
                if (res.ok) {
                    const galleries = await res.json();
                    setAvailableGalleries(galleries);
                }
            } catch (err) {
                console.error('Failed to fetch galleries:', err);
            }
        }
        fetchGalleries();
    }, [fetch]);

    const handleAddGallery = () => {
        const newElement: CanvasElement = {
            id: `gallery-${Date.now()}`,
            type: 'gallery',
            label: 'Image Gallery',
            x: 250,
            y: 200,
            width: 300,
            height: 200,
            rotation: 0,
            opacity: 100,
            zIndex: Date.now(),
            galleryMode,
            galleryCategories: categories,
            galleryMaxImages: maxImages,
            gallerySource,
            gallerySourceIds: selectedGalleries,
        };
        onAddElement(newElement);
    };

    const handleUpdate = (updates: Partial<CanvasElement>) => {
        if (selectedElement) {
            onUpdateElement(selectedElement.id, updates);
        }
    };

    const handleAddCategory = () => {
        if (newCategory.trim() && !categories.includes(newCategory.trim())) {
            const updatedCategories = [...categories, newCategory.trim()];
            setCategories(updatedCategories);
            setNewCategory('');
            if (selectedElement) {
                handleUpdate({ galleryCategories: updatedCategories });
            }
        }
    };

    const handleRemoveCategory = (category: string) => {
        const updatedCategories = categories.filter(c => c !== category);
        setCategories(updatedCategories);
        if (selectedElement) {
            handleUpdate({ galleryCategories: updatedCategories });
        }
    };

    return (
        <div className="space-y-6 pb-4">
            {/* Gallery Mode Selection */}
            <div className="px-1 space-y-3">
                <div className="flex items-center gap-2">
                    <Images className="w-4 h-4 text-pink-500" />
                    <Label className="text-sm font-bold text-gray-700">Display Mode</Label>
                </div>

                <ToggleGroup
                    type="single"
                    value={galleryMode}
                    onValueChange={(val: any) => {
                        if (val) {
                            setGalleryMode(val);
                            if (selectedElement) handleUpdate({ galleryMode: val });
                        }
                    }}
                    className="w-full bg-gray-50 p-1 rounded-xl border border-gray-100"
                >
                    <ToggleGroupItem
                        value="all"
                        className="flex-1 gap-2 rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm"
                    >
                        <Grid3x3 className="w-3.5 h-3.5" />
                        All Images
                    </ToggleGroupItem>
                    <ToggleGroupItem
                        value="categorized"
                        className="flex-1 gap-2 rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm"
                    >
                        <FolderOpen className="w-3.5 h-3.5" />
                        By Category
                    </ToggleGroupItem>
                </ToggleGroup>

                <p className="text-[10px] text-gray-500 italic px-1">
                    {galleryMode === 'all'
                        ? 'Show all images in a single grid view'
                        : 'Organize images into category tabs'}\n                </p>
            </div>

            {/* Gallery Source Selection */}
            <div className="px-1 space-y-3">
                <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-500" />
                    <Label className="text-sm font-bold text-gray-700">Image Source</Label>
                </div>

                <ToggleGroup
                    type="single"
                    value={gallerySource}
                    onValueChange={(val: any) => {
                        if (val) {
                            setGallerySource(val);
                            if (selectedElement) handleUpdate({ gallerySource: val });
                        }
                    }}
                    className="w-full bg-gray-50 p-1 rounded-xl border border-gray-100"
                >
                    <ToggleGroupItem
                        value="user_upload"
                        className="flex-1 gap-1.5 rounded-lg text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm"
                    >
                        <Upload className="w-3 h-3" />
                        User Upload
                    </ToggleGroupItem>
                    <ToggleGroupItem
                        value="predefined"
                        className="flex-1 gap-1.5 rounded-lg text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm"
                    >
                        <Database className="w-3 h-3" />
                        Predefined
                    </ToggleGroupItem>
                    <ToggleGroupItem
                        value="both"
                        className="flex-1 gap-1.5 rounded-lg text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm"
                    >
                        <Layers className="w-3 h-3" />
                        Both
                    </ToggleGroupItem>
                </ToggleGroup>

                <p className="text-[10px] text-gray-500 italic px-1">
                    {gallerySource === 'user_upload'
                        ? 'Only show images uploaded by customers'
                        : gallerySource === 'predefined'
                            ? 'Only show images from selected galleries below'
                            : 'Show both customer uploads and predefined galleries'}
                </p>
            </div>

            {/* Gallery Selection (only show if predefined or both) */}
            {(gallerySource === 'predefined' || gallerySource === 'both') && (
                <div className="px-1 space-y-3">
                    <Label className="text-sm font-bold text-gray-700">Select Galleries</Label>

                    {availableGalleries.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {availableGalleries.map((gallery) => {
                                const isSelected = selectedGalleries.includes(gallery.id);
                                return (
                                    <button
                                        key={gallery.id}
                                        onClick={() => {
                                            const updated = isSelected
                                                ? selectedGalleries.filter(id => id !== gallery.id)
                                                : [...selectedGalleries, gallery.id];
                                            setSelectedGalleries(updated);
                                            if (selectedElement) handleUpdate({ gallerySourceIds: updated });
                                        }}
                                        className={`w-full p-3 rounded-lg border-2 transition-all text-left ${isSelected
                                            ? 'border-purple-500 bg-purple-50'
                                            : 'border-gray-200 bg-white hover:border-purple-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-gray-900">{gallery.name}</p>
                                                {gallery.config?.description && (
                                                    <p className="text-[10px] text-gray-500 mt-0.5">{gallery.config.description}</p>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 ml-2">
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <Database className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-gray-400 italic">No galleries available</p>
                            <p className="text-[10px] text-gray-400 mt-1">Create galleries in Assets page</p>
                        </div>
                    )}
                </div>
            )}

            {/* Categories (only show if categorized mode) */}
            {galleryMode === 'categorized' && (
                <div className="px-1 space-y-3">
                    <Label className="text-sm font-bold text-gray-700">Categories</Label>

                    {/* Add Category Input */}
                    <div className="flex gap-2">
                        <Input
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                            placeholder="e.g., Wedding, Portrait, Nature"
                            className="flex-1 h-9 rounded-lg text-xs"
                        />
                        <Button
                            onClick={handleAddCategory}
                            size="sm"
                            className="h-9 px-3 bg-pink-500 hover:bg-pink-600 text-white rounded-lg"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Category List */}
                    {categories.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {categories.map((category) => (
                                <Badge
                                    key={category}
                                    variant="secondary"
                                    className="pl-3 pr-1 py-1 bg-pink-50 text-pink-700 border border-pink-200 rounded-lg flex items-center gap-1.5"
                                >
                                    <span className="text-xs font-medium">{category}</span>
                                    <button
                                        onClick={() => handleRemoveCategory(category)}
                                        className="hover:bg-pink-200 rounded-full p-0.5 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            No categories yet. Add one above.
                        </p>
                    )}
                </div>
            )}

            {/* Max Images */}
            <div className="px-1 space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold text-gray-700">Max Images to Show</Label>
                    <span className="text-xs font-bold text-pink-600">{maxImages}</span>
                </div>
                <Input
                    type="number"
                    min="1"
                    max="100"
                    value={maxImages}
                    onChange={(e) => {
                        const val = parseInt(e.target.value) || 10;
                        setMaxImages(val);
                        if (selectedElement) handleUpdate({ galleryMaxImages: val });
                    }}
                    className="h-9 rounded-lg text-xs"
                />
                <p className="text-[10px] text-gray-500 italic">
                    Limit the number of images displayed (1-100)
                </p>
            </div>

            {/* Add Gallery Button (only show if no element selected) */}
            {!selectedElement && (
                <div className="px-1">
                    <Button
                        onClick={handleAddGallery}
                        className="w-full h-11 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-lg shadow-pink-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Add Gallery
                    </Button>
                </div>
            )}

            {/* Info Box */}
            <div className="mx-1 p-3 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border border-pink-100">
                <div className="flex items-start gap-2">
                    <Images className="w-4 h-4 text-pink-600 mt-0.5 flex-shrink-0" />
                    <div className="text-[10px] text-pink-700 space-y-1">
                        <p className="font-bold">Gallery will display:</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                            <li>Customer uploaded images</li>
                            <li>Images from selected categories (if categorized)</li>
                            <li>Thumbnail grid with lightbox view</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
