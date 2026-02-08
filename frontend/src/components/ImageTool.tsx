import { useState, useRef, useEffect } from 'react';
import { Plus, Upload, Image as ImageIcon, ChevronDown, Shapes, Zap, RotateCw } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CanvasElement } from '@/types';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getProxiedUrl } from '@/utils/urlUtils';

interface ImageToolProps {
  onAddElement: (element: CanvasElement) => void;
  selectedElement?: CanvasElement | undefined;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onCrop?: () => void;
  canvasDimensions?: { width: number; height: number };
  userImages?: any[];
  customFetch?: any;
  isPublicMode?: boolean;
  shop?: string;
}

export function ImageTool({ onAddElement, selectedElement, onUpdateElement, onCrop, canvasDimensions, userImages: propUserImages, customFetch, isPublicMode, shop }: ImageToolProps) {

  const [userImages, setUserImages] = useState<any[]>(propUserImages || []);
  const [shapeGroups, setShapeGroups] = useState<any[]>([]);
  const [selectedShapeGroupId, setSelectedShapeGroupId] = useState<string>('all');
  const [availableShapes, setAvailableShapes] = useState<any[]>([]);
  const [imageLabel, setImageLabel] = useState<string>(selectedElement?.label || '');
  const [showLabel, setShowLabel] = useState<boolean>(selectedElement?.showLabel !== false);
  const [isVisible, setIsVisible] = useState<boolean>(selectedElement?.isVisible !== false);
  const fetchFn = customFetch || window.fetch;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchImages() {
      try {
        const baseUrl = isPublicMode ? '/imcst_api/public/assets' : '/imcst_api/assets';
        const query = new URLSearchParams();
        query.append('type', 'image');
        if (isPublicMode && shop) query.append('shop', shop);

        const response = await fetchFn(`${baseUrl}?${query.toString()}`);
        if (response.ok) {
          setUserImages(await response.json());
        } else {
          console.error(`Failed to fetch images: ${response.status} ${response.statusText}`);
          if (response.status === 400 || response.status === 401) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Auth error details:', errorData);
          }
        }
      } catch (err) {
        console.error("Failed to fetch image gallery:", err);
      }
    }

    async function fetchShapes() {
      try {
        const baseUrl = isPublicMode ? '/imcst_api/public/assets' : '/imcst_api/assets';
        const query = new URLSearchParams();
        query.append('type', 'shape');
        if (isPublicMode && shop) query.append('shop', shop);

        const response = await fetchFn(`${baseUrl}?${query.toString()}`);
        if (response.ok) {
          const assets = await response.json();
          setShapeGroups(assets);

          const allShapes: any[] = [];
          assets.forEach((asset: any) => {
            const lines = asset.value.split('\n').filter(Boolean);
            lines.forEach((line: string) => {
              const parts = line.split('|');
              if (parts.length >= 2) {
                const name = parts[0];
                const svg = parts.slice(1).join('|');
                allShapes.push({
                  id: `${asset.id}-${name}`,
                  assetId: asset.id,
                  name,
                  svg
                });
              }
            });
          });
          setAvailableShapes(allShapes);
        } else {
          console.error(`Failed to fetch shapes: ${response.status} ${response.statusText}`);
          if (response.status === 400 || response.status === 401) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Auth error details:', errorData);
          }
        }
      } catch (err) {
        console.error("Failed to fetch shapes:", err);
      }
    }

    if (!propUserImages) {
      fetchImages();
    }
    fetchShapes();
  }, [fetchFn, propUserImages, isPublicMode, shop]);

  // Sync label state when selected element changes
  useEffect(() => {
    if (selectedElement) {
      setImageLabel(selectedElement.label || '');
      setShowLabel(selectedElement.showLabel !== false);
      setIsVisible(selectedElement.isVisible !== false);
    }
  }, [selectedElement?.id, selectedElement?.isVisible]);

  const parseMaskFromSvg = (svgString: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg) return null;

      const viewBox = svg.getAttribute('viewBox') || '0 0 100 100';

      const path = doc.querySelector('path');
      if (path) {
        const d = path.getAttribute('d');
        if (d) return { path: d, viewBox };
      }

      const polygon = doc.querySelector('polygon');
      if (polygon) {
        const points = polygon.getAttribute('points');
        if (points) return { path: points, viewBox };
      }

      const circle = doc.querySelector('circle');
      if (circle) {
        const cx = parseFloat(circle.getAttribute('cx') || '50');
        const cy = parseFloat(circle.getAttribute('cy') || '50');
        const r = parseFloat(circle.getAttribute('r') || '50');
        const d = `M ${cx - r}, ${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`;
        return { path: d, viewBox };
      }
    } catch (e) {
      console.error("SVG Parse Error:", e);
    }
    return null;
  };

  const filteredShapes = availableShapes.filter(s => {
    // Filter by user selection in dropdown only
    if (selectedShapeGroupId !== 'all' && s.assetId !== selectedShapeGroupId) return false;
    return true;
  });

  const availableGroups = shapeGroups; // All groups available

  const handleAddFromGallery = (url: string) => {
    // If we have a REAL image element selected, replace it.
    // If we have a "draft" element (placeholder) OR no element, add it as a new element.
    if (selectedElement?.type === 'image' && selectedElement.id !== 'draft') {
      onUpdateElement(selectedElement.id, { src: url });
      toast.success("Image replaced");
      return;
    }

    const newElement: CanvasElement = {
      id: `image-${Date.now()}`,
      type: 'image',
      src: url,
      x: (canvasDimensions?.width || 1000) / 2 - 100,
      y: (canvasDimensions?.height || 1000) / 2 - 100,
      width: 200,
      height: 200,
      rotation: 0,
      opacity: 100,
      zIndex: Date.now(),
      removeBg: false,
    };
    onAddElement(newElement);
  };

  const processFile = async (file: File, index: number) => {
    try {
      let url = '';
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'pdf') {
        const toastId = toast.loading(`Processing PDF: ${file.name}...`);
        try {
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 2 });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport, canvas: canvas } as any).promise;
            url = canvas.toDataURL('image/png');
            toast.success("PDF imported successfully", { id: toastId });
          }
        } catch (err) {
          toast.error("Failed to process PDF", { id: toastId });
          throw err;
        }
      } else if (extension === 'psd') {
        const toastId = toast.loading(`Processing PSD: ${file.name}...`);
        try {
          const PSD = (await import('psd.js') as any).default;
          const psd = await PSD.fromURL(URL.createObjectURL(file));
          url = psd.image.toBase64();
          toast.success("PSD imported successfully", { id: toastId });
        } catch (err) {
          toast.error("Failed to process PSD", { id: toastId });
          throw err;
        }
      } else {
        url = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      if (url) {
        if (index === 0 && selectedElement?.type === 'image' && selectedElement.id !== 'draft') {
          onUpdateElement(selectedElement.id, { src: url });
          toast.success("Image replaced");
        } else {
          const newElement: CanvasElement = {
            id: `image-${Date.now()}-${index}`,
            type: 'image',
            src: url,
            x: ((canvasDimensions?.width || 1000) / 2 - 100) + (index * 20),
            y: ((canvasDimensions?.height || 1000) / 2 - 100) + (index * 20),
            width: 200,
            height: 200,
            rotation: 0,
            opacity: 100,
            zIndex: Date.now() + index,
            removeBg: false,
          };
          onAddElement(newElement);
        }
      }
    } catch (err) {
      console.error("Error processing file:", err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file, index) => {
        processFile(file, index);
      });
    }
  };

  const handleUpdate = (updates: Partial<CanvasElement>) => {
    if (selectedElement) {
      onUpdateElement(selectedElement.id, updates);
    }
  };

  const updateFilters = (filterUpdates: Partial<NonNullable<CanvasElement['imageFilters']>>) => {
    if (!selectedElement) return;
    const currentFilters = selectedElement.imageFilters || {
      brightness: 100,
      contrast: 100,
      saturate: 100,
      hueRotate: 0,
      sepia: 0,
      grayscale: 0,
      preset: 'none'
    };
    handleUpdate({
      imageFilters: {
        ...currentFilters,
        ...filterUpdates
      }
    });
  };



  const allImages = [...userImages];

  return (
    <div className="space-y-6 pb-6">

      {/* 2. Selection Specific Settings */}
      {selectedElement?.type === 'image' && (
        <div className="space-y-4">

          {/* 1. Permanent Upload Section */}
          <div className="space-y-6">
            {/* Label Input - Above Upload */}
            <div className="space-y-3 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-indigo-900 tracking-wide">Title</Label>
                <Input
                  value={imageLabel}
                  onChange={(e) => {
                    setImageLabel(e.target.value);
                    if (selectedElement) {
                      handleUpdate({ label: e.target.value });
                    }
                  }}
                  placeholder="Enter label for this image..."
                  className="h-10 rounded-lg bg-white border-indigo-200 focus:border-indigo-400"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-indigo-100/50">
                <div className="flex flex-col">
                  <Label className="text-xs font-bold text-gray-700">Show label</Label>
                  <p className="text-[9px] text-gray-500">Display this label to customers</p>
                </div>
                <Switch
                  checked={showLabel}
                  onCheckedChange={(checked) => {
                    setShowLabel(checked);
                    if (selectedElement) {
                      handleUpdate({ showLabel: checked });
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2 text-wrap pr-4">
                <Upload className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                {selectedElement?.type === 'image' ? 'Update Asset' : 'Upload Asset'}
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newElement: CanvasElement = {
                    id: `image-${Date.now()}`,
                    type: 'image',
                    src: '', // Dummy image has no src
                    x: (canvasDimensions?.width || 1000) / 2 - 100,
                    y: (canvasDimensions?.height || 1000) / 2 - 100,
                    width: 200,
                    height: 200,
                    rotation: 0,
                    opacity: 100,
                    zIndex: Date.now(),
                    label: 'Upload Your Image',
                    showLabel: true,
                    isVisible: true,
                  };
                  onAddElement(newElement);
                }}
                className="h-7 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 gap-1 px-2 border border-indigo-100 flex-shrink-0"
              >
                <Plus className="w-3 h-3" />
                Create
              </Button>
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all font-medium text-gray-400 bg-gray-50/30 group"
            >
              <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2 group-hover:text-indigo-400 group-hover:scale-110 transition-all" />
              <p className="text-sm font-bold text-gray-500 group-hover:text-indigo-600">
                {selectedElement?.type === 'image' ? 'Drop to update or click' : 'Drop files or click to browse'}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, SVG, PDF up to 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.psd"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white hover:bg-indigo-50/30 transition-colors rounded-xl border-2 border-dashed border-indigo-100/50">
              <div className="flex flex-col">
                <Label className="text-xs font-bold text-gray-700">Visible on Public</Label>
                <p className="text-[9px] text-gray-500">Show this image on the public frontend</p>
              </div>
              <Switch
                checked={isVisible}
                onCheckedChange={(checked) => {
                  setIsVisible(checked);
                  if (selectedElement) {
                    handleUpdate({ isVisible: checked });
                  }
                }}
              />
            </div>
          </div>

          <Separator />

          {/* 2. Your Assets Section */}
          {allImages.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2 tracking-tight">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Your Assets
              </Label>

              <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100/50">
                <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto custom-scrollbar p-1">
                  {allImages.filter(img => img.type !== 'gallery').map((img: any) => (
                    <button
                      key={img.id}
                      onClick={() => handleAddFromGallery(img.value.includes('|') ? img.value.split('|')[1].trim() : img.value)}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-white hover:border-indigo-400 transition-all shadow-sm hover:shadow-md"
                    >
                      <img
                        src={getProxiedUrl(img.value.includes('|') ? img.value.split('|')[1].trim() : img.value)}
                        alt={img.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Plus className="w-6 h-6 text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Image Shapes */}
          <Collapsible className="space-y-2">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 w-full rounded-xl bg-orange-50 border border-orange-100 cursor-pointer group">
                <div className="flex items-center gap-3">
                  <Shapes className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-bold text-orange-900">Image Shapes</span>
                </div>
                <ChevronDown className="w-4 h-4 text-orange-400 group-data-[state=open]:rotate-180 transition-transform" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1">
              <div className="space-y-3 p-2 bg-gray-50 rounded-xl border border-gray-100">
                {availableGroups.length > 1 && (
                  <Select value={selectedShapeGroupId} onValueChange={setSelectedShapeGroupId}>
                    <SelectTrigger className="w-full h-8 text-[10px] font-bold border-orange-100">
                      <SelectValue placeholder="Select Group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-[10px] font-bold text-gray-500">All Shapes</SelectItem>
                      {availableGroups.map(g => (
                        <SelectItem key={g.id} value={g.id} className="text-[10px] font-bold">{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleUpdate({ maskShape: undefined, maskViewBox: undefined })}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-[10px] font-bold ${!selectedElement.maskShape
                      ? 'bg-orange-600 border-orange-600 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-orange-400'
                      }`}
                  >
                    <div className="w-8 h-8 mb-1 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 opacity-40" />
                    </div>
                    <span className="truncate w-full text-center">None</span>
                  </button>

                  {filteredShapes.map((shape) => {
                    const maskData = parseMaskFromSvg(shape.svg);
                    return (
                      <button
                        key={shape.id}
                        onClick={() => {
                          if (maskData) {
                            handleUpdate({ maskShape: maskData.path, maskViewBox: maskData.viewBox });
                          }
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-[10px] font-bold ${selectedElement.maskShape === maskData?.path
                          ? 'bg-orange-600 border-orange-600 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-orange-400'
                          }`}
                      >
                        <div className="w-8 h-8 mb-1 flex items-center justify-center">
                          <div
                            className={`w-6 h-6 flex items-center justify-center shape-preview ${selectedElement.maskShape === maskData?.path ? '[&_svg]:fill-white' : '[&_svg]:fill-orange-600'}`}
                            dangerouslySetInnerHTML={{ __html: shape.svg }}
                          />
                        </div>
                        <span className="truncate w-full text-center">{shape.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <style dangerouslySetInnerHTML={{
            __html: `
            .shape-preview svg {
              width: 100%;
              height: 100%;
              fill: currentColor;
            }
          `}} />


          {/* Engraving Effect */}
          <Collapsible className="space-y-2">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 w-full rounded-xl bg-violet-50 border border-violet-100 cursor-pointer group">
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-bold text-violet-900">Laser Print Effect</span>
                </div>
                <ChevronDown className="w-4 h-4 text-violet-400 group-data-[state=open]:rotate-180 transition-transform" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1">
              <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <Label className="text-xs font-bold text-gray-700 tracking-wider">Laser Print Effect</Label>
                    <p className="text-[9px] text-gray-400">Convert image to etched style</p>
                  </div>
                  <Switch
                    checked={!!selectedElement.isEngraved}
                    onCheckedChange={(checked) => {
                      handleUpdate({ isEngraved: checked });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <Label className="text-xs font-bold text-gray-700 tracking-wider">Invert Etching</Label>
                    <p className="text-[9px] text-gray-400">Flip dark/light areas</p>
                  </div>
                  <Switch
                    checked={!!selectedElement.engraveInvert}
                    onCheckedChange={(checked) => handleUpdate({ engraveInvert: checked })}
                  />
                </div>

                {selectedElement.isEngraved && (
                  <>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 mb-2">
                      <p className="text-[10px] text-amber-800 font-medium leading-tight flex items-center gap-2">
                        <Zap className="w-3 h-3" />
                        Tip: If your logo is WHITE, turn ON "Invert Etching" to make it visible.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <Label className="text-[10px] font-bold text-gray-500">Detail Threshold</Label>
                        <span className="text-[10px] font-bold text-violet-600">{selectedElement.engraveThreshold ?? 128}</span>
                      </div>
                      <Slider
                        value={[selectedElement.engraveThreshold ?? 128]}
                        onValueChange={([val]) => handleUpdate({ engraveThreshold: val })}
                        min={0} max={255} step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-gray-500">Simulated Material Color</Label>
                      <div className="flex flex-wrap gap-2">
                        {['#000000', '#4A3728', '#2C1E12', '#5C4033', '#1A1110'].map((color) => (
                          <button
                            key={color}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${selectedElement.engraveColor === color ? 'border-violet-600 scale-110 shadow-md' : 'border-white'}`}
                            style={{ backgroundColor: color }}
                            onClick={() => handleUpdate({ engraveColor: color })}
                          />
                        ))}
                        <div className="relative w-8 h-8 group/color">
                          <Input
                            type="color"
                            value={selectedElement.engraveColor || '#000000'}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdate({ engraveColor: e.target.value })}
                            className="absolute inset-0 w-8 h-8 p-0 border-none rounded-full overflow-hidden cursor-pointer opacity-0 z-10"
                          />
                          <div
                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center bg-gradient-to-tr from-gray-100 to-white"
                            style={{ backgroundColor: selectedElement.engraveColor }}
                          >
                            {!selectedElement.engraveColor && <Plus className="w-3 h-3 text-gray-400" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 text-[9px] font-bold text-gray-400 hover:text-red-500 gap-1.5"
                      onClick={() => handleUpdate({ isEngraved: false, engraveInvert: false, engraveThreshold: 128 })}
                    >
                      <RotateCw className="w-3 h-3" />
                      Reset Engraving
                    </Button>
                  </>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 mt-auto">
            <h4 className="text-sm font-semibold text-purple-900 mb-2 leading-none flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Image Tips
            </h4>
            <ul className="text-[11px] text-purple-700 space-y-1.5">
              <li>• High resolution (300 DPI) recommended</li>
              <li>• PNG supports transparency for best results</li>
              <li>• Keep file sizes under 10MB to ensure stability</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
