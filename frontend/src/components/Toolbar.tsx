import { lazy, Suspense, useState, useEffect } from 'react';
import { Type, Image, Settings2, Plus, AlignLeft, UploadCloud, Palette, ChevronDownSquare, MousePointer2, CheckSquare, Hash, Phone, Calendar, Clock, Images, ChevronLeft, Cpu, Trash2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CanvasElement } from '@/types';

// Lazy load tool components to reduce initial bundle size
const TextTool = lazy(() => import('@/components/TextTool').then(m => ({ default: m.TextTool })));
const ImageTool = lazy(() => import('@/components/ImageTool').then(m => ({ default: m.ImageTool })));
const GalleryTool = lazy(() => import('@/components/GalleryTool').then(m => ({ default: m.GalleryTool })));
const FileUploadTool = lazy(() => import('@/components/FileUploadTool').then(m => ({ default: m.FileUploadTool })));
const SwatchTool = lazy(() => import('@/components/SwatchTool').then(m => ({ default: m.SwatchTool })));
const DropdownTool = lazy(() => import('@/components/DropdownTool').then(m => ({ default: m.DropdownTool })));
const ButtonTool = lazy(() => import('@/components/ButtonTool').then(m => ({ default: m.ButtonTool })));
const CheckboxTool = lazy(() => import('@/components/CheckboxTool').then(m => ({ default: m.CheckboxTool })));
const NumberTool = lazy(() => import('@/components/NumberTool').then(m => ({ default: m.NumberTool })));
const PhoneTool = lazy(() => import('@/components/PhoneTool').then(m => ({ default: m.PhoneTool })));
const DateTool = lazy(() => import('@/components/DateTool').then(m => ({ default: m.DateTool })));
const TimeTool = lazy(() => import('@/components/TimeTool').then(m => ({ default: m.TimeTool })));
const MonogramTool = lazy(() => import('@/components/MonogramTool').then(m => ({ default: m.MonogramTool })));
const LogicTool = lazy(() => import('./LogicTool').then(m => ({ default: m.LogicTool })));

const ToolLoader = () => (
  <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
    <p className="text-sm text-gray-400 font-medium">Loading tool...</p>
  </div>
);

interface ToolbarProps {
  onAddElement: (element: CanvasElement) => void;
  selectedElement?: CanvasElement;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onCrop?: () => void;
  elements: CanvasElement[];
  productData?: any;
  userColors?: any[];
  userOptions?: any[];
  userFonts?: any[];
  userGalleries?: any[];
  activeElementPaletteColors?: { name: string, value: string }[];
  onRefreshAssets?: () => void;
  onSaveAsset?: (asset: any) => Promise<any>;
  onSelectElement?: (id: string) => void;
  onDeleteElement?: (id: string) => void;
  canvasDimensions?: { width: number; height: number };
  customFetch?: any;
  allowedTools?: string[];
  isPublicMode?: boolean;
  shop?: string;
  baseUrl?: string;
}

