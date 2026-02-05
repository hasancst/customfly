import { useState, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, RotateCcw, AlignCenter, AlignVerticalJustifyCenter, Square, Maximize, Crop as CropIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ImageCropModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    onCropComplete: (croppedAreaPixels: { x: number; y: number; width: number; height: number }) => void;
    initialCrop?: { x: number; y: number; width: number; height: number };
}

export function ImageCropModal({ isOpen, onClose, imageUrl, onCropComplete, initialCrop }: ImageCropModalProps) {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [aspect, setAspect] = useState<number | undefined>(undefined);
    const imgRef = useRef<HTMLImageElement>(null);

    const initializeCrop = () => {
        const img = imgRef.current;
        if (!img || !img.naturalWidth) return;

        const { naturalWidth, naturalHeight } = img;

        // 1. Restore saved crop if exists (Convert to %)
        if (initialCrop && initialCrop.width > 0 && naturalWidth > 0) {
            setCrop({
                unit: '%',
                x: (initialCrop.x / naturalWidth) * 100,
                y: (initialCrop.y / naturalHeight) * 100,
                width: (initialCrop.width / naturalWidth) * 100,
                height: (initialCrop.height / naturalHeight) * 100
            });
            return;
        }

        // 2. Default to Full Image Selection (100%) so everything is visible
        const newCrop: Crop = {
            unit: '%',
            x: 0,
            y: 0,
            width: 100,
            height: 100
        };

        if (aspect) {
            const imgAspect = naturalWidth / naturalHeight;
            if (imgAspect > aspect) {
                newCrop.width = 100;
                newCrop.height = (100 / imgAspect) * aspect;
                newCrop.y = (100 - newCrop.height) / 2;
            } else {
                newCrop.height = 100;
                newCrop.width = (100 * imgAspect) / aspect;
                newCrop.x = (100 - newCrop.width) / 2;
            }
        }

        setCrop(newCrop);
    };

    useEffect(() => {
        if (isOpen && imageUrl) {
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {
                if (isOpen) initializeCrop();
            };
        } else {
            setCrop(undefined);
            setCompletedCrop(undefined);
        }
    }, [isOpen, imageUrl]);

    const centerHorizontal = () => {
        setCrop((c) => {
            if (!c || c.unit !== '%') return c;
            return {
                ...c,
                x: (100 - (c.width || 0)) / 2,
            };
        });
    };

    const centerVertical = () => {
        setCrop((c) => {
            if (!c || c.unit !== '%') return c;
            return {
                ...c,
                y: (100 - (c.height || 0)) / 2,
            };
        });
    };

    const toggleSquare = () => {
        const newAspect = aspect === 1 ? undefined : 1;
        setAspect(newAspect);
        initializeCrop();
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

            // completedCrop is in pixels relative to the displayed image size
            // We need to scale it to the natural image dimensions
            const scaleX = img.naturalWidth / img.width;
            const scaleY = img.naturalHeight / img.height;

            const x = completedCrop.x * scaleX;
            const y = completedCrop.y * scaleY;
            const w = completedCrop.width * scaleX;
            const h = completedCrop.height * scaleY;

            onCropComplete({ x, y, width: w, height: h });
            onClose();
        }
    };

    const resetCrop = () => {
        initializeCrop();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) onClose();
        }}>
            <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl flex flex-col max-h-[95vh]">
                <DialogHeader className="p-6 pb-2 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                        <CropIcon className="w-5 h-5 text-indigo-600" />
                        Adjust Crop Area
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-500">
                        Drag handles to resize. Drag center to move.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative flex-1 bg-gray-50 p-12 flex justify-center items-center overflow-hidden min-h-[400px]">
                    <div className="relative w-full h-full flex items-center justify-center">
                        <ReactCrop
                            crop={crop}
                            onChange={(c) => setCrop(c)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={aspect}
                            className="shadow-2xl rounded-lg overflow-hidden border-4 border-white bg-white"
                        >
                            <img
                                ref={imgRef}
                                src={imageUrl}
                                onLoad={initializeCrop}
                                className="max-w-full max-h-[60vh] h-auto block select-none"
                                draggable={false}
                            />
                        </ReactCrop>
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-gray-100 shrink-0">
                    <TooltipProvider delayDuration={0}>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={centerHorizontal}>
                                            <AlignCenter className="w-4 h-4 text-gray-600" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Center Horizontal</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={centerVertical}>
                                            <AlignVerticalJustifyCenter className="w-4 h-4 text-gray-600" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Center Vertical</TooltipContent>
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
                                    <TooltipContent side="top">Square 1:1</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-gray-600" onClick={fullImage}>
                                            <Maximize className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Fit to Image</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-gray-600" onClick={resetCrop}>
                                            <RotateCcw className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Reset Area</TooltipContent>
                                </Tooltip>
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
                    </TooltipProvider>
                </div>
            </DialogContent>
        </Dialog>
    );
}
