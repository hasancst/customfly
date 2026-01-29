import { useState } from 'react';
import { Type, Image, Settings2, Plus, AlignLeft, UploadCloud, Palette, ChevronDownSquare, MousePointer2, CheckSquare, Hash, Phone, Calendar, Clock, Images, ChevronLeft, Cpu, Shapes, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextTool } from '@/components/TextTool';
import { ImageTool } from '@/components/ImageTool';
import { GalleryTool } from '@/components/GalleryTool';
import { FileUploadTool } from '@/components/FileUploadTool';
import { SwatchTool } from '@/components/SwatchTool';
import { DropdownTool } from '@/components/DropdownTool';
import { ButtonTool } from '@/components/ButtonTool';
import { CheckboxTool } from '@/components/CheckboxTool';
import { NumberTool } from '@/components/NumberTool';
import { PhoneTool } from '@/components/PhoneTool';
import { DateTool } from '@/components/DateTool';
import { TimeTool } from '@/components/TimeTool';
import { ShapeTool } from '@/components/ShapeTool';
import { LogicTool } from './LogicTool';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CanvasElement } from '@/types';

interface ToolbarProps {
  onAddElement: (element: CanvasElement) => void;
  selectedElement?: CanvasElement;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onCrop?: () => void;
  elements: CanvasElement[];
  productData?: any;
  userColors?: any[];
  userOptions?: any[];
  onRefreshAssets?: () => void;
  onSaveAsset?: (asset: any) => Promise<any>;
  onSelectElement?: (id: string) => void;
  onDeleteElement?: (id: string) => void;
  canvasDimensions?: { width: number; height: number };
}

