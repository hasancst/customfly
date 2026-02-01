import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
import { Summary } from './Summary';
import { ContextualToolbar } from './ContextualToolbar';
import { ImageCropModal } from './ImageCropModal';
import { BaseImageModal } from './BaseImageModal';
import { Header } from './Header';
import { CanvasElement, ShopifyProduct, PageData } from '../types';
import { Minus, Plus, X, Image as ImageIcon, Pencil, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

const parseAssetColors = (value: string) => {
    if (!value) return [];
    const colors: { name: string, value: string }[] = [];
    const lines = value.split('\n').filter(Boolean);

    lines.forEach(line => {
        if (line.includes('|')) {
            const [name, val] = line.split('|');
            const cleanVal = val.trim();
            if (/^#[0-9A-Fa-f]{3,6}$/.test(cleanVal)) {
                colors.push({ name: name.trim(), value: cleanVal });
            }
        } else {
            const cleanVal = line.trim();
            if (/^#[0-9A-Fa-f]{3,6}$/.test(cleanVal)) {
                colors.push({ name: cleanVal, value: cleanVal });
            }
        }
    });

    return colors;
};

export interface DesignerOpenCoreProps {
    isPublicMode: boolean;
    productId: string | undefined;
    productData: ShopifyProduct | null;
    initialPages?: PageData[];
    initialConfig?: any;
    onSave?: (data: any) => Promise<any>;
    onFetchAssets?: (type: string) => Promise<any>;
    onFetchDesigns?: () => Promise<any>;
    onBack?: () => void;
    userFonts?: any[];
    userColors?: any[];
    userOptions?: any[];
    savedDesigns?: any[];
    allDesigns?: any[];
    pricingConfigComponent?: React.ReactNode;
    customFetch?: any;
}

// DesignerOpenCore.tsx - Optimized for Public Use
// Changes: Removed Admin config state, hardcoded isPublicMode, restricted Toolbar

export function DesignerOpenCore({
    isPublicMode = true,
    productId,
    productData,
    initialPages = [{ id: 'default', name: 'Side 1', elements: [] }],
    initialConfig = {},
    onSave,
    onFetchAssets,
    // onFetchDesigns, // Unused
    onBack,
    userFonts = [],
    userColors = [],
    userOptions = [],
    savedDesigns = [],
    allDesigns = [],
    customFetch,
}: DesignerOpenCoreProps) {
    const isPublicModeProp = isPublicMode;

    const [pages, setPages] = useState<PageData[]>(initialPages);
    const [activePageId, setActivePageId] = useState<string>(initialPages[0]?.id || 'default');
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [history, setHistory] = useState<PageData[][]>([JSON.parse(JSON.stringify(initialPages))]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [zoom, setZoom] = useState(80);
    const [showSummary, setShowSummary] = useState(true);

    // Simplified Config - Consumers don't control Safe Area or Output Settings
    // We keep default values solely for rendering consistency if needed
    const showSafeArea = initialConfig.showSafeArea ?? true;
    const showRulers = false;   // Hidden for customers
    const unit = 'cm';
    const paperSize = initialConfig.paperSize || 'Custom';
    const customPaperDimensions = initialConfig.customPaperDimensions || { width: 264.5833, height: 264.5833 };
    const safeAreaPadding = initialConfig.safeAreaPadding ?? 10;
    const safeAreaRadius = initialConfig.safeAreaRadius ?? 0;
    const safeAreaWidth = initialConfig.safeAreaWidth;
    const safeAreaHeight = initialConfig.safeAreaHeight;
    const safeAreaOffset = initialConfig.safeAreaOffset || { x: 0, y: 0 };

    // Fixed Admin Settings
    const designerLayout = 'redirect';
    const buttonText = initialConfig.buttonText || 'Design It';
    const productOutputSettings = initialConfig.productOutputSettings || null;

    const [designName, setDesignName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);

    const [selectedVariantId, setSelectedVariantId] = useState<string>('');
    const [selectedBaseColorAssetId, setSelectedBaseColorAssetId] = useState<string | null>(initialConfig.assets?.selectedBaseColorAssetId || initialConfig.selectedBaseColorAssetId || null);
    const [selectedElementColorAssetId, setSelectedElementColorAssetId] = useState<string | null>(initialConfig.assets?.colorAssetId || initialConfig.colorAssetId || initialConfig.selectedColorAssetId || null);
    const [selectedFontAssetId, setSelectedFontAssetId] = useState<string | null>(initialConfig.assets?.fontAssetId || initialConfig.fontAssetId || null);
    const [selectedOptionAssetId, setSelectedOptionAssetId] = useState<string | null>(initialConfig.assets?.optionAssetId || initialConfig.optionAssetId || null);
    const [selectedGalleryAssetId, setSelectedGalleryAssetId] = useState<string | null>(initialConfig.assets?.galleryAssetId || initialConfig.galleryAssetId || null);
    const [selectedShapeAssetId, setSelectedShapeAssetId] = useState<string | null>(initialConfig.assets?.shapeAssetId || initialConfig.shapeAssetId || null);

    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [isBaseImageModalOpen, setIsBaseImageModalOpen] = useState(false);
    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
    // Initialize selected variant
    useEffect(() => {
        if (productData?.variants && productData.variants.length > 0) {
            if (!selectedVariantId) {
                console.log("[DesignerOpenCore] Auto-selecting first variant:", productData.variants[0].id);
                setSelectedVariantId(productData.variants[0].id.toString());
            }
        } else if (productData) {
            console.warn("[DesignerOpenCore] productData present but no variants found:", productData);
        }
    }, [productData, selectedVariantId]);

    useEffect(() => {
        console.log('DesignerOpenCore Initial Data:', {
            productData,
            variants: productData?.variants,
            initialConfig,
            variantBaseImages: initialConfig?.variantBaseImages
        });
    }, [productData]);

    const addToHistory = useCallback((currentPages: PageData[]) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(JSON.parse(JSON.stringify(currentPages)));
            if (newHistory.length > 50) newHistory.shift();
            return newHistory;
        });
        setHistoryIndex(prev => prev + 1);
    }, [historyIndex]);

    const undo = () => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            if (prevState) {
                setHistoryIndex(prev => prev - 1);
                setPages(JSON.parse(JSON.stringify(prevState)));
            }
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            if (nextState) {
                setHistoryIndex(prev => prev + 1);
                setPages(JSON.parse(JSON.stringify(nextState)));
            }
        }
    };

    const updateElement = useCallback((id: string, updates: Partial<CanvasElement>, skipHistory = false) => {
        setPages(prev => {
            const updated = prev.map(p => {
                if (p.id === activePageId) {
                    const newEls = p.elements.map(el => el.id === id ? { ...el, ...updates } : el);
                    return { ...p, elements: newEls };
                }
                return p;
            });
            if (!skipHistory) addToHistory(updated);
            return updated;
        });
    }, [activePageId, addToHistory]);

    const deleteElement = useCallback((id: string) => {
        setPages(prev => {
            const updated = prev.map(p => {
                if (p.id === activePageId) return { ...p, elements: p.elements.filter(el => el.id !== id) };
                return p;
            });
            addToHistory(updated);
            return updated;
        });
        setSelectedElement(null);
    }, [activePageId, addToHistory]);

    const duplicateElement = useCallback((id: string) => {
        setPages(prev => {
            const updated = prev.map(p => {
                if (p.id === activePageId) {
                    const el = p.elements.find(e => e.id === id);
                    if (el) {
                        const nextZ = p.elements.length > 0 ? Math.max(...p.elements.map(e => e.zIndex)) + 1 : 1;
                        const newEl = { ...el, id: `${el.type}-${Date.now()}`, x: el.x + 20, y: el.y + 20, zIndex: nextZ };
                        return { ...p, elements: [...p.elements, newEl] };
                    }
                }
                return p;
            });
            addToHistory(updated);
            return updated;
        });
    }, [activePageId, addToHistory]);

    const getCanvasPx = useCallback(() => {
        const safeCustom = {
            width: Number(customPaperDimensions?.width) || 210,
            height: Number(customPaperDimensions?.height) || 297
        };

        const paperSizes: Record<string, { width: number; height: number }> = {
            'A4': { width: 210, height: 297 },
            'A3': { width: 297, height: 420 },
            'A5': { width: 148, height: 210 },
            'Letter': { width: 216, height: 279 },
            'Legal': { width: 216, height: 356 },
            'Tabloid': { width: 279, height: 432 },
            'Custom': safeCustom,
        };

        const paper = paperSizes[paperSize] || paperSizes['A4'];
        const mmToPx = 3.7795275591;

        const w = Number(paper.width || 210) * mmToPx;
        const h = Number(paper.height || 297) * mmToPx;

        return {
            width: isNaN(w) ? 1000 : w,
            height: isNaN(h) ? 1000 : h
        };
    }, [paperSize, customPaperDimensions]);

    const addElement = useCallback((element: CanvasElement) => {
        const canvas = getCanvasPx();

        let finalX = Number(element.x);
        let finalY = Number(element.y);
        let finalOpacity = Number(element.opacity);
        const elW = Number(element.width) || 200;
        const elH = Number(element.height) || 50;

        const isNeedsCentering = isNaN(finalX) || isNaN(finalY) || finalX < -500 || (finalX === 100 && finalY === 100) || finalOpacity === 0;

        if (isNeedsCentering) {
            finalX = (canvas.width / 2) - (elW / 2);
            finalY = (canvas.height / 2) - (elH / 2);
            finalOpacity = 100;
        }

        setPages(prev => {
            const updated = prev.map(p => {
                if (p.id === activePageId) {
                    const nextZ = p.elements.length > 0 ? Math.max(...p.elements.map(e => e.zIndex)) + 1 : 1;
                    const sanitizedElement = {
                        ...element,
                        x: isNaN(finalX) ? 0 : finalX,
                        y: isNaN(finalY) ? 0 : finalY,
                        opacity: isNaN(finalOpacity) ? 100 : finalOpacity,
                        zIndex: nextZ
                    };
                    return { ...p, elements: [...p.elements, sanitizedElement] };
                }
                return p;
            });
            addToHistory(updated);
            return updated;
        });
        setSelectedElement(element.id);
    }, [activePageId, addToHistory, getCanvasPx]);

    const addPage = () => {
        if (pages.length >= 20) return;
        const newId = `page-${Date.now()}`;
        const newPages = [...pages, { id: newId, name: `Side ${pages.length + 1}`, elements: [] }];
        setPages(newPages);
        setActivePageId(newId);
        addToHistory(newPages);
    };

    const deletePage = (id: string) => {
        if (pages.length <= 1) return;
        const newPages = pages.filter(p => p.id !== id);
        setPages(newPages);
        if (activePageId === id) setActivePageId(newPages[0].id);
        addToHistory(newPages);
    };

    const renamePage = (id: string, name: string) => {
        const updated = pages.map(p => p.id === id ? { ...p, name } : p);
        setPages(updated);
        addToHistory(updated);
    };

    const handleSave = async (_isTemplate = false, isSilent = false) => {
        if (!onSave) return;
        if (!isSilent) setIsSaving(true);
        else setIsAutoSaving(true);

        let previewUrl = '';
        let productionFileUrl = '';
        const canvasElement = document.getElementById('canvas-paper');
        if (canvasElement && !isSilent) {
            try {
                const html2canvas = (await import('html2canvas')).default;

                // 1. Preview Capture (Low res for UI)
                const previewCanvas = await html2canvas(canvasElement, {
                    useCORS: true,
                    scale: 1,
                    backgroundColor: null,
                    ignoreElements: (element: Element) => {
                        // Ignore hidden elements
                        if (element.classList.contains('imcst-preview-hide')) return true;

                        // Ignore problematic Shopify theme components during capture
                        const tagName = element.tagName.toLowerCase();
                        if (tagName.includes('-') || // Custom elements
                            element.classList.contains('cart-drawer') ||
                            element.classList.contains('shopify-section') ||
                            element.id.includes('shopify-section') ||
                            element.closest('.shopify-section')
                        ) {
                            // If it's one of these but IS the canvas parent or inside it, don't ignore
                            if (element.contains(canvasElement)) return false;
                            return true;
                        }
                        return false;
                    }
                });
                previewUrl = previewCanvas.toDataURL('image/png', 0.8);

                // 2. Production Capture (High res based on settings)
                const dpi = productOutputSettings?.dpi || 300;
                const scale = Math.max(2, Math.min(8, dpi / 72)); // Scale factor for DPI

                const prodCanvas = await html2canvas(canvasElement, {
                    useCORS: true,
                    scale: scale,
                    backgroundColor: productOutputSettings?.includeBaseMockup ? undefined : null,
                    ignoreElements: (element: Element) => {
                        if (element.classList.contains('imcst-preview-hide')) return true;

                        const tagName = element.tagName.toLowerCase();
                        if (tagName.includes('-') ||
                            element.classList.contains('cart-drawer') ||
                            element.classList.contains('shopify-section') ||
                            element.id.includes('shopify-section') ||
                            element.closest('.shopify-section')
                        ) {
                            if (element.contains(canvasElement)) return false;
                            return true;
                        }
                        return false;
                    }
                });
                // We'll pass the base64 to onSave, which will handle uploading it
                productionFileUrl = prodCanvas.toDataURL('image/png', 1.0);

            } catch (err) {
                console.error('Failed to capture canvas:', err);
            }
        }

        const data = {
            name: designName || `Design-${Date.now()}`,
            designJson: pages,
            isTemplate: false, // Customers can't save templates
            variantId: selectedVariantId,
            previewUrl: previewUrl || undefined,
            productionFileBase64: productionFileUrl || undefined, // Temp base64 for the wrapper to upload
            config: isPublicModeProp ? undefined : {
                showSafeArea,
                safeAreaPadding,
                safeAreaRadius,
                safeAreaWidth,
                safeAreaHeight,
                safeAreaOffset,
                showRulers,
                unit,
                paperSize,
                customPaperDimensions,
                selectedBaseColorAssetId,
                selectedElementColorAssetId,
                fontAssetId: selectedFontAssetId,
                colorAssetId: selectedElementColorAssetId,
                optionAssetId: selectedOptionAssetId,
                galleryAssetId: selectedGalleryAssetId,
                shapeAssetId: selectedShapeAssetId,
                designerLayout,
                buttonText,
                productOutputSettings
            }
        };

        try {
            const result = await onSave(data);
            if (result) {
                setLastSavedTime(new Date());
                if (!isSilent) toast.success(`Saved successfully`);
            }
        } catch (error) {
            if (!isSilent) toast.error('Save failed');
        } finally {
            setIsSaving(false);
            setIsAutoSaving(false);
        }
    };

    const currentPages = useMemo(() => {
        const found = pages.find(p => p.id === activePageId);
        return found || pages[0] || { id: 'default', name: 'Side 1', elements: [] };
    }, [pages, activePageId]);

    const currentElements = currentPages?.elements || [];
    const processedElements = useMemo(() => {
        // Only show elements that are not locked or restricted for customers to see in layers
        return currentElements;
    }, [currentElements]);

    const activeBasePaletteColors = useMemo(() => {
        const asset = userColors.find((a: any) => a.id === selectedBaseColorAssetId);
        if (!asset) return [];
        return parseAssetColors(asset.value);
    }, [userColors, selectedBaseColorAssetId]);

    const activeElementPaletteColors = useMemo(() => {
        const asset = userColors.find((a: any) => a.id === selectedElementColorAssetId);
        if (!asset) return [];
        return parseAssetColors(asset.value);
    }, [userColors, selectedElementColorAssetId]);

    const filteredUserFonts = useMemo(() => {
        if (selectedFontAssetId) return userFonts.filter(a => a.id === selectedFontAssetId);
        return userFonts.filter(a => !a.config?.productId || String(a.config.productId) === String(productId));
    }, [userFonts, selectedFontAssetId, productId]);

    const filteredUserColors = useMemo(() => {
        if (selectedElementColorAssetId) return userColors.filter(a => a.id === selectedElementColorAssetId);
        return userColors.filter(a => !a.config?.productId || String(a.config.productId) === String(productId));
    }, [userColors, selectedElementColorAssetId, productId]);

    const filteredUserOptions = useMemo(() => {
        if (selectedOptionAssetId) return userOptions.filter(a => a.id === selectedOptionAssetId);
        return userOptions.filter(a => !a.config?.productId || String(a.config.productId) === String(productId));
    }, [userOptions, selectedOptionAssetId, productId]);

    const selectedVariant = useMemo(() =>
        (productData?.variants || []).find(v => String(v.id) === String(selectedVariantId)),
        [productData, selectedVariantId]
    );

    const hasVariants = useMemo(() => {
        if (!productData?.variants || productData.variants.length === 0) return false;
        if (productData.variants.length > 1) return true;
        return productData.variants[0].title.toLowerCase() !== 'default title';
    }, [productData]);

    const handleOptionChange = (optionIndex: number, value: string) => {
        console.log('Handle Option Change:', { optionIndex, value, selectedVariant, allVariants: productData?.variants });
        if (!productData?.variants || productData.variants.length === 0) return;

        // Fallback to first variant if none selected to ensure we have a baseline for options
        const baseVariant = selectedVariant || productData.variants[0];

        const currentOptions = [
            baseVariant.option1,
            baseVariant.option2,
            baseVariant.option3,
        ];

        currentOptions[optionIndex] = value;
        const match = productData.variants.find(v =>
            (currentOptions[0] === undefined || currentOptions[0] === null || v.option1 === currentOptions[0]) &&
            (currentOptions[1] === undefined || currentOptions[1] === null || v.option2 === currentOptions[1]) &&
            (currentOptions[2] === undefined || currentOptions[2] === null || v.option3 === currentOptions[2])
        );

        if (match) {
            console.log('Variant Matched:', match.id, match);
            setSelectedVariantId(String(match.id));
        } else {
            console.log('No exact match. Trying fallback for option index:', optionIndex, 'Value:', value);
            // Fallback: Find first variant that has the NEW option value at the correct position
            // This handles "Linked Options" behavior where switching one option might require changing others
            const fallbackMatch = productData.variants.find(v => {
                const variantOptionValue = optionIndex === 0 ? v.option1 : optionIndex === 1 ? v.option2 : v.option3;
                return variantOptionValue === value;
            });

            if (fallbackMatch) {
                console.log('Fallback Variant Matched:', fallbackMatch.id, fallbackMatch);
                setSelectedVariantId(String(fallbackMatch.id));
            } else {
                console.warn('No variant found even with fallback for value:', value);
            }
        }
    };

    const zoomContainerRef = useRef<HTMLDivElement>(null);

    const handleWheel = useCallback((e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -5 : 5;
            setZoom(prev => Math.max(10, Math.min(200, prev + delta)));
        }
    }, []);

    useEffect(() => {
        const container = zoomContainerRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
            return () => container.removeEventListener('wheel', handleWheel);
        }
    }, [handleWheel]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // If user is typing in an input/textarea, don't trigger shortcuts
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                return;
            }

            // Delete
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
                deleteElement(selectedElement);
            }

            // Undo/Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) redo();
                else undo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                redo();
            }

            // Duplicate
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                if (selectedElement) duplicateElement(selectedElement);
            }

            // Arrows move
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedElement) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;
                const el = currentElements.find(el => el.id === selectedElement);
                if (el) {
                    let dx = 0, dy = 0;
                    if (e.key === 'ArrowUp') dy = -step;
                    if (e.key === 'ArrowDown') dy = step;
                    if (e.key === 'ArrowLeft') dx = -step;
                    if (e.key === 'ArrowRight') dx = step;
                    updateElement(selectedElement, { x: el.x + dx, y: el.y + dy });
                }
            }

            // Zoom
            if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
                e.preventDefault();
                setZoom(prev => Math.min(200, prev + 10));
            }
            if ((e.ctrlKey || e.metaKey) && e.key === '-') {
                e.preventDefault();
                setZoom(prev => Math.max(10, prev - 10));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedElement, deleteElement, undo, redo, duplicateElement, currentElements, updateElement]);

    return (
        <div className="fixed inset-0 z-[99999] bg-gray-100 flex flex-col overflow-hidden">
            <Header
                onUndo={undo} onRedo={redo} canUndo={historyIndex > 0} canRedo={historyIndex < history.length - 1}
                title={productData?.title} onSave={(isTemplate) => handleSave(isTemplate, false)} designName={designName} onDesignNameChange={setDesignName}
                isSaving={isSaving || isAutoSaving} lastSavedTime={lastSavedTime}
                productId={productId}
                isPublicMode={isPublicModeProp} buttonText={buttonText}
                savedDesigns={savedDesigns} allDesigns={allDesigns}
                onLoadDesign={(design, _mode) => {
                    if (!design || !design.designJson) return;
                    try {
                        let newPages: PageData[] = typeof design.designJson === 'string' ? JSON.parse(design.designJson) : design.designJson;
                        if (!Array.isArray(newPages)) return;
                        setPages(newPages);
                        if (newPages[0]) setActivePageId(newPages[0].id);
                        toast.success(`Loaded design`);
                    } catch (e) { toast.error("Failed to load design"); }
                }}
                showSummary={showSummary} onToggleSummary={() => setShowSummary(!showSummary)} onClose={onBack || (() => { })}
            />
            <div className="flex flex-1 overflow-hidden">
                <Toolbar
                    onAddElement={addElement} selectedElement={currentElements.find(el => el.id === selectedElement)}
                    onUpdateElement={updateElement} onDeleteElement={deleteElement} onCrop={() => setIsCropModalOpen(true)}
                    elements={currentElements} productData={productData} userColors={filteredUserColors} userOptions={filteredUserOptions}
                    onRefreshAssets={async () => { if (onFetchAssets) await onFetchAssets('all'); }}
                    onSaveAsset={async (_a) => { }}
                    onSelectElement={setSelectedElement} canvasDimensions={getCanvasPx()}
                    customFetch={customFetch}
                    isPublicMode={isPublicMode}
                />
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <ContextualToolbar
                        selectedElement={currentElements.find(el => el.id === selectedElement)} onUpdateElement={updateElement}
                        onDeleteElement={deleteElement} onDuplicateElement={duplicateElement}
                        userFonts={filteredUserFonts} userColors={filteredUserColors} onCrop={() => setIsCropModalOpen(true)}
                        isPublicMode={isPublicModeProp}
                    />
                    <div className="h-10 bg-white border-b flex items-center px-4 gap-3 relative shrink-0">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight whitespace-nowrap">Side: {pages.findIndex(p => p.id === activePageId) + 1}/{pages.length}</span>

                        {isPublicModeProp && hasVariants && (
                            <div className="flex items-center gap-3 border-l pl-3 ml-1 flex-1 overflow-hidden">
                                {productData?.options?.map((option, idx) => (
                                    <div key={option.name} className="flex items-center gap-1.5 shrink-0">
                                        <Label className="text-[9px] font-bold text-gray-400 uppercase whitespace-nowrap">{option.name}:</Label>
                                        <Select
                                            value={(idx === 0 ? selectedVariant?.option1 : idx === 1 ? selectedVariant?.option2 : selectedVariant?.option3) || ""}
                                            onValueChange={(val) => handleOptionChange(idx, val)}
                                        >
                                            <SelectTrigger className="h-7 px-2 min-w-[70px] text-[10px] bg-gray-50/50 border-gray-100 rounded-md">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {option.values?.map(val => (
                                                    <SelectItem key={val} value={val} className="text-[10px]">{val}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                                {selectedVariant && (
                                    <Badge variant="outline" className="ml-auto text-[10px] font-bold bg-white text-indigo-600 border-indigo-100 px-2 py-0 h-6 shrink-0 flex items-center gap-1">
                                        <span className="text-[8px] text-gray-400">PRICE:</span> ${selectedVariant.price}
                                    </Badge>
                                )}
                            </div>
                        )}

                        {!isPublicModeProp && (
                            <div className="flex items-center gap-3 border-l pl-3">
                                <button
                                    onClick={() => setIsBaseImageModalOpen(true)}
                                    className="h-7 px-3 rounded-md text-[10px] font-bold border bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center gap-1.5"
                                >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    {currentPages.baseImage ? 'Change Base' : 'Add Base'}
                                </button>

                                {currentPages.baseImage && (
                                    <>
                                        <button
                                            onClick={() => {
                                                const updatedPages = pages.map(p => p.id === activePageId ? { ...p, baseImage: undefined, baseImageProperties: { x: 0, y: 0, scale: 1 } } : p);
                                                setPages(updatedPages);
                                                addToHistory(updatedPages);
                                            }}
                                            className="h-7 w-7 rounded-md border bg-white text-gray-400 border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center"
                                            title="Remove base image"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>

                                        <div className="h-6 w-px bg-gray-200"></div>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={currentPages.baseImageColorEnabled || false}
                                                onChange={(e) => {
                                                    const updatedPages = pages.map(p => p.id === activePageId ? { ...p, baseImageColorEnabled: e.target.checked } : p);
                                                    setPages(updatedPages);
                                                    addToHistory(updatedPages);
                                                }}
                                                className="w-3.5 h-3.5 rounded border-gray-300"
                                            />
                                            <span className="text-[10px] font-medium text-gray-600">Color Overlay</span>
                                        </label>

                                        {currentPages.baseImageColorEnabled && (
                                            <input
                                                type="color"
                                                value={currentPages.baseImageColor || '#ffffff'}
                                                onChange={(e) => {
                                                    const updatedPages = pages.map(p => p.id === activePageId ? { ...p, baseImageColor: e.target.value } : p);
                                                    setPages(updatedPages);
                                                    addToHistory(updatedPages);
                                                }}
                                                className="w-7 h-7 rounded border border-gray-200 cursor-pointer"
                                            />
                                        )}

                                        <div className="h-6 w-px bg-gray-200"></div>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={currentPages.baseImageAsMask || false}
                                                onChange={(e) => {
                                                    const updatedPages = pages.map(p => p.id === activePageId ? { ...p, baseImageAsMask: e.target.checked } : p);
                                                    setPages(updatedPages);
                                                    addToHistory(updatedPages);
                                                }}
                                                className="w-3.5 h-3.5 rounded border-gray-300"
                                            />
                                            <span className="text-[10px] font-medium text-gray-600">Use as Mask</span>
                                        </label>

                                        {currentPages.baseImageAsMask && (
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={currentPages.baseImageMaskInvert || false}
                                                    onChange={(e) => {
                                                        const updatedPages = pages.map(p => p.id === activePageId ? { ...p, baseImageMaskInvert: e.target.checked } : p);
                                                        setPages(updatedPages);
                                                        addToHistory(updatedPages);
                                                    }}
                                                    className="w-3.5 h-3.5 rounded border-gray-300"
                                                />
                                                <span className="text-[10px] font-medium text-gray-600">Invert Mask</span>
                                            </label>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        <div className="ml-auto flex items-center gap-2">
                            {pages.map((page) => (
                                <div key={page.id} className="group relative flex items-center">
                                    <button onClick={() => setActivePageId(page.id)} className={`h-7 px-3 rounded-md text-[10px] font-bold border transition-all flex items-center gap-1.5 ${activePageId === page.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200'}`}>
                                        {page.baseImage && (
                                            <img src={page.baseImage} className="w-4 h-4 rounded-sm object-cover border border-white/20" />
                                        )}
                                        {page.name}
                                    </button>
                                    {!isPublicMode && (
                                        <button onClick={(e) => { e.stopPropagation(); const n = prompt('Name:', page.name); if (n) renamePage(page.id, n); }} className="p-1 opacity-0 group-hover:opacity-100"><Pencil className="w-2.5 h-2.5" /></button>
                                    )}
                                    {!isPublicMode && pages.length > 1 && <button onClick={(e) => { e.stopPropagation(); deletePage(page.id); }} className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full border text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500"><X className="w-2 h-2" /></button>}
                                </div>
                            ))}
                            {!isPublicMode && (
                                <button onClick={addPage} className="h-7 w-7 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-600"><UploadCloud className="w-3.5 h-3.5" /></button>
                            )}
                        </div>
                    </div>

                    <div
                        ref={zoomContainerRef}
                        className="flex-1 relative overflow-hidden flex items-center justify-center bg-[#e5e5e5] pattern-bg"
                    >
                        <div className="relative" style={{ transform: `scale(${zoom / 100})`, transition: 'transform 0.1s ease-out' }}>
                            <Canvas
                                elements={processedElements}
                                selectedElement={selectedElement}
                                onSelectElement={setSelectedElement}
                                onUpdateElement={updateElement}
                                onDeleteElement={deleteElement}
                                onDuplicateElement={duplicateElement}
                                zoom={zoom}
                                showSafeArea={showSafeArea}
                                productVariant={{ color: 'white' } as any}
                                showRulers={showRulers}
                                unit={unit}
                                enableBounce={false}
                                paperSize={paperSize}
                                customPaperDimensions={customPaperDimensions}
                                safeAreaPadding={safeAreaPadding}
                                safeAreaRadius={safeAreaRadius}
                                safeAreaWidth={safeAreaWidth}
                                safeAreaHeight={safeAreaHeight}
                                safeAreaOffset={safeAreaOffset}
                                onUpdateSafeAreaOffset={(offset, skipHistory) => {
                                    const updatedPages = pages.map(p => p.id === activePageId ? { ...p, safeAreaOffset: offset } : p);
                                    setPages(updatedPages);
                                    if (!skipHistory) addToHistory(updatedPages);
                                }}
                                onUpdateSafeAreaWidth={(val) => {
                                    const updatedPages = pages.map(p => p.id === activePageId ? { ...p, safeAreaWidth: val } : p);
                                    setPages(updatedPages);
                                    addToHistory(updatedPages);
                                }}
                                onUpdateSafeAreaHeight={(val) => {
                                    const updatedPages = pages.map(p => p.id === activePageId ? { ...p, safeAreaHeight: val } : p);
                                    setPages(updatedPages);
                                    addToHistory(updatedPages);
                                }}
                                baseImage={(() => {
                                    // 1. Admin configured variant image for this specific variant
                                    const adminVariantImage = initialConfig?.variantBaseImages?.[String(selectedVariantId)]?.default?.url;
                                    // 2. Shopify variant image
                                    const shopifyImage = productData?.variants?.find(v => String(v.id) === String(selectedVariantId))?.image;
                                    // 3. Page default base image
                                    const defaultImage = currentPages.baseImage;

                                    console.log('Base Image Calculation:', { selectedVariantId, adminVariantImage, shopifyImage, defaultImage });
                                    return adminVariantImage || shopifyImage || defaultImage;
                                })()}
                                baseImageProperties={currentPages.baseImageProperties as any}
                                baseImageColor={currentPages.baseImageColor}
                                baseImageColorEnabled={currentPages.baseImageColorEnabled}
                                onUpdateBaseImage={(props) => {
                                    setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageProperties: { ...p.baseImageProperties, ...props } as any } : p));
                                }}
                                baseImageAsMask={currentPages.baseImageAsMask}
                                baseImageMaskInvert={currentPages.baseImageMaskInvert}
                            />
                        </div>


                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-white/20 z-50">
                            <button onClick={() => setZoom(Math.max(10, zoom - 10))} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-600"><Minus className="w-4 h-4" /></button>
                            <span className="text-sm font-bold w-12 text-center text-gray-700">{zoom}%</span>
                            <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-600"><Plus className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>

                <div className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${showSummary ? 'w-[350px] opacity-100' : 'w-0 opacity-0'}`}>
                    <Summary
                        elements={processedElements as any} selectedElement={selectedElement} onSelectElement={setSelectedElement} onDeleteElement={deleteElement}
                        onUpdateElement={updateElement}
                        zoom={zoom} onZoomChange={setZoom} showSafeArea={showSafeArea}
                        onToggleSafeArea={() => { }}
                        safeAreaPadding={safeAreaPadding} onSafeAreaPaddingChange={() => { }}
                        safeAreaRadius={safeAreaRadius} onSafeAreaRadiusChange={() => { }}
                        safeAreaOffset={safeAreaOffset} onResetSafeAreaOffset={() => { }}
                        onToggleRulers={() => { }} showRulers={showRulers} unit={unit} onUnitChange={() => { }} paperSize={paperSize} onPaperSizeChange={() => { }}
                        customPaperDimensions={customPaperDimensions} onCustomPaperDimensionsChange={() => { }} onReset={() => { setPages(history[0] || [{ id: 'default', name: 'Side 1', elements: [] }]); }}
                        userColors={userColors}
                        userFonts={userFonts}
                        userOptions={userOptions}
                        selectedBaseColorAssetId={selectedBaseColorAssetId}
                        onSelectedBaseColorAssetIdChange={setSelectedBaseColorAssetId}
                        selectedElementColorAssetId={selectedElementColorAssetId}
                        onSelectedElementColorAssetIdChange={setSelectedElementColorAssetId}
                        selectedFontAssetId={selectedFontAssetId}
                        onSelectedFontAssetIdChange={setSelectedFontAssetId}
                        selectedOptionAssetId={selectedOptionAssetId}
                        onSelectedOptionAssetIdChange={setSelectedOptionAssetId}
                        selectedGalleryAssetId={selectedGalleryAssetId}
                        onSelectedGalleryAssetIdChange={setSelectedGalleryAssetId}
                        selectedShapeAssetId={selectedShapeAssetId}
                        onSelectedShapeAssetIdChange={setSelectedShapeAssetId}
                        activeBasePaletteColors={activeBasePaletteColors}
                        activeElementPaletteColors={activeElementPaletteColors}
                        onToggleSummary={() => setShowSummary(false)}
                        baseImageColorEnabled={currentPages.baseImageColorEnabled || false}
                        onBaseImageColorEnabledChange={(enabled) => setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageColorEnabled: enabled } : p))}
                        baseImageColor={currentPages.baseImageColor}
                        onBaseImageColorChange={(color) => setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageColor: color } : p))}
                        baseImageAsMask={currentPages.baseImageAsMask || false}
                        onToggleBaseImageAsMask={(enabled) => {
                            setPages(prev => {
                                const updated = prev.map(p => p.id === activePageId ? { ...p, baseImageAsMask: enabled } : p);
                                addToHistory(updated);
                                return updated;
                            });
                        }}
                        baseImageMaskInvert={currentPages.baseImageMaskInvert || false}
                        onToggleBaseImageMaskInvert={(enabled) => {
                            setPages(prev => {
                                const updated = prev.map(p => p.id === activePageId ? { ...p, baseImageMaskInvert: enabled } : p);
                                addToHistory(updated);
                                return updated;
                            });
                        }}
                        shopifyOptions={productData?.options || []} shopifyVariants={productData?.variants || []} selectedVariantId={selectedVariantId} onVariantChange={setSelectedVariantId}
                        onOptionChange={handleOptionChange}
                        productOutputSettings={productOutputSettings}
                        onProductOutputSettingsChange={() => { }}
                        isPublicMode={isPublicModeProp}
                        designerLayout={designerLayout} onDesignerLayoutChange={() => { }} buttonText={buttonText} onButtonTextChange={() => { }}
                        onSave={handleSave}
                        isSaving={isSaving || isAutoSaving}
                        baseImage={currentPages.baseImage}
                        onOpenBaseImageModal={() => setIsBaseImageModalOpen(true)}
                    />
                </div>
            </div>

            <ImageCropModal
                isOpen={isCropModalOpen}
                onClose={() => setIsCropModalOpen(false)}
                imageUrl={currentPages.baseImage || ''}
                onCropComplete={(crop) => {
                    setPages(prev => prev.map(p => p.id === activePageId ? {
                        ...p,
                        baseImageProperties: { ...p.baseImageProperties, crop } as any
                    } : p));
                }}
            />

            <BaseImageModal
                isOpen={isBaseImageModalOpen}
                onClose={() => setIsBaseImageModalOpen(false)}
                productData={productData}
                selectedVariantId={selectedVariantId}
                currentBaseImage={currentPages.baseImage}
                onSelectImage={(url, _isVariantImage, _applyToVariant) => {
                    setPages(prev => {
                        const updated = prev.map(p => p.id === activePageId ? { ...p, baseImage: url, baseImageAsMask: false, baseImageMaskInvert: false } : p);
                        addToHistory(updated);
                        return updated;
                    });
                }}
            />
        </div>
    );
}
