import { useState } from 'react';
import { Type, Image, Settings2, FormInput } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { TextTool } from '@/components/TextTool';
import { ImageTool } from '@/components/ImageTool';
import { FieldsTool } from '@/components/FieldsTool';
import { CanvasElement } from '@/types';

interface ToolbarProps {
  onAddElement: (element: CanvasElement) => void;
  selectedElement?: CanvasElement;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
}

export function Toolbar({ onAddElement, selectedElement, onUpdateElement }: ToolbarProps) {
  const [activeTab, setActiveTab] = useState('text');

  return (
    <div className="w-80 bg-white/80 backdrop-blur-xl border-r border-gray-200 p-4 overflow-y-auto">
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 p-1 bg-gray-100 rounded-xl m-2">
            <TabsTrigger value="text" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:shadow text-[10px] px-1">
              <Type className="w-3.5 h-3.5" />
              Text
            </TabsTrigger>
            <TabsTrigger value="image" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:shadow text-[10px] px-1">
              <Image className="w-3.5 h-3.5" />
              Image
            </TabsTrigger>
            <TabsTrigger value="fields" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:shadow text-[10px] px-1">
              <FormInput className="w-3.5 h-3.5" />
              Fields
            </TabsTrigger>
          </TabsList>


          <TabsContent value="text" className="p-4 mt-0">
            <TextTool
              onAddElement={onAddElement}
              selectedElement={selectedElement?.type === 'text' ? selectedElement : undefined}
              onUpdateElement={onUpdateElement}
            />
          </TabsContent>

          <TabsContent value="image" className="p-4 mt-0">
            <ImageTool
              onAddElement={onAddElement}
              selectedElement={selectedElement?.type === 'image' ? selectedElement : undefined}
              onUpdateElement={onUpdateElement}
            />
          </TabsContent>

          <TabsContent value="fields" className="p-4 mt-0">
            <FieldsTool
              onAddElement={onAddElement}
              selectedElement={selectedElement}
              onUpdateElement={onUpdateElement}
            />
          </TabsContent>
        </Tabs>
      </Card>

      <div className="mt-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
        <div className="flex items-center gap-2 mb-2">
          <Settings2 className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-indigo-900">Quick Tips</h3>
        </div>
        <ul className="text-xs text-indigo-700 space-y-1">
          <li>• Click elements on canvas to edit</li>
          <li>• Drag to reposition elements</li>
          <li>• Use handles to resize</li>
          <li>• Layer order in right panel</li>
        </ul>
      </div>
    </div>
  );
}