export function Toolbar({ onAddElement, selectedElement, onUpdateElement, onCrop, elements, productData, userColors, userOptions, userFonts, userGalleries, activeElementPaletteColors, onRefreshAssets, onSaveAsset, onSelectElement, onDeleteElement, canvasDimensions, customFetch, allowedTools, isPublicMode, shop }: ToolbarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [activeAddingType, setActiveAddingType] = useState<string | null>(null);
  const [draftElement, setDraftElement] = useState<CanvasElement | null>(null);

  useEffect(() => {
    if (selectedElement && (activeAddingType || showPicker)) {
      setActiveAddingType(null);
      setDraftElement(null);
      setShowPicker(false);
    }
  }, [selectedElement, activeAddingType, showPicker]);

  const allOptionTypes = [
    { id: 'text', label: 'Text', icon: Type, color: 'bg-blue-500', desc: 'Custom text' },
    { id: 'monogram', label: 'Monogram', icon: Type, color: 'bg-indigo-600', desc: 'Custom monograms' },
    { id: 'image', label: 'Image', icon: Image, color: 'bg-purple-500', desc: 'Upload photo' },
    { id: 'gallery', label: 'Gallery', icon: Images, color: 'bg-pink-500', desc: 'Image library' },
    { id: 'textarea', label: 'Text Area', icon: AlignLeft, color: 'bg-indigo-500', desc: 'Notes/Lyrics' },
    { id: 'file_upload', label: 'File Upload', icon: UploadCloud, color: 'bg-emerald-500', desc: 'Zip, PDF, etc.' },
    { id: 'swatch', label: 'Swatch', icon: Palette, color: 'bg-orange-500', desc: 'Material options' },
    { id: 'dropdown', label: 'Drop Down', icon: ChevronDownSquare, color: 'bg-cyan-500', desc: 'Selection list' },
    { id: 'button', label: 'Button', icon: MousePointer2, color: 'bg-rose-500', desc: 'Preset actions' },
    { id: 'checkbox', label: 'Check Box', icon: CheckSquare, color: 'bg-amber-500', desc: 'Yes/No options' },
    { id: 'number', label: 'Number', icon: Hash, color: 'bg-teal-500', desc: 'Quantity/Size' },
    { id: 'phone', label: 'Phone Number', icon: Phone, color: 'bg-sky-500', desc: 'Contact info' },
    { id: 'date', label: 'Date Picker', icon: Calendar, color: 'bg-violet-500', desc: 'Delivery date' },
    { id: 'time', label: 'Time Picker', icon: Clock, color: 'bg-fuchsia-500', desc: 'Booking time' },
  ];

  const optionTypes = allowedTools
    ? allOptionTypes.filter(opt => allowedTools.includes(opt.id))
    : allOptionTypes;

  const handleAddOption = (type: any) => {
    setActiveAddingType(type);
    setDraftElement({
      id: 'draft',
      type: type as any,
      opacity: 100,
      x: (canvasDimensions?.width || 1000) / 2 - 100,
      y: (canvasDimensions?.height || 1000) / 2 - 100,
      width: type === 'monogram' ? 300 : 200,
      height: type === 'monogram' ? 300 : (type === 'text' ? 60 : 200),
      rotation: 0,
      zIndex: 9999,
      isVisible: true,
      text: type === 'text' ? 'New Text' : (type === 'monogram' ? 'ABC' : ''),
      fontSize: type === 'monogram' ? 100 : 32,
      fontFamily: type === 'monogram' ? undefined : 'Inter',
      monogramType: type === 'monogram' ? 'Vine' : undefined,
      color: '#000000',
      textAlign: type === 'textarea' ? 'left' : 'center',
      label: ['text', 'image', 'textarea', 'monogram', 'gallery'].includes(type) ? '' : (allOptionTypes.find(opt => opt.id === type)?.label || type.charAt(0).toUpperCase() + type.slice(1)),
      placeholder: '',
      isEditableByCustomer: true,
      showLabel: true
    } as any);
    setShowPicker(false);
  };

  const effectiveSelected = selectedElement || draftElement;
  const effectiveUpdateElement = (id: string, updates: Partial<CanvasElement>) => {
    if (id === 'draft') {
      setDraftElement(prev => prev ? { ...prev, ...updates } : null);
    } else {
      onUpdateElement(id, updates);
    }
  };

  const handleOnAddElement = (element: CanvasElement) => {
    onAddElement(element);
    setActiveAddingType(null);
    setDraftElement(null);
  };

  return (
    <div className="w-full h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">

        {!effectiveSelected && !showPicker && (
          <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500 h-full">
            {(elements || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-6">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center animate-bounce">
                  <Plus className="w-10 h-10 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Start Customizing</h3>
                  <p className="text-sm text-gray-500 mt-2 px-6">Add interactive options and visual elements to your product</p>
                </div>
                <Button
                  onClick={() => setShowPicker(true)}
                  className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 font-bold text-lg border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 transition-all"
                >
                  <Plus className="w-6 h-6" />
                  Add Your Option
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    {isPublicMode ? "Your Customization" : "Active Options"}
                  </h3>
                  <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-xs font-bold">{(elements || []).length}</span>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                  {(elements || []).map((element) => (
                    <button
                      key={element.id}
                      onClick={() => onSelectElement?.(element.id)}
                      className={`group flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${(selectedElement as any)?.id === element.id
                        ? 'border-indigo-500 bg-indigo-50/30'
                        : 'border-gray-50 bg-white hover:border-gray-200'}`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm ${element.type === 'text' ? 'bg-blue-500' :
                        element.type === 'image' ? 'bg-purple-500' :
                          element.type === 'swatch' ? 'bg-orange-500' :
                            element.type === 'monogram' ? 'bg-indigo-600' :
                              'bg-gray-400'
                        }`}>
                        {element.type === 'text' ? <Type className="w-5 h-5" /> :
                          element.type === 'image' ? <Image className="w-5 h-5" /> :
                            element.type === 'swatch' ? <Palette className="w-5 h-5" /> :
                              element.type === 'monogram' ? <Type className="w-5 h-5" /> :
                                <Settings2 className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 flex items-center justify-between gap-2">
                          {element.label || (element.type.charAt(0).toUpperCase() + element.type.slice(1))}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); onDeleteElement?.(element.id); }}
                            className="h-8 w-8 rounded-lg hover:bg-red-50 group/del shrink-0"
                          >
                            <Trash2 className="w-4 h-4 text-gray-400 group-hover/del:text-red-500 transition-colors" />
                          </Button>
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {element.type === 'text' || element.type === 'field' || element.type === 'textarea' ? (element.text || 'No content') : 'Custom element'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-100 mt-2">
                  <Button
                    onClick={() => setShowPicker(true)}
                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 font-black text-base transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Add More Tools
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {showPicker && (
          <div className="flex flex-col gap-6 animate-in slide-in-from-left duration-300">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPicker(false)}
                className="rounded-full hover:bg-gray-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h3 className="text-xl font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Choose Option Type
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {optionTypes.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleAddOption(opt.id)}
                  className="group p-4 bg-white border-2 border-gray-50 rounded-2xl flex flex-col items-center gap-3 transition-all hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50/50 hover:-translate-y-1 text-center"
                >
                  <div className={`w-12 h-12 ${opt.color} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <opt.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 leading-tight">{opt.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {effectiveSelected && !showPicker && (
          <div className="flex flex-col gap-6 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setActiveAddingType(null);
                    setDraftElement(null);
                    if (onSelectElement) onSelectElement('');
                  }}
                  className="h-8 w-8 rounded-full hover:bg-gray-100 -ml-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-medium text-gray-900">{activeAddingType ? `Add ${activeAddingType}` : 'Element Settings'}</h3>
                </div>
              </div>
              {!activeAddingType && (
                <Button
                  onClick={() => setShowPicker(true)}
                  size="sm"
                  className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg px-3 font-bold border-0 shadow-none"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add More
                </Button>
              )}
            </div>

            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-50 p-1 rounded-xl">
                <TabsTrigger value="general" className="text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                  <Settings2 className="w-3.5 h-3.5" />
                  General
                </TabsTrigger>
                <TabsTrigger value="logic" className="text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                  <Cpu className="w-3.5 h-3.5" />
                  Logic
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-0 space-y-6">
                <Card className="border-0 shadow-none bg-transparent">
                  <Suspense fallback={<ToolLoader />}>
                    {['text', 'textarea'].includes(effectiveSelected.type) && (
                      <TextTool
                        onAddElement={handleOnAddElement}
                        selectedElement={effectiveSelected}
                        onUpdateElement={effectiveUpdateElement}
                        canvasDimensions={canvasDimensions}
                        userFonts={userFonts}
                        userColors={userColors}
                        isPublicMode={isPublicMode}
                      />
                    )}
                    {effectiveSelected.type === 'monogram' && (
                      <MonogramTool
                        onAddElement={handleOnAddElement}
                        selectedElement={effectiveSelected}
                        onUpdateElement={effectiveUpdateElement}
                        canvasDimensions={canvasDimensions}
                        userFonts={userFonts}
                        userColors={userColors}
                      />
                    )}
                    {effectiveSelected.type === 'image' && (
                      <ImageTool
                        onAddElement={handleOnAddElement}
                        selectedElement={effectiveSelected}
                        onUpdateElement={effectiveUpdateElement}
                        onCrop={onCrop}
                        canvasDimensions={canvasDimensions}
                        customFetch={customFetch}
                        isPublicMode={isPublicMode}
                        shop={shop}
                      />
                    )}
                    {effectiveSelected.type === 'gallery' && (
                      <GalleryTool
                        onAddElement={handleOnAddElement}
                        selectedElement={effectiveSelected}
                        onUpdateElement={effectiveUpdateElement}
                        userGalleries={userGalleries}
                        customFetch={customFetch}
                        isPublicMode={isPublicMode}
                      />
                    )}
                    {effectiveSelected.type === 'file_upload' && (
                      <FileUploadTool
                        onAddElement={handleOnAddElement}
                        selectedElement={effectiveSelected}
                        onUpdateElement={effectiveUpdateElement}
                        isPublicMode={isPublicMode}
                      />
                    )}
                    {effectiveSelected.type === 'swatch' && (
                      <SwatchTool
                        selectedElement={effectiveSelected}
                        onUpdateElement={effectiveUpdateElement}
                        productData={productData}
                        userOptions={userOptions}
                        userFonts={userFonts}
                        activeElementPaletteColors={activeElementPaletteColors}
                        onRefreshAssets={onRefreshAssets}
                        onSaveAsset={onSaveAsset}
                        isPublicMode={isPublicMode}
                      />
                    )}
                    {effectiveSelected.type === 'dropdown' && (
                      <DropdownTool
                        selectedElement={effectiveSelected}
                        onUpdateElement={effectiveUpdateElement}
                        productData={productData}
                        userOptions={userOptions}
                        userFonts={userFonts}
                      />
                    )}
                    {effectiveSelected.type === 'button' && (
                      <ButtonTool
                        selectedElement={effectiveSelected}
                        onUpdateElement={effectiveUpdateElement}
                        userOptions={userOptions}
                        userFonts={userFonts}
                      />
                    )}
                    {effectiveSelected.type === 'checkbox' && (
                      <CheckboxTool
                        selectedElement={effectiveSelected}
                        onUpdateElement={effectiveUpdateElement}
                        userOptions={userOptions}
                        userFonts={userFonts}
                      />
                    )}
                    {effectiveSelected.type === 'number' && (
                      <NumberTool
                        onAddElement={handleOnAddElement}
                        selectedElement={effectiveSelected}
                        onUpdateElement={effectiveUpdateElement}
                        userFonts={userFonts}
                        userColors={userColors}
                      />
                    )}
                    {effectiveSelected.type === 'phone' && (
                      <PhoneTool
                        onAddElement={handleOnAddElement}
                        selectedElement={effectiveSelected}
                        onUpdateElement={effectiveUpdateElement}
                        userFonts={userFonts}
                        userColors={userColors}
                      />
                    )}
                    {effectiveSelected.type === 'date' && (
                      <DateTool
                        onAddElement={handleOnAddElement}
                        selectedElement={effectiveSelected}
                        onUpdateElement={effectiveUpdateElement}
                        userFonts={userFonts}
                        userColors={userColors}
                      />
                    )}
                    {effectiveSelected.type === 'time' && (
                      <TimeTool
                        onAddElement={handleOnAddElement}
                        selectedElement={effectiveSelected}
                        onUpdateElement={effectiveUpdateElement}
                        userFonts={userFonts}
                        userColors={userColors}
                      />
                    )}
                    {!['text', 'image', 'gallery', 'textarea', 'file_upload', 'swatch', 'dropdown', 'button', 'checkbox', 'number', 'phone', 'date', 'time', 'monogram'].includes(effectiveSelected.type) && (
                      <div className="py-20 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Settings2 className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400 italic">Settings for {effectiveSelected.type} coming soon</p>
                      </div>
                    )}
                  </Suspense>
                </Card>
              </TabsContent>

              <TabsContent value="logic" className="mt-0">
                <Suspense fallback={<ToolLoader />}>
                  {effectiveSelected && !activeAddingType && (
                    <LogicTool
                      selectedElement={effectiveSelected}
                      onUpdateElement={effectiveUpdateElement}
                      productData={productData}
                    />
                  )}
                </Suspense>
                {activeAddingType && (
                  <div className="py-10 text-center text-gray-400">
                    <p className="text-sm italic">Add the element first to configure logic</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
      <div className="p-4 mt-auto">
        <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100/50">
          <div className="flex items-center gap-2 mb-2">
            <Settings2 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-indigo-900">Designer Tips</h3>
          </div>
          <ul className="text-[11px] text-indigo-700/70 space-y-1 font-medium">
            <li>• Click elements on canvas to edit</li>
            <li>• Everything is auto-saved to cloud</li>
            <li>• Use drag handles to resize precisely</li>
          </ul>
        </div>
      </div>
    </div >
  );
}
