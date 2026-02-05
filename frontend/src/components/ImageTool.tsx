import { useState, useRef, useEffect } from 'react';
import { Plus, Upload, RotateCw, Image as ImageIcon, Wand2, Sliders, ChevronDown, Crop, Shapes, Zap } from 'lucide-react';
import { IMAGE_PRESETS } from '../constants/filters';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CanvasElement } from '@/types';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ImageToolProps {
  onAddElement: (element: CanvasElement) => void;
  selectedElement?: CanvasElement;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onCrop?: () => void;
  canvasDimensions?: { width: number; height: number };
  userImages?: any[];
  customFetch?: any;
  isPublicMode?: boolean;
  shop?: string;
}

export function ImageTool({ onAddElement, selectedElement, onUpdateElement, onCrop, canvasDimensions, userImages: propUserImages, customFetch, isPublicMode, shop }: ImageToolProps) {
  const [removeBgType, setRemoveBgType] = useState<'js' | 'rembg'>(selectedElement?.removeBgType || 'js');
  const [isRemovingBg, setIsRemovingBg] = useState(false);
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

  const handleRemoveBg = async () => {
    if (!selectedElement) return;

    setIsRemovingBg(true);
    const toastId = toast.loading("AI is removing background...");

    try {
      let imageData = selectedElement.src || '';
      if (imageData.startsWith('blob:')) {
        const response = await fetch(imageData);
        const blob = await response.blob();
        imageData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      const resp = await fetch('/imcst_api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || "Failed to remove background");
      }

      const data = await resp.json();
      handleUpdate({ src: data.image, removeBg: false });
      toast.success("Background removed successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error removing background", { id: toastId });
    } finally {
      setIsRemovingBg(false);
    }
  };

  const allImages = [...userImages];

  return (
    <div className="space-y-6 pb-6">
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

          <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-indigo-100/50">
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

        <div>
          <Label className="text-sm font-bold text-gray-900 mb-3 tracking-tight flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-600" />
            Upload Asset
          </Label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all font-medium text-gray-400 bg-gray-50/30 group"
          >
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2 group-hover:text-indigo-400 group-hover:scale-110 transition-all" />
            <p className="text-sm font-bold text-gray-500 group-hover:text-indigo-600">Drop files or click to browse</p>
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
                  onClick={() => handleAddFromGallery(img.value)}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-white hover:border-indigo-400 transition-all shadow-sm hover:shadow-md"
                >
                  <img
                    src={img.value}
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

      {/* 2. Selection Specific Settings */}
      {selectedElement?.type === 'image' && (
        <div className="space-y-4">

          <div className="flex items-center justify-between pb-2">
            <Label className="text-xs font-bold text-gray-900 mb-3 tracking-tight">Image Style</Label>
            <div className="flex gap-2">
              {selectedElement.crop && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] text-red-500 hover:bg-red-50 gap-1 px-2 border border-red-100/50"
                  onClick={() => handleUpdate({ crop: undefined, width: 200, height: 200 })}
                >
                  <RotateCw className="w-3 h-3" />
                  Reset Crop
                </Button>
              )}
            </div>
          </div>

          {/* Smooth Resize Controls */}
          <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <Label className="text-[10px] font-bold text-gray-500 tracking-wider">Maintain Aspect Ratio</Label>
                <p className="text-[9px] text-gray-400">Turn off to stretch or squash the image freely</p>
              </div>
              <Switch
                checked={selectedElement.lockAspectRatio !== false}
                onCheckedChange={(checked) => handleUpdate({ lockAspectRatio: checked })}
                className="scale-75"
              />
            </div>

            <Separator className="bg-indigo-100/50" />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold text-gray-500">Width (W)</Label>
                  <span className="text-[9px] font-bold text-indigo-400">PX</span>
                </div>
                <Input
                  type="number"
                  value={Math.round(selectedElement.width || 200)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      if (selectedElement.lockAspectRatio !== false) {
                        const ratio = (selectedElement.height || 200) / (selectedElement.width || 200);
                        handleUpdate({ width: val, height: val * ratio });
                      } else {
                        handleUpdate({ width: val });
                      }
                    }
                  }}
                  className="h-8 text-[10px] font-bold text-center bg-white border-indigo-100"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold text-gray-500">Height (H)</Label>
                  <span className="text-[9px] font-bold text-indigo-400">PX</span>
                </div>
                <Input
                  type="number"
                  value={Math.round(selectedElement.height || 200)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      if (selectedElement.lockAspectRatio !== false) {
                        const ratio = (selectedElement.width || 200) / (selectedElement.height || 200);
                        handleUpdate({ height: val, width: val * ratio });
                      } else {
                        handleUpdate({ height: val });
                      }
                    }
                  }}
                  className="h-8 text-[10px] font-bold text-center bg-white border-indigo-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-[10px] font-bold text-gray-500">Quick Resize</Label>
                <span className="text-[9px] font-bold text-indigo-500">{Math.round(selectedElement.width || 0)}px</span>
              </div>
              <Slider
                value={[selectedElement.width || 200]}
                onValueChange={([val]) => {
                  if (selectedElement.lockAspectRatio !== false) {
                    const ratio = (selectedElement.height || 200) / (selectedElement.width || 200);
                    handleUpdate({ width: val, height: val * ratio });
                  } else {
                    handleUpdate({ width: val });
                  }
                }}
                min={10}
                max={1200}
                step={1}
              />
            </div>

            <Separator className="bg-indigo-100/50" />

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-[10px] font-bold text-gray-500">Opacity</Label>
                  <span className="text-[9px] font-bold text-indigo-500">{selectedElement.opacity || 100}%</span>
                </div>
                <Slider
                  value={[selectedElement.opacity || 100]}
                  onValueChange={([val]) => handleUpdate({ opacity: val })}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-[10px] font-bold text-gray-500">Rotation</Label>
                  <span className="text-[9px] font-bold text-indigo-500">{selectedElement.rotation || 0}°</span>
                </div>
                <Slider
                  value={[selectedElement.rotation || 0]}
                  onValueChange={([val]) => handleUpdate({ rotation: val })}
                  min={-180}
                  max={180}
                  step={1}
                />
              </div>
            </div>

            {onCrop && (
              <Button
                onClick={(e) => { e.stopPropagation(); onCrop(); }}
                className="w-full h-9 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-bold gap-2 mt-2"
              >
                <Crop className="w-4 h-4" />
                Crop Image
              </Button>
            )}
          </div>


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

          {/* Filters Presets */}
          <Collapsible className="space-y-2">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 w-full rounded-xl bg-indigo-50 border border-indigo-100 cursor-pointer group">
                <div className="flex items-center gap-3">
                  <Wand2 className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-bold text-indigo-900">Artistic Filters</span>
                </div>
                <ChevronDown className="w-4 h-4 text-indigo-400 group-data-[state=open]:rotate-180 transition-transform" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1">
              <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                {IMAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => updateFilters({ preset: preset.id })}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-[10px] font-bold ${(selectedElement.imageFilters?.preset || 'none') === preset.id
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-400'
                      }`}
                  >
                    <div
                      className="w-8 h-8 rounded-sm mb-1 border border-black/10 overflow-hidden"
                      style={{
                        background: 'linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%), linear-gradient(45deg, #eee 25%, white 25%, white 75%, #eee 75%)',
                        backgroundSize: '10px 10px',
                        backgroundPosition: '0 0, 5px 5px'
                      }}
                    >
                      <div
                        className="w-full h-full bg-indigo-400"
                        style={{ filter: preset.filter }}
                      />
                    </div>
                    {preset.name}
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Manual Adjustments */}
          <Collapsible className="space-y-2">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 w-full rounded-xl bg-emerald-50 border border-emerald-100 cursor-pointer group">
                <div className="flex items-center gap-3">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-900">Adjustments</span>
                </div>
                <ChevronDown className="w-4 h-4 text-emerald-400 group-data-[state=open]:rotate-180 transition-transform" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1">
              <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-[10px] font-bold text-gray-500">Brightness</Label>
                    <span className="text-[10px] font-bold text-emerald-600">{selectedElement.imageFilters?.brightness ?? 100}%</span>
                  </div>
                  <Slider
                    value={[selectedElement.imageFilters?.brightness ?? 100]}
                    onValueChange={([val]) => updateFilters({ brightness: val })}
                    min={0} max={200} step={1}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-[10px] font-bold text-gray-500">Contrast</Label>
                    <span className="text-[10px] font-bold text-emerald-600">{selectedElement.imageFilters?.contrast ?? 100}%</span>
                  </div>
                  <Slider
                    value={[selectedElement.imageFilters?.contrast ?? 100]}
                    onValueChange={([val]) => updateFilters({ contrast: val })}
                    min={0} max={200} step={1}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-[10px] font-bold text-gray-500">Saturation</Label>
                    <span className="text-[10px] font-bold text-emerald-600">{selectedElement.imageFilters?.saturate ?? 100}%</span>
                  </div>
                  <Slider
                    value={[selectedElement.imageFilters?.saturate ?? 100]}
                    onValueChange={([val]) => updateFilters({ saturate: val })}
                    min={0} max={200} step={1}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-[10px] font-bold text-gray-500">Hue Rotate</Label>
                    <span className="text-[10px] font-bold text-emerald-600">{selectedElement.imageFilters?.hueRotate ?? 0}°</span>
                  </div>
                  <Slider
                    value={[selectedElement.imageFilters?.hueRotate ?? 0]}
                    onValueChange={([val]) => updateFilters({ hueRotate: val })}
                    min={0} max={360} step={1}
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-[10px] font-bold text-red-500 border-red-100 hover:bg-red-50"
                  onClick={() => updateFilters({
                    brightness: 100, contrast: 100, saturate: 100, hueRotate: 0, sepia: 0, grayscale: 0, preset: 'none'
                  })}
                >
                  Reset Adjustments
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Engraving Effect */}
          <Collapsible className="space-y-2">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 w-full rounded-xl bg-violet-50 border border-violet-100 cursor-pointer group">
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-bold text-violet-900">Engraving Effect</span>
                </div>
                <ChevronDown className="w-4 h-4 text-violet-400 group-data-[state=open]:rotate-180 transition-transform" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1">
              <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <Label className="text-xs font-bold text-gray-700 tracking-wider">Enable Engraving</Label>
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

          {/* Background Removal */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <Label className="text-sm font-bold text-gray-700 tracking-tight">Background Removal</Label>
                <p className="text-[10px] text-gray-500">Apply magic filters or AI</p>
              </div>
            </div>

            <Tabs
              value={selectedElement.removeBgType || removeBgType}
              onValueChange={(val: any) => {
                setRemoveBgType(val);
                handleUpdate({ removeBgType: val });
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 h-8 p-1 bg-white border border-gray-100 rounded-lg">
                <TabsTrigger value="js" className="text-[10px] py-1">Live Filter</TabsTrigger>
                <TabsTrigger value="rembg" className="text-[10px] py-1">AI Rem</TabsTrigger>
              </TabsList>

              <TabsContent value="js" className="space-y-4 mt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-gray-700">Enable Filter</Label>
                  <Switch
                    checked={!!(selectedElement.removeBg && selectedElement.removeBgType === 'js')}
                    onCheckedChange={(checked: boolean) => {
                      handleUpdate({ removeBg: checked, removeBgType: 'js' });
                    }}
                    className="scale-75"
                  />
                </div>

                {selectedElement.removeBg && selectedElement.removeBgType === 'js' && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <Label className="text-[10px] font-bold text-gray-700">Sensitivity</Label>
                        <span className="text-[10px] text-indigo-500">{selectedElement.removeBgDeep || 0}</span>
                      </div>
                      <Slider
                        value={[selectedElement.removeBgDeep || 0]}
                        onValueChange={([val]) => handleUpdate({ removeBgDeep: val })}
                        min={0}
                        max={200}
                        step={1}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-gray-700 mb-1.5 block">Target Color</Label>
                      <Select
                        value={selectedElement.removeBgMode || 'light'}
                        onValueChange={(val: any) => handleUpdate({ removeBgMode: val })}
                      >
                        <SelectTrigger className="h-8 text-[10px] bg-white border-gray-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          <SelectItem value="light">Remove Whites/Light</SelectItem>
                          <SelectItem value="dark">Remove Blacks/Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rembg" className="mt-3">
                <Button
                  onClick={handleRemoveBg}
                  disabled={isRemovingBg}
                  className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2 shadow-md"
                >
                  {isRemovingBg ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isRemovingBg ? "Processing..." : "Remove Background Now"}
                </Button>
              </TabsContent>
            </Tabs>
          </div>

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