export function Toolbar({ onAddElement, selectedElement, onUpdateElement, onCrop, elements, productData, userColors, userOptions, onRefreshAssets, onSaveAsset, onSelectElement, onDeleteElement, canvasDimensions }: ToolbarProps) {
  const [showPicker, setShowPicker] = useState(false);

  const optionTypes = [
    { id: 'text', label: 'Text', icon: Type, color: 'bg-blue-500', desc: 'Custom text' },
    { id: 'image', label: 'Image', icon: Image, color: 'bg-purple-500', desc: 'Upload photo' },
    { id: 'gallery', label: 'Gallery', icon: Images, color: 'bg-pink-500', desc: 'Image library' },
    { id: 'textarea', label: 'Text Area', icon: AlignLeft, color: 'bg-indigo-500', desc: 'Notes/Lyrics' },
    { id: 'file_upload', label: 'File Upload', icon: UploadCloud, color: 'bg-emerald-500', desc: 'Zip, PDF, etc.' },
    { id: 'product_color', label: 'Swatch', icon: Palette, color: 'bg-orange-500', desc: 'Material options' },
    { id: 'dropdown', label: 'Drop Down', icon: ChevronDownSquare, color: 'bg-cyan-500', desc: 'Selection list' },
    { id: 'button', label: 'Button', icon: MousePointer2, color: 'bg-rose-500', desc: 'Preset actions' },
    { id: 'checkbox', label: 'Check Box', icon: CheckSquare, color: 'bg-amber-500', desc: 'Yes/No options' },
    { id: 'number', label: 'Number', icon: Hash, color: 'bg-teal-500', desc: 'Quantity/Size' },
    { id: 'phone', label: 'Phone Number', icon: Phone, color: 'bg-sky-500', desc: 'Contact info' },
    { id: 'date', label: 'Date Picker', icon: Calendar, color: 'bg-violet-500', desc: 'Delivery date' },
    { id: 'time', label: 'Time Picker', icon: Clock, color: 'bg-fuchsia-500', desc: 'Booking time' },
    { id: 'shape', label: 'Shape', icon: Shapes, color: 'bg-blue-500', desc: 'Custom shapes' },
  ];

  const handleAddOption = (type: any) => {
    const canvasW = canvasDimensions?.width || 1000;
    const canvasH = canvasDimensions?.height || 1000;

    const commonProps = {
      x: 100, y: 100, rotation: 0, opacity: 1, zIndex: 10
    };

    if (type === 'text') {
      onAddElement({
        ...commonProps,
        id: `text-placeholder-${Date.now()}`,
        type: 'text',
        text: 'New Text',
        fontSize: 24,
        color: '#000000',
        fontFamily: 'Inter',
        width: 300,
        height: 100,
        x: -1000,
        y: -1000,
        opacity: 0 // Invisible
      });
    } else if (type === 'image') {
      const svgString = `
        <svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#f1f5f9;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="400" height="400" rx="32" fill="url(#grad)" />
          <rect x="15" y="15" width="370" height="370" rx="24" fill="none" stroke="#6366f1" stroke-width="3" stroke-dasharray="12 12" opacity="0.2" />
          <g transform="translate(140, 100)">
            <circle cx="60" cy="60" r="50" fill="white" />
            <path d="M60 40V80M40 60H80" stroke="#6366f1" stroke-width="6" stroke-linecap="round" />
          </g>
          <text x="200" y="260" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="24" fill="#1e293b">UPLOAD YOUR IMAGE</text>
          <text x="200" y="300" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="14" fill="#64748b">TRANSPARENT PNG - JPG - SVG</text>
        </svg>
      `;
      const placeholderSvg = `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
      onAddElement({
        ...commonProps,
        id: `img-${Date.now()}`,
        type: 'image',
        src: placeholderSvg,
        x: (canvasW / 2) - 150,
        y: (canvasH / 2) - 150,
        width: 300,
        height: 300,
        opacity: 100
      });
    } else if (type === 'textarea') {
      onAddElement({
        ...commonProps,
        id: `textarea-placeholder-${Date.now()}`,
        type: 'textarea',
        text: 'Enter notes here...',
        fontSize: 16,
        color: '#000000',
        fontFamily: 'Inter',
        fontWeight: 400,
        textAlign: 'left',
        textMode: 'wrap',
        label: 'Text Area',
        x: -1000,
        y: -1000,
        opacity: 0
      });
    } else if (type === 'number') {
      // Create a temporary placeholder element to show NumberTool
      // This won't be visible on canvas (opacity: 0) until user clicks Add Number
      onAddElement({
        ...commonProps,
        id: `number-placeholder-${Date.now()}`,
        type: 'number',
        x: -1000, // Off-canvas
        y: -1000,
        width: 180,
        height: 60,
        label: '',
        defaultValue: 0,
        text: '0',
        fontSize: 32,
        fontFamily: 'Inter',
        color: '#000000',
        textAlign: 'center',
        opacity: 0 // Invisible
      });
    } else if (type === 'phone') {
      // Create a temporary placeholder element for phone
      onAddElement({
        ...commonProps,
        id: `phone-placeholder-${Date.now()}`,
        type: 'phone',
        x: -1000,
        y: -1000,
        width: 300,
        height: 60,
        label: '',
        text: '+62 812-3456-7890',
        fontSize: 32,
        fontFamily: 'Inter',
        color: '#000000',
        textAlign: 'center',
        opacity: 0
      });
    } else if (type === 'date') {
      onAddElement({
        ...commonProps,
        id: `date-placeholder-${Date.now()}`,
        type: 'date',
        x: -1000,
        y: -1000,
        width: 300,
        height: 60,
        label: '',
        text: '31/12/2025',
        fontSize: 32,
        fontFamily: 'Inter',
        color: '#000000',
        textAlign: 'center',
        opacity: 0
      });
    } else if (type === 'time') {
      onAddElement({
        ...commonProps,
        id: `time-placeholder-${Date.now()}`,
        type: 'time',
        x: -1000,
        y: -1000,
        width: 300,
        height: 60,
        label: '',
        text: '12:00',
        defaultValue: '12:00',
        fontSize: 32,
        fontFamily: 'Inter',
        color: '#000000',
        textAlign: 'center',
        opacity: 0
      });
    } else if (type === 'shape') {
      onAddElement({
        ...commonProps,
        id: `shape-${Date.now()}`,
        type: 'shape',
        svgCode: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="currentColor"/></svg>',
        width: 100,
        height: 100,
        color: '#3b82f6',
        x: canvasW / 2 - 50,
        y: canvasH / 2 - 50,
      });
    } else {
      // Placeholder for new types
      onAddElement({ ...commonProps, id: `${type}-${Date.now()}`, type: type as any, label: `New ${type}` });
    }
    setShowPicker(false);
  };

  return (
    <div className="w-80 bg-white/90 backdrop-blur-2xl border-r border-gray-200/50 p-4 flex flex-col gap-4 overflow-y-auto shadow-[10px_0_30px_rgba(0,0,0,0.02)]">

      {!selectedElement && !showPicker && (
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
            <>
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Options</h3>
                  <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{(elements || []).length}</span>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                  {(elements || []).map((element) => (
                    <button
                      key={element.id}
                      onClick={() => onSelectElement?.(element.id)} // Trigger selection in designer
                      className={`group flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${(selectedElement as any)?.id === element.id
                        ? 'border-indigo-500 bg-indigo-50/30'
                        : 'border-gray-50 bg-white hover:border-gray-200'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm ${element.type === 'text' ? 'bg-blue-500' :
                        element.type === 'image' ? 'bg-purple-500' :
                          element.type === 'product_color' ? 'bg-orange-500' :
                            element.type === 'shape' ? 'bg-blue-600' :
                              'bg-gray-400'
                        }`}>
                        {element.type === 'text' ? <Type className="w-4 h-4" /> :
                          element.type === 'image' ? <Image className="w-4 h-4" /> :
                            element.type === 'product_color' ? <Palette className="w-4 h-4" /> :
                              element.type === 'shape' ? <Shapes className="w-4 h-4" /> :
                                <Settings2 className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-bold text-gray-900 truncate">
                            {element.label || (element.type === 'product_color' ? 'Swatch' : element.type.charAt(0).toUpperCase() + element.type.slice(1))}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); onDeleteElement?.(element.id); }}
                            className="h-6 w-6 rounded-md hover:bg-red-50 group/del shrink-0"
                          >
                            <Trash2 className="w-3 h-3 text-gray-400 group-hover/del:text-red-500 transition-colors" />
                          </Button>
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {element.type === 'text' || element.type === 'field' || element.type === 'textarea' ? (element.text || 'No content') : 'Custom element'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-100 mt-2">
                  <Button
                    onClick={() => setShowPicker(true)}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 font-bold text-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add More Tools
                  </Button>
                </div>
              </div>
            </>
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
            <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
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
                  <div className="text-xs font-bold text-gray-900 leading-tight">{opt.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedElement && !showPicker && (
        <div className="flex flex-col gap-6 animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-gray-900">Element Settings</h3>
            </div>
            <Button
              onClick={() => setShowPicker(true)}
              size="sm"
              className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg px-3 font-bold border-0 shadow-none"
            >
              <Plus className="w-4 h-4 mr-1" /> Add More
            </Button>
          </div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-50 p-1 rounded-xl">
              <TabsTrigger value="general" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                General
              </TabsTrigger>
              <TabsTrigger value="logic" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                <Cpu className="w-3.5 h-3.5" />
                Logic
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-0 space-y-6">
              <Card className="border-0 shadow-none bg-transparent">
                {['text', 'textarea'].includes(selectedElement.type) && (
                  <TextTool
                    onAddElement={onAddElement}
                    selectedElement={selectedElement}
                    onUpdateElement={onUpdateElement}
                    canvasDimensions={canvasDimensions}
                  />
                )}
                {selectedElement.type === 'image' && (
                  <ImageTool
                    onAddElement={onAddElement}
                    selectedElement={selectedElement}
                    onUpdateElement={onUpdateElement}
                    onCrop={onCrop}
                    canvasDimensions={canvasDimensions}
                  />
                )}
                {selectedElement.type === 'gallery' && (
                  <GalleryTool
                    onAddElement={onAddElement}
                    selectedElement={selectedElement}
                    onUpdateElement={onUpdateElement}
                  />
                )}
                {selectedElement.type === 'shape' && (
                  <ShapeTool
                    selectedElement={selectedElement}
                    onUpdateElement={onUpdateElement}
                  />
                )}
                {selectedElement.type === 'file_upload' && (
                  <FileUploadTool
                    onAddElement={onAddElement}
                    selectedElement={selectedElement}
                    onUpdateElement={onUpdateElement}
                  />
                )}
                {selectedElement.type === 'product_color' && (
                  <SwatchTool
                    selectedElement={selectedElement}
                    onUpdateElement={onUpdateElement}
                    productData={productData}
                    userColors={userColors}
                    userOptions={userOptions}
                    onRefreshAssets={onRefreshAssets}
                    onSaveAsset={onSaveAsset}
                  />
                )}
                {selectedElement.type === 'dropdown' && (
                  <DropdownTool
                    selectedElement={selectedElement}
                    onUpdateElement={onUpdateElement}
                    productData={productData}
                    userOptions={userOptions}
                  />
                )}
                {selectedElement.type === 'button' && (
                  <ButtonTool
                    selectedElement={selectedElement}
                    onUpdateElement={onUpdateElement}
                    userOptions={userOptions}
                  />
                )}
                {selectedElement.type === 'checkbox' && (
                  <CheckboxTool
                    selectedElement={selectedElement}
                    onUpdateElement={onUpdateElement}
                    userOptions={userOptions}
                  />
                )}
                {selectedElement.type === 'number' && (
                  <NumberTool
                    onAddElement={onAddElement}
                    selectedElement={selectedElement}
                    onUpdateElement={onUpdateElement}
                  />
                )}
                {selectedElement.type === 'phone' && (
                  <PhoneTool
                    onAddElement={onAddElement}
                    selectedElement={selectedElement}
                    onUpdateElement={onUpdateElement}
                  />
                )}
                {selectedElement.type === 'date' && (
                  <DateTool
                    onAddElement={onAddElement}
                    selectedElement={selectedElement}
                    onUpdateElement={onUpdateElement}
                  />
                )}
                {selectedElement.type === 'time' && (
                  <TimeTool
                    onAddElement={onAddElement}
                    selectedElement={selectedElement}
                    onUpdateElement={onUpdateElement}
                  />
                )}
                {!['text', 'image', 'gallery', 'textarea', 'file_upload', 'product_color', 'dropdown', 'button', 'checkbox', 'number', 'phone', 'date', 'time'].includes(selectedElement.type) && (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Settings2 className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-400 italic">Settings for {selectedElement.type} coming soon</p>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="logic" className="mt-0">
              <LogicTool
                selectedElement={selectedElement}
                onUpdateElement={onUpdateElement}
                productData={productData}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      <div className="mt-auto p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100/50">
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
  );
}
