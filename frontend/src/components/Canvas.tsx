import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Move
} from 'lucide-react';
import { CanvasElement, ProductVariant } from '../types';
import { DraggableElement } from './DraggableElement';

interface CanvasProps {
  elements: CanvasElement[];
  selectedElement: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>, skipHistory?: boolean) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  zoom: number;
  showSafeArea: boolean;
  productVariant: ProductVariant;
  showRulers: boolean;
  unit: 'cm' | 'mm' | 'inch';
  enableBounce: boolean;
  paperSize: string;
  customPaperDimensions: { width: number; height: number };
  safeAreaPadding: number;
  safeAreaRadius: number;
  safeAreaWidth?: number;
  safeAreaHeight?: number;
  safeAreaOffset: { x: number; y: number };
  onUpdateSafeAreaOffset: (offset: { x: number; y: number }, skipHistory?: boolean) => void;
  onUpdateSafeAreaWidth: (width: number) => void;
  onUpdateSafeAreaHeight: (height: number) => void;
  baseImage?: string;
  baseImageColor?: string;
  baseImageColorEnabled?: boolean;
  baseImageAsMask?: boolean;
  baseImageMaskInvert?: boolean;
  baseImageProperties: { x: number; y: number; scale: number; width?: number; height?: number; crop?: { x: number; y: number; width: number; height: number } };
  onUpdateBaseImage: (props: Partial<{ x: number; y: number; scale: number; width?: number; height?: number; crop?: { x: number; y: number; width: number; height: number } }>) => void;
  isPublicMode?: boolean;
  safeAreaShape?: 'rectangle' | 'circle';
  hideSafeAreaLine?: boolean;
  onZoomChange?: (zoom: number) => void;
  showGrid?: boolean;
}

