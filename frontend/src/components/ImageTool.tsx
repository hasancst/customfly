import { useState, useRef, useEffect } from 'react';
import { Plus, Upload, RotateCw, Image as ImageIcon, Sparkles, Wand2, Sliders, ChevronDown } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { CanvasElement } from '@/types';
import { toast } from 'sonner';

interface ImageToolProps {
  onAddElement: (element: CanvasElement) => void;
  selectedElement?: CanvasElement;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
}

export function ImageTool({ onAddElement, selectedElement, onUpdateElement }: ImageToolProps) {
  const [removeBgType, setRemoveBgType] = useState<'js' | 'rembg'>(selectedElement?.removeBgType || 'js');
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [userImages, setUserImages] = useState<any[]>([]);
  const fetch = useAuthenticatedFetch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchImages() {
      try {
        const response = await fetch('/imcst_api/assets?type=image');
        if (response.ok) setUserImages(await response.json());
      } catch (err) {
        console.error("Failed to fetch image gallery:", err);
      }
    }
    fetchImages();
  }, [fetch]);

  const handleAddFromGallery = (url: string) => {
    const newElement: CanvasElement = {
      id: `image-${Date.now()}`,
      type: 'image',
      src: url,
      x: 200,
      y: 150,
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
        const newElement: CanvasElement = {
          id: `image-${Date.now()}-${index}`,
          type: 'image',
          src: url,
          x: 200 + (index * 20),
          y: 150 + (index * 20),
          width: 200,
          height: 200,
          rotation: 0,
          opacity: 100,
          zIndex: Date.now() + index,
          removeBg: false,
        };
        onAddElement(newElement);
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
      const resp = await fetch('/imcst_api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: selectedElement.src })
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

  return (
    <div className="space-y-6 pb-6">
      {!selectedElement && (
        <>
          {userImages.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Asset Gallery
              </Label>
              <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100 max-h-48 overflow-y-auto">
                {userImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => handleAddFromGallery(img.value)}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-500 transition-colors bg-white shadow-sm"
                  >
                    <img src={img.value} alt={img.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                      <Plus className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2">Upload Image</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all font-medium text-gray-500"
            >
              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-sm">Click to upload assets</p>
              <p className="text-xs text-gray-400 mt-1">Supports PNG, JPG, SVG, PDF, PSD</p>
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
        </>
      )}

      {selectedElement?.type === 'image' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1 mb-2">
            <Label className="text-sm font-bold text-gray-900 uppercase tracking-tight">Active Image</Label>
            <div className="h-20 w-fit aspect-video bg-gray-100 rounded-lg border border-gray-200 overflow-hidden relative group">
              <img src={selectedElement.src} className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button variant="ghost" size="sm" className="text-white hover:text-white" onClick={() => fileInputRef.current?.click()}>Replace</Button>
              </div>
            </div>
          </div>

          {/* Filters Presets */}
          <Collapsible className="space-y-2" defaultOpen>
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
                    <Label className="text-[10px] font-bold text-gray-500 uppercase">Brightness</Label>
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
                    <Label className="text-[10px] font-bold text-gray-500 uppercase">Contrast</Label>
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
                    <Label className="text-[10px] font-bold text-gray-500 uppercase">Saturation</Label>
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
                    <Label className="text-[10px] font-bold text-gray-500 uppercase">Hue Rotate</Label>
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
                  Reset Settings
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Background Removal */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <Label className="text-sm font-bold text-gray-700">Background Removal</Label>
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
                <TabsTrigger value="rembg" className="text-[10px] py-1">AI Scan</TabsTrigger>
              </TabsList>

              <TabsContent value="js" className="space-y-4 mt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-gray-700">Enable Filter</Label>
                  <Switch
                    checked={selectedElement.removeBg && selectedElement.removeBgType === 'js'}
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
                        <SelectContent shadow-none className="z-[10000]">
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
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isRemovingBg ? "Processing..." : "Remove Background Now"}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

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
  );
}
