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
  safeAreaShape: 'rectangle' | 'circle' | 'oval';
  safeAreaOffset: { x: number; y: number };
  onUpdateSafeAreaOffset: (offset: { x: number; y: number }) => void;
  baseImage?: string;
  baseImageColor?: string;
  baseImageColorEnabled?: boolean;
  baseImageProperties: { x: number; y: number; scale: number; width?: number; height?: number; crop?: { x: number; y: number; width: number; height: number } };
  onUpdateBaseImage: (props: Partial<{ x: number; y: number; scale: number; width?: number; height?: number; crop?: { x: number; y: number; width: number; height: number } }>) => void;
  isPublicMode?: boolean;
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
  safeAreaShape,
  safeAreaOffset,
  onUpdateSafeAreaOffset,
  baseImage,
  baseImageColor,
  baseImageColorEnabled = false,
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

  // Paper sizes in mm (width x height)
  const paperSizes: Record<string, { width: number; height: number }> = {
    'A4': { width: 210, height: 297 },
    'A3': { width: 297, height: 420 },
    'A5': { width: 148, height: 210 },
    'Letter': { width: 216, height: 279 },
    'Legal': { width: 216, height: 356 },
    'Tabloid': { width: 279, height: 432 },
    'Custom': customPaperDimensions,
  };

  const selectedPaper = paperSizes[paperSize] || paperSizes['A4'];
  const pxPerUnit = getPixelsPerUnit();
  const scaledPxPerUnit = pxPerUnit * (zoom / 100);

  // Convert mm to pixels (1mm = 3.7795275591 pixels at 96 DPI)
  const mmToPx = 3.7795275591;
  const baseWidth = selectedPaper.width * mmToPx;
  const baseHeight = selectedPaper.height * mmToPx;
  const currentWidth = baseWidth * (zoom / 100);
  const currentHeight = baseHeight * (zoom / 100);

  const renderRulerTicks = (orientation: 'horizontal' | 'vertical') => {
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
          {(isTen || (unit === 'inch' && isMajor)) && (
            <text
              x={orientation === 'horizontal' ? pos + 2 : (orientation === 'vertical' ? 2 : 0)}
              y={orientation === 'horizontal' ? 10 : (orientation === 'vertical' ? pos - 2 : 0)}
              fontSize="8"
              fill="#64748b"
              className="select-none"
              style={{ transform: orientation === 'vertical' ? 'rotate(-90deg)' : 'none', transformOrigin: `${orientation === 'horizontal' ? pos + 2 : 2}px ${orientation === 'horizontal' ? 10 : pos - 2}px` }}
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
          {/* Horizontal Ruler */}
          {showRulers && (
            <div
              className="absolute -top-8 left-0 overflow-hidden bg-white/50 border-t border-x border-slate-200 rounded-t-lg"
              style={{ width: currentWidth, height: 25 }}
            >
              <svg width={currentWidth} height={25}>
                {renderRulerTicks('horizontal')}
              </svg>
            </div>
          )}

          {/* Vertical Ruler */}
          {showRulers && (
            <div
              className="absolute top-0 -left-8 overflow-hidden bg-white/50 border-l border-y border-slate-200 rounded-l-lg"
              style={{ width: 25, height: currentHeight }}
            >
              <svg width={25} height={currentHeight}>
                {renderRulerTicks('vertical')}
              </svg>
            </div>
          )}

          {/* Paper Canvas */}
          <div
            id="canvas-paper"
            className={`relative bg-white shadow-2xl overflow-hidden ${showRulers ? 'rounded-br-3xl' : 'rounded-3xl'}`}
            style={{
              width: currentWidth,
              height: currentHeight,
              backgroundColor: productColors[productVariant.color] || '#ffffff',
            }}
            onPointerDown={() => onSelectElement(null)}
            onClick={() => onSelectElement(null)}
          >
            {/* Base Image Background */}
            {baseImage && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <motion.div
                  drag
                  dragMomentum={false}
                  onDragEnd={(_, info) => {
                    onUpdateBaseImage({
                      x: baseImageProperties.x + info.offset.x / (zoom / 100),
                      y: baseImageProperties.y + info.offset.y / (zoom / 100),
                    });
                  }}
                  className="cursor-move select-none pointer-events-auto relative"
                  style={{
                    x: (baseImageProperties?.x || 0) * (zoom / 100),
                    y: (baseImageProperties?.y || 0) * (zoom / 100),
                    scale: (baseImageProperties?.scale || 1) * (zoom / 100),
                    maxWidth: 'none',
                  }}
                >
                  <div
                    className="relative overflow-hidden"
                    style={{
                      width: baseImageProperties?.crop
                        ? `${baseImageProperties.crop.width}px`
                        : (baseImageProperties?.width ? `${baseImageProperties.width}px` : '500px'),
                      height: baseImageProperties?.crop
                        ? `${baseImageProperties.crop.height}px`
                        : (baseImageProperties?.height ? `${baseImageProperties.height}px` : '500px'),
                      backgroundColor: (baseImageColorEnabled && baseImageColor) ? baseImageColor : 'transparent',
                    }}
                  >
                    <img
                      src={baseImage}
                      alt="Base"
                      className="block max-w-none drag-none pointer-events-none relative z-10"
                      draggable={false}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      style={{
                        transform: baseImageProperties?.crop
                          ? `translate(${-baseImageProperties.crop.x}px, ${-baseImageProperties.crop.y}px)`
                          : 'none',
                      }}
                    />
                  </div>
                </motion.div>
              </div>
            )}

            {/* Safe Print Area Overlay */}
            {/* Safe Print Area Overlay (SVG) - Now Draggable */}
            {showSafeArea && (
              <motion.div
                drag
                dragControls={dragControls}
                dragListener={false}
                dragMomentum={false}
                dragElastic={0}
                onDragEnd={(_, info) => {
                  onUpdateSafeAreaOffset({
                    x: safeAreaOffset.x + info.offset.x / (zoom / 100),
                    y: safeAreaOffset.y + info.offset.y / (zoom / 100)
                  });
                }}
                className="absolute inset-0 z-10 pointer-events-none group/safe-area"
                style={{
                  x: safeAreaOffset.x * (zoom / 100),
                  y: safeAreaOffset.y * (zoom / 100),
                }}
              >
                <div className="absolute inset-0 pointer-events-none">
                  <svg width={currentWidth} height={currentHeight}>
                    {(() => {
                      const p = safeAreaPadding / 100;
                      const safeW = currentWidth * (1 - 2 * p);
                      const safeH = currentHeight * (1 - 2 * p);
                      const insetX = currentWidth * p;
                      const insetY = currentHeight * p;

                      if (safeAreaShape === 'circle') {
                        const r = Math.min(safeW, safeH) / 2;
                        return (
                          <circle
                            cx={currentWidth / 2}
                            cy={currentHeight / 2}
                            r={r}
                            fill="none"
                            stroke="#818cf8"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            className="opacity-50"
                          />
                        );
                      } else if (safeAreaShape === 'oval') {
                        return (
                          <ellipse
                            cx={currentWidth / 2}
                            cy={currentHeight / 2}
                            rx={safeW / 2}
                            ry={safeH / 2}
                            fill="none"
                            stroke="#818cf8"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            className="opacity-50"
                          />
                        );
                      } else {
                        return (
                          <rect
                            x={insetX}
                            y={insetY}
                            width={safeW}
                            height={safeH}
                            rx="8"
                            fill="none"
                            stroke="#818cf8"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            className="opacity-50"
                          />
                        );
                      }
                    })()}
                  </svg>
                </div>

                {/* Drag Handle Icon and Label */}
                <div
                  onPointerDown={(e) => dragControls.start(e)}
                  className="absolute pointer-events-auto cursor-move flex items-center gap-1.5 px-2 py-1 bg-white/90 backdrop-blur-sm border border-indigo-200 rounded-full shadow-lg group-hover/safe-area:scale-110 transition-transform duration-200"
                  style={{
                    top: `calc(${safeAreaPadding}% - 12px)`,
                    left: '50%',
                    transform: 'translateX(-50%)'
                  }}
                >
                  <Move className="w-3 h-3 text-indigo-600" />
                  <span className="text-[10px] font-bold text-indigo-700 whitespace-nowrap">Safe Area</span>
                </div>
              </motion.div>
            )}

            {/* Canvas Elements */}
            <div
              className="absolute inset-0"
              onPointerDown={() => onSelectElement(null)}
              onClick={() => onSelectElement(null)}
              style={{
                clipPath: (() => {
                  if (!showSafeArea) return 'none';
                  const p = safeAreaPadding / 100;
                  const safeW = currentWidth * (1 - 2 * p);
                  const safeH = currentHeight * (1 - 2 * p);
                  const insetX = (currentWidth * p) + (safeAreaOffset.x * (zoom / 100));
                  const insetY = (currentHeight * p) + (safeAreaOffset.y * (zoom / 100));

                  if (safeAreaShape === 'rectangle') {
                    return `inset(${insetY}px ${currentWidth - (insetX + safeW)}px ${currentHeight - (insetY + safeH)}px ${insetX}px round 0.5rem)`;
                  }
                  if (safeAreaShape === 'oval') {
                    return `inset(${insetY}px ${currentWidth - (insetX + safeW)}px ${currentHeight - (insetY + safeH)}px ${insetX}px round 50%)`;
                  }
                  if (safeAreaShape === 'circle') {
                    const r = Math.min(safeW, safeH) / 2;
                    return `circle(${r}px at calc(50% + ${safeAreaOffset.x * (zoom / 100)}px) calc(50% + ${safeAreaOffset.y * (zoom / 100)}px))`;
                  }
                  return 'none';
                })()
              }}
            >
              {[...elements]
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((element) => (
                  <DraggableElement
                    key={element.id}
                    element={element}
                    isSelected={selectedElement === element.id}
                    onSelect={() => onSelectElement(element.id)}
                    onUpdate={(updates: Partial<CanvasElement>, skipHistory?: boolean) => onUpdateElement(element.id, updates, skipHistory)}
                    onDelete={() => onDeleteElement(element.id)}
                    onDuplicate={() => onDuplicateElement(element.id)}
                    zoom={zoom}
                    enableBounce={enableBounce}
                    isPublicMode={isPublicMode}
                  />
                ))}
            </div>

            {/* Paper Size Indicator */}
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg">
              <p className="text-xs text-gray-500 font-medium">
                {paperSize} ({selectedPaper.width} × {selectedPaper.height} mm)
              </p>
            </div>
          </div>

          {/* Zoom Indicator */}
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-700">{zoom}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
