import { useRef, useState, useMemo, memo, useEffect } from 'react';

const ProcessedImage = memo(({ id, src, removeBg, removeBgType, deep, mode, width, height, zoom, filter, crop, maskShape, maskViewBox, tint, tintMode }: {
    id: string,
    src: string,
    removeBg: boolean,
    removeBgType: 'js' | 'rembg',
    deep: number,
    mode: 'light' | 'dark',
    width: number,
    height: number,
    zoom: number,
    filter?: string,
    crop?: { x: number, y: number, width: number, height: number },
    maskShape?: string,
    maskViewBox?: string,
    tint?: string,
    tintMode?: 'transparent-only' | 'full-image'
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const z = zoom / 100;

    useEffect(() => {
        // If tint is handled externally for non-js removal (like CSS), we might not need this.
        // Actually, we ONLY want to process if we are removing BG via JS.
        // If just Tinting without RemoveBG, we rely on CSS in parent usually?
        // User requirement: "remove bg ... and tint".
        // If removeBg is true (JS), we MUST tint here.
        if (!removeBg || removeBgType !== 'js') return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true });
        const img = imgRef.current;

        if (!canvas || !ctx || !img || !isLoaded) return;

        const process = () => {
            // Draw to canvas for BG removal
            if (crop) {
                canvas.width = crop.width;
                canvas.height = crop.height;
                ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
            } else {
                canvas.width = img.naturalWidth || width;
                canvas.height = img.naturalHeight || height;
                ctx.drawImage(img, 0, 0);
            }

            // Parse Tint
            let tintRGB: { r: number, g: number, b: number } | null = null;
            if (tint) {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(tint);
                if (result) {
                    tintRGB = {
                        r: parseInt(result[1], 16),
                        g: parseInt(result[2], 16),
                        b: parseInt(result[3], 16)
                    };
                }
            }

            if (deep > 0 || tintRGB) { // Only proceed if there's something to process (deep or tint)
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                    let R = data[i];
                    let G = data[i + 1];
                    let B = data[i + 2];

                    // Removal Logic
                    if (deep > 0) {
                        if (mode !== 'dark') {
                            if (255 - R < deep && 255 - G < deep && 255 - B < deep) {
                                const alpha = (((255 - R) / deep) + ((255 - G) / deep) + ((255 - B) / deep)) / 3;
                                data[i + 3] = Math.max(0, Math.min(255, alpha * 255));
                            }
                        } else {
                            if (R < deep && G < deep && B < deep) {
                                const alpha = ((R / deep) + (G / deep) + (B / deep)) / 3;
                                data[i + 3] = Math.max(0, Math.min(255, alpha * 255));
                            }
                        }
                    }

                    // Tint Logic (Only tint if not fully removed? Or tint everything remaining?)
                    // Tinting usually multiplies.
                    if (tintRGB && data[i + 3] > 0) { // If visible
                        // Multiply blend: R * Tint / 255
                        data[i] = (R * tintRGB.r) / 255;
                        data[i + 1] = (G * tintRGB.g) / 255;
                        data[i + 2] = (B * tintRGB.b) / 255;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
            }
        };

        process();
    }, [src, removeBg, deep, mode, crop, isLoaded, removeBgType, width, height, tint]);

    const showProcessed = removeBg && removeBgType === 'js';

    // Core styles for the container
    const containerStyle: React.CSSProperties = {
        width: width * z,
        height: height * z,
        overflow: 'hidden',
        position: 'relative',
    };

    // Base style for the image
    let imgStyle: React.CSSProperties = {
        display: showProcessed ? 'none' : 'block',
        userSelect: 'none',
        pointerEvents: 'none',
        filter: filter || 'none',
        maxWidth: 'none',
    };

    if (crop) {
        // If cropped, we must use absolute positioning and transform to show the right slice
        imgStyle = {
            ...imgStyle,
            position: 'absolute',
            width: 'auto',
            height: 'auto',
            transform: `scale(${(width / crop.width) * z}) translate(${-crop.x}px, ${-crop.y}px)`,
            transformOrigin: '0 0',
        };
    } else {
        // Standard image render: Fill the component dimensions
        imgStyle = {
            ...imgStyle,
            width: width * z,
            height: height * z,
            objectFit: 'contain',
        };
    }

    const maskId = useMemo(() => `mask-${id}`, [id]);

    const maskTransform = useMemo(() => {
        if (!maskShape) return "";
        if (!maskViewBox) return "scale(0.01, 0.01)";
        const parts = maskViewBox.split(/[ ,]+/).filter(Boolean).map(Number);
        if (parts.length !== 4) return "scale(0.01, 0.01)";
        const [minX, minY, vbWidth, vbHeight] = parts;

        if (!vbWidth || !vbHeight) return "scale(0.01, 0.01)";

        // Small margin to prevent edge clipping (2% buffer)
        const margin = 0.02;
        const s = 1 - (margin * 2);

        const sx = s / vbWidth;
        const sy = s / vbHeight;

        return `translate(${margin}, ${margin}) scale(${sx}, ${sy}) translate(${-minX}, ${-minY})`;
    }, [maskShape, maskViewBox]);

    const clipPathStyle = useMemo(() => ({
        width: '100%',
        height: '100%',
        clipPath: maskShape ? `url(#${maskId})` : 'none',
        overflow: 'hidden'
    }), [maskShape, maskId]);

    // Adjust objectFit when masking is active
    if (maskShape && !crop) {
        imgStyle = {
            ...imgStyle,
            objectFit: 'cover',
        };
    }

    return (
        <div style={containerStyle}>
            {/* 
        The SVG needs to be in the DOM to be referencable. 
        Positioning it far away ensures it doesn't interfere but remains active.
      */}
            <svg
                style={{
                    position: 'fixed',
                    width: 0,
                    height: 0,
                    top: 0,
                    left: 0,
                    pointerEvents: 'none',
                    opacity: 0,
                    zIndex: -1
                }}
                aria-hidden="true"
            >
                <defs>
                    <clipPath id={maskId} clipPathUnits="objectBoundingBox">
                        {maskShape?.startsWith('M') ? (
                            <path d={maskShape} transform={maskTransform} />
                        ) : maskShape ? (
                            <polygon points={maskShape} transform={maskTransform} />
                        ) : (
                            <rect width="1" height="1" />
                        )}
                    </clipPath>
                </defs>
            </svg>
            <div style={clipPathStyle} key={maskId + (maskShape || '')}>
                <div className="relative w-full h-full">
                    <img
                        ref={imgRef}
                        src={src}
                        onLoad={() => setIsLoaded(true)}
                        style={imgStyle}
                        crossOrigin={showProcessed ? "anonymous" : undefined}
                        draggable={false}
                    />
                    {!showProcessed && tint && (
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                backgroundColor: tint,
                                ...(tintMode === 'transparent-only' ? {
                                    // Apply color ONLY to transparent areas
                                    // We create a mask from the image's alpha channel (inverted)
                                    maskImage: `url(${src})`,
                                    WebkitMaskImage: `url(${src})`,
                                    maskSize: 'contain',
                                    WebkitMaskSize: 'contain',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskPosition: 'center',
                                    WebkitMaskPosition: 'center',
                                    maskComposite: 'exclude', // Inverts the mask
                                    WebkitMaskComposite: 'xor', // Safari equivalent
                                } : {
                                    // Apply color to entire image (multiply blend)
                                    maskImage: `url(${src})`,
                                    WebkitMaskImage: `url(${src})`,
                                    maskSize: 'contain',
                                    WebkitMaskSize: 'contain',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskPosition: 'center',
                                    WebkitMaskPosition: 'center',
                                    mixBlendMode: 'multiply'
                                })
                            }}
                        />
                    )}
                </div>
                {showProcessed && (
                    <canvas
                        ref={canvasRef}
                        style={{
                            width: width * z,
                            height: height * z,
                            filter: filter || 'none'
                        }}
                    />
                )}
            </div>
        </div>
    );
});

export { ProcessedImage };
