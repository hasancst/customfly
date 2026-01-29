import { useState, useEffect } from 'react';
import { Palette, Library } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { CanvasElement } from '@/types';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ShapeToolProps {
    selectedElement: CanvasElement;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
}

export function ShapeTool({ selectedElement, onUpdateElement }: ShapeToolProps) {
    const [availableShapes, setAvailableShapes] = useState<any[]>([]);
    const fetch = useAuthenticatedFetch();

    useEffect(() => {
        async function fetchShapes() {
            try {
                const res = await fetch('/imcst_api/assets?type=shape');
                if (res.ok) {
                    const assets = await res.json();
                    const shapes: any[] = [];

                    assets.forEach((asset: any) => {
                        const lines = asset.value.split('\n').filter(Boolean);
                        lines.forEach((line: string) => {
                            const parts = line.split('|');
                            if (parts.length >= 2) {
                                shapes.push({
                                    id: `${asset.id}-${parts[0]}`,
                                    name: parts[0],
                                    svg: parts.slice(1).join('|')
                                });
                            }
                        });
                    });

                    setAvailableShapes(shapes);
                }
            } catch (err) {
                console.error('Failed to fetch shapes:', err);
            }
        }
        fetchShapes();
    }, [fetch]);

    const handleUpdate = (updates: Partial<CanvasElement>) => {
        if (selectedElement) {
            onUpdateElement(selectedElement.id, updates);
        }
    };

    return (
        <div className="space-y-6 pb-4">
            {/* Settings Grid */}
            <div className="grid grid-cols-2 gap-3 px-1">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5 text-blue-500" />
                        <Label className="text-[10px] font-bold text-gray-500 uppercase">Shape Color</Label>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-white border border-blue-100 rounded-lg shadow-sm">
                        <input
                            type="color"
                            value={selectedElement.color || '#000000'}
                            onChange={(e) => handleUpdate({ color: e.target.value })}
                            className="w-6 h-6 p-0 border-0 rounded cursor-pointer bg-transparent"
                        />
                        <span className="text-[10px] font-mono font-bold text-gray-600 uppercase">
                            {selectedElement.color || '#000000'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Shapes Library */}
            <div className="px-1 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Library className="w-4 h-4 text-indigo-500" />
                        <Label className="text-sm font-bold text-gray-700 uppercase">Shapes Library</Label>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {availableShapes.length} Shapes
                    </span>
                </div>

                <Card className="border-indigo-100 bg-indigo-50/20 overflow-hidden shadow-sm">
                    <ScrollArea className="h-[280px] p-2">
                        <div className="grid grid-cols-3 gap-2">
                            {availableShapes.map((shape) => (
                                <button
                                    key={shape.id}
                                    onClick={() => handleUpdate({ svgCode: shape.svg })}
                                    className={`relative aspect-square flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all group ${selectedElement.svgCode === shape.svg
                                        ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-100/50'
                                        : 'bg-white border-white hover:border-indigo-200'
                                        }`}
                                    title={shape.name}
                                >
                                    <div
                                        className={`w-full h-full flex items-center justify-center transition-transform group-hover:scale-90 ${selectedElement.svgCode === shape.svg ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-400'
                                            }`}
                                        dangerouslySetInnerHTML={{ __html: shape.svg }}
                                        style={{ color: selectedElement.svgCode === shape.svg ? undefined : 'currentColor' }}
                                    />
                                    <div className="absolute bottom-1 left-0 right-0 px-1">
                                        <p className={`text-[8px] font-bold truncate text-center ${selectedElement.svgCode === shape.svg ? 'text-indigo-600' : 'text-gray-400'
                                            }`}>
                                            {shape.name}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </Card>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        [dangerouslysetinnerhtml] svg {
          width: 100%;
          height: 100%;
          fill: currentColor;
        }
      `}} />
        </div>
    );
}
