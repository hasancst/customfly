import React, { useRef, useEffect } from 'react';
import { CanvasElement } from '@/types';
import { cleanAssetName } from '@/utils/fonts';

interface TextRendererProps {
    element: CanvasElement;
    zoom: number;
    localState: {
        width: number;
        height: number;
        fontSize: number;
    };
    textScale: { x: number; y: number };
    isEditing: boolean;
    contentRef: React.RefObject<HTMLDivElement | null>;
    getStrokeStyle: () => React.CSSProperties;
    getGradientStyle: () => React.CSSProperties;
}

export const BridgeText = ({
    element,
    zoom,
    width,
    height,
    fontSize
}: {
    element: CanvasElement,
    zoom: number,
    width: number,
    height: number,
    fontSize: number
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !element.bridge) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 1. Render text to a temporary canvas to get the raw image
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        const fontSizeRaw = fontSize * 2; // Render at 2x for better quality
        tempCtx.font = `${element.fontWeight || 400} ${fontSizeRaw}px ${cleanAssetName(element.fontFamily || '') || 'Inter'}`;
        // @ts-ignore - letterSpacing is a standard but sometimes missing from types
        if ('letterSpacing' in tempCtx) {
            tempCtx.letterSpacing = `${(element.letterSpacing || 0) * 2}px`;
        }
        const text = element.text || '';
        const metrics = tempCtx.measureText(text);

        // Set temp canvas size
        const textWidth = metrics.width;
        const textHeight = fontSize * 1.5;
        tempCanvas.width = textWidth || 100;
        tempCanvas.height = textHeight || 50;

        // Draw text
        tempCtx.font = `${element.fontWeight || 400} ${fontSizeRaw}px ${cleanAssetName(element.fontFamily || '') || 'Inter'}`;

        if (element.fillType === 'gradient' && element.gradient) {
            const { from, to } = element.gradient;
            const grad = tempCtx.createLinearGradient(0, 0, textWidth, 0);
            grad.addColorStop(0, from);
            grad.addColorStop(1, to);
            tempCtx.fillStyle = grad;
        } else {
            tempCtx.fillStyle = element.color || '#000000';
        }

        tempCtx.textBaseline = 'middle';
        tempCtx.textAlign = 'left';

        // Draw stroke first so fill is on top
        if (element.strokeWidth && element.strokeWidth > 0) {
            tempCtx.lineWidth = element.strokeWidth * 2; // Scale for 2x canvas
            tempCtx.strokeStyle = element.strokeColor || '#000000';
            tempCtx.lineJoin = 'round';
            tempCtx.strokeText(text, 0, tempCanvas.height / 2);
        }

        tempCtx.fillText(text, 0, tempCanvas.height / 2);

        // 2. Apply bridge logic
        const ops = element.bridge;
        const w = tempCanvas.width;
        const h = tempCanvas.height * 8; // Increased to 8 to be very safe against clipping

        canvas.width = w;
        canvas.height = h;
        ctx.clearRect(0, 0, w, h);

        const unit = tempCanvas.height;
        const curveVal = (ops.curve / 2) * unit;
        const topVal = ops.offsetY * unit;
        const bottomVal = ops.bottom * unit;
        const trident = ops.trident;
        const oblique = ops.oblique;
        const angle = (oblique ? 45 : 180) / w;

        let dVal = 0;
        let yVal = 0;
        if (trident) {
            yVal = bottomVal;
            dVal = curveVal / (h * 0.25);
            if ((dVal * w * 0.5) > bottomVal) {
                dVal = bottomVal / (w * 0.5);
            }
        }

        for (let i = 0; i < w; i++) {
            if (trident) {
                if (i > (w * 0.5)) yVal -= dVal;
                else yVal += dVal;
            } else {
                yVal = bottomVal - curveVal * Math.sin(i * angle * Math.PI / 180);
            }

            // Center the render vertically at h * 0.5
            ctx.drawImage(
                tempCanvas,
                i, 0, 1, unit,
                i, h * 0.5 - (topVal / unit) * yVal, 1, yVal
            );
        }
    }, [element, fontSize]);

    const style = {
        width: width * (zoom / 100),
        height: height * (zoom / 100),
        objectFit: 'fill' as const,
        userSelect: 'none' as const,
        pointerEvents: 'none' as const,
    };

    return <canvas ref={canvasRef} style={style} />;
};

