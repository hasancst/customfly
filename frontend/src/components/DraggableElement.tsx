import { useRef, useState, useMemo, memo, useEffect } from 'react';
import { CanvasElement } from '../types';
import { Input } from './ui/input';
import {
  MapPin,
  Trash2,
  Copy,
  UploadCloud
} from 'lucide-react';
import { IMAGE_PRESETS } from '../constants/filters';

interface DraggableElementProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CanvasElement>, skipHistory?: boolean) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  zoom: number;
  enableBounce?: boolean;
  isPublicMode?: boolean;
}

import { ProcessedImage } from '@/components/ProcessedImage';

const BridgeText = ({
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
    tempCtx.font = `${element.fontWeight || 400} ${fontSizeRaw}px ${element.fontFamily || 'Inter'} `;
    const text = element.text || '';
    const metrics = tempCtx.measureText(text);

    // Set temp canvas size
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.5;
    tempCanvas.width = textWidth || 100;
    tempCanvas.height = textHeight || 50;

    // Draw text
    tempCtx.font = `${element.fontWeight || 400} ${fontSizeRaw}px ${element.fontFamily || 'Inter'} `;

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
    const h = fontSize * 8; // Use fontSize * 8 for safe warping space (prevents clipping)

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

export const DraggableElement = memo(({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  zoom,
  isPublicMode = false,
}: DraggableElementProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [textScale, setTextScale] = useState({ x: 1, y: 1 });

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

  useEffect(() => {
    // Determine target mode or shape type
    const isCurvedOrBridge = element.isCurved || element.bridge;
    const isNumber = element.type === 'number';

    // Condition to run this effect: 
    // - Text element with shrink mode OR curved/bridge
    // - Number element (always uses shrink-like behavior)
    if (element.type === 'text') {
      if (!isCurvedOrBridge && element.textMode !== 'shrink') {
        if (!isResizing && !isDragging) setTextScale({ x: 1, y: 1 });
        return;
      }
    } else if (!isNumber) {
      if (!isResizing && !isDragging) setTextScale({ x: 1, y: 1 });
      return;
    }

    if (!elementRef.current) {
      if (!isResizing && !isDragging) setTextScale({ x: 1, y: 1 });
      return;
    }

    const measure = () => {
      const container = elementRef.current;
      if (!container) return;

      // --- LOGIKA SHAPE TEXT (Auto Height & Scale 1:1) ---
      if (isCurvedOrBridge) {
        if (element.isCurved && element.curve && element.curve !== 0) {
          // Calculate curved height requirements using absolute coordinates
          const fontSize = localState.fontSize || 32;
          const containerWidth = Math.max(localState.width, 100);

          const curveIntensity = element.curve;
          const baseRadius = containerWidth * 0.4;
          const radius = Math.abs(baseRadius / (curveIntensity / 20));
          const chordHalf = containerWidth / 2;

          let dy = 0;
          if (radius > chordHalf) {
            dy = radius - Math.sqrt(radius * radius - chordHalf * chordHalf);
          } else {
            dy = chordHalf;
          }

          // Height needed = curve depth + font height + padding
          const neededHeight = Math.max(Math.abs(dy) + fontSize * 2, fontSize * 3);

          // Apply auto-height with threshold to prevent jitter
          if (Math.abs(localState.height - neededHeight) > 3) {
            setLocalState(prev => ({ ...prev, height: neededHeight }));
            onUpdate({ height: neededHeight }, true);
          }
        }
        else if (element.bridge) {
          // Bridge text
          const idealHeight = Math.max(localState.width * 0.6, (localState.fontSize || 32) * 4);
          if (Math.abs(localState.height - idealHeight) > 3) {
            setLocalState(prev => ({ ...prev, height: idealHeight }));
            onUpdate({ height: idealHeight }, true);
          }
        }

        setTextScale({ x: 1, y: 1 });
        return;
      }

      // --- LOGIKA REGULAR TEXT (Shrink / Wrap) ---
      const content = contentRef.current;
      if (!content) return;

      const mode = element.textMode || 'shrink';

      if (mode === 'wrap') {
        const contentHeight = content.scrollHeight / (zoom / 100);
        if (Math.abs(localState.height - contentHeight) > 1) {
          setLocalState(prev => ({ ...prev, height: contentHeight }));
          onUpdate({ height: contentHeight }, true);
          setTextScale({ x: 1, y: 1 });
        }
      } else {
        // SHRINK MODE
        const originalTransform = content.style.transform;
        content.style.transform = 'none';

        const containerWidth = localState.width * (zoom / 100);
        const containerHeight = localState.height * (zoom / 100);

        const contentWidth = content.offsetWidth || content.scrollWidth;
        const contentHeight = content.offsetHeight || content.scrollHeight;

        content.style.transform = originalTransform;

        if (containerWidth > 0 && containerHeight > 0 && contentWidth > 0 && contentHeight > 0) {
          const uniformScale = Math.min(containerWidth / contentWidth, containerHeight / contentHeight);
          setTextScale({ x: uniformScale, y: uniformScale });
        }
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (elementRef.current) observer.observe(elementRef.current);
    if (contentRef.current) observer.observe(contentRef.current);

    return () => observer.disconnect();
  }, [
    element.text,
    localState.width,
    localState.fontSize,
    element.textMode,
    element.type,
    element.isCurved,
    element.curve,
    element.bridge,
    zoom
  ]);

  // State to track initial interaction data
  const interactionRef = useRef<{
    centerX: number;
    centerY: number;
    startWidth: number;
    startHeight: number;
    startX: number;
    startY: number;
    startX_orig: number;
    startY_orig: number;
    startRotation: number;
    startFontSize: number;
    startAngle: number;
    resizeHandle: string | null;
    rafId: number | null;
    isResizingFlag?: boolean;
  }>({
    centerX: 0,
    centerY: 0,
    startWidth: 0,
    startHeight: 0,
    startX: 0,
    startY: 0,
    startX_orig: 0,
    startY_orig: 0,
    startRotation: 0,
    startFontSize: 0,
    startAngle: 0,
    resizeHandle: null,
    rafId: null,
  });

  // Rotation Logic
  useEffect(() => {
    if (!isRotating) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (element.lockRotate) return; // Enforce lock
      if (interactionRef.current.rafId) return;

      interactionRef.current.rafId = requestAnimationFrame(() => {
        const { centerX, centerY, startAngle, startRotation } = interactionRef.current;
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);
        const newRotation = startRotation + deltaAngle;
        setLocalState(prev => ({ ...prev, rotation: newRotation }));

        // Real-time update for parent
        onUpdate({ rotation: newRotation }, true);

        interactionRef.current.rafId = null;
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (element.lockRotate) {
        setIsRotating(false);
        return;
      }
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
      if (element.lockResize) return; // Enforce lock
      if (interactionRef.current.rafId) return;

      interactionRef.current.rafId = requestAnimationFrame(() => {
        const { startX, startY, startWidth, startHeight, startFontSize, startX_orig, startY_orig, resizeHandle } = interactionRef.current;
        const rotationRad = (element.rotation || 0) * (Math.PI / 180);

        // 1. Calculate global delta
        const globalDx = (e.clientX - startX) / (zoom / 100);
        const globalDy = (e.clientY - startY) / (zoom / 100);

        // 2. Transform global delta to local delta (unrotated)
        const localDx = globalDx * Math.cos(-rotationRad) - globalDy * Math.sin(-rotationRad);
        const localDy = globalDx * Math.sin(-rotationRad) + globalDy * Math.cos(-rotationRad);

        let newWidth = startWidth;
        let newHeight = startHeight;
        let localOffsetX = 0;
        let localOffsetY = 0;

        const isFieldType = ['field', 'phone', 'date'].includes(element.type);
        const maintainAspect = element.type === 'image' || element.type === 'monogram' || element.type === 'text';

        // handle logic
        switch (resizeHandle) {
          case 'se':
            newWidth = Math.max(20, startWidth + localDx);
            newHeight = maintainAspect ? newWidth * (startHeight / startWidth) : Math.max(20, startHeight + localDy);
            break;
          case 'sw':
            newWidth = Math.max(20, startWidth - localDx);
            newHeight = maintainAspect ? newWidth * (startHeight / startWidth) : Math.max(20, startHeight + localDy);
            localOffsetX = startWidth - newWidth;
            break;
          case 'ne':
            newWidth = Math.max(20, startWidth + localDx);
            newHeight = maintainAspect ? newWidth * (startHeight / startWidth) : Math.max(20, startHeight - localDy);
            localOffsetY = startHeight - newHeight;
            break;
          case 'nw':
            newWidth = Math.max(20, startWidth - localDx);
            newHeight = maintainAspect ? newWidth * (startHeight / startWidth) : Math.max(20, startHeight - localDy);
            localOffsetX = startWidth - newWidth;
            localOffsetY = startHeight - newHeight;
            break;
          case 'e':
            newWidth = Math.max(20, startWidth + localDx);
            if (maintainAspect) newHeight = newWidth * (startHeight / startWidth);
            break;
          case 'w':
            newWidth = Math.max(20, startWidth - localDx);
            if (maintainAspect) newHeight = newWidth * (startHeight / startWidth);
            localOffsetX = startWidth - newWidth;
            break;
          case 's':
            newHeight = Math.max(20, startHeight + localDy);
            if (maintainAspect) newWidth = newHeight * (startWidth / startHeight);
            break;
          case 'n':
            newHeight = Math.max(20, startHeight - localDy);
            if (maintainAspect) newWidth = newHeight * (startWidth / startHeight);
            localOffsetY = startHeight - newHeight;
            break;
        }

        // 3. Prevent resizing height for field types
        if (isFieldType) newHeight = startHeight;

        // 4. Convert local offset back to global
        const globalOffsetX = localOffsetX * Math.cos(rotationRad) - localOffsetY * Math.sin(rotationRad);
        const globalOffsetY = localOffsetX * Math.sin(rotationRad) + localOffsetY * Math.cos(rotationRad);

        const newX = startX_orig + globalOffsetX;
        const newY = startY_orig + globalOffsetY;

        let newFontSize = startFontSize;
        if (element.type === 'text') {
          // Selalu proposional untuk teks dari handle mana pun
          const scale = newWidth / startWidth;
          newFontSize = startFontSize * scale;
          newHeight = startHeight * scale;
        }

        setLocalState(prev => ({
          ...prev,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
          fontSize: newFontSize
        }));

        interactionRef.current.rafId = null;
      });
    };

    const handlePointerUp = () => {
      if (interactionRef.current.rafId) {
        cancelAnimationFrame(interactionRef.current.rafId);
        interactionRef.current.rafId = null;
      }

      setLocalState(prev => {
        onUpdate({
          x: prev.x,
          y: prev.y,
          width: prev.width,
          height: prev.height,
          fontSize: prev.fontSize,
        }, false);
        return prev;
      });

      setIsResizing(false);
      if (interactionRef.current) {
        interactionRef.current.isResizingFlag = false;
        document.body.style.cursor = '';
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (interactionRef.current.rafId) cancelAnimationFrame(interactionRef.current.rafId);
    };
  }, [isResizing, onUpdate, zoom, element.type, element.rotation, element.lockResize]);

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

  const startResizing = (e: React.PointerEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!elementRef.current) return;

    interactionRef.current = {
      ...interactionRef.current,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: localState.width,
      startHeight: localState.height,
      startX_orig: localState.x,
      startY_orig: localState.y,
      startFontSize: localState.fontSize,
      resizeHandle: handle,
      isResizingFlag: true,
    };
    setIsResizing(true);

    document.body.style.cursor = (interactionRef.current as any).resizeHandle?.includes('nw') || (interactionRef.current as any).resizeHandle?.includes('se') ? 'nwse-resize' : 'nesw-resize';
  };

  const getStrokeStyle = () => {
    if (!element.strokeWidth || element.strokeWidth <= 0) return {};
    const scaledWidth = element.strokeWidth * (zoom / 100);
    return {
      WebkitTextStroke: `${scaledWidth}px ${element.strokeColor || '#000000'} `,
      paintOrder: 'stroke fill'
    };
  };

  const getGradientStyle = () => {
    if (element.fillType !== 'gradient' || !element.gradient) return {};
    const { from, to } = element.gradient;
    return {
      backgroundImage: `linear - gradient(135deg, ${from}, ${to})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
      display: 'inline-block',
    };
  };

  const filterString = useMemo(() => {
    if (element.type !== 'image') return 'none';

    let baseFilter = '';

    if (element.imageFilters?.preset) {
      const preset = IMAGE_PRESETS.find(p => p.id === element.imageFilters?.preset);
      if (preset && preset.filter !== 'none') {
        baseFilter = preset.filter;
      }
    }

    const adj = element.imageFilters;
    if (adj) {
      const parts = [];
      if (adj.brightness !== undefined && adj.brightness !== 100) parts.push(`brightness(${adj.brightness} %)`);
      if (adj.contrast !== undefined && adj.contrast !== 100) parts.push(`contrast(${adj.contrast} %)`);
      if (adj.saturate !== undefined && adj.saturate !== 100) parts.push(`saturate(${adj.saturate} %)`);
      if (adj.hueRotate !== undefined && adj.hueRotate !== 0) parts.push(`hue - rotate(${adj.hueRotate}deg)`);
      if (adj.sepia !== undefined && adj.sepia !== 0) parts.push(`sepia(${adj.sepia} %)`);
      if (adj.grayscale !== undefined && adj.grayscale !== 0) parts.push(`grayscale(${adj.grayscale} %)`);

      if (parts.length > 0) {
        baseFilter = (baseFilter === 'none' || !baseFilter ? '' : baseFilter) + ' ' + parts.join(' ');
      }
    }

    return baseFilter.trim() || 'none';
  }, [element.imageFilters, element.type]);

  const curveGeometry = useMemo(() => {
    if (element.type !== 'text' || !element.isCurved || !element.curve) return null;

    const containerWidth = localState.width;
    const containerHeight = localState.height;
    const curveIntensity = element.curve;
    const isSmile = curveIntensity > 0;

    const baseRadius = containerWidth * 0.4;
    const radius = Math.abs(baseRadius / (curveIntensity / 20));
    const chordHalf = containerWidth / 2;

    let dy = 0;
    if (radius > chordHalf) {
      dy = radius - Math.sqrt(radius * radius - chordHalf * chordHalf);
    } else {
      dy = chordHalf;
    }

    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    const startX = centerX - chordHalf;
    const endX = centerX + chordHalf;
    const curveY = isSmile ? (centerY + dy / 2) : (centerY - dy / 2);

    const pathId = `curve - path - ${element.id} `;
    const d = `M ${startX},${curveY} A ${radius} ${radius} 0 0 ${isSmile ? 1 : 0} ${endX},${curveY} `;

    return {
      radius,
      chordHalf,
      dy,
      centerX,
      centerY,
      startX,
      endX,
      curveY,
      isSmile,
      pathId,
      d,
      containerWidth,
      containerHeight
    };
  }, [element.type, element.isCurved, element.curve, localState.width, localState.height, element.id]);

  const content = useMemo(() => {
    switch (element.type) {
      case 'text':
      case 'textarea':
        if (element.type === 'text' && element.bridge) {
          return <BridgeText
            element={element}
            zoom={zoom}
            width={localState.width}
            height={localState.height}
            fontSize={localState.fontSize}
          />;
        }

        if (element.type === 'text' && element.isCurved && element.curve && element.curve !== 0 && curveGeometry) {
          const fontSize = (localState.fontSize || 32);
          const text = element.text || '';
          const { pathId, d, containerWidth, containerHeight } = curveGeometry;

          return (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              pointerEvents: 'none',
              overflow: 'visible'
            }}>
              <svg
                width={containerWidth}
                height={containerHeight}
                style={{
                  overflow: 'visible',
                  pointerEvents: 'none'
                }}
              >
                <defs>
                  <path id={pathId} d={d} />
                  {element.fillType === 'gradient' && element.gradient && (
                    <linearGradient
                      id={`gradient - ${element.id} `}
                      x1="0%" y1="0%" x2="100%" y2="100%"
                    >
                      <stop offset="0%" stopColor={element.gradient.from} />
                      <stop offset="100%" stopColor={element.gradient.to} />
                    </linearGradient>
                  )}
                </defs>

                {/* Invisible Hit Area for Curve Path - makes clicking the 'line' easy */}
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={Math.max(fontSize, 40)}
                  style={{ pointerEvents: 'auto', cursor: 'move' }}
                />

                <text
                  fontSize={fontSize}
                  fontFamily={element.fontFamily || 'Inter'}
                  fontWeight={element.fontWeight || 400}
                  fill={element.fillType === 'gradient' ? `url(#gradient - ${element.id})` : (element.color || '#000000')}
                  stroke={element.strokeWidth && element.strokeWidth > 0 ? (element.strokeColor || '#000000') : 'none'}
                  strokeWidth={element.strokeWidth ? element.strokeWidth : 0}
                  strokeLinejoin="round"
                  paintOrder="stroke fill"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  letterSpacing={element.letterSpacing || 0}
                  style={{ pointerEvents: 'auto', cursor: 'move' }}
                >
                  <textPath
                    href={`#${pathId} `}
                    startOffset="50%"
                  >
                    {text}
                  </textPath>
                </text>
              </svg>
            </div>
          );
        }

        const mode = element.textMode || 'shrink';
        const isWrap = mode === 'wrap';

        return (
          <div
            style={{
              fontSize: localState.fontSize * (zoom / 100),
              fontFamily: element.fontFamily || 'Inter',
              fontWeight: element.fontWeight || 400,
              fontStyle: element.italic ? 'italic' : 'normal',
              textDecoration: element.underline ? 'underline' : 'none',
              textAlign: 'center',
              whiteSpace: isWrap ? 'pre-wrap' : 'nowrap',
              wordBreak: isWrap ? 'break-word' : 'normal',
              userSelect: 'none',
              lineHeight: 1.1,
              width: '100%',
              height: isWrap ? 'auto' : '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'visible',
              padding: 0,
            }}
          >
            <div
              ref={contentRef}
              style={{
                transform: isWrap ? 'none' : `scale(${textScale.x}, ${textScale.y})`,
                transformOrigin: 'center center',
                width: isWrap ? '100%' : 'fit-content',
                whiteSpace: isWrap ? 'pre-wrap' : 'nowrap',
                ...getGradientStyle(),
                ...getStrokeStyle(),
                color: element.fillType === 'gradient' ? 'transparent' : (element.color || '#000000'),
              }}
            >
              {element.text}
            </div>
          </div>
        );

      case 'image':
        if (!element.src) {
          return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50/40 to-purple-50/40 border-2 border-dashed border-indigo-300/50 rounded-2xl gap-3 p-4 transition-all duration-300 hover:border-indigo-400 hover:from-indigo-100/40 hover:to-purple-100/40 shadow-inner overflow-hidden">
              <div className="w-14 h-14 rounded-full bg-white/80 shadow-sm flex items-center justify-center border border-white/100 pointer-events-none mb-1">
                <UploadCloud className="w-7 h-7 text-indigo-500" />
              </div>
              <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                <p className="text-[11px] font-black text-indigo-900 uppercase tracking-widest text-center truncate max-w-full px-2">
                  {element.label || 'Upload Your Image'}
                </p>
                <div className="h-[2px] w-6 bg-indigo-400/40 rounded-full" />
                <p className="text-[8px] text-indigo-500/70 font-bold text-center uppercase tracking-tighter">Click tool to add</p>
              </div>
            </div>
          );
        }
        return (
          <div className="relative w-full h-full">
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
        );

      case 'gallery':
        const SYSTEM_DEFAULT_DUMMY = 'https://img.icons8.com/fluency/512/image-gallery.png';
        const isDummy = !element.src ||
          element.src === SYSTEM_DEFAULT_DUMMY ||
          element.src.includes('icons8.com') ||
          element.src.includes('placeholder') ||
          element.src.includes('image-gallery.png');

        if (isDummy && isPublicMode) {
          return null;
        }

        return (
          <div className="relative w-full h-full">
            <ProcessedImage
              id={element.id}
              src={element.src || SYSTEM_DEFAULT_DUMMY}
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
            {isDummy && !isPublicMode && (
              <div className="absolute inset-0 bg-purple-600/10 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm py-1 px-2 rounded-md border border-purple-100 shadow-sm flex items-center gap-1.5 overflow-hidden">
                  <span className="text-[8px] font-bold text-purple-700 uppercase truncate">Gallery Placeholder</span>
                </div>
              </div>
            )}
          </div>
        );

      case 'field':
        const fieldStyle = {
          fontSize: (element.fontSize || 14) * (zoom / 100),
          fontFamily: element.fontFamily || 'Inter',
          fontWeight: element.fontWeight || 400,
          fontStyle: element.italic ? 'italic' : 'normal',
          color: element.fillType === 'gradient' ? 'transparent' : (element.color || '#000000'),
          ...getGradientStyle(),
          ...getStrokeStyle(),
        };

        return (
          <div style={{ width: '100%', userSelect: 'none' }}>
            {!element.hideLabel && element.label && <label className="text-xs font-medium text-gray-500 mb-1 block">{element.label}</label>}
            <Input
              placeholder={element.placeholder || 'Type here...'}
              className="rounded-lg pointer-events-none bg-transparent"
              style={{
                height: 40 * (zoom / 100),
                ...fieldStyle
              }}
            />
          </div>
        );

      case 'swatch': {
        const hasImages = element.swatchColors?.some(val => {
          const v = val.split('|')[1] || val;
          return v.startsWith('http') || v.includes('.jpg') || v.includes('.png') || v.includes('.svg') || v.includes('webp');
        });

        if (!element.showCanvasPreview && !hasImages) {
          return null;
        }

        return (
          <div className="flex flex-wrap gap-2">
            {element.swatchColors?.map((rawVal, i) => {
              const parts = rawVal.split('|');
              const name = parts[0];
              const value = parts[1] || parts[0];
              const isImage = value.startsWith('http') || value.includes('.jpg') || value.includes('.png') || value.includes('.svg') || value.includes('webp');

              if (!element.showCanvasPreview && !isImage) return null;

              return (
                <div
                  key={i}
                  className={`w - 8 h - 8 rounded - full border border - gray - 200 overflow - hidden flex items - center justify - center`}
                  style={{ backgroundColor: isImage ? '#f3f4f6' : value }}
                >
                  {isImage ? (
                    <img src={value} alt={name} className="w-full h-full object-cover" />
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      }

      case 'phone':
        const phoneStyle = {
          fontSize: (element.fontSize || 14) * (zoom / 100),
          fontFamily: element.fontFamily || 'Inter',
          fontWeight: element.fontWeight || 500,
          fontStyle: element.italic ? 'italic' : 'normal',
          color: element.fillType === 'gradient' ? 'transparent' : (element.color || '#000000'),
          ...getGradientStyle(),
          ...getStrokeStyle(),
        };

        return (
          <div style={{ width: '100%', userSelect: 'none' }}>
            {!element.hideLabel && element.label && <label className="text-xs font-medium text-gray-700 mb-1 block">{element.label}</label>}
            <div className="flex gap-2">
              <div
                className="flex items-center gap-2 bg-transparent rounded-lg px-3 border border-gray-300"
                style={{
                  height: 40 * (zoom / 100),
                  ...phoneStyle
                }}
              >
                <span className="font-medium">{element.countryCode}</span>
              </div>
              <Input
                value={element.text || ''}
                placeholder="(555) 123-4567"
                readOnly
                className="rounded-lg flex-1 pointer-events-none bg-transparent"
                style={{
                  height: 40 * (zoom / 100),
                  ...phoneStyle
                }}
              />
            </div>
          </div>
        );

      case 'date':
        const dateStyle = {
          fontSize: (element.fontSize || 14) * (zoom / 100),
          fontFamily: element.fontFamily || 'Inter',
          fontWeight: element.fontWeight || 500,
          fontStyle: element.italic ? 'italic' : 'normal',
          color: element.fillType === 'gradient' ? 'transparent' : (element.color || '#000000'),
          ...getGradientStyle(),
          ...getStrokeStyle(),
        };

        return (
          <div style={{ width: '100%', userSelect: 'none' }}>
            {!element.hideLabel && element.label && <label className="text-xs font-medium text-gray-700 mb-1 block">{element.label}</label>}
            <div className="relative">
              <Input
                value={element.text || ''}
                readOnly
                placeholder="MM/DD/YYYY"
                className="rounded-lg pointer-events-none bg-transparent"
                style={{
                  height: 40 * (zoom / 100),
                  ...dateStyle
                }}
              />
            </div>
          </div>
        );

      case 'map':
        return (
          <div style={{ width: '100%', userSelect: 'none' }}>
            {!element.hideLabel && element.label && <label className="text-xs font-medium text-gray-700 mb-2 block">{element.label}</label>}
            <div className="w-full bg-gray-100 rounded-lg flex items-center justify-center border border-gray-300 relative overflow-hidden" style={{ height: 120 * (zoom / 100) }}>
              <MapPin className="w-6 h-6 text-gray-400 z-10" />
              <div className="absolute inset-0 opacity-20 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=-6.2,106.8&zoom=13&size=400x400')] bg-cover" />
            </div>
          </div>
        );

      case 'monogram':
        const monogramText = element.text || 'ABC';
        const monogramType = element.monogramType || 'Vine';
        const customFont = element.fontFamily;

        const monogramTextProps = {
          fill: element.fillType === 'gradient' ? `url(#gradient - ${element.id})` : (element.color || '#000000'),
          stroke: element.strokeWidth && element.strokeWidth > 0 ? (element.strokeColor || '#000000') : 'none',
          strokeWidth: element.strokeWidth || 0,
          strokeLinejoin: "round" as any,
          paintOrder: "stroke fill" as any,
        };

        const renderDefs = () => (
          <defs>
            {element.fillType === 'gradient' && element.gradient && (
              <linearGradient id={`gradient - ${element.id} `} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={element.gradient.from} />
                <stop offset="100%" stopColor={element.gradient.to} />
              </linearGradient>
            )}
          </defs>
        );

        // If a custom font is selected, use it for everything
        if (customFont) {
          return (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible', aspectRatio: '1/1' }}>
                {renderDefs()}
                <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="95" fontFamily={customFont} {...monogramTextProps}>
                  {monogramText}
                </text>
              </svg>
            </div>
          );
        }

        // Special handling for Standard Split Fonts (Diamond, Circle, Round, Scallop)
        const splitFamilies = ['Diamond', 'Circle', 'Round', 'Scallop'];
        if (splitFamilies.includes(monogramType)) {
          const chars = monogramText.substring(0, 3).split('');
          const isDiamond = monogramType === 'Diamond';
          const isCircle = monogramType === 'Circle';

          // Diamond is already tight (34/66). 
          // Circle (Master Circle) now also made tight to match the pillow reference.
          let leftX = "22%";
          let rightX = "78%";
          let midSize = "95";

          if (isDiamond) {
            leftX = "34%";
            rightX = "66%";
          } else if (isCircle) {
            leftX = "25%";
            rightX = "75%";
            midSize = "100";
          }

          return (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible', aspectRatio: '1/1' }}>
                {renderDefs()}
                {chars[0] && (
                  <text x={leftX} y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="95" fontFamily={`${monogramType} -Left`} {...monogramTextProps}>
                    {chars[0]}
                  </text>
                )}
                {chars[1] && (
                  <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize={midSize} fontFamily={`${monogramType} -Mid`} {...monogramTextProps}>
                    {chars[1]}
                  </text>
                )}
                {chars[2] && (
                  <text x={rightX} y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="95" fontFamily={`${monogramType} -Right`} {...monogramTextProps}>
                    {chars[2]}
                  </text>
                )}
              </svg>
            </div>
          );
        }

        // Special handling for Stacked
        if (monogramType === 'Stacked') {
          const chars = monogramText.substring(0, 3).split('');
          return (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible', aspectRatio: '1/1' }}>
                {renderDefs()}
                {chars[0] && (
                  <text x="19%" y="45%" dominantBaseline="middle" textAnchor="middle" fontSize="149" fontFamily="Stacked-Top-Left" {...monogramTextProps}>
                    {chars[0]}
                  </text>
                )}
                {chars[1] && (
                  <text x="19%" y="51%" dominantBaseline="middle" textAnchor="middle" fontSize="149" fontFamily="Stacked-Bottom-Left" {...monogramTextProps}>
                    {chars[1]}
                  </text>
                )}
                {chars[2] && (
                  <text x="75%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="160" fontFamily="Stacked-Tall-Right" {...monogramTextProps}>
                    {chars[2]}
                  </text>
                )}
              </svg>
            </div>
          );
        }

        // Default or Vine
        const chars = monogramText.substring(0, 3).split('');
        const isVine = monogramType === 'Vine';

        if (isVine && chars.length > 1) {
          return (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible', aspectRatio: '1/1' }}>
                {renderDefs()}
                {chars[0] && (
                  <text x="20%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="65" fontFamily={monogramType} {...monogramTextProps}>
                    {chars[0]}
                  </text>
                )}
                {chars[1] && (
                  <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="100" fontFamily={monogramType} {...monogramTextProps}>
                    {chars[1]}
                  </text>
                )}
                {chars[2] && (
                  <text x="80%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="65" fontFamily={monogramType} {...monogramTextProps}>
                    {chars[2]}
                  </text>
                )}
              </svg>
            </div>
          );
        }

        return (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible', aspectRatio: '1/1' }}>
              {renderDefs()}
              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="95" fontFamily={monogramType} {...monogramTextProps}>
                {monogramText}
              </text>
            </svg>
          </div>
        );

      case 'product_color':
        return (
          <div className="flex flex-wrap gap-2">
            {element.swatchColors?.map((c, i) => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: c.split('|')[1] || c }} />
            ))}
          </div>
        );

      case 'dropdown':
      case 'checkbox':
      case 'button':
        return null;

      case 'number':
        return (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: localState.fontSize * (zoom / 100),
            fontFamily: element.fontFamily || 'Inter',
            fontWeight: element.fontWeight || 700,
            fontStyle: element.italic ? 'italic' : 'normal',
            color: element.fillType === 'gradient' ? 'transparent' : (element.color || '#000000'),
            whiteSpace: 'nowrap',
            userSelect: 'none',
            overflow: 'visible',
            ...getGradientStyle(),
            ...getStrokeStyle(),
          }}>
            <div
              ref={contentRef}
              style={{
                transform: `scale(${textScale.x}, ${textScale.y})`,
                transformOrigin: 'center center',
                width: 'fit-content',
                whiteSpace: 'nowrap'
              }}
            >
              {element.numberPrefix || ''}{element.text || element.defaultValue || '0'}{element.numberSuffix || ''}
            </div>
          </div>
        );

      case 'time':
        return (
          <div style={{ width: '100%', userSelect: 'none' }}>
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: localState.fontSize * (zoom / 100),
              fontFamily: element.fontFamily || 'Inter',
              fontWeight: element.fontWeight || 700,
              fontStyle: element.italic ? 'italic' : 'normal',
              color: element.fillType === 'gradient' ? 'transparent' : (element.color || '#000000'),
              ...getGradientStyle(),
              ...getStrokeStyle(),
            }}>
              {element.text || '12:00'}
            </div>
          </div>
        );

      default:
        return null;
    }
  }, [element, zoom, textScale, filterString, localState.width, localState.height, localState.fontSize, curveGeometry]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isResizing || isRotating || (interactionRef.current as any).isResizingFlag) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    e.stopPropagation();
    setIsDragging(true);
    onSelect();

    const startX = e.clientX;
    const startY = e.clientY;
    const startElementX = element.x;
    const startElementY = element.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (element.lockMove) return; // Enforce lock
      const dx = (moveEvent.clientX - startX) / (zoom / 100);
      const dy = (moveEvent.clientY - startY) / (zoom / 100);

      const newX = startElementX + dx;
      const newY = startElementY + dy;

      setLocalState(prev => ({ ...prev, x: newX, y: newY }));
      onUpdate({ x: newX, y: newY }, true);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (!element.lockMove) {
        const dx = (upEvent.clientX - startX) / (zoom / 100);
        const dy = (upEvent.clientY - startY) / (zoom / 100);
        const finalX = startElementX + dx;
        const finalY = startElementY + dy;
        onUpdate({ x: finalX, y: finalY }, false);
      }
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      ref={elementRef}
      onPointerDown={handlePointerDown}
      onClick={(e) => e.stopPropagation()}
      className={`absolute draggable - element ${isResizing || isRotating ? 'cursor-not-allowed' : (element.lockMove ? 'cursor-default' : 'cursor-move')} `}
      style={{
        left: localState.x * (zoom / 100),
        top: localState.y * (zoom / 100),
        width: localState.width * (zoom / 100),
        height: localState.height * (zoom / 100),
        transform: `rotate(${localState.rotation}deg)`,
        opacity: element.opacity / 100,
        zIndex: (element.zIndex || 0) + (isSelected ? 1000 : 0),
        willChange: 'transform, left, top, width, height',
        pointerEvents: element.isCurved ? 'none' : 'auto'
      }}
    >
      {content}

      {isSelected && (() => {
        const isStacked = element.type === 'monogram' && element.monogramType === 'Stacked';
        const selectionClass = isStacked ? '-inset-[30%]' : '-inset-[3px]';
        const handlesInsetClass = isStacked ? '-inset-[30%]' : 'inset-0';

        return (
          <>
            <div
              className={`absolute border - [2.5px] border - indigo - 600 pointer - events - none z - [999] ${selectionClass} ${element.isCurved ? 'rounded-xl opacity-40' : 'rounded-sm'} `}
              style={{ display: 'block' }}
            />

            {element.isCurved && curveGeometry && (
              <div className="absolute inset-0 pointer-events-none z-[999] flex items-center justify-center">
                <svg width={curveGeometry.containerWidth} height={curveGeometry.containerHeight} style={{ overflow: 'visible' }}>
                  <path d={curveGeometry.d} fill="none" stroke="#4f46e5" strokeWidth={2} strokeDasharray="5 3" opacity={0.8} />
                </svg>
              </div>
            )}

            {!isDragging && (
              <div className={`absolute pointer - events - none ${handlesInsetClass} `}>
                {!element.lockDelete && (
                  <div onPointerDown={(e) => { e.stopPropagation(); onDelete(); }} className="absolute w-8 h-8 bg-white border-2 border-red-500 text-red-500 rounded-full flex items-center justify-center top-0 left-0 -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer shadow-md">
                    <Trash2 className="w-4 h-4" />
                  </div>
                )}
                {!element.lockRotate && (
                  <div onPointerDown={(e) => { e.stopPropagation(); startRotating(e); }} className="absolute w-8 h-8 bg-white border-2 border-indigo-600 text-indigo-600 rounded-full flex items-center justify-center top-0 right-0 translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-alias shadow-md">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </div>
                )}
                {!element.lockDuplicate && (
                  <div onPointerDown={(e) => { e.stopPropagation(); onDuplicate(); }} className="absolute w-8 h-8 bg-white border-2 border-indigo-600 text-indigo-600 rounded-full flex items-center justify-center bottom-0 left-0 -translate-x-1/2 translate-y-1/2 pointer-events-auto cursor-pointer shadow-md">
                    <Copy className="w-4 h-4" />
                  </div>
                )}
                {!element.lockResize && (
                  <div onPointerDown={(e) => { e.stopPropagation(); startResizing(e, 'se'); }} className="absolute w-8 h-8 bg-white border-2 border-indigo-600 text-indigo-600 rounded-sm flex items-center justify-center bottom-0 right-0 translate-x-1/2 translate-y-1/2 pointer-events-auto cursor-nwse-resize shadow-md">
                    <div className="w-3 h-3 border-r-2 border-b-2 border-current" />
                  </div>
                )}

                {!element.lockResize && (
                  <>
                    <div onPointerDown={(e) => startResizing(e, 'n')} className="absolute h-4 left-4 right-4 top-0 -translate-y-1/2 cursor-ns-resize pointer-events-auto z-[998]" />
                    <div onPointerDown={(e) => startResizing(e, 's')} className="absolute h-4 left-4 right-4 bottom-0 translate-y-1/2 cursor-ns-resize pointer-events-auto z-[998]" />
                    <div onPointerDown={(e) => startResizing(e, 'w')} className="absolute w-4 top-4 bottom-4 left-0 -translate-x-1/2 cursor-ew-resize pointer-events-auto z-[998]" />
                    <div onPointerDown={(e) => startResizing(e, 'e')} className="absolute w-4 top-4 bottom-4 right-0 translate-x-1/2 cursor-ew-resize pointer-events-auto z-[998]" />
                  </>
                )}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
});
