import { useState, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Crop as CropIcon, Check, X, RotateCcw } from 'lucide-react';

interface ImageCropModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    onCropComplete: (croppedAreaPixels: { x: number; y: number; width: number; height: number }) => void;
    initialCrop?: { x: number; y: number; width: number; height: number };
}

export function ImageCropModal({ isOpen, onClose, imageUrl, onCropComplete }: ImageCropModalProps) {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const imgRef = useRef<HTMLImageElement>(null);

    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        const { width, height } = e.currentTarget;

        // Set an initial crop area (80% of image)
        const initialCrop = centerCrop(
            makeAspectCrop(
                {
                    unit: '%',
                    width: 80,
                },
                undefined, // Aspect ratio undefined for freeform
                width,
                height
            ),
            width,
            height
        );

        setCrop(initialCrop);
    }

    const handleSave = () => {
        if (completedCrop) {
            onCropComplete({
                x: completedCrop.x,
                y: completedCrop.y,
                width: completedCrop.width,
                height: completedCrop.height
            });
            onClose();
        }
    };

    const resetCrop = () => {
        if (imgRef.current) {
            const { width, height } = imgRef.current;
            const newCrop = centerCrop(
                makeAspectCrop({ unit: '%', width: 80 }, undefined, width, height),
                width, height
            );
            setCrop(newCrop);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                        <CropIcon className="w-5 h-5 text-indigo-600" />
                        Adjust Crop Area
                    </DialogTitle>
                    <p className="text-sm text-gray-500">Drag handles to resize. Drag center to move. Non-destructive.</p>
                </DialogHeader>

                <div className="relative max-h-[500px] overflow-auto bg-gray-100 p-4 flex justify-center">
                    <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                        className="shadow-lg border-2 border-white rounded-sm"
                    >
                        <img
                            ref={imgRef}
                            src={imageUrl}
                            onLoad={onImageLoad}
                            className="max-w-full block"
                            crossOrigin="anonymous"
                        />
                    </ReactCrop>
                </div>

                <div className="p-6 bg-white flex flex-col gap-4">
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl h-10 font-bold border-gray-200 hover:bg-gray-50 gap-2 px-4"
                            onClick={resetCrop}
                        >
                            <RotateCcw className="w-4 h-4" /> Reset Area
                        </Button>

                        <div className="flex-1" />

                        <Button
                            variant="outline"
                            className="rounded-xl h-10 font-bold border-gray-200 hover:bg-gray-50 gap-2 px-4 text-gray-500"
                            onClick={onClose}
                        >
                            <X className="w-4 h-4" /> Cancel
                        </Button>
                        <Button
                            className="rounded-xl h-10 font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 gap-2 px-6"
                            onClick={handleSave}
                            disabled={!completedCrop?.width || !completedCrop?.height}
                        >
                            <Check className="w-4 h-4" /> Apply Crop
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