export const TextRenderer: React.FC<TextRendererProps> = ({
    element,
    zoom,
    localState,
    textScale,
    isEditing,
    contentRef,
    getStrokeStyle,
    getGradientStyle,
}) => {
    if (element.type === 'monogram') {
        const letters = (element.text || 'ABC').split('');
        const l1 = letters[0] || '';
        const l2 = letters[1] || '';
        const l3 = letters[2] || '';
        const type = element.monogramType || 'Vine';
        const color = element.color || '#000000';
        const size = (localState.fontSize || 100) * (zoom / 100);
        const gradientStyle = getGradientStyle();
        const strokeStyle = getStrokeStyle();

        // Custom font mode
        if (element.fontFamily && !element.monogramType) {
            return (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{
                        fontFamily: cleanAssetName(element.fontFamily || '') || 'Inter',
                        fontSize: size,
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                        ...gradientStyle,
                        ...strokeStyle,
                        color: element.fillType === 'gradient' ? 'transparent' : color,
                        letterSpacing: element.letterSpacing ? `${element.letterSpacing * (zoom / 100)}px` : 'normal'
                    }}>
                        {l1}{l2}{l3}
                    </span>
                </div>
            );
        }

        if (type === 'Vine') {
            return (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{
                        fontFamily: 'Vine',
                        fontSize: size,
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                        ...gradientStyle,
                        ...strokeStyle,
                        color: element.fillType === 'gradient' ? 'transparent' : color,
                        letterSpacing: element.letterSpacing ? `${element.letterSpacing * (zoom / 100)}px` : 'normal'
                    }}>
                        {l1}{l2}{l3}
                    </span>
                </div>
            );
        }

        if (type === 'Stacked') {
            return (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: size * 0.05 }}>
                        <div style={{
                            fontFamily: 'Stacked-Top-Left',
                            fontSize: size * 0.4,
                            ...gradientStyle,
                            ...strokeStyle,
                            color: element.fillType === 'gradient' ? 'transparent' : color
                        }}>{l1}</div>
                        <div style={{
                            fontFamily: 'Stacked-Bottom-Left',
                            fontSize: size * 0.4,
                            ...gradientStyle,
                            ...strokeStyle,
                            color: element.fillType === 'gradient' ? 'transparent' : color
                        }}>{l2}</div>
                    </div>
                    <div style={{
                        fontFamily: 'Stacked-Tall-Right',
                        fontSize: size,
                        ...gradientStyle,
                        ...strokeStyle,
                        color: element.fillType === 'gradient' ? 'transparent' : color,
                        letterSpacing: element.letterSpacing ? `${element.letterSpacing * (zoom / 100)}px` : 'normal'
                    }}>{l3}</div>
                </div>
            );
        }

        const fontPrefix = type;
        return (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                letterSpacing: element.letterSpacing ? `${element.letterSpacing * (zoom / 100)}px` : 'normal'
            }}>
                <span style={{
                    fontFamily: `${fontPrefix}-Left`,
                    fontSize: size,
                    ...gradientStyle,
                    ...strokeStyle,
                    color: element.fillType === 'gradient' ? 'transparent' : color
                }}>{l1}</span>
                <span style={{
                    fontFamily: `${fontPrefix}-Mid`,
                    fontSize: size,
                    ...gradientStyle,
                    ...strokeStyle,
                    color: element.fillType === 'gradient' ? 'transparent' : color
                }}>{l2}</span>
                <span style={{
                    fontFamily: `${fontPrefix}-Right`,
                    fontSize: size,
                    ...gradientStyle,
                    ...strokeStyle,
                    color: element.fillType === 'gradient' ? 'transparent' : color
                }}>{l3}</span>
            </div>
        );
    }

    // Handle bridging
    if (element.type === 'text' && element.bridge) {
        return (
            <BridgeText
                element={element}
                zoom={zoom}
                width={localState.width}
                height={localState.height}
                fontSize={localState.fontSize}
            />
        );
    }

    // Handle Curved Text
    if (element.type === 'text' && element.isCurved && element.curve && element.curve !== 0) {
        const fontSize = (localState.fontSize || 32);
        const text = element.text || '';
        const CURVE_SCALE = 3000;
        const radius = Math.abs(CURVE_SCALE / element.curve);
        const isSmile = element.curve > 0;
        const pathId = `curve-path-${element.id}`;

        const startY = isSmile ? -radius : radius;
        const sweepFlag = isSmile ? 0 : 1;
        const d = `M 0,${startY} a ${radius},${radius} 0 1,${sweepFlag} 0,${isSmile ? radius * 2 : -radius * 2} a ${radius},${radius} 0 1,${sweepFlag} 0,${isSmile ? -radius * 2 : radius * 2}`;

        const padding = fontSize;
        const viewBoxRadius = radius + padding;

        return (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                pointerEvents: 'none'
            }}>
                <svg
                    overflow="visible"
                    width="100%"
                    height="100%"
                    viewBox={`${-viewBoxRadius} ${-viewBoxRadius} ${viewBoxRadius * 2} ${viewBoxRadius * 2}`}
                >
                    <defs>
                        <path id={pathId} d={d} />
                        {element.fillType === 'gradient' && element.gradient && (
                            <linearGradient id={`gradient-${element.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={element.gradient.from} />
                                <stop offset="100%" stopColor={element.gradient.to} />
                            </linearGradient>
                        )}
                    </defs>

                    <text
                        fontSize={fontSize}
                        fontFamily={cleanAssetName(element.fontFamily || '') || 'Inter'}
                        fontWeight={element.fontWeight || 400}
                        fill={element.fillType === 'gradient' ? `url(#gradient-${element.id})` : (element.color || '#000000')}
                        stroke={element.strokeWidth && element.strokeWidth > 0 ? (element.strokeColor || '#000000') : 'none'}
                        strokeWidth={element.strokeWidth ? element.strokeWidth : 0}
                        strokeLinejoin="round"
                        paintOrder="stroke fill"
                        textAnchor="middle"
                        letterSpacing={element.letterSpacing}
                    >
                        <textPath href={`#${pathId}`} startOffset="50%">
                            {text}
                        </textPath>
                    </text>
                </svg>
            </div>
        );
    }

    // Default text rendering (shrink/wrap)
    const mode = element.textMode || 'shrink';
    const isWrap = mode === 'wrap';

    return (
        <div
            style={{
                fontSize: localState.fontSize * (zoom / 100),
                fontFamily: cleanAssetName(element.fontFamily || '') || 'Inter',
                fontWeight: element.fontWeight || 400,
                fontStyle: element.italic ? 'italic' : 'normal',
                textDecoration: element.underline ? 'underline' : 'none',
                textAlign: (element.textAlign || 'center') as any,
                whiteSpace: isWrap ? 'pre-wrap' : 'nowrap',
                wordBreak: isWrap ? 'break-word' : 'normal',
                userSelect: 'none',
                lineHeight: 1.1,
                width: '100%',
                height: isWrap ? 'auto' : '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                    element.textAlign === 'left' ? 'flex-start' :
                        element.textAlign === 'right' ? 'flex-end' :
                            'center',
                overflow: 'visible',
                padding: 0,
                visibility: isEditing ? 'hidden' : 'visible',
                letterSpacing: element.letterSpacing ? `${element.letterSpacing * (zoom / 100)}px` : 'normal'
            }}
        >
            <div
                ref={contentRef}
                style={{
                    transform: isWrap ? 'none' : `scale(${textScale.x}, ${textScale.y})`,
                    transformOrigin: 'center center',
                    width: isWrap ? '100%' : 'fit-content',
                    whiteSpace: isWrap ? 'pre-wrap' : 'nowrap',
                    textAlign: (element.textAlign || 'center') as any,
                    ...getGradientStyle(),
                    ...getStrokeStyle(),
                    color: element.fillType === 'gradient' ? 'transparent' : (element.color || '#000000'),
                }}
            >
                {element.text}
            </div>
        </div>
    );
};
