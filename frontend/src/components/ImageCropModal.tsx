import { useState, useRef, useEffect } from 'react';
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

export function ImageCropModal({ isOpen, onClose, imageUrl, onCropComplete, initialCrop }: ImageCropModalProps) {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [aspect, setAspect] = useState<number | undefined>(undefined);
    const imgRef = useRef<HTMLImageElement>(null);

    const initializeCrop = () => {
        const img = imgRef.current;
        if (!img) return;

        const { width, height, naturalWidth, naturalHeight } = img;

        if (width <= 0 || height <= 0) {
            return;
        }

        // 1. Restore saved crop if exists
        if (initialCrop && initialCrop.width > 0 && naturalWidth > 0) {
            const scaleX = width / naturalWidth;
            const scaleY = height / naturalHeight;

            setCrop({
                unit: 'px',
                x: initialCrop.x * scaleX,
                y: initialCrop.y * scaleY,
                width: initialCrop.width * scaleX,
                height: initialCrop.height * scaleY
            });
            return;
        }

        // 2. Large Initial Selection (90% of image)
        const initialWidth = width * 0.9;
        const initial = centerCrop(
            makeAspectCrop(
                { unit: 'px', width: initialWidth },
                aspect || (undefined as any),
                width,
                height
            ),
            width,
            height
        );

        // If no aspect, make it a nice large rectangle manually to be sure
        if (!aspect) {
            initial.x = width * 0.05;
            initial.y = height * 0.05;
            initial.width = width * 0.9;
            initial.height = height * 0.9;
        }

        setCrop(initial);
    };

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                if (imgRef.current && imgRef.current.complete) {
                    initializeCrop();
                }
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setCrop(undefined);
            setCompletedCrop(undefined);
        }
    }, [isOpen, imageUrl]);

    const centerHorizontal = () => {
        if (!imgRef.current) return;
        const { width } = imgRef.current;
        setCrop((c) => {
            if (!c || c.unit !== 'px') return c;
            return {
                ...c,
                x: (width - (c.width || 0)) / 2,
            };
        });
    };

    const centerVertical = () => {
        if (!imgRef.current) return;
        const { height } = imgRef.current;
        setCrop((c) => {
            if (!c || c.unit !== 'px') return c;
            return {
                ...c,
                y: (height - (c.height || 0)) / 2,
            };
        });
    };

    const toggleSquare = () => {
        const newAspect = aspect === 1 ? undefined : 1;
        setAspect(newAspect);

        if (imgRef.current) {
            const { width, height } = imgRef.current;
            const newCrop = centerCrop(
                makeAspectCrop({ unit: 'px', width: Math.min(width, height) * 0.9 }, newAspect || (undefined as any), width, height),
                width,
                height
            );
            setCrop(newCrop);
        }
    };

    const fullImage = () => {
        if (!imgRef.current) return;
        const { width, height } = imgRef.current;
        setAspect(undefined);
        setCrop({
            unit: 'px',
            x: 0,
            y: 0,
            width: width,
            height: height
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
        initializeCrop();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) onClose();
        }}>
            <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 pb-2 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                        <CropIcon className="w-5 h-5 text-indigo-600" />
                        Adjust Crop Area
                    </DialogTitle>
                    <p className="text-sm text-gray-500">Drag handles to resize. Drag center to move.</p>
                </DialogHeader>

                <div className="relative flex-1 overflow-hidden bg-gray-100/50 p-4 flex justify-center items-center min-h-0">
                    <div className="relative max-w-full max-h-full overflow-auto custom-scrollbar shadow-inner rounded-xl p-4 bg-white/40">
                        <ReactCrop
                            crop={crop}
                            onChange={(c) => setCrop(c)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={aspect}
                            className="shadow-xl rounded-lg overflow-hidden border-2 border-white"
                        >
                            <img
                                ref={imgRef}
                                src={imageUrl}
                                onLoad={initializeCrop}
                                className="max-w-full block select-none touch-none"
                                crossOrigin="anonymous"
                                draggable={false}
                                style={{
                                    userSelect: 'none',
                                    WebkitUserDrag: 'none',
                                    pointerEvents: 'auto',
                                }}
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
