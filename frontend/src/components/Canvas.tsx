import { motion, useDragControls } from 'motion/react';
import { Move } from 'lucide-react';
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
  unit,
  enableBounce,
  paperSize,
  customPaperDimensions,
  safeAreaPadding,
  safeAreaRadius = 0,
  safeAreaWidth,
  safeAreaHeight,
  safeAreaOffset,
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
}: CanvasProps) {
  const dragControls = useDragControls();
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

  // Convert mm to pixels
  const mmToPx = 3.7795275591;

  // Paper sizes in mm (width x height)
  const paperSizes: Record<string, { width: number; height: number }> = {
    'Default': { width: 1000 / mmToPx, height: 1000 / mmToPx },
    'A4': { width: 210, height: 297 },
    'A3': { width: 297, height: 420 },
    'A5': { width: 148, height: 210 },
    'Letter': { width: 216, height: 279 },
    'Legal': { width: 216, height: 356 },
    'Tabloid': { width: 279, height: 432 },
    'Custom': customPaperDimensions || { width: 210, height: 297 },
  };

  const selectedPaper = paperSizes[paperSize] || paperSizes['A4'];
  const pxPerUnit = getPixelsPerUnit();
  const validZoom = isNaN(zoom) || zoom <= 0 ? 100 : zoom;
  const scaledPxPerUnit = pxPerUnit * (validZoom / 100);

  const baseWidth = selectedPaper.width * mmToPx;
  const baseHeight = selectedPaper.height * mmToPx;
  const currentWidth = baseWidth * (validZoom / 100);
  const currentHeight = baseHeight * (validZoom / 100);

  const renderRulerTicks = (orientation: 'horizontal' | 'vertical') => {
    if (isNaN(currentWidth) || isNaN(currentHeight)) return null;
    const ticks = [];
    const length = orientation === 'horizontal' ? currentWidth : currentHeight;
    const count = Math.floor(length / scaledPxPerUnit);

    for (let i = 0; i <= count; i++) {
      const pos = i * scaledPxPerUnit;
      const isMajor = i % 5 === 0;
      const isTen = i % 10 === 0;

      ticks.push(
        <g key={i}>
          <line
            x1={orientation === 'horizontal' ? pos : 0}
            y1={orientation === 'horizontal' ? (isTen ? 0 : (isMajor ? 10 : 15)) : pos}
            x2={orientation === 'horizontal' ? pos : (isTen ? 25 : (isMajor ? 15 : 10))}
            y2={orientation === 'horizontal' ? 25 : pos}
            stroke="#94a3b8"
            strokeWidth="1"
          />
          {isTen && (
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

  return (
    <div
      className="flex-1 p-12 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 relative"
      onPointerDown={() => onSelectElement(null)}
      onClick={() => onSelectElement(null)}
    >
      <div className="flex items-center justify-center min-h-full">
        <div className="relative">
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
            className={`relative bg-white shadow-2xl overflow-hidden ${showRulers ? 'rounded-br-3xl' : 'rounded-3xl'}`}
            style={{
              width: currentWidth || 1000,
              height: currentHeight || 1000,
              backgroundColor: (productColors || {})[productVariant?.color || 'white'] || '#ffffff',
            }}
            onPointerDown={() => onSelectElement(null)}
            onClick={() => onSelectElement(null)}
          >
            {/* Base Image */}
            {baseImage && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[0]">
                <motion.div
                  drag
                  dragMomentum={false}
                  onDragEnd={(_, info) => {
                    onUpdateBaseImage({
                      x: (baseImageProperties?.x || 0) + info.offset.x / (validZoom / 100),
                      y: (baseImageProperties?.y || 0) + info.offset.y / (validZoom / 100),
                    });
                  }}
                  className="cursor-move select-none pointer-events-auto relative"
                  style={{
                    x: (baseImageProperties?.x || 0) * (validZoom / 100),
                    y: (baseImageProperties?.y || 0) * (validZoom / 100),
                    scale: (baseImageProperties?.scale || 1) * (validZoom / 100),
                    maxWidth: 'none',
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      width: baseImageProperties?.width ? `${baseImageProperties.width}px` : 'auto',
                      height: baseImageProperties?.height ? `${baseImageProperties.height}px` : 'auto',
                      backgroundColor: (baseImageColorEnabled && baseImageColor) ? baseImageColor : 'transparent',
                    }}
                  >
                    <img src={baseImage} alt="Base" className="block max-w-none drag-none pointer-events-none" draggable={false} />
                  </div>
                </motion.div>
              </div>
            )}

            {/* Safe Print Area Overlay (Only show handles/border in Admin) */}
            {showSafeArea && !isPublicMode && !isNaN(currentWidth) && !isNaN(currentHeight) && (
              <motion.div
                drag
                dragControls={dragControls}
                dragListener={false}
                dragMomentum={false}
                dragElastic={0}
                onDrag={(e, info) => {
                  onUpdateSafeAreaOffset({
                    x: (safeAreaOffset?.x || 0) + info.delta.x / (validZoom / 100),
                    y: (safeAreaOffset?.y || 0) + info.delta.y / (validZoom / 100)
                  }, true); // skipHistory
                }}
                onDragEnd={() => {
                  onUpdateSafeAreaOffset(safeAreaOffset, false); // commitHistory
                }}
                className="absolute inset-0 z-30 pointer-events-none group/safe-area imcst-preview-hide"
                style={{
                  x: (safeAreaOffset?.x || 0) * (validZoom / 100),
                  y: (safeAreaOffset?.y || 0) * (validZoom / 100),
                }}
              >
                {(() => {
                  const p = (safeAreaPadding || 0) / 100;
                  const wPercent = safeAreaWidth !== undefined ? safeAreaWidth / 100 : (1 - 2 * p);
                  const hPercent = safeAreaHeight !== undefined ? safeAreaHeight / 100 : (1 - 2 * p);
                  const safeW = currentWidth * wPercent;
                  const safeH = currentHeight * hPercent;
                  const insetX = (currentWidth - safeW) / 2;
                  const insetY = (currentHeight - safeH) / 2;
                  const zoomMult = validZoom / 100;

                  const handleResize = (e: React.PointerEvent, direction: 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se') => {
                    e.stopPropagation();
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startW = safeW;
                    const startH = safeH;
                    const startInsetX = insetX;
                    const startInsetY = insetY;

                    const onPointerMove = (moveEvent: PointerEvent) => {
                      const deltaX = (moveEvent.clientX - startX) / zoomMult;
                      const deltaY = (moveEvent.clientY - startY) / zoomMult;

                      let newW = startW;
                      let newH = startH;
                      let newInsetX = startInsetX;
                      let newInsetY = startInsetY;

                      if (direction.includes('e')) {
                        newW = startW + deltaX;
                      }
                      if (direction.includes('w')) {
                        newW = startW - deltaX;
                        newInsetX = startInsetX + deltaX;
                      }
                      if (direction.includes('s')) {
                        newH = startH + deltaY;
                      }
                      if (direction.includes('n')) {
                        newH = startH - deltaY;
                        newInsetY = startInsetY + deltaY;
                      }

                      // Clamp values
                      newW = Math.max(10, Math.min(currentWidth, newW));
                      newH = Math.max(10, Math.min(currentHeight, newH));

                      let finalWPercent = newW / currentWidth;
                      let finalHPercent = newH / currentHeight;

                      if (finalWPercent > 1) finalWPercent = 1;
                      if (finalHPercent > 1) finalHPercent = 1;

                      onUpdateSafeAreaWidth(finalWPercent * 100);
                      onUpdateSafeAreaHeight(finalHPercent * 100);

                      if (direction.includes('w')) {
                        const currentCenter = startInsetX + startW / 2;
                        const newCenter = newInsetX + newW / 2;
                        const offsetChange = (newCenter - currentCenter) / zoomMult;
                        onUpdateSafeAreaOffset({ x: (safeAreaOffset?.x || 0) + offsetChange, y: safeAreaOffset?.y || 0 });
                      }
                      if (direction.includes('n')) {
                        const currentMiddle = startInsetY + startH / 2;
                        const newMiddle = newInsetY + newH / 2;
                        const offsetChange = (newMiddle - currentMiddle) / zoomMult;
                        onUpdateSafeAreaOffset({ x: safeAreaOffset?.x || 0, y: (safeAreaOffset?.y || 0) + offsetChange });
                      }
                    };

                    const onPointerUp = () => {
                      window.removeEventListener('pointermove', onPointerMove);
                      window.removeEventListener('pointerup', onPointerUp);
                    };

                    window.addEventListener('pointermove', onPointerMove);
                    window.addEventListener('pointerup', onPointerUp);
                  };

                  return (
                    <>
                      <div className="absolute inset-0 pointer-events-none">
                        <svg width={currentWidth || 0} height={currentHeight || 0}>
                          <rect
                            x={insetX + (safeAreaOffset.x * zoomMult)}
                            y={insetY + (safeAreaOffset.y * zoomMult)}
                            width={safeW}
                            height={safeH}
                            rx={safeAreaRadius * zoomMult}
                            ry={safeAreaRadius * zoomMult}
                            fill="none"
                            stroke="#4f46e5"
                            strokeWidth={3}
                            strokeDasharray="8 4"
                          />
                        </svg>
                      </div>

                      {/* Drag Handle Icon and Label */}
                      <div
                        onPointerDown={(e) => dragControls.start(e)}
                        className="absolute pointer-events-auto cursor-move flex items-center gap-1.5 px-2 py-1 bg-white/90 backdrop-blur-sm border border-indigo-200 rounded-full shadow-lg group-hover/safe-area:scale-110 transition-transform duration-200"
                        style={{
                          top: `${insetY - 12}px`,
                          left: '50%',
                          transform: 'translateX(-50%)'
                        }}
                      >
                        <Move className="w-3 h-3 text-indigo-600" />
                        <span className="text-[10px] font-bold text-indigo-700 whitespace-nowrap">Safe Area</span>
                      </div>

                      {/* Resize Handles */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div onPointerDown={(e) => handleResize(e, 'n')} className="absolute pointer-events-auto cursor-ns-resize" style={{ top: insetY - 4, left: insetX + 10, width: safeW - 20, height: 8 }} />
                        <div onPointerDown={(e) => handleResize(e, 's')} className="absolute pointer-events-auto cursor-ns-resize" style={{ top: insetY + safeH - 4, left: insetX + 10, width: safeW - 20, height: 8 }} />
                        <div onPointerDown={(e) => handleResize(e, 'e')} className="absolute pointer-events-auto cursor-ew-resize" style={{ top: insetY + 10, left: insetX + safeW - 4, width: 8, height: safeH - 20 }} />
                        <div onPointerDown={(e) => handleResize(e, 'w')} className="absolute pointer-events-auto cursor-ew-resize" style={{ top: insetY + 10, left: insetX - 4, width: 8, height: safeH - 20 }} />

                        {[
                          { dir: 'nw', top: insetY - 4, left: insetX - 4 },
                          { dir: 'ne', top: insetY - 4, left: insetX + safeW - 4 },
                          { dir: 'sw', top: insetY + safeH - 4, left: insetX - 4 },
                          { dir: 'se', top: insetY + safeH - 4, left: insetX + safeW - 4 },
                        ].map((c) => (
                          <div
                            key={c.dir}
                            onPointerDown={(e) => handleResize(e, c.dir as any)}
                            className={`absolute pointer-events-auto w-3 h-3 bg-white border-2 border-indigo-600 rounded-full shadow-sm cursor-${c.dir}-resize`}
                            style={{ top: c.top - 2, left: c.left - 2 }}
                          />
                        ))}
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}

            {/* Elements */}
            <div
              className="absolute inset-0 z-[10]"
              style={{
                ...(baseImageAsMask && baseImage ? (() => {
                  const zoomMult = validZoom / 100;
                  const imgW = (baseImageProperties?.width || 0) * (baseImageProperties?.scale || 1) * zoomMult;
                  const imgH = (baseImageProperties?.height || 0) * (baseImageProperties?.scale || 1) * zoomMult;
                  const posX = `calc(50% + ${(baseImageProperties?.x || 0) * zoomMult}px)`;
                  const posY = `calc(50% + ${(baseImageProperties?.y || 0) * zoomMult}px)`;

                  if (baseImageMaskInvert) {
                    // Inverted: Reveal in opaque areas (standard intersect)
                    return {
                      WebkitMaskImage: `url(${baseImage})`,
                      maskImage: `url(${baseImage})`,
                      WebkitMaskComposite: 'destination-in',
                      maskComposite: 'intersect',
                      WebkitMaskSize: `${imgW}px ${imgH}px`,
                      maskSize: `${imgW}px ${imgH}px`,
                      WebkitMaskPosition: `${posX} ${posY}`,
                      maskPosition: `${posX} ${posY}`,
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                    };
                  } else {
                    // Standard: Reveal in transparent areas (exclude/punch hole)
                    return {
                      WebkitMaskImage: `linear-gradient(#000, #000), url(${baseImage})`,
                      maskImage: `linear-gradient(#000, #000), url(${baseImage})`,
                      WebkitMaskComposite: 'destination-out',
                      maskComposite: 'exclude',
                      WebkitMaskSize: `100% 100%, ${imgW}px ${imgH}px`,
                      maskSize: `100% 100%, ${imgW}px ${imgH}px`,
                      WebkitMaskPosition: `0 0, ${posX} ${posY}`,
                      maskPosition: `0 0, ${posX} ${posY}`,
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                    };
                  }
                })() : {}),
                ...(showSafeArea ? (() => {
                  const p = (safeAreaPadding || 0) / 100;
                  const wPercent = safeAreaWidth !== undefined ? safeAreaWidth / 100 : (1 - 2 * p);
                  const hPercent = safeAreaHeight !== undefined ? safeAreaHeight / 100 : (1 - 2 * p);
                  const zoomMult = (validZoom / 100);

                  const safeW = currentWidth * wPercent;
                  const safeH = currentHeight * hPercent;

                  const clipLeft = (currentWidth - safeW) / 2 + (safeAreaOffset.x * zoomMult);
                  const clipRight = (currentWidth - safeW) / 2 - (safeAreaOffset.x * zoomMult);
                  const clipTop = (currentHeight - safeH) / 2 + (safeAreaOffset.y * zoomMult);
                  const clipBottom = (currentHeight - safeH) / 2 - (safeAreaOffset.y * zoomMult);

                  const clipValue = `inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px round ${safeAreaRadius * zoomMult}px)`;

                  return {
                    WebkitClipPath: clipValue,
                    clipPath: clipValue
                  };
                })() : {})
              }}
            >
              {(elements || [])
                .filter(el => !!el)
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


          </div>

        </div>
      </div>
    </div >
  );
}
