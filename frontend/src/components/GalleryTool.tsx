import { useState, useEffect } from 'react';
import { Images, Plus, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CanvasElement } from '@/types';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

interface GalleryToolProps {
    onAddElement: (element: CanvasElement) => void;
    selectedElement?: CanvasElement;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
}

export function GalleryTool({ onAddElement, selectedElement, onUpdateElement }: GalleryToolProps) {
    const [maxImages, setMaxImages] = useState(selectedElement?.galleryMaxImages || 10);
    const [availableGalleries, setAvailableGalleries] = useState<any[]>([]);
    const [selectedGalleries, setSelectedGalleries] = useState<string[]>(
        selectedElement?.gallerySourceIds || []
    );
    const fetch = useAuthenticatedFetch();

    useEffect(() => {
        if (selectedElement?.type === 'gallery') {
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
            galleryMaxImages: maxImages,
            gallerySourceIds: selectedGalleries,
        };
        onAddElement(newElement);
    };

    const handleUpdate = (updates: Partial<CanvasElement>) => {
        if (selectedElement) {
            onUpdateElement(selectedElement.id, updates);
        }
    };

    return (
        <div className="space-y-6 pb-4">
            {/* Gallery Selection - Always show */}
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
                            <li>Images from selected galleries</li>
                            <li>Thumbnail grid with lightbox view</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
