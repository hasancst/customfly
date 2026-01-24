import { useState } from 'react';
import { Plus, Palette, Phone, Calendar, MapPin, FileText, Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CanvasElement } from '@/types';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface FieldsToolProps {
  onAddElement: (element: CanvasElement) => void;
  selectedElement?: CanvasElement;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
}

export function FieldsTool({ onAddElement, selectedElement, onUpdateElement }: FieldsToolProps) {
  const [fieldLabel, setFieldLabel] = useState('Custom Field');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('Enter value...');
  const [swatchColors, setSwatchColors] = useState(['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']);
  const [phoneCountry, setPhoneCountry] = useState('+1');
  const [mapLocation, setMapLocation] = useState('New York, USA');

  const handleUpdate = (updates: Partial<CanvasElement>) => {
    if (selectedElement) {
      onUpdateElement(selectedElement.id, updates);
    }
  };

  const addTextField = () => {
    const newElement: CanvasElement = {
      id: `field-${Date.now()}`,
      type: 'field',
      fieldType: 'text',
      x: 200,
      y: 200,
      width: 250,
      height: 40,
      rotation: 0,
      opacity: 100,
      zIndex: Date.now(),
      label: fieldLabel,
      placeholder: fieldPlaceholder,
      color: '#000000',
      fontSize: 14,
    };
    onAddElement(newElement);
  };

  const addColorSwatch = () => {
    const newElement: CanvasElement = {
      id: `swatch-${Date.now()}`,
      type: 'swatch',
      x: 200,
      y: 200,
      width: 300,
      height: 50,
      rotation: 0,
      opacity: 100,
      zIndex: Date.now(),
      swatchColors: swatchColors,
      selectedColor: swatchColors[0],
      label: 'Color Selection',
    };
    onAddElement(newElement);
  };

  const addPhoneField = () => {
    const newElement: CanvasElement = {
      id: `phone-${Date.now()}`,
      type: 'phone',
      x: 200,
      y: 200,
      width: 250,
      height: 40,
      rotation: 0,
      opacity: 100,
      zIndex: Date.now(),
      countryCode: phoneCountry,
      phoneNumber: '',
      label: 'Phone Number',
      fontSize: 14,
    };
    onAddElement(newElement);
  };

  const addDateField = () => {
    const newElement: CanvasElement = {
      id: `date-${Date.now()}`,
      type: 'date',
      x: 200,
      y: 200,
      width: 250,
      height: 40,
      rotation: 0,
      opacity: 100,
      zIndex: Date.now(),
      dateValue: new Date().toISOString().split('T')[0],
      dateFormat: 'MM/DD/YYYY',
      label: 'Date',
      fontSize: 14,
    };
    onAddElement(newElement);
  };

  const addMapField = () => {
    const newElement: CanvasElement = {
      id: `map-${Date.now()}`,
      type: 'map',
      x: 200,
      y: 150,
      width: 300,
      height: 200,
      rotation: 0,
      opacity: 100,
      zIndex: Date.now(),
      mapLocation: mapLocation,
      mapZoom: 12,
      latitude: 40.7128,
      longitude: -74.006,
      label: 'Location',
    };
    onAddElement(newElement);
  };

  return (
    <div className="space-y-4">
      {/* Custom Text Field */}
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-blue-900">Custom Field</h3>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-blue-700 mb-1">Field Label</Label>
            <Input
              value={selectedElement?.label || fieldLabel}
              onChange={(e) => {
                const value = e.target.value;
                setFieldLabel(value);
                if (selectedElement?.type === 'field') handleUpdate({ label: value });
              }}
              placeholder="Name, Email, etc."
              className="rounded-lg h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-blue-700 mb-1">Placeholder</Label>
            <Input
              value={selectedElement?.placeholder || fieldPlaceholder}
              onChange={(e) => {
                const value = e.target.value;
                setFieldPlaceholder(value);
                if (selectedElement?.type === 'field') handleUpdate({ placeholder: value });
              }}
              placeholder="Enter your text..."
              className="rounded-lg h-8 text-sm"
            />
          </div>
          <Button onClick={addTextField} size="sm" className="w-full rounded-lg bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Text Field
          </Button>
        </div>
      </Card>

      <Separator />

      {/* Color Swatch */}
      <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-purple-900">Color Swatch</h3>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-purple-700 mb-2">Color Options</Label>
            <div className="flex gap-2 flex-wrap">
              {swatchColors.map((color, index) => (
                <Popover key={index}>
                  <PopoverTrigger asChild>
                    <button
                      className="w-10 h-10 rounded-lg border-2 border-white shadow-md hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3">
                    <HexColorPicker
                      color={color}
                      onChange={(newColor) => {
                        const newColors = [...swatchColors];
                        newColors[index] = newColor;
                        setSwatchColors(newColors);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              ))}
            </div>
          </div>
          <Button onClick={addColorSwatch} size="sm" className="w-full rounded-lg bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Color Swatch
          </Button>
        </div>
      </Card>

      <Separator />

      {/* Phone Number */}
      <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-center gap-2 mb-3">
          <Phone className="w-4 h-4 text-green-600" />
          <h3 className="text-sm font-semibold text-green-900">Phone Number</h3>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-green-700 mb-1">Country Code</Label>
            <Select
              value={selectedElement?.countryCode || phoneCountry}
              onValueChange={(value) => {
                setPhoneCountry(value);
                if (selectedElement?.type === 'phone') handleUpdate({ countryCode: value });
              }}
            >
              <SelectTrigger className="rounded-lg h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="+1">🇺🇸 +1 (USA)</SelectItem>
                <SelectItem value="+44">🇬🇧 +44 (UK)</SelectItem>
                <SelectItem value="+91">🇮🇳 +91 (India)</SelectItem>
                <SelectItem value="+86">🇨🇳 +86 (China)</SelectItem>
                <SelectItem value="+81">🇯🇵 +81 (Japan)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addPhoneField} size="sm" className="w-full rounded-lg bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Phone Field
          </Button>
        </div>
      </Card>

      <Separator />

      {/* Date Picker */}
      <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-orange-600" />
          <h3 className="text-sm font-semibold text-orange-900">Date Picker</h3>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-orange-700 mb-1">Date Format</Label>
            <Select defaultValue="MM/DD/YYYY">
              <SelectTrigger className="rounded-lg h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addDateField} size="sm" className="w-full rounded-lg bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Date Field
          </Button>
        </div>
      </Card>

      <Separator />

      {/* Map Location */}
      <Card className="p-4 bg-gradient-to-br from-cyan-50 to-teal-50 border-cyan-200">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-cyan-600" />
          <h3 className="text-sm font-semibold text-cyan-900">Map Location</h3>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-cyan-700 mb-1">Location</Label>
            <Input
              value={selectedElement?.mapLocation || mapLocation}
              onChange={(e) => {
                const value = e.target.value;
                setMapLocation(value);
                if (selectedElement?.type === 'map') handleUpdate({ mapLocation: value });
              }}
              placeholder="City, Country"
              className="rounded-lg h-8 text-sm"
            />
          </div>
          <Button onClick={addMapField} size="sm" className="w-full rounded-lg bg-cyan-600 hover:bg-cyan-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Map
          </Button>
        </div>
      </Card>

      <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
        <h4 className="text-xs font-semibold text-indigo-900 mb-2">Field Features</h4>
        <ul className="text-xs text-indigo-700 space-y-1">
          <li>• Collect custom customer data</li>
          <li>• Interactive color selection</li>
          <li>• Phone validation support</li>
          <li>• Location-based options</li>
        </ul>
      </div>
    </div>
  );
}