export function Canvas({
  elements,
  selectedElement,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  zoom,
  showSafeArea,
  productVariant,
  showRulers,
  showGrid = false,
  unit,
  enableBounce,
  paperSize,
  customPaperDimensions,
  safeAreaPadding,
  safeAreaRadius = 0,
  safeAreaWidth,
  safeAreaHeight,
  safeAreaOffset,
  onZoomChange,
  onUpdateSafeAreaOffset,
  onUpdateSafeAreaWidth,
  onUpdateSafeAreaHeight,
  baseImage,
  baseImageColor,
  baseImageColorEnabled = false,
  baseImageAsMask = false,
  baseImageMaskInvert = false,
  baseImageProperties,
  onUpdateBaseImage,
  isPublicMode = false,
  hideSafeAreaLine = false,
}: CanvasProps) {
  const [isBaseImageLoaded, setIsBaseImageLoaded] = useState(false);

  useEffect(() => {
    setIsBaseImageLoaded(false);
  }, [baseImage]);

  const productColors: Record<string, string> = {
    white: '#ffffff',
    black: '#1a1a1a',
    navy: '#1e3a8a',
    gray: '#6b7280',
  };

  const getPixelsPerUnit = () => {
    switch (unit) {
      case 'mm': return 3.7795275591;
      case 'cm': return 37.795275591;
      case 'inch': return 96;
      default: return 37.795275591;
    }
  };

  const pxPerUnit = getPixelsPerUnit();
  const validZoom = Math.max(10, zoom || 100);

  const safeCustom = {
    width: Number(customPaperDimensions?.width) || 210,
    height: Number(customPaperDimensions?.height) || 297
  };

  const paperSizes: Record<string, { width: number; height: number }> = {
    'Default': { width: 1000 / 3.7795275591, height: 1000 / 3.7795275591 },
    'A4': { width: 210, height: 297 },
    'A3': { width: 297, height: 420 },
    'A5': { width: 148, height: 210 },
    'Letter': { width: 216, height: 279 },
    'Legal': { width: 216, height: 356 },
    'Tabloid': { width: 279, height: 432 },
    'Custom': safeCustom,
  };

  const paperMM = paperSizes[paperSize] || paperSizes['Default'];
  const mmToPx = 3.7795275591;

  const baseWidth = paperMM.width * mmToPx;
  const baseHeight = paperMM.height * mmToPx;
  const currentWidth = baseWidth * (validZoom / 100);
  const currentHeight = baseHeight * (validZoom / 100);

  const renderRulerTicks = (orientation: 'horizontal' | 'vertical') => {
    const ticks = [];
    const pixelsPerUnit = pxPerUnit * (validZoom / 100);
    const limit = orientation === 'horizontal' ? currentWidth : currentHeight;

    const majorStep = unit === 'mm' ? 10 : 1;
    const minorStep = 1;

    for (let i = 0; i * pixelsPerUnit <= limit; i += minorStep) {
      const pos = i * pixelsPerUnit;
      const isMajor = i % majorStep === 0;

      ticks.push(
        <g key={`${orientation}-${i}`}>
          <line
            x1={orientation === 'horizontal' ? pos : (orientation === 'vertical' ? (isMajor ? 0 : 15) : 0)}
            y1={orientation === 'horizontal' ? (isMajor ? 0 : 15) : (orientation === 'vertical' ? pos : 0)}
            x2={orientation === 'horizontal' ? pos : 25}
            y2={orientation === 'horizontal' ? 25 : (orientation === 'vertical' ? pos : 0)}
            stroke="#94a3b8"
            strokeWidth={isMajor ? 1 : 0.5}
          />
          {isMajor && (
            <text
              x={orientation === 'horizontal' ? pos + 2 : (orientation === 'vertical' ? 2 : 0)}
              y={orientation === 'horizontal' ? 10 : (orientation === 'vertical' ? pos - 2 : 0)}
              fontSize="8"
              fill="#64748b"
              className="select-none"
              style={{ transform: orientation === 'vertical' ? 'rotate(-90deg)' : 'none' }}
            >
              {i}{unit}
            </text>
          )}
        </g>
      );
    }
    return ticks;
  };

  const renderGrid = () => {
    const lines = [];
    const pixelsPerUnit = pxPerUnit * (validZoom / 100);

    // Vertical lines
    for (let x = 0; x <= currentWidth; x += pixelsPerUnit) {
      const isMajor = Math.round(x / pixelsPerUnit) % (unit === 'mm' ? 10 : 1) === 0;
      lines.push(
        <line
          key={`grid-v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={currentHeight}
          stroke={isMajor ? "rgba(79, 70, 229, 0.15)" : "rgba(79, 70, 229, 0.05)"}
          strokeWidth={isMajor ? 1 : 0.5}
        />
      );
    }

    // Horizontal lines
    for (let y = 0; y <= currentHeight; y += pixelsPerUnit) {
      const isMajor = Math.round(y / pixelsPerUnit) % (unit === 'mm' ? 10 : 1) === 0;
      lines.push(
        <line
          key={`grid-h-${y}`}
          x1={0}
          y1={y}
          x2={currentWidth}
          y2={y}
          stroke={isMajor ? "rgba(79, 70, 229, 0.15)" : "rgba(79, 70, 229, 0.05)"}
          strokeWidth={isMajor ? 1 : 0.5}
        />
      );
    }

    return lines;
  };

  return (
    <div
      className="absolute inset-0 overflow-auto bg-gray-100/50 custom-scrollbar p-12 md:p-24"
      onPointerDown={() => onSelectElement(null)}
      onClick={() => onSelectElement(null)}
    >
      <div className="flex min-w-full min-h-full">
        <div className="relative m-auto shrink-0 shadow-xl">
          {/* Rulers */}
          {showRulers && !isNaN(currentWidth) && (
            <>
              <div className="absolute -top-8 left-0 overflow-hidden bg-white/50 border-t border-x border-slate-200" style={{ width: currentWidth, height: 25 }}>
                <svg width={currentWidth} height={25}>{renderRulerTicks('horizontal')}</svg>
              </div>
              <div className="absolute top-0 -left-8 overflow-hidden bg-white/50 border-l border-y border-slate-200" style={{ width: 25, height: currentHeight }}>
                <svg width={25} height={currentHeight}>{renderRulerTicks('vertical')}</svg>
              </div>
            </>
          )}

          {/* Paper Canvas */}
          <div
            id="canvas-paper"
            className="relative bg-white shadow-md overflow-hidden"
            style={{
              width: currentWidth || 1000,
              height: currentHeight || 1000,
              backgroundColor: (productColors || {})[productVariant?.color || 'white'] || '#ffffff',
            }}
            onPointerDown={() => onSelectElement(null)}
            onClick={() => onSelectElement(null)}
          >
            {/* 2. DESIGN ELEMENTS LAYER */}
            {(() => {
              const zoomMult = (validZoom / 100);
              const maskW = (baseImageProperties?.width || 0) * (baseImageProperties?.scale || 1) * zoomMult;
              const maskH = (baseImageProperties?.height || 0) * (baseImageProperties?.scale || 1) * zoomMult;
              const maskX = (currentWidth - maskW) / 2 + (baseImageProperties?.x || 0) * zoomMult;
              const maskY = (currentHeight - maskH) / 2 + (baseImageProperties?.y || 0) * zoomMult;

              const maskStyle: React.CSSProperties = (baseImageAsMask && baseImage && isBaseImageLoaded) ? {
                WebkitMaskImage: baseImageMaskInvert
                  ? `url("${baseImage}")`
                  : `linear-gradient(black, black), url("${baseImage}")`,
                maskImage: baseImageMaskInvert
                  ? `url("${baseImage}")`
                  : `linear-gradient(black, black), url("${baseImage}")`,
                WebkitMaskSize: baseImageMaskInvert
                  ? `${maskW}px ${maskH}px`
                  : `100% 100%, ${maskW}px ${maskH}px`,
                maskSize: baseImageMaskInvert
                  ? `${maskW}px ${maskH}px`
                  : `100% 100%, ${maskW}px ${maskH}px`,
                WebkitMaskPosition: baseImageMaskInvert
                  ? `${maskX}px ${maskY}px`
                  : `0 0, ${maskX}px ${maskY}px`,
                maskPosition: baseImageMaskInvert
                  ? `${maskX}px ${maskY}px`
                  : `0 0, ${maskX}px ${maskY}px`,
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskComposite: baseImageMaskInvert ? 'source-over' : 'destination-out',
                maskComposite: baseImageMaskInvert ? 'add' : 'subtract',
              } : {};

              const clipStyle: React.CSSProperties = showSafeArea ? (() => {
                const p = (safeAreaPadding || 0) / 100;
                const wPercent = safeAreaWidth !== undefined ? safeAreaWidth / 100 : (1 - 2 * p);
                const hPercent = safeAreaHeight !== undefined ? safeAreaHeight / 100 : (1 - 2 * p);
                const zm = (validZoom / 100);

                const sW = currentWidth * wPercent;
                const sH = currentHeight * hPercent;

                const clipLeft = (currentWidth - sW) / 2 + (safeAreaOffset.x * zm);
                const clipRight = (currentWidth - sW) / 2 - (safeAreaOffset.x * zm);
                const clipTop = (currentHeight - sH) / 2 + (safeAreaOffset.y * zm);
                const clipBottom = (currentHeight - sH) / 2 - (safeAreaOffset.y * zm);

                const clipVal = `inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px round ${safeAreaRadius * zm}px)`;
                return { WebkitClipPath: clipVal, clipPath: clipVal };
              })() : {};

              return (
                <div
                  className="absolute inset-0 transition-all"
                  style={{
                    zIndex: 25, // Above mockup (20) for interactivity
                    ...maskStyle,
                    ...clipStyle
                  }}
                >
                  {/* Design Elements */}
                  {(elements || [])
                    .filter(el => !!el && el.type !== 'file_upload' && (!isPublicMode || (el.isVisible !== false && !(el as any).isHiddenByLogic)))
                    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                    .map((element) => (
                      <DraggableElement
                        key={element.id}
                        element={element}
                        isSelected={selectedElement === element.id}
                        onSelect={() => onSelectElement(element.id)}
                        onUpdate={(updates: Partial<CanvasElement>, skipHistory?: boolean) => onUpdateElement(element.id, updates, skipHistory)}
                        onDelete={() => onDeleteElement(element.id)}
                        onDuplicate={() => onDuplicateElement(element.id)}
                        zoom={validZoom}
                        enableBounce={enableBounce}
                        isPublicMode={isPublicMode}
                      />
                    ))}
                </div>
              );
            })()}


            {/* 4. MOCKUP IMAGE LAYER */}
            {baseImage && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none imcst-base-image"
                style={{
                  zIndex: 20
                }}
              >
                <motion.div
                  drag
                  dragMomentum={false}
                  onDrag={(_e, info) => {
                    const zoomMult = (validZoom / 100);
                    onUpdateBaseImage({
                      x: (baseImageProperties?.x || 0) + info.delta.x / zoomMult,
                      y: (baseImageProperties?.y || 0) + info.delta.y / zoomMult,
                    });
                  }}
                  className="relative cursor-move pointer-events-auto"
                  style={{
                    x: (baseImageProperties?.x || 0) * (validZoom / 100),
                    y: (baseImageProperties?.y || 0) * (validZoom / 100),
                    scale: (baseImageProperties?.scale || 1),
                  }}
                >
                  <img
                    src={baseImage === 'none' ? undefined : baseImage}
                    crossOrigin="anonymous"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      if (!baseImageProperties?.width) {
                        onUpdateBaseImage({ width: img.naturalWidth, height: img.naturalHeight });
                      }
                      setIsBaseImageLoaded(true);
                    }}
                    style={{
                      width: (baseImageProperties?.width || 0) * (validZoom / 100),
                      height: (baseImageProperties?.height || 0) * (validZoom / 100),
                      display: baseImage === 'none' ? 'none' : 'block',
                      maxWidth: 'none',
                    }}
                    draggable={false}
                  />

                  {/* Color Overlay: Now applied to TRANSPARENT area as per user's request */}
                  {baseImageColorEnabled && baseImageColor && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundColor: baseImageColor,
                        WebkitMaskImage: `linear-gradient(black, black), url("${baseImage}")`,
                        maskImage: `linear-gradient(black, black), url("${baseImage}")`,
                        WebkitMaskSize: '100% 100%, 100% 100%',
                        maskSize: '100% 100%, 100% 100%',
                        WebkitMaskRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center',
                        maskPosition: 'center',
                        WebkitMaskComposite: 'destination-out',
                        maskComposite: 'subtract',
                        mixBlendMode: 'normal'
                      }}
                    />
                  )}
                </motion.div>
              </div>
            )}

            {/* Safe Area Controls (only show in Admin / non-public) */}
            {showSafeArea && !isNaN(currentWidth) && !isNaN(currentHeight) && (
              <motion.div
                className="absolute inset-0 pointer-events-none z-[30]"
              >
                {(() => {
                  const p = (safeAreaPadding || 0) / 100;
                  const wPercent = safeAreaWidth !== undefined ? safeAreaWidth / 100 : (1 - 2 * p);
                  const hPercent = safeAreaHeight !== undefined ? safeAreaHeight / 100 : (1 - 2 * p);
                  const zoomMult = (validZoom / 100);

                  const safeW = currentWidth * wPercent;
                  const safeH = currentHeight * hPercent;

                  const insetX = (currentWidth - safeW) / 2 + (safeAreaOffset.x * zoomMult);
                  const insetY = (currentHeight - safeH) / 2 + (safeAreaOffset.y * zoomMult);

                  return (
                    <>
                      <div
                        className="absolute border-2 border-dashed border-indigo-400 pointer-events-none"
                        style={{
                          top: insetY,
                          left: insetX,
                          width: safeW,
                          height: safeH,
                          borderRadius: `${safeAreaRadius * zoomMult}px`,
                          display: hideSafeAreaLine ? 'none' : 'block'
                        }}
                      >
                        {!hideSafeAreaLine && !isPublicMode && (
                          <>
                            {/* Drag Handle (Move) */}
                            <div
                              className="absolute -top-6 left-0 bg-white shadow-sm border border-indigo-100 rounded-md px-2 py-0.5 flex items-center gap-1 cursor-move pointer-events-auto"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                const startPos = { x: e.clientX, y: e.clientY };
                                const startOffset = { ...safeAreaOffset };

                                const onMove = (moveEvent: PointerEvent) => {
                                  const dx = (moveEvent.clientX - startPos.x) / zoomMult;
                                  const dy = (moveEvent.clientY - startPos.y) / zoomMult;
                                  onUpdateSafeAreaOffset({ x: startOffset.x + dx, y: startOffset.y + dy }, true);
                                };

                                const onUp = (upEvent: PointerEvent) => {
                                  const dx = (upEvent.clientX - startPos.x) / zoomMult;
                                  const dy = (upEvent.clientY - startPos.y) / zoomMult;
                                  onUpdateSafeAreaOffset({ x: startOffset.x + dx, y: startOffset.y + dy }, false);
                                  window.removeEventListener('pointermove', onMove);
                                  window.removeEventListener('pointerup', onUp);
                                };

                                window.addEventListener('pointermove', onMove);
                                window.addEventListener('pointerup', onUp);
                              }}
                            >
                              <Move className="w-3 h-3 text-indigo-600" />
                              <span className="text-[10px] font-medium text-indigo-700 whitespace-nowrap">Safe Area</span>
                            </div>

                            {/* Resize Handles */}
                            {[
                              { type: 'nw', cursor: 'nw-resize', pos: { top: -4, left: -4 } },
                              { type: 'n', cursor: 'ns-resize', pos: { top: -4, left: '50%', marginLeft: -4 } },
                              { type: 'ne', cursor: 'ne-resize', pos: { top: -4, right: -4 } },
                              { type: 'e', cursor: 'ew-resize', pos: { top: '50%', right: -4, marginTop: -4 } },
                              { type: 'se', cursor: 'se-resize', pos: { bottom: -4, right: -4 } },
                              { type: 's', cursor: 'ns-resize', pos: { bottom: -4, left: '50%', marginLeft: -4 } },
                              { type: 'sw', cursor: 'sw-resize', pos: { bottom: -4, left: -4 } },
                              { type: 'w', cursor: 'ew-resize', pos: { top: '50%', left: -4, marginTop: -4 } },
                            ].map((handle) => (
                              <div
                                key={handle.type}
                                className="absolute bg-white border border-indigo-500 rounded-full w-2 h-2 pointer-events-auto z-40"
                                style={{
                                  ...handle.pos,
                                  cursor: handle.cursor,
                                }}
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  const startPos = { x: e.clientX, y: e.clientY };
                                  // Capture initial values (unzoomed)
                                  const startWPercent = safeAreaWidth !== undefined ? safeAreaWidth : ((1 - 2 * p) * 100);
                                  const startHPercent = safeAreaHeight !== undefined ? safeAreaHeight : ((1 - 2 * p) * 100);
                                  const startOffset = { ...safeAreaOffset };

                                  // Base canvas dimensions (unzoomed)
                                  const bW = baseWidth;
                                  const bH = baseHeight;

                                  const onMove = (moveEvent: PointerEvent) => {
                                    // Delta in unzoomed pixels
                                    const dx = (moveEvent.clientX - startPos.x) / zoomMult;
                                    const dy = (moveEvent.clientY - startPos.y) / zoomMult;

                                    let newWPercent = startWPercent;
                                    let newHPercent = startHPercent;
                                    let newOffsetX = startOffset.x;
                                    let newOffsetY = startOffset.y;

                                    // Width Logic
                                    if (handle.type.includes('e')) {
                                      // Right edge moves right (+dx)
                                      const dW = dx;
                                      const newW = (bW * (startWPercent / 100)) + dW;
                                      newWPercent = (newW / bW) * 100;
                                      newOffsetX = startOffset.x + (dx / 2);
                                    } else if (handle.type.includes('w')) {
                                      // Left edge moves left (+dx is right, so we want -dx to increase width)
                                      // Actually if we move mouse left (dx negative), width INCREASES.
                                      const dW = -dx;
                                      const newW = (bW * (startWPercent / 100)) + dW;
                                      newWPercent = (newW / bW) * 100;
                                      newOffsetX = startOffset.x + (dx / 2);
                                    }

                                    // Height Logic
                                    if (handle.type.includes('s')) {
                                      // Bottom edge moves down (+dy)
                                      const dH = dy;
                                      const newH = (bH * (startHPercent / 100)) + dH;
                                      newHPercent = (newH / bH) * 100;
                                      newOffsetY = startOffset.y + (dy / 2);
                                    } else if (handle.type.includes('n')) {
                                      // Top edge moves up (dy negative -> width increases)
                                      const dH = -dy;
                                      const newH = (bH * (startHPercent / 100)) + dH;
                                      newHPercent = (newH / bH) * 100;
                                      newOffsetY = startOffset.y + (dy / 2);
                                    }

                                    // Updates
                                    if (handle.type.includes('e') || handle.type.includes('w')) {
                                      onUpdateSafeAreaWidth(Math.max(1, Math.min(100, newWPercent)));
                                    }
                                    if (handle.type.includes('n') || handle.type.includes('s')) {
                                      onUpdateSafeAreaHeight(Math.max(1, Math.min(100, newHPercent)));
                                    }

                                    onUpdateSafeAreaOffset({ x: newOffsetX, y: newOffsetY }, true);
                                  };

                                  const onUp = () => {
                                    window.removeEventListener('pointermove', onMove);
                                    window.removeEventListener('pointerup', onUp);
                                  };

                                  window.addEventListener('pointermove', onMove);
                                  window.addEventListener('pointerup', onUp);
                                }}
                              />
                            ))}
                          </>
                        )}
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}
            {/* Grid Overlay */}
            {showGrid && (
              <svg
                className="absolute inset-0 pointer-events-none z-[50]"
                width={currentWidth}
                height={currentHeight}
              >
                {renderGrid()}
              </svg>
            )}
          </div>

        </div>
      </div >
    </div >
  );
}
