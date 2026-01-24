import { useState, useRef } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crop as CropIcon, Check, RotateCcw, AlignCenter, AlignVerticalJustifyCenter, Square, Maximize } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    const [aspect, setAspect] = useState<number | undefined>(undefined);
    const imgRef = useRef<HTMLImageElement>(null);

    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        const { width, height } = e.currentTarget;

        const initial = centerCrop(
            makeAspectCrop(
                {
                    unit: '%',
                    width: 80,
                    height: 80,
                },
                aspect || 0,
                width,
                height
            ),
            width,
            height
        );

        setCrop(initial);
    }

    const centerHorizontal = () => {
        setCrop((c) => {
            if (!c) return c;
            return {
                ...c,
                x: (100 - (c.width || 0)) / 2,
            };
        });
    };

    const centerVertical = () => {
        setCrop((c) => {
            if (!c) return c;
            return {
                ...c,
                y: (100 - (c.height || 0)) / 2,
            };
        });
    };

    const toggleSquare = () => {
        if (aspect === 1) {
            setAspect(undefined);
        } else {
            setAspect(1);
            if (imgRef.current) {
                const { width, height } = imgRef.current;
                const newCrop = centerCrop(
                    makeAspectCrop({ unit: 'px', width: Math.min(width, height) * 0.8 }, 1, width, height),
                    width, height
                );
                setCrop(newCrop);
            }
        }
    };

    const fullImage = () => {
        setAspect(undefined);
        setCrop({
            unit: '%',
            x: 0,
            y: 0,
            width: 100,
            height: 100
        });
    };

    const handleSave = () => {
        if (completedCrop && imgRef.current) {
            const img = imgRef.current;
            const scaleX = img.naturalWidth / img.width;
            const scaleY = img.naturalHeight / img.height;

            onCropComplete({
                x: completedCrop.x * scaleX,
                y: completedCrop.y * scaleY,
                width: completedCrop.width * scaleX,
                height: completedCrop.height * scaleY
            });
            onClose();
        }
    };

    const resetCrop = () => {
        if (imgRef.current) {
            const { width, height } = imgRef.current;
            const newCrop = centerCrop(
                makeAspectCrop({ unit: 'px', width: width * 0.8, height: height * 0.8 }, aspect || 0, width, height),
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

                <div className="relative max-h-[500px] overflow-auto bg-gray-900/5 p-8 flex justify-center items-center">
                    <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={aspect}
                        className="shadow-2xl border-4 border-white rounded-lg overflow-hidden"
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

                <div className="p-6 bg-white border-t border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={centerHorizontal}>
                                            <AlignCenter className="w-4 h-4 text-gray-600" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Center Horizontal</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={centerVertical}>
                                            <AlignVerticalJustifyCenter className="w-4 h-4 text-gray-600" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Center Vertical</TooltipContent>
                                </Tooltip>
                                <div className="w-px h-4 bg-gray-300 mx-1" />
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={aspect === 1 ? 'secondary' : 'ghost'}
                                            size="icon"
                                            className={`h-9 w-9 rounded-lg ${aspect === 1 ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'}`}
                                            onClick={toggleSquare}
                                        >
                                            <Square className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Square 1:1</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-gray-600" onClick={fullImage}>
                                            <Maximize className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Fit to Image</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-gray-600" onClick={resetCrop}>
                                            <RotateCcw className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reset Area</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div className="flex-1" />

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="rounded-xl h-11 font-bold border-gray-200 hover:bg-gray-50 px-6 text-gray-600 transition-all"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="rounded-xl h-11 font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 px-8 transition-all gap-2"
                                onClick={handleSave}
                                disabled={!completedCrop?.width || !completedCrop?.height}
                            >
                                <Check className="w-5 h-5" /> Save Changes
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
