import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { CanvasElement, OutputSettings } from '@/types';
import { Separator } from '@/components/ui/separator';

interface OutputSettingsToolProps {
    element: CanvasElement;
    onUpdate: (updates: Partial<CanvasElement>) => void;
}

export function OutputSettingsTool({ element, onUpdate }: OutputSettingsToolProps) {
    const settings: OutputSettings = element.outputSettings || {
        fileType: 'png',
        dpi: 300,
        includeBaseMockup: true,
        includeOriginalFile: false,
    };

    const updateSettings = (updates: Partial<OutputSettings>) => {
        onUpdate({
            outputSettings: {
                ...settings,
                ...updates
            }
        });
    };

    return (
        <div className="space-y-4">
            <Separator />
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Output Settings</h3>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-gray-500 uppercase">File Type</Label>
                        <Select
                            value={settings.fileType}
                            onValueChange={(val: any) => updateSettings({ fileType: val })}
                        >
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="png">PNG</SelectItem>
                                <SelectItem value="jpg">JPG</SelectItem>
                                <SelectItem value="jpeg">JPEG</SelectItem>
                                <SelectItem value="pdf">PDF</SelectItem>
                                <SelectItem value="svg">SVG</SelectItem>
                                <SelectItem value="ai">AI</SelectItem>
                                <SelectItem value="eps">EPS</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-gray-500 uppercase">DPI</Label>
                        <Input
                            type="number"
                            value={settings.dpi}
                            onChange={(e) => updateSettings({ dpi: parseInt(e.target.value) || 72 })}
                            className="h-8 text-xs"
                            min={72}
                            max={2400}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-xs font-medium text-gray-900">Include Base Mockup</Label>
                        <p className="text-[10px] text-gray-500">
                            {settings.includeBaseMockup
                                ? "Output includes base product + design"
                                : "Output contains design only (transparent)"}
                        </p>
                    </div>
                    <Switch
                        checked={settings.includeBaseMockup}
                        onCheckedChange={(checked) => updateSettings({ includeBaseMockup: checked })}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-xs font-medium text-gray-900">Include Original File</Label>
                        <p className="text-[10px] text-gray-500">
                            Attach raw user upload to output
                        </p>
                    </div>
                    <Switch
                        checked={settings.includeOriginalFile}
                        onCheckedChange={(checked) => updateSettings({ includeOriginalFile: checked })}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-xs font-medium text-gray-900">Separate Files by Type</Label>
                        <p className="text-[10px] text-gray-500">
                            Download separate files for Text, Images, etc.
                        </p>
                    </div>
                    <Switch
                        checked={!!settings.separateFilesByType}
                        onCheckedChange={(checked) => updateSettings({ separateFilesByType: checked })}
                    />
                </div>
            </div>
        </div>
    );
}
