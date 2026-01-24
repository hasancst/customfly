import { useState } from 'react';
import { Type, Image, Settings2, Plus, AlignLeft, UploadCloud, Palette, ChevronDownSquare, MousePointer2, CheckSquare, Hash, Phone, Calendar, Clock, Images, ChevronLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextTool } from '@/components/TextTool';
import { ImageTool } from '@/components/ImageTool';
import { GalleryTool } from '@/components/GalleryTool';
import { CanvasElement } from '@/types';

interface ToolbarProps {
  onAddElement: (element: CanvasElement) => void;
  selectedElement?: CanvasElement;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onCrop?: () => void;
}

export function Toolbar({ onAddElement, selectedElement, onUpdateElement, onCrop }: ToolbarProps) {
  const [showPicker, setShowPicker] = useState(false);

  const optionTypes = [
    { id: 'text', label: 'Text', icon: Type, color: 'bg-blue-500', desc: 'Custom text' },
    { id: 'image', label: 'Image', icon: Image, color: 'bg-purple-500', desc: 'Upload photo' },
    { id: 'gallery', label: 'Gallery', icon: Images, color: 'bg-pink-500', desc: 'Image library' },
    { id: 'textarea', label: 'Text Area', icon: AlignLeft, color: 'bg-indigo-500', desc: 'Notes/Lyrics' },
    { id: 'file_upload', label: 'File Upload', icon: UploadCloud, color: 'bg-emerald-500', desc: 'Zip, PDF, etc.' },
    { id: 'product_color', label: 'Product Color', icon: Palette, color: 'bg-orange-500', desc: 'Color swatches' },
    { id: 'dropdown', label: 'Drop Down', icon: ChevronDownSquare, color: 'bg-cyan-500', desc: 'Selection list' },
    { id: 'button', label: 'Button', icon: MousePointer2, color: 'bg-rose-500', desc: 'Preset actions' },
    { id: 'checkbox', label: 'Check Box', icon: CheckSquare, color: 'bg-amber-500', desc: 'Yes/No options' },
    { id: 'number', label: 'Number', icon: Hash, color: 'bg-teal-500', desc: 'Quantity/Size' },
    { id: 'phone', label: 'Phone Number', icon: Phone, color: 'bg-sky-500', desc: 'Contact info' },
    { id: 'date', label: 'Date Picker', icon: Calendar, color: 'bg-violet-500', desc: 'Delivery date' },
    { id: 'time', label: 'Time Picker', icon: Clock, color: 'bg-fuchsia-500', desc: 'Booking time' },
  ];

  const handleAddOption = (type: any) => {
    const commonProps = {
      x: 100, y: 100, rotation: 0, opacity: 1, zIndex: 10
    };

    if (type === 'text') {
      onAddElement({ ...commonProps, id: `text-${Date.now()}`, type: 'text', text: 'New Text', fontSize: 24, color: '#000000', fontFamily: 'Inter' });
    } else if (type === 'image') {
      onAddElement({ ...commonProps, id: `img-${Date.now()}`, type: 'image', src: 'https://placehold.co/200x200?text=Upload+Image' });
    } else if (type === 'textarea') {
      onAddElement({
        ...commonProps,
        id: `textarea-${Date.now()}`,
        type: 'textarea',
        text: 'Enter notes here...',
        fontSize: 16,
        color: '#000000',
        fontFamily: 'Inter',
        fontWeight: 400,
        textAlign: 'left',
        textMode: 'wrap',
        label: 'Text Area'
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
        <div className="flex flex-col items-center justify-center h-full text-center gap-6 animate-in fade-in zoom-in duration-500">
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

          <Card className="border-0 shadow-none bg-transparent">
            {['text', 'textarea'].includes(selectedElement.type) && (
              <TextTool
                onAddElement={onAddElement}
                selectedElement={selectedElement}
                onUpdateElement={onUpdateElement}
              />
            )}
            {selectedElement.type === 'image' && (
              <ImageTool
                onAddElement={onAddElement}
                selectedElement={selectedElement}
                onUpdateElement={onUpdateElement}
                onCrop={onCrop}
              />
            )}
            {selectedElement.type === 'gallery' && (
              <GalleryTool
                onAddElement={onAddElement}
                selectedElement={selectedElement}
                onUpdateElement={onUpdateElement}
              />
            )}
            {!['text', 'image', 'gallery'].includes(selectedElement.type) && (
              <div className="py-20 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings2 className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400 italic">Settings for {selectedElement.type} coming soon</p>
              </div>
            )}
          </Card>
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
