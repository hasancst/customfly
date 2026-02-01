import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
import { Summary } from './Summary';
import { ContextualToolbar } from './ContextualToolbar';
import { ImageCropModal } from './ImageCropModal';
import { BaseImageModal } from './BaseImageModal';
import { Header } from './Header';
import { CanvasElement, ShopifyProduct, PageData } from '../types';
import { Pencil, X, Image as ImageIcon, UploadCloud, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { parseAssetColors } from '../utils/colors';


export interface DesignerCoreProps {
    isPublicMode: boolean;
    productId: string | undefined;
    productData: ShopifyProduct | null;
    initialPages?: PageData[];
    initialConfig?: any;
    initialDesignId?: string; // Add this
    onSave?: (data: any) => Promise<any>;
    onFetchAssets?: (type: string) => Promise<any>;
    onFetchDesigns?: () => Promise<any>;
    onBack?: () => void;
    onCustomPaperDimensionsChange?: (val: { width: number, height: number }) => void;
    onReset?: () => void;
    userFonts?: any[];
    userColors?: any[];
    userOptions?: any[];
    userGalleries?: any[];
    savedDesigns?: any[];
    allDesigns?: any[];
    pricingConfigComponent?: React.ReactNode;
    customFetch?: any;
}

export function DesignerCore({
    isPublicMode,
    productId,
    productData,
    initialPages = [{ id: 'default', name: 'Side 1', elements: [] }],
    initialConfig = {},
    initialDesignId, // Add this
    onSave,
    onFetchAssets,
    onBack,
    userFonts = [],
    userColors = [],
    userOptions = [],
    userGalleries = [],
    savedDesigns = [],
    allDesigns = [],
    pricingConfigComponent,
    customFetch,
}: DesignerCoreProps) {
    const [pages, setPages] = useState<PageData[]>(initialPages);
    const [activePageId, setActivePageId] = useState<string>(initialPages[0]?.id || 'default');
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [history, setHistory] = useState<PageData[][]>([JSON.parse(JSON.stringify(initialPages))]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [zoom, setZoom] = useState(50);
    const [showSummary, setShowSummary] = useState(true);

    // Config States
    const [showSafeArea, setShowSafeArea] = useState(initialConfig.showSafeArea ?? true);
    const [safeAreaPadding, setSafeAreaPadding] = useState(initialConfig.safeAreaPadding ?? 10);
    const [safeAreaRadius, setSafeAreaRadius] = useState(initialConfig.safeAreaRadius ?? 0);
    const [safeAreaWidth, setSafeAreaWidth] = useState<number | undefined>(initialConfig.safeAreaWidth);
    const [safeAreaHeight, setSafeAreaHeight] = useState<number | undefined>(initialConfig.safeAreaHeight);
    const [safeAreaOffset, setSafeAreaOffset] = useState(initialConfig.safeAreaOffset || { x: 0, y: 0 });
    const [showRulers, setShowRulers] = useState(initialConfig.showRulers ?? false);
    const [unit, setUnit] = useState<'cm' | 'mm' | 'inch'>(initialConfig.unit || 'cm');
    const [paperSize, setPaperSize] = useState<string>(initialConfig.paperSize || 'Custom');
    const [customPaperDimensions, setCustomPaperDimensions] = useState(initialConfig.customPaperDimensions || { width: 264.5833, height: 264.5833 });

    const [designName, setDesignName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);

    const [selectedVariantId, setSelectedVariantId] = useState<string>('');
    const [selectedBaseColorAssetId, setSelectedBaseColorAssetId] = useState<string | null>(initialConfig.selectedBaseColorAssetId || initialConfig.assets?.selectedBaseColorAssetId || null);
    const [selectedElementColorAssetId, setSelectedElementColorAssetId] = useState<string | null>(initialConfig.selectedElementColorAssetId || initialConfig.selectedColorAssetId || initialConfig.assets?.colorAssetId || null);
    const [selectedFontAssetId, setSelectedFontAssetId] = useState<string | null>(initialConfig.fontAssetId || initialConfig.assets?.fontAssetId || null);
    const [selectedOptionAssetId, setSelectedOptionAssetId] = useState<string | null>(initialConfig.optionAssetId || initialConfig.assets?.optionAssetId || null);
    const [selectedGalleryAssetId, setSelectedGalleryAssetId] = useState<string | null>(initialConfig.galleryAssetId || initialConfig.assets?.galleryAssetId || null);
    const [selectedShapeAssetId, setSelectedShapeAssetId] = useState<string | null>(initialConfig.shapeAssetId || initialConfig.assets?.shapeAssetId || null);

    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [isBaseImageModalOpen, setIsBaseImageModalOpen] = useState(false);

    const [designerLayout, setDesignerLayout] = useState(initialConfig.designerLayout || 'redirect');
    const [buttonText, setButtonText] = useState(initialConfig.buttonText || 'Design It');
    const [productOutputSettings, setProductOutputSettings] = useState<any>(initialConfig.productOutputSettings || null);

    const [lastSavedPagesJson, setLastSavedPagesJson] = useState<string>(JSON.stringify(initialPages));
    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

    // Initialize selected variant
    useEffect(() => {
        if (productData?.variants && productData.variants.length > 0 && !selectedVariantId) {
            setSelectedVariantId(String(productData.variants[0].id));
        }
    }, [productData, selectedVariantId]);

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

    const [designId, setDesignId] = useState<string | undefined>(initialDesignId); // State to track current design ID

    const handleSave = async (isTemplate = false, isSilent = false) => {
        if (!onSave) return;
        if (!isSilent) setIsSaving(true);
        else setIsAutoSaving(true);

        let previewUrl = '';
        const canvasElement = document.getElementById('canvas-paper');
        if (canvasElement && !isSilent) {
            try {
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(canvasElement, {
                    useCORS: true,
                    scale: 2,
                    backgroundColor: null,
                    ignoreElements: (element: Element) => element.classList.contains('imcst-preview-hide')
                });
                previewUrl = canvas.toDataURL('image/png', 0.8);
            } catch (err) {
                console.error('Failed to capture canvas:', err);
            }
        }

        const data = {
            id: designId, // Pass the ID to update existing record
            name: designName || (isTemplate ? `Template-${Date.now()}` : `Design-${savedDesigns.length + 1}`),
            designJson: pages,
            isTemplate,
            previewUrl: previewUrl || undefined,
            // Admin Config Settings
            config: {
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
                selectedColorAssetId: selectedElementColorAssetId, // For element colors
                selectedBaseColorAssetId, // For base image colors
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
                if (result.id) setDesignId(result.id); // Capture and update the ID
                setLastSavedPagesJson(JSON.stringify(pages));
                setLastSavedTime(new Date());
                if (!isSilent) toast.success(isTemplate ? `Saved template` : `Saved successfully`);
            }
        } catch (error) {
            if (!isSilent) toast.error('Save failed');
        } finally {
            setIsSaving(false);
            setIsAutoSaving(false);
        }
    };

    // Refs for autosave to prevent interval resetting
    const stateRef = useRef({ pages, lastSavedPagesJson, isSaving, isAutoSaving });
    stateRef.current = { pages, lastSavedPagesJson, isSaving, isAutoSaving };

    const handleSaveRef = useRef(handleSave);
    handleSaveRef.current = handleSave;

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

    // Autosave
    useEffect(() => {
        const timer = setInterval(() => {
            const { pages, lastSavedPagesJson, isSaving, isAutoSaving } = stateRef.current;
            const currentPagesJson = JSON.stringify(pages);

            if (productId && currentPagesJson !== lastSavedPagesJson && !isSaving && !isAutoSaving && lastSavedPagesJson) {
                // Use the latest handleSave function which has the correct closure
                if (handleSaveRef.current) {
                    handleSaveRef.current(false, true);
                }
            }
        }, 30000);
        return () => clearInterval(timer);
    }, [productId]); // Only restart if productId changes

    const currentPages = useMemo(() => {
        const found = pages.find(p => p.id === activePageId);
        return found || pages[0] || { id: 'default', name: 'Side 1', elements: [] };
    }, [pages, activePageId]);

    const currentElements = currentPages?.elements || [];
    const processedElements = useMemo(() => currentElements, [currentElements]);

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
                handle={productData?.handle}
                shop={productData?.shop}
                isPublicMode={isPublicMode} buttonText={buttonText}
                savedDesigns={savedDesigns} allDesigns={allDesigns}
                onLoadDesign={(design, mode) => {
                    if (!design || !design.designJson) return;

                    try {
                        let newPages: PageData[] = typeof design.designJson === 'string' ? JSON.parse(design.designJson) : design.designJson;

                        // Fallback/validation if not array
                        if (!Array.isArray(newPages) && (newPages as any).elements) {
                            newPages = [{ id: 'default', name: 'Side 1', elements: (newPages as any).elements }];
                        }

                        if (!Array.isArray(newPages)) return;

                        setPages(prev => {
                            let updatedPages = [...prev];

                            if (mode === 'full') {
                                // Replace everything
                                updatedPages = newPages;
                                setDesignName(design.name); // Restore name
                                if (design.isTemplate) {
                                    // Maybe set template flags?
                                }
                            } else if (mode === 'base_only') {
                                // Only update base image of active page (or all pages if match)
                                // Strategy: Update active page base image from first page of loaded design
                                const sourcePage = newPages[0];
                                updatedPages = prev.map(p => p.id === activePageId ? {
                                    ...p,
                                    baseImage: sourcePage.baseImage,
                                    baseImageProperties: sourcePage.baseImageProperties,
                                    baseImageColor: sourcePage.baseImageColor,
                                    baseImageColorEnabled: sourcePage.baseImageColorEnabled,
                                    baseImageAsMask: sourcePage.baseImageAsMask
                                } : p);
                            } else if (mode === 'options_only') {
                                // Better: active page gets elements from first source page.
                                const newElements = newPages[0]?.elements || [];

                                // Re-ID elements to avoid conflict
                                const remappedElements = newElements.map(el => ({
                                    ...el,
                                    id: `${el.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                                }));

                                updatedPages = prev.map(p => p.id === activePageId ? {
                                    ...p,
                                    elements: [...p.elements, ...remappedElements]
                                } : p);
                            }

                            addToHistory(updatedPages);
                            return updatedPages;
                        });

                        if (mode === 'full') {
                            // Reset active page to first
                            if (newPages[0]) setActivePageId(newPages[0].id);
                        }

                        toast.success(`Loaded design: ${design.name}`);
                    } catch (e) {
                        console.error("Failed to load design", e);
                        toast.error("Failed to load design data");
                    }
                }}
                onDeleteDesign={async () => { /* Delete logic */ }}
                showSummary={showSummary} onToggleSummary={() => setShowSummary(!showSummary)} onClose={onBack || (() => { })}
                pricingConfigComponent={pricingConfigComponent}
            />
            <div className="flex flex-1 overflow-hidden">
                <Toolbar
                    onAddElement={addElement} selectedElement={currentElements.find(el => el.id === selectedElement)}
                    onUpdateElement={updateElement} onDeleteElement={deleteElement} onCrop={() => setIsCropModalOpen(true)}
                    elements={currentElements} productData={productData} userColors={filteredUserColors} userOptions={filteredUserOptions}
                    userFonts={userFonts}
                    userGalleries={userGalleries}
                    activeElementPaletteColors={activeElementPaletteColors}
                    onRefreshAssets={async () => { if (onFetchAssets) await onFetchAssets('all'); }}
                    onSaveAsset={async () => { }}
                    onSelectElement={setSelectedElement} canvasDimensions={getCanvasPx()}
                    customFetch={customFetch}
                    isPublicMode={isPublicMode}
                />
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <ContextualToolbar
                        selectedElement={currentElements.find(el => el.id === selectedElement)} onUpdateElement={updateElement}
                        onDeleteElement={deleteElement} onDuplicateElement={duplicateElement}
                        userFonts={filteredUserFonts} userColors={filteredUserColors} onCrop={() => setIsCropModalOpen(true)}
                        isPublicMode={isPublicMode}
                    />
                    <div className="h-10 bg-white border-b flex items-center px-4 gap-3 z-30 shrink-0 justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Side: {pages.findIndex(p => p.id === activePageId) + 1}/{pages.length}</span>
                            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                                {pages.map(page => (
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
                                        {!isPublicMode && pages.length > 1 && (
                                            <button onClick={(e) => { e.stopPropagation(); deletePage(page.id); }} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] hover:bg-red-600">×</button>
                                        )}
                                    </div>
                                ))}
                                {!isPublicMode && (
                                    <button onClick={addPage} className="h-7 w-7 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-600"><UploadCloud className="w-3.5 h-3.5" /></button>
                                )}
                            </div>
                        </div>

                        {/* Base Image Controls */}
                        {!isPublicMode && (
                            <div className="flex items-center gap-3">
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
                                                setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImage: undefined, baseImageProperties: { x: 0, y: 0, scale: 1 } } : p));
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
                    </div>

                    <div
                        ref={zoomContainerRef}
                        data-testid="zoom-container"
                        className="flex-1 relative flex flex-col overflow-hidden bg-[#e5e5e5] pattern-bg"
                    >
                        <Canvas
                            elements={currentElements}
                            selectedElement={selectedElement}
                            onSelectElement={setSelectedElement}
                            onUpdateElement={updateElement}
                            onDeleteElement={deleteElement}
                            onDuplicateElement={duplicateElement}
                            zoom={zoom}
                            showSafeArea={showSafeArea}
                            productVariant={{ color: 'white', size: 'M', material: 'cotton' } as any}
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
                                setSafeAreaOffset(offset);
                                if (!skipHistory) {
                                    // History not tracked for these top-level non-page settings currently 
                                    // but if needed we can wrap them.
                                }
                            }}
                            onUpdateSafeAreaWidth={(val) => { setSafeAreaWidth(val); }}
                            onUpdateSafeAreaHeight={(val) => { setSafeAreaHeight(val); }}
                            baseImage={currentPages.variantBaseImages?.[String(selectedVariantId)] || productData?.variants.find(v => String(v.id) === String(selectedVariantId))?.image || currentPages.baseImage}
                            baseImageProperties={currentPages.baseImageProperties as any}
                            baseImageColor={currentPages.baseImageColor}
                            baseImageColorEnabled={currentPages.baseImageColorEnabled}
                            onUpdateBaseImage={(props) => {
                                setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageProperties: { ...p.baseImageProperties, ...props } as any } : p));
                            }}
                            baseImageAsMask={currentPages.baseImageAsMask}
                            baseImageMaskInvert={currentPages.baseImageMaskInvert}
                        />


                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-white/20 z-50">
                            <button onClick={() => setZoom(Math.max(10, zoom - 10))} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><Minus className="w-4 h-4" /></button>
                            <span className="text-sm font-medium w-12 text-center text-gray-700">{zoom}%</span>
                            <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><Plus className="w-4 h-4" /></button>
                        </div>

                        <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-50">
                            {!isPublicMode && (
                                <button onClick={addPage} className="w-10 h-10 bg-white shadow-xl rounded-lg flex items-center justify-center text-indigo-600 hover:bg-gray-50 transition-all border border-gray-100"><ImageIcon className="w-5 h-5 font-bold" /></button>
                            )}
                        </div>
                    </div>
                </div>

                <div className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${showSummary ? 'w-[350px] opacity-100' : 'w-0 opacity-0'}`}>
                    <Summary
                        elements={processedElements as any} selectedElement={selectedElement} onSelectElement={setSelectedElement} onDeleteElement={deleteElement}
                        onUpdateElement={updateElement}
                        zoom={zoom} onZoomChange={setZoom} showSafeArea={showSafeArea}
                        onToggleSafeArea={() => setShowSafeArea(!showSafeArea)}
                        safeAreaPadding={safeAreaPadding} onSafeAreaPaddingChange={setSafeAreaPadding}
                        safeAreaRadius={safeAreaRadius} onSafeAreaRadiusChange={setSafeAreaRadius}
                        safeAreaOffset={safeAreaOffset} onResetSafeAreaOffset={() => setSafeAreaOffset({ x: 0, y: 0 })}
                        onToggleRulers={() => setShowRulers(!showRulers)} showRulers={showRulers} unit={unit} onUnitChange={setUnit} paperSize={paperSize} onPaperSizeChange={setPaperSize}
                        userColors={userColors}
                        userFonts={userFonts}
                        userOptions={userOptions}
                        userGalleries={userGalleries}
                        customPaperDimensions={customPaperDimensions}
                        onCustomPaperDimensionsChange={setCustomPaperDimensions}
                        onReset={() => {
                            const clearedPages = pages.map(p => ({ ...p, elements: [] }));
                            setPages(clearedPages);
                            setSelectedElement(null);
                            addToHistory(clearedPages);
                            toast.success("Design cleared");
                        }}
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
                        onToggleBaseImageAsMask={(enabled: boolean) => {
                            setPages(prev => {
                                const updated = prev.map(p => p.id === activePageId ? { ...p, baseImageAsMask: enabled } : p);
                                addToHistory(updated);
                                return updated;
                            });
                        }}
                        baseImageMaskInvert={currentPages.baseImageMaskInvert || false}
                        onToggleBaseImageMaskInvert={(enabled: boolean) => {
                            setPages(prev => {
                                const updated = prev.map(p => p.id === activePageId ? { ...p, baseImageMaskInvert: enabled } : p);
                                addToHistory(updated);
                                return updated;
                            });
                        }}
                        shopifyOptions={productData?.options || []} shopifyVariants={productData?.variants || []} selectedVariantId={selectedVariantId} onVariantChange={setSelectedVariantId}
                        productOutputSettings={productOutputSettings}
                        onProductOutputSettingsChange={setProductOutputSettings}
                        isPublicMode={isPublicMode}
                        designerLayout={designerLayout} onDesignerLayoutChange={setDesignerLayout} buttonText={buttonText} onButtonTextChange={setButtonText}
                        onSave={(isTemp) => handleSave(isTemp, false)}
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
                variantBaseImages={currentPages.variantBaseImages}
                onSelectImage={(url, _isVar, targetId) => {
                    const img = new Image();
                    img.onload = () => {
                        const props = { x: 0, y: 0, scale: 1, width: img.naturalWidth, height: img.naturalHeight };
                        setPages(prev => {
                            const updated = prev.map(p => {
                                if (p.id !== activePageId) return p;

                                // New Logic for Variant Assignment
                                if (targetId === 'all') {
                                    return {
                                        ...p,
                                        baseImage: url || undefined,
                                        baseImageProperties: props,
                                        baseImageAsMask: false,
                                        baseImageMaskInvert: false
                                    };
                                } else {
                                    const newMappings = { ...(p.variantBaseImages || {}) };
                                    if (url) newMappings[targetId!] = url;
                                    else delete newMappings[targetId!];

                                    return {
                                        ...p,
                                        variantBaseImages: newMappings
                                    };
                                }
                            });
                            addToHistory(updated);
                            return updated;
                        });
                    };
                    if (url) img.src = url;
                    else {
                        // Handle clear logic immediately if no URL
                        setPages(prev => {
                            const updated = prev.map(p => {
                                if (p.id !== activePageId) return p;
                                if (targetId === 'all') return { ...p, baseImage: undefined };
                                const newMappings = { ...(p.variantBaseImages || {}) };
                                delete newMappings[targetId!];
                                return { ...p, variantBaseImages: newMappings };
                            });
                            addToHistory(updated);
                            return updated;
                        });
                    }
                }}
                currentBaseImage={currentPages.baseImage}
            />
        </div>
    );
}
