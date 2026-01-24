import { useRef, useState, useMemo, memo, useEffect } from 'react';
import { CanvasElement } from '../types';
import { Input } from './ui/input';
import { MapPin, Calendar, Phone, Trash2, Copy, RotateCw, Maximize2, Images, AlignLeft, UploadCloud, Palette, ChevronDown, CheckCircle2, Hash, Clock } from 'lucide-react';

interface DraggableElementProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CanvasElement>, skipHistory?: boolean) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  zoom: number;
  enableBounce?: boolean;
}

const ProcessedImage = ({ src, removeBg, removeBgType, deep, mode, width, height, zoom }: {
  src: string,
  removeBg: boolean,
  removeBgType: 'js' | 'rembg',
  deep: number,
  mode: 'light' | 'dark',
  width: number,
  height: number,
  zoom: number
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!removeBg || removeBgType !== 'js') return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    const img = imgRef.current;

    if (!canvas || !ctx || !img) return;

    const process = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      if (deep > 0) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const R = data[i];
          const G = data[i + 1];
          const B = data[i + 2];

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
        ctx.putImageData(imageData, 0, 0);
      }
    };

    if (img.complete) {
      process();
    } else {
      img.onload = process;
    }
  }, [src, removeBg, deep, mode]);

  const style = {
    width: width * (zoom / 100),
    height: height * (zoom / 100),
    objectFit: 'contain' as const,
    userSelect: 'none' as const,
    pointerEvents: 'none' as const,
  };

  const showProcessed = removeBg && removeBgType === 'js';

  return (
    <>
      <img
        ref={imgRef}
        src={src}
        style={{ ...style, display: showProcessed ? 'none' : 'block' }}
        crossOrigin="anonymous"
        draggable={false}
      />
      {showProcessed && (
        <canvas
          ref={canvasRef}
          style={style}
        />
      )}
    </>
  );
};

const BridgeText = ({ element, zoom }: { element: CanvasElement, zoom: number }) => {
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

    const fontSize = (element.fontSize || 32) * 2; // Render at 2x for better quality
    tempCtx.font = `${element.fontWeight || 400} ${fontSize}px ${element.fontFamily || 'Inter'}`;
    const text = element.text || '';
    const metrics = tempCtx.measureText(text);

    // Set temp canvas size
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.5;
    tempCanvas.width = textWidth || 100;
    tempCanvas.height = textHeight || 50;

    // Draw text
    tempCtx.font = `${element.fontWeight || 400} ${fontSize}px ${element.fontFamily || 'Inter'}`;

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
    const h = tempCanvas.height * 3; // Extra space for warping

    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    const curveVal = (ops.curve / 2) * tempCanvas.height;
    const topVal = ops.offsetY * tempCanvas.height;
    const bottomVal = ops.bottom * tempCanvas.height;
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

      ctx.drawImage(
        tempCanvas,
        i, 0, 1, tempCanvas.height,
        i, h * 0.5 - topVal / tempCanvas.height * yVal, 1, yVal
      );
    }
  }, [element]);

  const style = {
    width: (element.width || 200) * (zoom / 100),
    height: (element.height || 100) * (zoom / 100),
    objectFit: 'contain' as const,
    userSelect: 'none' as const,
    pointerEvents: 'none' as const,
  };

  return <canvas ref={canvasRef} style={style} />;
};

