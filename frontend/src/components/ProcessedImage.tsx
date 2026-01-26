import { useRef, useState, useMemo, memo, useEffect } from 'react';

const ProcessedImage = memo(({ id, src, removeBg, removeBgType, deep, mode, width, height, zoom, filter, crop, maskShape, maskViewBox, tint, tintMode, isEngraved, engraveThreshold = 128, engraveColor = '#000000', engraveInvert }: {
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
    tintMode?: 'transparent-only' | 'full-image',
    isEngraved?: boolean,
    engraveThreshold?: number,
    engraveColor?: string,
    engraveInvert?: boolean
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(false);
    }, [src]);

    const z = zoom / 100;

    useEffect(() => {
        if ((!removeBg || removeBgType !== 'js') && !isEngraved) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true });
        const img = imgRef.current;

        if (!canvas || !ctx || !img || !isLoaded) return;

        const process = () => {
            try {
                // Setup canvas dimensions
                if (crop) {
                    canvas.width = crop.width;
                    canvas.height = crop.height;
                    ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
                } else {
                    canvas.width = img.naturalWidth || width;
                    canvas.height = img.naturalHeight || height;
                    ctx.drawImage(img, 0, 0);
                }

                // Parse Colors
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

                let engraveRGB: { r: number, g: number, b: number } | null = null;
                if (isEngraved && engraveColor) {
                    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(engraveColor);
                    if (result) {
                        engraveRGB = {
                            r: parseInt(result[1], 16),
                            g: parseInt(result[2], 16),
                            b: parseInt(result[3], 16)
                        };
                    }
                }

                if (deep > 0 || tintRGB || isEngraved) {
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    for (let i = 0; i < data.length; i += 4) {
                        let R = data[i];
                        let G = data[i + 1];
                        let B = data[i + 2];
                        let A = data[i + 3];

                        // 1. Background Removal
                        if (!isEngraved && removeBg && removeBgType === 'js' && deep > 0) {
                            if (mode !== 'dark') {
                                if (255 - R < deep && 255 - G < deep && 255 - B < deep) {
                                    A = Math.max(0, Math.min(255, ((((255 - R) / deep) + ((255 - G) / deep) + ((255 - B) / deep)) / 3) * 255));
                                    data[i + 3] = A;
                                }
                            } else {
                                if (R < deep && G < deep && B < deep) {
                                    A = Math.max(0, Math.min(255, (((R / deep) + (G / deep) + (B / deep)) / 3) * 255));
                                    data[i + 3] = A;
                                }
                            }
                        }

                        if (A === 0) continue;

                        // 2. Engraving or Tinting
                        if (isEngraved) {
                            const gray = 0.299 * R + 0.587 * G + 0.114 * B;
                            const isTransparent = engraveInvert
                                ? gray < (engraveThreshold || 128)
                                : gray > (engraveThreshold || 128);

                            if (isTransparent) {
                                data[i + 3] = 0;
                            } else {
                                data[i] = engraveRGB?.r ?? 0;
                                data[i + 1] = engraveRGB?.g ?? 0;
                                data[i + 2] = engraveRGB?.b ?? 0;
                                data[i + 3] = 255;
                            }
                        } else if (tintRGB) {
                            data[i] = (R * tintRGB.r) / 255;
                            data[i + 1] = (G * tintRGB.g) / 255;
                            data[i + 2] = (B * tintRGB.b) / 255;
                        }
                    }
                    ctx.putImageData(imageData, 0, 0);
                }
            } catch (err) {
                console.error("Canvas Processing Error:", err);
            }
        };

        process();
    }, [src, removeBg, deep, mode, crop, isLoaded, removeBgType, width, height, tint, isEngraved, engraveThreshold, engraveColor, engraveInvert]);

    const showProcessed = (removeBg && removeBgType === 'js') || isEngraved;

    const containerStyle: React.CSSProperties = {
        width: width * z,
        height: height * z,
        overflow: 'hidden',
        position: 'relative',
    };

    let imgStyle: React.CSSProperties = {
        visibility: showProcessed ? 'hidden' : 'visible',
        position: showProcessed ? 'absolute' : 'relative',
        userSelect: 'none',
        pointerEvents: 'none',
        filter: filter || 'none',
        maxWidth: 'none',
    };

    if (crop) {
        imgStyle = {
            ...imgStyle,
            position: 'absolute',
            width: 'auto',
            height: 'auto',
            transform: `scale(${(width / crop.width) * z}) translate(${-crop.x}px, ${-crop.y}px)`,
            transformOrigin: '0 0',
        };
    } else {
        imgStyle = {
            ...imgStyle,
            width: width * z,
            height: height * z,
            objectFit: 'contain',
        };
    }

    const maskId = useMemo(() => `mask-${id}`, [id]);
    const maskTransform = useMemo(() => {
        if (!maskShape || !maskViewBox) return "";
        const parts = maskViewBox.split(/[ ,]+/).filter(Boolean).map(Number);
        if (parts.length !== 4) return "";
        const [minX, minY, vbWidth, vbHeight] = parts;
        if (!vbWidth || !vbHeight) return "";
        const margin = 0.02;
        const s = 1 - (margin * 2);
        return `translate(${margin}, ${margin}) scale(${s / vbWidth}, ${s / vbHeight}) translate(${-minX}, ${-minY})`;
    }, [maskShape, maskViewBox]);

    const clipPathStyle = useMemo(() => ({
        width: '100%',
        height: '100%',
        clipPath: maskShape ? `url(#${maskId})` : 'none',
        overflow: 'hidden'
    }), [maskShape, maskId]);

    if (maskShape && !crop) {
        imgStyle = { ...imgStyle, objectFit: 'cover' };
    }

    return (
        <div style={containerStyle}>
            <svg style={{ position: 'fixed', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
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
                <div
                    className="relative w-full h-full"
                    style={{
                        visibility: showProcessed ? 'hidden' : 'visible',
                        pointerEvents: showProcessed ? 'none' : 'auto',
                        position: showProcessed ? 'absolute' : 'relative',
                        top: 0,
                        left: 0
                    }}
                >
                    <img
                        ref={imgRef}
                        src={src}
                        onLoad={() => setIsLoaded(true)}
                        style={imgStyle}
                        crossOrigin={src.startsWith('data:') || src.startsWith('blob:') ? undefined : "anonymous"}
                        draggable={false}
                    />
                    {!showProcessed && tint && (
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                backgroundColor: tint,
                                maskImage: `url(${src})`,
                                WebkitMaskImage: `url(${src})`,
                                maskSize: 'contain',
                                WebkitMaskSize: 'contain',
                                maskRepeat: 'no-repeat',
                                WebkitMaskRepeat: 'no-repeat',
                                maskPosition: 'center',
                                WebkitMaskPosition: 'center',
                                ...(tintMode === 'transparent-only' ? {
                                    maskComposite: 'exclude',
                                    WebkitMaskComposite: 'xor',
                                } : {
                                    mixBlendMode: 'multiply'
                                })
                            }}
                        />
                    )}
                </div>
                <canvas
                    ref={canvasRef}
                    style={{
                        width: width * z,
                        height: height * z,
                        display: showProcessed ? 'block' : 'none',
                        filter: filter || 'none'
                    }}
                />
            </div>
        </div>
    );
});

export { ProcessedImage };
