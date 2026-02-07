import React from 'react';
import { CanvasElement } from '@/types';
import { ProcessedImage } from '@/components/ProcessedImage';
import { Database } from 'lucide-react';

interface ImageRendererProps {
    element: CanvasElement;
    zoom: number;
    localState: {
        width: number;
        height: number;
    };
    filterString: string;
    isPublicMode: boolean;
}

export const ImageRenderer: React.FC<ImageRendererProps> = ({
    element,
    zoom,
    localState,
    filterString,
    isPublicMode,
}) => {
    if (element.type === 'image') {
        return (
            <div className="flex flex-col gap-1 w-full h-full">
                <div className="relative flex-1 min-h-0">
                    <ProcessedImage
                        id={element.id}
                        src={element.src || ''}
                        removeBg={!!element.removeBg}
                        removeBgType={(element.removeBgType as any) || 'js'}
                        deep={element.removeBgDeep || 0}
                        mode={element.removeBgMode || 'light'}
                        width={localState.width}
                        height={localState.height}
                        zoom={zoom}
                        filter={filterString}
                        crop={element.crop}
                        maskShape={element.maskShape}
                        maskViewBox={element.maskViewBox}
                        isEngraved={element.isEngraved}
                        engraveThreshold={element.engraveThreshold}
                        engraveColor={element.engraveColor}
                        engraveInvert={element.engraveInvert}
                    />
                </div>
            </div>
        );
    }

    if (element.type === 'gallery') {
        const SYSTEM_DEFAULT_DUMMY = 'https://img.icons8.com/fluency/512/image-gallery.png';
        const isDummy = !element.src ||
            element.src === SYSTEM_DEFAULT_DUMMY ||
            element.src.includes('icons8.com') ||
            element.src.includes('placeholder') ||
            element.src.includes('image-gallery.png');

        if (isPublicMode) {
            if (isDummy) return null;

            if (element.src) {
                const cleanSrc = element.src.includes('|') ? element.src.split('|')[1].trim() : element.src;
                return (
                    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                        <img
                            src={cleanSrc}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            draggable={false}
                            alt="Selected Gallery"
                        />
                    </div>
                );
            }
            return null;
        }

        const currentSrc = element.src || SYSTEM_DEFAULT_DUMMY;
        const cleanSrc = currentSrc.includes('|') ? currentSrc.split('|')[1].trim() : currentSrc;

        return (
            <div className="w-full h-full relative group">
                <img
                    src={cleanSrc}
                    className={`w-full h-full object-cover rounded-lg shadow-sm ${isDummy ? 'border-purple-200 border-2 border-dashed' : 'border border-purple-200'}`}
                    alt="Gallery Preview"
                />
                <div className="absolute inset-0 bg-purple-600/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Database className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
                {isDummy && (
                    <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm py-1 px-2 rounded-md border border-purple-100 shadow-sm flex items-center gap-1.5 overflow-hidden">
                        <Database className="w-3 h-3 text-purple-600 flex-shrink-0" />
                        <span className="text-[8px] font-bold text-purple-700 uppercase truncate">Gallery Placeholder</span>
                    </div>
                )}
            </div>
        );
    }

    return null;
};