export const DraggableElement = memo(({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  zoom,
}: DraggableElementProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [textScale, setTextScale] = useState(1);

  // Local state for smooth interactions
  const [localState, setLocalState] = useState({
    x: element.x,
    y: element.y,
    width: element.width || 200,
    height: element.height || (element.type === 'text' ? 40 : 200),
    rotation: element.rotation,
    fontSize: element.fontSize || 32,
  });

  // Sync props to local state when not interacting
  useEffect(() => {
    if (!isDragging && !isResizing && !isRotating) {
      setLocalState({
        x: element.x,
        y: element.y,
        width: element.width || 200,
        height: element.height || (element.type === 'text' ? 40 : 200),
        rotation: element.rotation,
        fontSize: element.fontSize || 32,
      });
    }
  }, [element, isDragging, isResizing, isRotating]);

  // Shrink Logic
  useEffect(() => {
    if (element.type !== 'text' || element.textMode !== 'shrink' || !contentRef.current || !elementRef.current) {
      setTextScale(1);
      return;
    }

    const measure = () => {
      const container = elementRef.current;
      const content = contentRef.current;
      if (!container || !content) return;

      // Use a consistent width fallback (200px)
      const baseWidth = element.width || 200;
      const padding = 8 * (zoom / 100); // 4px each side
      const containerWidth = (baseWidth * (zoom / 100)) - padding;

      // Use scrollWidth for a more accurate measurement of raw text size
      const contentWidth = content.scrollWidth || content.offsetWidth;

      if (containerWidth > 0 && contentWidth > containerWidth) {
        setTextScale(containerWidth / contentWidth);
      } else {
        setTextScale(1);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (elementRef.current) observer.observe(elementRef.current);
    if (contentRef.current) observer.observe(contentRef.current);

    return () => observer.disconnect();
  }, [element.text, element.width, element.fontSize, element.textMode, element.type, zoom]);

  // State to track initial interaction data
  const interactionRef = useRef<{
    centerX: number;
    centerY: number;
    startWidth: number;
    startHeight: number;
    startX: number;
    startY: number;
    startRotation: number;
    startFontSize: number;
    startAngle: number;
    rafId: number | null;
  }>({
    centerX: 0,
    centerY: 0,
    startWidth: 0,
    startHeight: 0,
    startX: 0,
    startY: 0,
    startRotation: 0,
    startFontSize: 0,
    startAngle: 0,
    rafId: null,
  });

  // Rotation Logic
  useEffect(() => {
    if (!isRotating) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (interactionRef.current.rafId) return;

      interactionRef.current.rafId = requestAnimationFrame(() => {
        const { centerX, centerY, startAngle, startRotation } = interactionRef.current;
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);
        setLocalState(prev => ({ ...prev, rotation: startRotation + deltaAngle }));
        interactionRef.current.rafId = null;
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (interactionRef.current.rafId) {
        cancelAnimationFrame(interactionRef.current.rafId);
        interactionRef.current.rafId = null;
      }

      const { centerX, centerY, startAngle, startRotation } = interactionRef.current;
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);

      const finalRotation = startRotation + deltaAngle;
      setLocalState(prev => ({ ...prev, rotation: finalRotation }));
      onUpdate({ rotation: finalRotation }, false); // Commit to history
      setIsRotating(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (interactionRef.current.rafId) cancelAnimationFrame(interactionRef.current.rafId);
    };
  }, [isRotating, onUpdate]);

  // Resizing Logic
  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (interactionRef.current.rafId) return;

      interactionRef.current.rafId = requestAnimationFrame(() => {
        const { startX, startY, startWidth, startHeight, startFontSize } = interactionRef.current;

        // Calculate raw delta
        const dx = (e.clientX - startX) / (zoom / 100);
        const dy = (e.clientY - startY) / (zoom / 100);

        const isFieldType = ['field', 'phone', 'date'].includes(element.type);
        const newWidth = Math.max(50, startWidth + dx);
        const newHeight = isFieldType ? startHeight : Math.max(20, startHeight + dy);

        let newFontSize = startFontSize;
        if (element.type === 'text') {
          newFontSize = startFontSize * (newWidth / startWidth);
        }

        setLocalState(prev => ({
          ...prev,
          width: newWidth,
          height: newHeight,
          fontSize: newFontSize
        }));

        interactionRef.current.rafId = null;
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (interactionRef.current.rafId) {
        cancelAnimationFrame(interactionRef.current.rafId);
        interactionRef.current.rafId = null;
      }

      // Final commit from local state would be easiest, but leveraging calculation ensures precision
      const { startX, startY, startWidth, startHeight, startFontSize } = interactionRef.current;
      const dx = (e.clientX - startX) / (zoom / 100);
      const dy = (e.clientY - startY) / (zoom / 100);

      const isFieldType = ['field', 'phone', 'date'].includes(element.type);
      const newWidth = Math.max(50, startWidth + dx);
      const newHeight = isFieldType ? startHeight : Math.max(20, startHeight + dy);

      const updates: Partial<CanvasElement> = {
        width: newWidth,
        height: newHeight,
      };

      if (element.type === 'text') {
        updates.fontSize = startFontSize * (newWidth / startWidth);
      }

      // Update local state one last time just in case
      setLocalState(prev => ({
        ...prev,
        width: newWidth,
        height: newHeight,
        fontSize: updates.fontSize || prev.fontSize
      }));

      onUpdate(updates, false); // Commit to history
      setIsResizing(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (interactionRef.current.rafId) cancelAnimationFrame(interactionRef.current.rafId);
    };
  }, [isResizing, onUpdate, zoom, element.type]);

  const startRotating = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!elementRef.current) return;
    const rect = elementRef.current.getBoundingClientRect();
    interactionRef.current = {
      ...interactionRef.current,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      startAngle: Math.atan2(e.clientY - (rect.top + rect.height / 2), e.clientX - (rect.left + rect.width / 2)),
      startRotation: element.rotation || 0,
    };
    setIsRotating(true);
  };

  const startResizing = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!elementRef.current) return;
    interactionRef.current = {
      ...interactionRef.current,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: element.width || 200,
      startHeight: element.height || 200,
      startFontSize: element.fontSize || 32,
    };
    setIsResizing(true);
  };

  const getStrokeStyle = () => {
    if (!element.strokeWidth || element.strokeWidth <= 0) return {};
    const scaledWidth = element.strokeWidth * (zoom / 100);
    return {
      WebkitTextStroke: `${scaledWidth}px ${element.strokeColor || '#000000'}`,
      paintOrder: 'stroke fill'
    };
  };

  const getGradientStyle = () => {
    if (element.fillType !== 'gradient' || !element.gradient) return {};
    const { from, to } = element.gradient;
    return {
      backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
      display: 'inline-block',
    };
  };

  const content = useMemo(() => {
    switch (element.type) {
      case 'text':
        if (element.bridge) {
          return <BridgeText element={element} zoom={zoom} />;
        }

        if (element.isCurved && element.curve && element.curve !== 0) {
          const fontSize = (element.fontSize || 32);
          const scaledFontSize = fontSize * (zoom / 100);
          const text = element.text || '';

          const CURVE_SCALE = 3000;
          const radius = Math.abs(CURVE_SCALE / element.curve);
          const CHORD_HALF_WIDTH = 1000;
          const safeChordHalf = Math.min(CHORD_HALF_WIDTH, radius - 1);

          if (safeChordHalf <= 0) {
            return (
              <div style={{
                fontSize: scaledFontSize,
                fontFamily: element.fontFamily || 'Inter',
                fontWeight: element.fontWeight || 400,
                textAlign: element.textAlign || 'center',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                lineHeight: 1,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{
                  ...getGradientStyle(),
                  ...getStrokeStyle(),
                  color: element.fillType === 'gradient' ? 'transparent' : (element.color || '#000000'),
                }}>
                  {text}
                </span>
              </div>
            );
          }

          const isSmile = element.curve > 0;
          const dy = radius - Math.sqrt(radius * radius - safeChordHalf * safeChordHalf);
          const startX = -safeChordHalf;
          const endX = safeChordHalf;
          const d = `M ${startX},${isSmile ? -dy : dy} A ${radius} ${radius} 0 0 ${isSmile ? 1 : 0} ${endX},${isSmile ? -dy : dy}`;
          const pathId = `curve-path-${element.id}`;

          return (
            <div style={{
              width: localState.width * (zoom / 100),
              height: localState.height * (zoom / 100),
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              pointerEvents: 'none'
            }}>
              <svg
                overflow="visible"
                width={(element.width || 500) * (zoom / 100)}
                height={(element.height || 500) * (zoom / 100)}
                viewBox="-250 -250 500 500"
              >
                <defs>
                  <path id={pathId} d={d} />
                  {element.fillType === 'gradient' && element.gradient && (
                    <linearGradient
                      id={`gradient-${element.id}`}
                      x1="0%" y1="0%" x2="100%" y2="100%"
                    >
                      <stop offset="0%" stopColor={element.gradient.from} />
                      <stop offset="100%" stopColor={element.gradient.to} />
                    </linearGradient>
                  )}
                </defs>

                <text
                  fontSize={fontSize}
                  fontFamily={element.fontFamily || 'Inter'}
                  fontWeight={element.fontWeight || 400}
                  fill={element.fillType === 'gradient' ? `url(#gradient-${element.id})` : (element.color || '#000000')}
                  stroke={element.strokeWidth && element.strokeWidth > 0 ? (element.strokeColor || '#000000') : 'none'}
                  strokeWidth={element.strokeWidth ? element.strokeWidth : 0}
                  strokeLinejoin="round"
                  paintOrder="stroke fill"
                  textAnchor="middle"
                >
                  <textPath
                    href={`#${pathId}`}
                    startOffset="50%"
                  >
                    {text}
                  </textPath>
                </text>
              </svg>
            </div>
          );
        }

        // Default to 'shrink' if no mode is specified (prevents overflow on old designs)
        const mode = element.textMode || 'shrink';
        const isWrap = mode === 'wrap';
        const isShrink = mode === 'shrink';

        return (
          <div
            style={{
              fontSize: localState.fontSize * (zoom / 100),
              fontFamily: element.fontFamily || 'Inter',
              fontWeight: element.fontWeight || 400,
              textAlign: element.textAlign || 'center',
              whiteSpace: isWrap ? 'pre-wrap' : 'nowrap',
              wordBreak: isWrap ? 'break-word' : 'normal',
              userSelect: 'none',
              lineHeight: 1.2,
              width: localState.width * (zoom / 100),
              height: localState.height * (zoom / 100),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              paddingLeft: 4 * (zoom / 100),
              paddingRight: 4 * (zoom / 100),
            }}
          >
            <div
              ref={contentRef}
              style={{
                transform: isShrink ? `scale(${textScale})` : 'none',
                transformOrigin: 'center',
                display: 'inline-block',
                width: isWrap ? '100%' : 'auto',
              }}
            >
              <span style={{
                ...getGradientStyle(),
                ...getStrokeStyle(),
                color: element.fillType === 'gradient' ? 'transparent' : (element.color || '#000000'),
                display: 'inline-block',
                width: isWrap ? '100%' : 'auto',
              }}>
                {element.text}
              </span>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="relative">
            <ProcessedImage
              src={element.src || ''}
              removeBg={!!element.removeBg}
              removeBgType={(element.removeBgType as any) || 'js'}
              deep={element.removeBgDeep || 0}
              mode={element.removeBgMode || 'light'}
              width={localState.width}
              height={localState.height}
              zoom={zoom}
            />
          </div>
        );

      case 'field':
        return (
          <div
            style={{
              width: (element.width || 250) * (zoom / 100),
              userSelect: 'none',
            }}
          >
            {element.label && (
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                {element.label}
              </label>
            )}
            <Input
              placeholder={element.placeholder || 'Enter text...'}
              className="rounded-lg pointer-events-none"
              style={{
                height: 40 * (zoom / 100),
                fontSize: (element.fontSize || 14) * (zoom / 100),
                fontFamily: element.fontFamily || 'Inter',
              }}
            />
          </div>
        );

      case 'swatch':
        return (
          <div
            style={{
              width: (element.width || 300) * (zoom / 100),
              height: 50 * (zoom / 100),
              userSelect: 'none',
            }}
          >
            {element.label && (
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                {element.label}
              </label>
            )}
            <div className="flex gap-2">
              {element.swatchColors?.map((color: string, index: number) => (
                <button
                  key={index}
                  className={`rounded-lg border-2 transition-all pointer-events-none ${element.selectedColor === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                    }`}
                  style={{
                    backgroundColor: color,
                    width: 40 * (zoom / 100),
                    height: 40 * (zoom / 100),
                  }}
                />
              ))}
            </div>
          </div>
        );

      case 'phone':
        return (
          <div
            style={{
              width: (element.width || 250) * (zoom / 100),
              userSelect: 'none',
            }}
          >
            {element.label && (
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                {element.label}
              </label>
            )}
            <div className="flex gap-2">
              <div
                className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 border border-gray-300"
                style={{
                  height: 40 * (zoom / 100),
                  fontSize: (element.fontSize || 14) * (zoom / 100),
                }}
              >
                <Phone className="w-3 h-3" />
                <span className="font-medium">{element.countryCode}</span>
              </div>
              <Input
                placeholder="(555) 123-4567"
                className="rounded-lg flex-1 pointer-events-none"
                style={{
                  height: 40 * (zoom / 100),
                  fontSize: (element.fontSize || 14) * (zoom / 100),
                }}
              />
            </div>
          </div>
        );

      case 'date':
        return (
          <div
            style={{
              width: (element.width || 250) * (zoom / 100),
              userSelect: 'none',
            }}
          >
            {element.label && (
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                {element.label}
              </label>
            )}
            <div className="relative">
              <Input
                type="text"
                value={element.dateValue || ''}
                placeholder={element.dateFormat || 'MM/DD/YYYY'}
                className="rounded-lg pointer-events-none"
                style={{
                  height: 40 * (zoom / 100),
                  fontSize: (element.fontSize || 14) * (zoom / 100),
                  paddingRight: 35 * (zoom / 100),
                }}
              />
              <Calendar
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                style={{
                  width: 16 * (zoom / 100),
                  height: 16 * (zoom / 100),
                }}
              />
            </div>
          </div>
        );

      case 'map':
        return (
          <div
            style={{
              width: (element.width || 300) * (zoom / 100),
              userSelect: 'none',
            }}
          >
            {element.label && (
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                {element.label}
              </label>
            )}
            <div
              className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl border-2 border-blue-300 flex items-center justify-center relative overflow-hidden"
              style={{
                width: (element.width || 300) * (zoom / 100),
                height: (element.height || 200) * (zoom / 100),
              }}
            >
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="border border-blue-300" />
                  ))}
                </div>
              </div>
              <div className="relative z-10 text-center">
                <MapPin className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-blue-900">{element.mapLocation}</p>
              </div>
            </div>
          </div>
        );

      case 'monogram':
        const letters = (element.text || 'ABC').split('');
        const l1 = letters[0] || '';
        const l2 = letters[1] || '';
        const l3 = letters[2] || '';
        const type = element.monogramType || 'Vine';
        const color = element.color || '#000000';
        const size = (element.fontSize || 100) * (zoom / 100);
        const gradientStyle = getGradientStyle();

        if (type === 'Vine') {
          return (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: 'Vine',
                fontSize: size,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                ...gradientStyle,
                ...getStrokeStyle(),
                color: element.fillType === 'gradient' ? 'transparent' : color,
              }}>
                {l2}
              </span>
            </div>
          );
        }

        if (type === 'Stacked') {
          return (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: size * 0.05,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: size * 0.02 }}>
                <div style={{
                  fontFamily: 'Stacked-Top-Left',
                  fontSize: size * 0.4,
                  ...gradientStyle,
                  ...getStrokeStyle(),
                  color: element.fillType === 'gradient' ? 'transparent' : color
                }}>{l1}</div>
                <div style={{
                  fontFamily: 'Stacked-Bottom-Left',
                  fontSize: size * 0.4,
                  ...gradientStyle,
                  ...getStrokeStyle(),
                  color: element.fillType === 'gradient' ? 'transparent' : color
                }}>{l2}</div>
              </div>
              <div style={{
                fontFamily: 'Stacked-Tall-Right',
                fontSize: size,
                ...gradientStyle,
                ...getStrokeStyle(),
                color: element.fillType === 'gradient' ? 'transparent' : color
              }}>{l3}</div>
            </div>
          );
        }

        // 3-part fonts (Diamond, Circle, Round, Scallop)
        const fontPrefix = type; // Diamond, Circle, Round, Scallop
        return (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}>
            <span style={{
              fontFamily: `${fontPrefix}-Left`,
              fontSize: size,
              ...gradientStyle,
              ...getStrokeStyle(),
              color: element.fillType === 'gradient' ? 'transparent' : color
            }}>{l1}</span>
            <span style={{
              fontFamily: `${fontPrefix}-Mid`,
              fontSize: size,
              ...gradientStyle,
              ...getStrokeStyle(),
              color: element.fillType === 'gradient' ? 'transparent' : color
            }}>{l2}</span>
            <span style={{
              fontFamily: `${fontPrefix}-Right`,
              fontSize: size,
              ...gradientStyle,
              ...getStrokeStyle(),
              color: element.fillType === 'gradient' ? 'transparent' : color
            }}>{l3}</span>
          </div>
        );

      case 'gallery':
        const galleryCount = element.gallerySourceIds?.length || 0;
        return (
          <div className="flex flex-col items-center justify-center bg-pink-50 border-2 border-pink-200 rounded-2xl overflow-hidden group/opt p-4" style={{ width: (element.width || 300) * (zoom / 100), height: (element.height || 150) * (zoom / 100) }}>
            <Images className="w-10 h-10 text-pink-500 mb-2 group-hover/opt:scale-110 transition-transform" />
            <p className="text-xs font-bold text-pink-700 uppercase tracking-wider">{element.label || 'Gallery'}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="px-2 py-0.5 bg-pink-100 rounded-full">
                <span className="text-[9px] font-bold text-pink-600">
                  {galleryCount} Galleries
                </span>
              </div>
              <div className="px-2 py-0.5 bg-white rounded-full border border-pink-200">
                <span className="text-[9px] font-bold text-pink-500">
                  Max: {element.galleryMaxImages || 10}
                </span>
              </div>
            </div>
          </div>
        );

      case 'textarea':
        return (
          <div className="bg-white border-2 border-indigo-100 rounded-xl p-3 shadow-sm" style={{ width: (element.width || 250) * (zoom / 100) }}>
            <div className="flex items-center gap-2 mb-2">
              <AlignLeft className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-bold text-gray-500 uppercase">{element.label || 'Notes'}</span>
            </div>
            <div className="h-16 bg-gray-50 rounded-lg border border-dashed border-gray-200" />
          </div>
        );

      case 'file_upload':
        return (
          <div className="bg-emerald-50 border-2 border-emerald-200 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2" style={{ width: (element.width || 200) * (zoom / 100) }}>
            <UploadCloud className="w-6 h-6 text-emerald-500" />
            <p className="text-[10px] font-bold text-emerald-700">{element.label || 'Upload File'}</p>
          </div>
        );

      case 'product_color':
        return (
          <div className="bg-white border-2 border-orange-100 rounded-2xl p-3 flex flex-col gap-2 shadow-sm" style={{ width: (element.width || 250) * (zoom / 100) }}>
            <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1.5">
              <Palette className="w-3 h-3" />
              Select Color
            </p>
            <div className="flex gap-2">
              {['#FF5F5F', '#5FBCFF', '#5FFF9C', '#FFD85F'].map(c => (
                <div key={c} className="w-8 h-8 rounded-full border border-gray-100 shadow-sm" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        );

      case 'dropdown':
        return (
          <div className="bg-white border-2 border-cyan-100 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm" style={{ width: (element.width || 250) * (zoom / 100) }}>
            <span className="text-xs font-medium text-gray-700">{element.label || 'Choose Option'}</span>
            <ChevronDown className="w-4 h-4 text-cyan-500" />
          </div>
        );

      case 'button':
        return (
          <div className="bg-rose-600 rounded-xl px-6 py-3 shadow-lg shadow-rose-100 text-center" style={{ width: (element.width || 200) * (zoom / 100) }}>
            <span className="text-xs font-bold text-white uppercase tracking-widest">{element.label || 'Click Here'}</span>
          </div>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-3 bg-white border-2 border-amber-100 rounded-xl p-3 shadow-sm" style={{ width: (element.width || 200) * (zoom / 100) }}>
            <div className="w-6 h-6 rounded-md border-2 border-amber-200 bg-amber-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-xs font-bold text-gray-700">{element.label || 'Agree to terms'}</span>
          </div>
        );

      case 'number':
        return (
          <div className="bg-white border-2 border-teal-100 rounded-xl p-3 space-y-2 shadow-sm" style={{ width: (element.width || 180) * (zoom / 100) }}>
            <p className="text-[10px] font-bold text-teal-600 uppercase flex items-center gap-1.5">
              <Hash className="w-3 h-3" />
              {element.label || 'Quantity'}
            </p>
            <div className="flex items-center justify-between h-8 bg-gray-50 rounded-lg px-3">
              <span className="text-gray-400 font-bold">-</span>
              <span className="text-xs font-bold">1</span>
              <span className="text-gray-400 font-bold">+</span>
            </div>
          </div>
        );

      case 'time':
        return (
          <div className="bg-white border-2 border-fuchsia-100 rounded-xl p-3 flex items-center justify-between shadow-sm" style={{ width: (element.width || 200) * (zoom / 100) }}>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-fuchsia-500" />
              <span className="text-xs font-medium">12:00 PM</span>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Set Time</p>
          </div>
        );

      default:
        return null;
    }
  }, [element, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isResizing || isRotating) return;

    e.stopPropagation();
    e.preventDefault(); // Prevent text selection/ghosting
    setIsDragging(true);
    onSelect();

    const startX = e.clientX;
    const startY = e.clientY;
    const startElementX = element.x;
    const startElementY = element.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / (zoom / 100);
      const deltaY = (moveEvent.clientY - startY) / (zoom / 100);

      onUpdate({
        x: startElementX + deltaX,
        y: startElementY + deltaY,
      }, true); // Skip history during drag
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const deltaX = (upEvent.clientX - startX) / (zoom / 100);
      const deltaY = (upEvent.clientY - startY) / (zoom / 100);

      onUpdate({
        x: startElementX + deltaX,
        y: startElementY + deltaY,
      }, false); // Commit to history

      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={elementRef}
      onMouseDown={handleMouseDown}
      onClick={onSelect}
      className={`absolute cursor-move ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
      style={{
        left: localState.x * (zoom / 100),
        top: localState.y * (zoom / 100),
        transform: `rotate(${localState.rotation}deg)`,
        opacity: element.opacity / 100,
        zIndex: element.zIndex,
        willChange: (isDragging || isResizing || isRotating) ? 'transform, left, top' : 'auto',
      }}
    >
      {content}

      {/* Selection Handles - Interactive Icons */}
      {isSelected && !isDragging && (
        <>
          {/* Top Left: Delete */}
          <button
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
            className="absolute -top-3 -left-3 w-6 h-6 bg-white rounded-full border border-gray-200 shadow-md flex items-center justify-center text-red-500 hover:bg-red-50 transition-all hover:scale-110 active:scale-90 z-[100]"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Top Right: Duplicate */}
          <button
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onDuplicate(); }}
            className="absolute -top-3 -right-3 w-6 h-6 bg-white rounded-full border border-gray-200 shadow-md flex items-center justify-center text-indigo-500 hover:bg-indigo-50 transition-all hover:scale-110 active:scale-90 z-[100]"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Bottom Left: Rotate */}
          <div
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); startRotating(e); }}
            className="absolute -bottom-3 -left-3 w-6 h-6 bg-white rounded-full border border-gray-200 shadow-md flex items-center justify-center text-indigo-500 hover:bg-indigo-50 transition-all hover:scale-110 active:rotate-180 z-[100] cursor-alias"
            title="Rotate"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </div>

          {/* Bottom Right: Resize */}
          <div
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); startResizing(e); }}
            className="absolute -bottom-3 -right-3 w-6 h-6 bg-white rounded-full border border-gray-200 shadow-md flex items-center justify-center text-indigo-500 hover:bg-indigo-50 transition-all hover:scale-110 active:scale-125 z-[100] cursor-nwse-resize"
            title="Resize"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </div>
        </>
      )}
    </div>
  );
});

