import { useRef, useState, useMemo, memo, useEffect, useCallback } from 'react';
import { CanvasElement } from '../types';
import { Input } from './ui/input';
import {
  MapPin,
  Calendar,
  Phone,
  Trash2,
  Copy,
  UploadCloud,
  ChevronDown,
  CheckCircle2,
  Info,
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
    tempCtx.font = `${element.fontWeight || 400} ${fontSizeRaw}px ${element.fontFamily || 'Inter'}`;
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
    tempCtx.font = `${element.fontWeight || 400} ${fontSizeRaw}px ${element.fontFamily || 'Inter'}`;

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
  const [isEditing, setIsEditing] = useState(false);
  const canInteract = !isPublicMode || element.isEditableByCustomer;
  const [editValue, setEditValue] = useState(element.text || '');

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
    if ((element.type !== 'text' && element.type !== 'textarea') || !contentRef.current || !elementRef.current) {
      if (!isResizing && !isDragging) setTextScale({ x: 1, y: 1 });
      return;
    }

    const measure = () => {
      requestAnimationFrame(() => {
        const container = elementRef.current;
        const content = contentRef.current;
        if (!container || !content) return;

        const mode = element.textMode || 'shrink';

        if (mode === 'wrap') {
          // --- LOGIKA WRAP: Kotak mengikuti tinggi teks ---
          const contentHeight = content.scrollHeight / (zoom / 100);
          if (Math.abs(localState.height - contentHeight) > 1) {
            setLocalState(prev => ({ ...prev, height: contentHeight }));
            onUpdate({ height: contentHeight }, true);
            setTextScale({ x: 1, y: 1 });
          }
        } else {
          // --- LOGIKA SHRINK: Teks mengecil/membesar masuk ke kotak ---
          const originalTransform = content.style.transform;
          content.style.transform = 'none';

          // Force layout recalculation for fit-content
          const containerWidth = localState.width * (zoom / 100);
          const containerHeight = localState.height * (zoom / 100);

          const contentWidth = content.offsetWidth || content.scrollWidth;
          const contentHeight = content.offsetHeight || content.scrollHeight;

          content.style.transform = originalTransform;

          if (containerWidth > 0 && containerHeight > 0 && contentWidth > 0 && contentHeight > 0) {
            // Kita ingin teks memenuhi kotak, jadi kita gunakan rasio terkecil agar tidak terpotong
            const uniformScale = Math.min(containerWidth / contentWidth, containerHeight / contentHeight);
            setTextScale({ x: uniformScale, y: uniformScale });
          }
        }
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (elementRef.current) observer.observe(elementRef.current);
    if (contentRef.current) observer.observe(contentRef.current);

    return () => observer.disconnect();
  }, [element.text, localState.width, localState.height, localState.fontSize, element.textMode, element.type, zoom]);

  useEffect(() => {
    setEditValue(element.text || '');
  }, [element.text]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (!isEditing) return;
    const target = e.target as HTMLElement;
    if (elementRef.current && !elementRef.current.contains(target)) {
      setIsEditing(false);
      onUpdate({ text: editValue }, false);
    }
  }, [isEditing, editValue, onUpdate]);

  useEffect(() => {
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
    setEditValue(element.text || '');
  }, [element.text]);

  // Handle outside click to save editing
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (elementRef.current && !elementRef.current.contains(target)) {
        setIsEditing(false);
        onUpdate({ text: editValue }, false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, editValue, onUpdate]);

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
        const maintainAspect = element.type === 'image'
          ? (element.lockAspectRatio !== false)
          : (element.type === 'monogram' || (element.type === 'text' && element.textMode === 'shrink'));

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
        if (element.type === 'text' || element.type === 'monogram') {
          const isEdgeHandle = ['n', 's', 'e', 'w'].includes(resizeHandle || '');

          if (element.textMode === 'shrink' || element.type === 'monogram') {
            // MODE SHRINK (or Monogram): Selalu proposional dari handle mana pun
            const scale = newWidth / startWidth;
            newFontSize = startFontSize * scale;
            newHeight = startHeight * scale;
          } else {
            // MODE WRAP:
            // 1. Tarik Garis (Side): Hanya ganti lebar/tinggi, font tetap.
            // 2. Tarik Pojok (Corner): Proposional + Ganti Font.
            if (!isEdgeHandle) {
              const scale = newWidth / startWidth;
              newFontSize = startFontSize * scale;
              newHeight = startHeight * scale;
            }
          }
        }

        setLocalState(prev => ({
          ...prev,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
          fontSize: newFontSize
        }));

        // Optimisasi Performa: Gunakan localState saja selama resizing.
        // Sync ke parent hanya dilakukan saat PointerUp agar tidak sluggish.
        // onUpdate({
        //   x: newX,
        //   y: newY,
        //   width: newWidth,
        //   height: newHeight,
        //   fontSize: newFontSize
        // }, true);

        interactionRef.current.rafId = null;
      });
    };

    const handlePointerUp = () => {
      if (interactionRef.current.rafId) {
        cancelAnimationFrame(interactionRef.current.rafId);
        interactionRef.current.rafId = null;
      }

      // Commit local state to parent
      // We take the values from local state directly for consistency
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
      // Clear the immediate flag and global cursor
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
  }, [isResizing, onUpdate, zoom, element.type, element.rotation]);

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

    // Set flag immediately to prevent any drag
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
      isResizingFlag: true, // Set immediate flag
    };
    setIsResizing(true);

    // Explicitly set cursor on body to prevent flickering during fast resize
    document.body.style.cursor = (interactionRef.current as any).resizeHandle?.includes('nw') || (interactionRef.current as any).resizeHandle?.includes('se') ? 'nwse-resize' : 'nesw-resize';
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

  const filterString = useMemo(() => {
    if (element.type !== 'image') return 'none';

    let baseFilter = '';

    // Apply Preset first if exists
    if (element.imageFilters?.preset) {
      const preset = IMAGE_PRESETS.find(p => p.id === element.imageFilters?.preset);
      if (preset && preset.filter !== 'none') {
        baseFilter = preset.filter;
      }
    }

    // Add Adjustments
    const adj = element.imageFilters;
    if (adj) {
      const parts = [];
      if (adj.brightness !== undefined && adj.brightness !== 100) parts.push(`brightness(${adj.brightness}%)`);
      if (adj.contrast !== undefined && adj.contrast !== 100) parts.push(`contrast(${adj.contrast}%)`);
      if (adj.saturate !== undefined && adj.saturate !== 100) parts.push(`saturate(${adj.saturate}%)`);
      if (adj.hueRotate !== undefined && adj.hueRotate !== 0) parts.push(`hue-rotate(${adj.hueRotate}deg)`);
      if (adj.sepia !== undefined && adj.sepia !== 0) parts.push(`sepia(${adj.sepia}%)`);
      if (adj.grayscale !== undefined && adj.grayscale !== 0) parts.push(`grayscale(${adj.grayscale}%)`);

      if (parts.length > 0) {
        baseFilter = (baseFilter === 'none' ? '' : baseFilter) + ' ' + parts.join(' ');
      }
    }

    return baseFilter || 'none';
  }, [element.imageFilters]);

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

        if (element.type === 'text' && element.isCurved && element.curve && element.curve !== 0) {
          const fontSize = (localState.fontSize || 32);
          const text = element.text || '';

          const CURVE_SCALE = 3000;
          const radius = Math.abs(CURVE_SCALE / element.curve);
          const isSmile = element.curve > 0;
          const pathId = `curve-path-${element.id}`;

          // Create a full circle path so text can wrap around completely
          // For Smile (text at bottom), start path at top (0, -radius)
          // For Frown (text at top), start path at bottom (0, radius)
          const startY = isSmile ? -radius : radius;
          // Reverse sweep flags (0 vs 1) to ensure text is upright at the target position
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
                  letterSpacing={element.letterSpacing}
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

      case 'image':
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

      case 'shape':
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              color: element.color || '#000000',
            }}
            className="[&_svg]:w-full [&_svg]:h-full [&_svg]:fill-current"
            dangerouslySetInnerHTML={{ __html: element.svgCode || '' }}
          />
        );

      case 'field':
        return (
          <div
            style={{
              width: '100%',
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
      case 'product_color':
        const getSwatchRadius = () => {
          const shape = element.swatchShape || 'circle';
          if (shape === 'square') return '0px';
          if (shape === 'rounded') return '8px';
          return '50%';
        };

        return (
          <div
            className="flex flex-col gap-2"
            style={{
              width: '100%',
              userSelect: 'none',
            }}
          >
            {element.label && (
              <label className="text-xs font-bold text-gray-500 uppercase">
                {element.label}
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              {element.swatchColors?.map((color: string, index: number) => {
                const parts = color.split('|');
                const name = parts.length > 1 ? parts[0] : '';
                const value = parts.length > 1 ? parts[1] : parts[0];
                const isImage = value.startsWith('http') || value.startsWith('data:image');

                return (
                  <button
                    key={index}
                    title={name || value}
                    className={`border-2 transition-all pointer-events-none overflow-hidden ${element.selectedColor === color
                      ? 'border-indigo-600 scale-110 shadow-md ring-2 ring-indigo-100'
                      : 'border-white shadow-sm hover:border-gray-200'
                      }`}
                    style={{
                      width: 36 * (zoom / 100),
                      height: 36 * (zoom / 100),
                      borderRadius: getSwatchRadius(),
                      backgroundColor: isImage ? 'transparent' : value,
                      padding: 0,
                    }}
                  >
                    {isImage && (
                      <img
                        src={value}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'phone':
        return (
          <div
            style={{
              width: '100%',
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
              width: '100%',
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
                placeholder="MM/DD/YYYY"
                className="rounded-lg pr-10 pointer-events-none"
                style={{
                  height: 40 * (zoom / 100),
                  fontSize: (element.fontSize || 14) * (zoom / 100),
                }}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
        );

      case 'map':
        return (
          <div
            style={{
              width: '100%',
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
                width: '100%',
                height: '100%',
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
                letterSpacing: element.letterSpacing ? `${element.letterSpacing * (zoom / 100)}px` : 'normal'
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
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: size * 0.05 }}>
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
                color: element.fillType === 'gradient' ? 'transparent' : color,
                letterSpacing: element.letterSpacing ? `${element.letterSpacing * (zoom / 100)}px` : 'normal'
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
            letterSpacing: element.letterSpacing ? `${element.letterSpacing * (zoom / 100)}px` : 'normal'
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

      case 'file_upload':
        return (
          <div className="flex flex-col gap-1.5" style={{ width: '100%' }}>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase truncate">
                {element.label || 'File Upload'}
              </span>
              {element.isRequired && <span className="text-red-500 font-bold -mt-0.5">*</span>}
            </div>

            <div className="bg-emerald-50 border-2 border-emerald-100 border-dashed rounded-xl p-3 flex flex-col items-center justify-center gap-1 group transition-all hover:bg-emerald-100/50 hover:border-emerald-200">
              <UploadCloud className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-bold text-emerald-600">Select File</p>
            </div>

            {element.helpText && (
              <p className="text-[9px] text-gray-400 italic px-1 truncate">{element.helpText}</p>
            )}

            {element.maxFileSize && (
              <div className="flex items-center gap-1 px-1 mt-0.5">
                <Info className="w-2.5 h-2.5 text-gray-300" />
                <span className="text-[8px] text-gray-400 font-medium">Max {element.maxFileSize}MB</span>
              </div>
            )}
          </div>
        );

      case 'button':
        const displayOptions = element.enabledOptions && element.enabledOptions.length > 0
          ? element.enabledOptions
          : (element.buttonOptions || []);

        const getButtonStyle = () => {
          const style = element.buttonStyle || 'solid';
          const shape = element.buttonShape || 'rounded';

          let baseClasses = "text-[10px] font-bold px-3 py-1.5 shadow-sm truncate max-w-full transition-all ";

          // Shape
          if (shape === 'square') baseClasses += "rounded-none ";
          else if (shape === 'pill') baseClasses += "rounded-full ";
          else baseClasses += "rounded-lg ";

          // Style
          if (style === 'outline') return baseClasses + "bg-white border border-gray-300 text-gray-700 hover:border-indigo-400";
          if (style === 'soft') return baseClasses + "bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100";
          return baseClasses + "bg-indigo-600 border border-indigo-700 text-white shadow-indigo-100";
        };

        return (
          <div className="flex flex-col gap-1.5" style={{ width: '100%' }}>
            {element.label && (
              <span className="text-[10px] font-bold text-gray-400 uppercase truncate flex items-center gap-1">
                {element.label}
                {element.isRequired && <span className="text-red-500 font-bold">*</span>}
              </span>
            )}
            <div className="flex flex-wrap gap-1.5">
              {displayOptions.length > 0 ? (
                displayOptions.slice(0, 4).map((opt, idx) => (
                  <div key={idx} className={getButtonStyle()}>
                    {opt.includes('|') ? opt.split('|')[0] : opt}
                  </div>
                ))
              ) : (
                <div className={getButtonStyle() + " w-full text-center py-3"}>
                  <span className="text-xs uppercase tracking-widest">{element.label || 'Click Here'}</span>
                </div>
              )}
              {displayOptions.length > 4 && (
                <div className="text-[9px] text-gray-400 font-bold self-end pb-1">
                  +{displayOptions.length - 4} more
                </div>
              )}
            </div>
          </div>
        );

      case 'checkbox':
        const checkboxList = element.enabledCheckboxOptions && element.enabledCheckboxOptions.length > 0
          ? element.enabledCheckboxOptions
          : (element.checkboxOptions || []);

        return (
          <div className="flex flex-col gap-2" style={{ width: '100%' }}>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                {element.label && (
                  <span className="text-[10px] font-bold text-gray-400 uppercase truncate">
                    {element.label}
                  </span>
                )}
                {element.isRequired && <span className="text-red-500 font-bold -mt-1">*</span>}
              </div>

              {element.isMultiple && (element.minSelection || element.maxSelection) && (
                <div className="text-[8px] text-gray-400 font-medium">
                  {element.minSelection ? `Min: ${element.minSelection}` : ''}
                  {element.minSelection && element.maxSelection ? ' • ' : ''}
                  {element.maxSelection ? `Max: ${element.maxSelection}` : ''}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              {checkboxList.length > 0 ? (
                <>
                  {checkboxList.slice(0, 4).map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-1">
                      {element.isMultiple ? (
                        <div className="w-3.5 h-3.5 rounded border border-gray-300 bg-white" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-gray-300 bg-white" />
                      )}
                      <span className="text-[11px] text-gray-600 truncate">
                        {opt.includes('|') ? opt.split('|')[0] : opt}
                      </span>
                    </div>
                  ))}
                  {element.showOtherOption && (
                    <div className="flex flex-col gap-1 px-1">
                      <div className="flex items-center gap-2">
                        {element.isMultiple ? (
                          <div className="w-3.5 h-3.5 rounded border border-gray-300 bg-white" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-gray-300 bg-white" />
                        )}
                        <span className="text-[11px] text-gray-600">Other</span>
                      </div>
                      <div className="h-4 border-b border-gray-200 w-full ml-5" />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-3 bg-white border-2 border-amber-100 rounded-xl p-3 shadow-sm">
                  <div className="w-6 h-6 rounded-md border-2 border-amber-200 bg-amber-50 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-xs font-bold text-gray-700">{element.label || 'Agree to terms'}</span>
                </div>
              )}
              {checkboxList.length > 4 && (
                <span className="text-[9px] text-gray-400 font-bold px-1">+{checkboxList.length - 4} more items</span>
              )}
            </div>
          </div>
        );

      case 'number':
        const displayValue = element.text || String(element.defaultValue ?? '0');
        const fullDisplayNum = `${element.numberPrefix || ''}${displayValue}${element.numberSuffix || ''}`;

        return (
          <div className="flex flex-col gap-1.5" style={{ width: '100%' }}>


            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: element.textAlign === 'left' ? 'flex-start' : element.textAlign === 'right' ? 'flex-end' : 'center',
                fontSize: localState.fontSize * (zoom / 100),
                fontFamily: element.fontFamily || 'Inter',
                fontWeight: element.fontWeight || 400,
                fontStyle: element.italic ? 'italic' : 'normal',
                color: element.color || '#000000',
                lineHeight: 1,
                overflow: 'visible'
              }}
            >
              <div style={{
                ...getGradientStyle(),
                ...getStrokeStyle(),
                color: element.fillType === 'gradient' ? 'transparent' : (element.color || '#000000'),
                whiteSpace: 'nowrap'
              }}>
                {fullDisplayNum}
              </div>
            </div>

            {element.helpText && (
              <p className="text-[9px] text-gray-400 italic px-1 truncate">{element.helpText}</p>
            )}
          </div>
        );





      case 'time':
        return (
          <div className="flex flex-col gap-1.5" style={{ width: '100%' }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: element.textAlign === 'left' ? 'flex-start' : element.textAlign === 'right' ? 'flex-end' : 'center',
                fontSize: localState.fontSize * (zoom / 100),
                fontFamily: element.fontFamily || 'Inter',
                fontWeight: element.fontWeight || 400,
                fontStyle: element.italic ? 'italic' : 'normal',
                color: element.color || '#000000',
                lineHeight: 1,
                overflow: 'visible'
              }}
            >
              <div style={{
                color: element.color || '#000000',
                whiteSpace: 'nowrap'
              }}>
                {element.text || '12:00'}
              </div>
            </div>

            {element.helpText && (
              <p className="text-[9px] text-gray-400 italic px-1 truncate">{element.helpText}</p>
            )}
          </div>
        );



      case 'dropdown':
        const getDropdownContainerStyle = () => {
          const style = element.dropdownStyle || 'classic';
          if (style === 'outline') return "bg-white border-2 border-cyan-400 shadow-sm shadow-cyan-50";
          if (style === 'soft') return "bg-cyan-50/50 border border-cyan-100 text-cyan-900";
          return "bg-white border border-gray-200 shadow-sm";
        };

        return (
          <div
            className="flex flex-col gap-1"
            style={{ width: '100%' }}
          >
            {element.label && (
              <span className="text-[10px] font-bold text-gray-400 uppercase truncate flex items-center gap-1">
                {element.label}
                {element.isRequired && <span className="text-red-500 font-bold">*</span>}
              </span>
            )}

            <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg pointer-events-none ${getDropdownContainerStyle()}`}>
              <div className="flex items-center gap-2 truncate">
                {element.isSearchable && <div className="w-3 h-3 border border-gray-300 rounded-full flex-shrink-0" title="Searchable enabled" />}
                <span className={`text-xs truncate ${element.dropdownStyle === 'soft' ? 'text-cyan-700' : 'text-gray-400'}`}>
                  {element.placeholder || 'Select option...'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 ${element.dropdownStyle === 'soft' ? 'text-cyan-400' : 'text-gray-400'}`} />
            </div>

            {element.helpText && (
              <p className="text-[9px] text-gray-400 italic px-1 truncate">{element.helpText}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  }, [
    element,
    zoom,
    textScale,
    filterString,
    localState.width,
    localState.height,
    localState.fontSize,
    isEditing
  ]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canInteract) return;
    // Prevent dragging if already resizing or rotating
    if (isResizing || isRotating || (interactionRef.current as any).isResizingFlag) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    e.stopPropagation();
    onSelect();

    // Allow selection but prevent dragging if locked
    if (element.lockMove) return;

    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startElementX = element.x;
    const startElementY = element.y;

    interactionRef.current = {
      ...interactionRef.current,
      startX,
      startY,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (interactionRef.current.rafId) return;

      interactionRef.current.rafId = requestAnimationFrame(() => {
        const dx = (moveEvent.clientX - startX) / (zoom / 100);
        const dy = (moveEvent.clientY - startY) / (zoom / 100);

        const newX = startElementX + dx;
        const newY = startElementY + dy;

        setLocalState(prev => ({
          ...prev,
          x: newX,
          y: newY
        }));

        // Optimisasi Performa: Gunakan localState saja selama dragging.
        // Sync ke parent hanya dilakukan saat PointerUp agar tidak sluggish.
        // onUpdate({ x: newX, y: newY }, true);

        interactionRef.current.rafId = null;
      });
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (interactionRef.current.rafId) {
        cancelAnimationFrame(interactionRef.current.rafId);
        interactionRef.current.rafId = null;
      }

      const dx = (upEvent.clientX - startX) / (zoom / 100);
      const dy = (upEvent.clientY - startY) / (zoom / 100);

      const finalX = startElementX + dx;
      const finalY = startElementY + dy;

      setLocalState(prev => ({
        ...prev,
        x: finalX,
        y: finalY
      }));

      onUpdate({ x: finalX, y: finalY }, false); // Commit to history

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
      onDoubleClick={() => {
        if (canInteract && (element.type === 'text' || element.type === 'textarea' || element.type === 'monogram')) {
          setIsEditing(true);
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className={`draggable-element ${element.type === 'text' ? 'draggable-text' : element.type === 'image' ? 'draggable-image' : element.type === 'shape' ? 'draggable-shape' : ''} absolute ${(isResizing || isRotating || !canInteract || element.lockMove) ? 'cursor-default' : 'cursor-move'}`}
      style={{
        left: localState.x * (zoom / 100),
        top: localState.y * (zoom / 100),
        width: localState.width * (zoom / 100),
        height: localState.height * (zoom / 100),
        transform: `rotate(${localState.rotation}deg)`,
        opacity: element.opacity / 100,
        zIndex: (element.zIndex || 0) + (isSelected ? 1000 : 0),
        willChange: 'transform, left, top, width, height',
      }}
    >
      {content}

      {/* Inline Text Editing Overlay */}
      {isEditing && (
        <textarea
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              setIsEditing(false);
              onUpdate({ text: editValue }, false);
            }
            if (e.key === 'Escape') {
              setIsEditing(false);
              setEditValue(element.text || '');
            }
          }}
          className="absolute inset-0 bg-white/90 focus:outline-none z-[2000] p-0 border-none resize-none"
          style={{
            fontSize: element.fontSize || 32,
            fontFamily: element.fontFamily || 'Inter',
            fontWeight: element.fontWeight || 400,
            fontStyle: element.italic ? 'italic' : 'normal',
            lineHeight: 1.1,
            textAlign: (element.textAlign || 'center') as any,
            color: element.color || '#000000',
            overflow: 'hidden',
            letterSpacing: element.letterSpacing ? `${element.letterSpacing * (zoom / 100)}px` : 'normal'
          }}
        />
      )}

      {/* Selection Bounding Box & Handles */}
      {isSelected && canInteract && (
        <>
          {/* Solid Outline Bounding Box - No transitions for maximum performance */}
          <div
            className="absolute -inset-[3px] border-[2.5px] border-indigo-600 pointer-events-none rounded-sm z-[999]"
            style={{ display: 'block' }}
          />

          {/* Four Corner Action Handles */}
          {!isDragging && (
            <div className="absolute inset-0 pointer-events-none">
              {/* NW: Delete */}
              {!element.lockDelete && (
                <div
                  onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
                  className="absolute w-12 h-12 flex items-center justify-center pointer-events-auto z-[1000] top-0 left-0 -translate-x-[80%] -translate-y-[80%] cursor-pointer group"
                  title="Delete"
                >
                  <div className="w-7 h-7 bg-white border-2 border-red-500 text-red-500 shadow-md rounded-full flex items-center justify-center hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}

              {/* NE: Rotate */}
              {!element.lockRotate && (
                <div
                  onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); startRotating(e); }}
                  className="absolute w-12 h-12 flex items-center justify-center pointer-events-auto z-[1000] top-0 right-0 translate-x-[80%] -translate-y-[80%] cursor-alias group"
                  title="Rotate"
                >
                  <div className={`w-7 h-7 bg-white border-2 border-indigo-600 text-indigo-600 shadow-md rounded-full flex items-center justify-center transition-all ${isRotating ? 'scale-110 bg-indigo-50' : 'hover:bg-indigo-50'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                </div>
              )}

              {/* SW: Duplicate */}
              {!element.lockDuplicate && (
                <div
                  onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onDuplicate(); }}
                  className="absolute w-12 h-12 flex items-center justify-center pointer-events-auto z-[1000] bottom-0 left-0 -translate-x-[80%] translate-y-[80%] cursor-pointer group"
                  title="Duplicate"
                >
                  <div className="w-7 h-7 bg-white border-2 border-indigo-600 text-indigo-600 shadow-md rounded-full flex items-center justify-center hover:bg-indigo-50 transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}

              {/* SE: Resize */}
              {!element.lockResize && (
                <>
                  <div
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); startResizing(e, 'se'); }}
                    className="absolute w-12 h-12 flex items-center justify-center pointer-events-auto z-[1000] bottom-0 right-0 translate-x-[80%] translate-y-[80%] cursor-nwse-resize group"
                    title="Resize"
                  >
                    <div className={`w-7 h-7 bg-white border-2 border-indigo-600 text-indigo-600 shadow-md rounded-sm flex items-center justify-center transition-all ${isResizing ? 'scale-110 bg-indigo-50 border-indigo-700' : 'hover:bg-indigo-50'}`}>
                      <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-current" />
                    </div>
                  </div>

                  {/* Edge Handles for smooth line resizing */}
                  {/* Top Handle */}
                  <div
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); startResizing(e, 'n'); }}
                    className="absolute h-4 left-4 right-4 top-0 -translate-y-1/2 cursor-ns-resize pointer-events-auto z-[998]"
                  />
                  {/* Bottom Handle */}
                  <div
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); startResizing(e, 's'); }}
                    className="absolute h-4 left-4 right-4 bottom-0 translate-y-1/2 cursor-ns-resize pointer-events-auto z-[998]"
                  />
                  {/* Left Handle */}
                  <div
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); startResizing(e, 'w'); }}
                    className="absolute w-4 top-4 bottom-4 left-0 -translate-x-1/2 cursor-ew-resize pointer-events-auto z-[998]"
                  />
                  {/* Right Handle */}
                  <div
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); startResizing(e, 'e'); }}
                    className="absolute w-4 top-4 bottom-4 right-0 translate-x-1/2 cursor-ew-resize pointer-events-auto z-[998]"
                  />
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
});
