import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Crop, RotateCcw, Check, X } from 'lucide-react';

interface ImageCropModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    onCropComplete: (croppedAreaPixels: { x: number; y: number; width: number; height: number }) => void;
    initialCrop?: { x: number; y: number; width: number; height: number };
}

export function ImageCropModal({ isOpen, onClose, imageUrl, onCropComplete, initialCrop }: ImageCropModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onCropCompleteInternal = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = () => {
        if (croppedAreaPixels) {
            onCropComplete(croppedAreaPixels);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                        <Crop className="w-5 h-5 text-indigo-600" />
                        Crop Image
                    </DialogTitle>
                    <p className="text-sm text-gray-500">Adjust the area you want to keep. This is non-destructive.</p>
                </DialogHeader>

                <div className="relative h-[400px] w-full bg-gray-900 mt-2">
                    <Cropper
                        image={imageUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={undefined} // Freeform crop
                        onCropChange={onCropChange}
                        onCropComplete={onCropCompleteInternal}
                        onZoomChange={onZoomChange}
                    />
                </div>

                <div className="p-6 bg-white space-y-6">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Zoom Level</Label>
                            <span className="text-xs font-bold text-indigo-600">{(zoom * 100).toFixed(0)}%</span>
                        </div>
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.1}
                            onValueChange={([val]) => setZoom(val)}
                            className="py-2"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            className="flex-1 rounded-xl h-12 font-bold border-gray-200 hover:bg-gray-50 gap-2"
                            onClick={onClose}
                        >
                            <X className="w-4 h-4" /> Cancel
                        </Button>
                        <Button
                            className="flex-1 rounded-xl h-12 font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 gap-2"
                            onClick={handleSave}
                        >
                            <Check className="w-4 h-4" /> Apply Crop
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
