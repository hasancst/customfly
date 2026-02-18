import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Move
} from 'lucide-react';
import { CanvasElement, ProductVariant } from '../types';
import { DraggableElement } from './DraggableElement';
import { getPaperSizeMM } from '../constants/paperSizes';

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
  unit: 'cm' | 'mm' | 'inch' | 'px';
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
  hideSafeAreaLine?: boolean;
  showGrid?: boolean;
  baseImageScale?: number;
  baseImageLocked?: boolean;
  baseImageColorMode?: 'opaque' | 'transparent';
  width?: number;
  height?: number;
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
  baseImageScale = 80,
  baseImageLocked = false,
  baseImageColorMode = 'transparent',
  width: propWidth,
  height: propHeight,
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
      case 'px': return 1;
      case 'mm': return 3.7795275591;
      case 'cm': return 37.795275591;
      case 'inch': return 96;
      default: return 37.795275591;
    }
  };

  const pxPerUnit = getPixelsPerUnit();
  const validZoom = Math.max(1, Number(zoom) || 100);

  const safeCustom = {
    width: Number(customPaperDimensions?.width) || 210,
    height: Number(customPaperDimensions?.height) || 297
  };

  // Special case: Default is already in pixels
  const isDefaultSize = paperSize === 'Default';
  
  let paperSizeMM;
  if (isDefaultSize) {
    paperSizeMM = { width: 1000, height: 1000 }; // Already in pixels
  } else if (paperSize === 'Custom') {
    paperSizeMM = safeCustom;
  } else {
    paperSizeMM = getPaperSizeMM(paperSize);
  }
  
  const mmToPx = 3.7795275591;

  // Calculate base dimensions based on paper size type
  let baseWidth, baseHeight;
  
  if (Number(propWidth) && Number(propHeight)) {
    // Use provided dimensions if available
    baseWidth = Number(propWidth);
    baseHeight = Number(propHeight);
  } else if (isDefaultSize) {
    // Default: direct pixels, no conversion
    baseWidth = paperSizeMM.width;
    baseHeight = paperSizeMM.height;
  } else if (paperSize === 'Custom') {
    // Custom: use unit-based conversion
    baseWidth = paperSizeMM.width * pxPerUnit;
    baseHeight = paperSizeMM.height * pxPerUnit;
  } else {
    // Standard paper sizes: convert from mm to px
    baseWidth = paperSizeMM.width * mmToPx;
    baseHeight = paperSizeMM.height * mmToPx;
  }
  
  const currentWidth = Math.max(1, baseWidth * (validZoom / 100));
  const currentHeight = Math.max(1, baseHeight * (validZoom / 100));

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

  const PaperContent = (
    <div
      id="canvas-paper"
      className={`relative bg-white shadow-md overflow-hidden transform-gpu ${isPublicMode ? 'border border-slate-200 shadow-sm' : ''}`}
      style={{
        width: currentWidth || 1000,
        height: currentHeight || 1000,
        backgroundColor: (productColors || {})[productVariant?.color || 'white'] || '#ffffff',
        transform: 'translateZ(0)' // Force hardware acceleration for masks
      }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onSelectElement(null);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelectElement(null);
      }}
    >
      {/* 2. DESIGN ELEMENTS LAYER */}
      {(() => {
        const zoomMult = (validZoom / 100);
        const effectiveScale = baseImageScale ? (baseImageScale / 100) : (baseImageProperties?.scale || 1);
        // Use Math.round to avoid subpixel gaps in mask rendering
        const maskW = Math.round((baseImageProperties?.width || 0) * effectiveScale * zoomMult);
        const maskH = Math.round((baseImageProperties?.height || 0) * effectiveScale * zoomMult);
        const maskX = Math.round((currentWidth - maskW) / 2 + (baseImageProperties?.x || 0) * zoomMult);
        const maskY = Math.round((currentHeight - maskH) / 2 + (baseImageProperties?.y || 0) * zoomMult);

        const maskStyle: React.CSSProperties = (baseImageAsMask && baseImage && isBaseImageLoaded) ? (() => {
          if (isNaN(maskX) || isNaN(maskY) || isNaN(maskW) || isNaN(maskH)) return {};
          return {
            WebkitMaskImage: baseImageMaskInvert
              ? `url("${baseImage}")`
              : `linear-gradient(black, black), url("${baseImage}")`,
            maskImage: baseImageMaskInvert
              ? `url("${baseImage}")`
              : `linear-gradient(black, black), url("${baseImage}")`,
            WebkitMaskSize: baseImageMaskInvert
              ? `${maskW}px ${maskH}px`
              : `101% 101%, ${maskW}px ${maskH}px`,
            maskSize: baseImageMaskInvert
              ? `${maskW}px ${maskH}px`
              : `101% 101%, ${maskW}px ${maskH}px`,
            WebkitMaskPosition: baseImageMaskInvert
              ? `${maskX}px ${maskY}px`
              : `center, ${maskX}px ${maskY}px`,
            maskPosition: baseImageMaskInvert
              ? `${maskX}px ${maskY}px`
              : `center, ${maskX}px ${maskY}px`,
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskComposite: baseImageMaskInvert ? 'source-over' : 'destination-out',
            maskComposite: baseImageMaskInvert ? 'add' : 'subtract',
          };
        })() : {};

        const clipStyle: React.CSSProperties = showSafeArea ? (() => {
          const p = (Number(safeAreaPadding) || 0) / 100;
          const wPercent = safeAreaWidth !== undefined ? (Number(safeAreaWidth) / 100) : (1 - 2 * p);
          const hPercent = safeAreaHeight !== undefined ? (Number(safeAreaHeight) / 100) : (1 - 2 * p);
          const zm = (validZoom / 100);

          const sW = currentWidth * wPercent;
          const sH = currentHeight * hPercent;

          const offX = Number(safeAreaOffset?.x) || 0;
          const offY = Number(safeAreaOffset?.y) || 0;

          const clipLeft = (currentWidth - sW) / 2 + (offX * zm);
          const clipRight = (currentWidth - sW) / 2 - (offX * zm);
          const clipTop = (currentHeight - sH) / 2 + (offY * zm);
          const clipBottom = (currentHeight - sH) / 2 - (offY * zm);

          // Safety check for NaN
          if (isNaN(clipTop) || isNaN(clipRight) || isNaN(clipBottom) || isNaN(clipLeft)) {
            return {};
          }

          const clipVal = `inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px round ${(Number(safeAreaRadius) || 0) * zm}px)`;
          return { WebkitClipPath: clipVal, clipPath: clipVal };
        })() : {};

        const isMaskingActive = (baseImageAsMask && baseImage && isBaseImageLoaded);

        const elementsToRender = (elements || [])
          .filter(el => !!el && el.type !== 'file_upload' && (!isPublicMode || (el.isVisible !== false && !(el as any).isHiddenByLogic)))
          .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        return (
          <>
            {/* Layer 1: Visible Content (Masked & Clipped) */}
            <div
              className="absolute inset-0 transition-all"
              style={{
                zIndex: 25,
                ...maskStyle,
                ...clipStyle, // Apply safety area clip here
                pointerEvents: isMaskingActive ? 'none' : 'auto', // Disable interaction if masking is active (handled by Layer 2)
              }}
            >
              {elementsToRender.map((element) => (
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
                  renderMode={isMaskingActive ? 'view' : 'standard'}
                />
              ))}
            </div>

            {/* Layer 2: Interactive Controls (Unmasked, No Clip) - Only if masking is active */}
            {isMaskingActive && (
              <div
                className="absolute inset-0 transition-all"
                style={{
                  zIndex: 26, // Higher z-index to sit on top of mask
                  pointerEvents: 'auto', // Capture interactions
                  // No maskStyle, No clipStyle
                }}
              >
                {elementsToRender.map((element) => (
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
                    renderMode="interactive"
                  />
                ))}
              </div>
            )}
          </>
        );
      })()}


      {/* 4. MOCKUP IMAGE LAYER */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none imcst-base-image"
        style={{
          zIndex: baseImageAsMask ? 30 : 20, // If mask enabled, put base image ABOVE elements to mask them
          visibility: 'visible !important' as any,
          opacity: '1 !important' as any
        }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            width: 'fit-content',
            height: 'fit-content',
            maxWidth: currentWidth,
            maxHeight: currentHeight,
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${(baseImageProperties?.x || 0) * (validZoom / 100)}px, ${(baseImageProperties?.y || 0) * (validZoom / 100)}px) scale(${baseImageScale ? (baseImageScale / 100) : (baseImageProperties?.scale || 1)})`,
            display: 'block !important' as any,
            visibility: 'visible !important' as any,
            opacity: '1 !important' as any
          }}
        >

          {/* Base Image Container */}
          <div
            className="relative"
            style={{
              width: (baseImageProperties?.width || 600) * (validZoom / 100),
              height: (baseImageProperties?.height || 600) * (validZoom / 100),
              pointerEvents: 'none', // Container doesn't intercept events
            }}
          >
            <img
              key={baseImage || 'system-default'}
              className={baseImageLocked ? 'cursor-not-allowed' : 'cursor-move'}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                position: 'relative',
                zIndex: 1,
                objectFit: 'contain',
                pointerEvents: baseImageLocked ? 'none' : 'auto', // When locked, let events pass through
                opacity: baseImageLocked ? 0.7 : 1,
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'none',
              }}
              onPointerDown={(e) => {
                if (baseImageLocked) {
                  // Don't handle event when locked, let it pass through
                  return;
                }
                
                e.stopPropagation();
                e.preventDefault();
                
                const target = e.currentTarget;
                target.setPointerCapture(e.pointerId);
                
                const startPos = { x: e.clientX, y: e.clientY };
                const startBasePos = { x: baseImageProperties?.x || 0, y: baseImageProperties?.y || 0 };
                const zoomMult = (validZoom / 100);

                const onMove = (moveEvent: PointerEvent) => {
                  moveEvent.preventDefault();
                  const dx = (moveEvent.clientX - startPos.x) / zoomMult;
                  const dy = (moveEvent.clientY - startPos.y) / zoomMult;
                  onUpdateBaseImage({
                    x: startBasePos.x + dx,
                    y: startBasePos.y + dy,
                  });
                };

                const onUp = (upEvent: PointerEvent) => {
                  if (target.hasPointerCapture(upEvent.pointerId)) {
                    target.releasePointerCapture(upEvent.pointerId);
                  }
                  target.removeEventListener('pointermove', onMove);
                  target.removeEventListener('pointerup', onUp);
                  target.removeEventListener('pointercancel', onUp);
                };

                target.addEventListener('pointermove', onMove);
                target.addEventListener('pointerup', onUp);
                target.addEventListener('pointercancel', onUp);
              }}
              onDragStart={(e) => e.preventDefault()}
              src={(() => {
                if (!baseImage || baseImage === 'none') {
                  return '/imcst_assets/system-placeholder.png'; // Updated path for built assets
                }
                if (baseImage.startsWith('/')) return baseImage;

                let finalUrl = baseImage;
                // If the URL is external, always proxy it via our backend if not already proxied
                if (finalUrl.startsWith('http') && !finalUrl.includes('proxy-image?url=')) {
                  const baseUrl = (window as any).IMCST_BASE_URL || '';
                  if (baseUrl) {
                    finalUrl = `${baseUrl}/imcst_public_api/proxy-image?url=${encodeURIComponent(finalUrl)}`;
                  }
                }
                // Add cache busting parameter to force reload
                const separator = finalUrl.includes('?') ? '&' : '?';
                return `${finalUrl}${separator}_cb=${encodeURIComponent(baseImage || '')}`;
              })()}
              crossOrigin="anonymous"
              onLoad={(event) => {
                const img = event.currentTarget;
                if (img.naturalWidth > 0 && (img.naturalWidth !== baseImageProperties?.width || img.naturalHeight !== baseImageProperties?.height)) {
                  onUpdateBaseImage({ width: img.naturalWidth, height: img.naturalHeight });
                }
                setIsBaseImageLoaded(true);
              }}
              onError={(e) => {
                console.error("[IMCST] Mockup image failed to load:", baseImage);
                // Try literal fallback if proxy failed
                if (e.currentTarget.src.includes('proxy-image')) {
                  e.currentTarget.src = baseImage!;
                }
              }}
              draggable={false}
            />
          </div>
        </div>
      </div>

      {/* Color Overlay - Behind transparent areas using CSS mask */}
      {(() => {
        if (!baseImageColorEnabled || !baseImageColor) {
          return null;
        }
        
        const containerWidth = (baseImageProperties?.width || 600) * (validZoom / 100);
        const containerHeight = (baseImageProperties?.height || 600) * (validZoom / 100);
        
        // Fallback to minimum size if calculated size is invalid
        const finalWidth = containerWidth > 0 ? containerWidth : 600;
        const finalHeight = containerHeight > 0 ? containerHeight : 600;
        
        // Calculate position to match base image
        const baseX = (baseImageProperties?.x || 0) * (validZoom / 100);
        const baseY = (baseImageProperties?.y || 0) * (validZoom / 100);
        const scale = baseImageScale ? (baseImageScale / 100) : (baseImageProperties?.scale || 1);

        // Color overlay with CSS mask - only show in transparent areas
        // We need to invert the mask so color appears where the image is transparent
        const maskUrl = baseImage ? (baseImage.startsWith('http') && !baseImage.includes('proxy-image') 
          ? `${(window as any).IMCST_BASE_URL || ''}/imcst_public_api/proxy-image?url=${encodeURIComponent(baseImage)}`
          : baseImage) : '';
        
        return (
          <div
            className="absolute pointer-events-none"
            data-color-overlay="true"
            data-color={baseImageColor}
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${baseX}px, ${baseY}px) scale(${scale})`,
              width: `${finalWidth}px`,
              height: `${finalHeight}px`,
              zIndex: 19, // Below base image (20) so it appears behind
              backgroundColor: baseImageColor,
              // Use double mask technique: solid layer + inverted image mask
              WebkitMaskImage: maskUrl ? `linear-gradient(black, black), url("${maskUrl}")` : 'none',
              maskImage: maskUrl ? `linear-gradient(black, black), url("${maskUrl}")` : 'none',
              WebkitMaskSize: '100% 100%, 100% 100%',
              maskSize: '100% 100%, 100% 100%',
              WebkitMaskPosition: 'center, center',
              maskPosition: 'center, center',
              WebkitMaskRepeat: 'no-repeat, no-repeat',
              maskRepeat: 'no-repeat, no-repeat',
              // Subtract the image from solid layer = color only in transparent areas
              WebkitMaskComposite: 'destination-out',
              maskComposite: 'subtract'
            }}
          />
        );
      })()}

      {/* Safe Area Controls (only show if enabled) */}
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

                              // Width Logic - ONLY change width, NOT offset
                              if (handle.type.includes('e')) {
                                // Right edge moves right (+dx)
                                const dW = dx;
                                const newW = (bW * (startWPercent / 100)) + dW;
                                newWPercent = (newW / bW) * 100;
                              } else if (handle.type.includes('w')) {
                                // Left edge moves left (+dx is right, so we want -dx to increase width)
                                // Actually if we move mouse left (dx negative), width INCREASES.
                                const dW = -dx;
                                const newW = (bW * (startWPercent / 100)) + dW;
                                newWPercent = (newW / bW) * 100;
                              }

                              // Height Logic - ONLY change height, NOT offset
                              if (handle.type.includes('s')) {
                                // Bottom edge moves down (+dy)
                                const dH = dy;
                                const newH = (bH * (startHPercent / 100)) + dH;
                                newHPercent = (newH / bH) * 100;
                              } else if (handle.type.includes('n')) {
                                // Top edge moves up (dy negative -> width increases)
                                const dH = -dy;
                                const newH = (bH * (startHPercent / 100)) + dH;
                                newHPercent = (newH / bH) * 100;
                              }

                              // Updates - ONLY update width/height, NOT offset
                              if (handle.type.includes('e') || handle.type.includes('w')) {
                                onUpdateSafeAreaWidth(Math.max(1, Math.min(100, newWPercent)));
                              }
                              if (handle.type.includes('n') || handle.type.includes('s')) {
                                onUpdateSafeAreaHeight(Math.max(1, Math.min(100, newHPercent)));
                              }
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
  );

  if (isPublicMode) {
    return PaperContent;
  }

  return (
    <div
      className="absolute inset-0 overflow-auto bg-gray-100/50 custom-scrollbar p-12 md:p-24"
      onPointerDown={() => onSelectElement(null)}
      onClick={() => onSelectElement(null)}
    >
      <div className="flex min-w-full min-h-full">
        <div className="relative m-auto shrink-0">
          {/* Rulers (Only in Admin) */}
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

          {PaperContent}
        </div>
      </div>
    </div>
  );
}
