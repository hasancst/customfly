import { useState, useEffect, useCallback, useMemo } from 'react';
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
import { Summary } from './Summary';
import { ContextualToolbar } from './ContextualToolbar';
import { ImageCropModal } from './ImageCropModal';
import { BaseImageModal } from './BaseImageModal';
import { Header } from './Header';
import { CanvasElement, ShopifyProduct, PageData } from '../types';
import { Pencil, X, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';

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

export interface DesignerCoreProps {
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

export function DesignerCore({
    isPublicMode,
    productId,
    productData,
    initialPages = [{ id: 'default', name: 'Side 1', elements: [] }],
    initialConfig = {},
    onSave,
    onFetchAssets,
    onFetchDesigns,
    onBack,
    userFonts = [],
    userColors = [],
    userOptions = [],
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
    const [selectedColorAssetId, setSelectedColorAssetId] = useState<string | null>(initialConfig.selectedColorAssetId || null);

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
            setSelectedVariantId(productData.variants[0].id);
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
            setHistoryIndex(prev => prev - 1);
            setPages(JSON.parse(JSON.stringify(history[historyIndex - 1])));
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
            setPages(JSON.parse(JSON.stringify(history[historyIndex + 1])));
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
            name: designName || (isTemplate ? `Template-${Date.now()}` : `Design-${savedDesigns.length + 1}`),
            designJson: pages,
            isTemplate,
            previewUrl: previewUrl || undefined
        };

        try {
            const result = await onSave(data);
            if (result) {
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

    // Autosave
    useEffect(() => {
        const timer = setInterval(() => {
            const currentPagesJson = JSON.stringify(pages);
            if (productId && currentPagesJson !== lastSavedPagesJson && !isSaving && !isAutoSaving && lastSavedPagesJson && onSave) {
                handleSave(false, true);
            }
        }, 30000);
        return () => clearInterval(timer);
    }, [pages, lastSavedPagesJson, productId, isSaving, isAutoSaving, onSave]);

    const currentPages = useMemo(() => {
        const found = pages.find(p => p.id === activePageId);
        return found || pages[0] || { id: 'default', name: 'Side 1', elements: [] };
    }, [pages, activePageId]);

    const currentElements = currentPages?.elements || [];
    const processedElements = useMemo(() => currentElements, [currentElements]);

    const activeColorPalette = useMemo(() => {
        const asset = userColors.find((a: any) => a.id === selectedColorAssetId);
        if (!asset) return [];
        return parseAssetColors(asset.value);
    }, [userColors, selectedColorAssetId]);

    const filteredUserFonts = useMemo(() => userFonts.filter(a => !a.config?.productId || String(a.config.productId) === String(productId)), [userFonts, productId]);
    const filteredUserColors = useMemo(() => userColors.filter(a => !a.config?.productId || String(a.config.productId) === String(productId)), [userColors, productId]);
    const filteredUserOptions = useMemo(() => userOptions.filter(a => !a.config?.productId || String(a.config.productId) === String(productId)), [userOptions, productId]);

    return (
        <div className="fixed inset-0 z-[99999] bg-gray-100 flex flex-col overflow-hidden">
            <Header
                onUndo={undo} onRedo={redo} canUndo={historyIndex > 0} canRedo={historyIndex < history.length - 1}
                title={productData?.title} onSave={(isTemplate) => handleSave(isTemplate, false)} designName={designName} onDesignNameChange={setDesignName}
                isSaving={isSaving || isAutoSaving} lastSavedTime={lastSavedTime}
                productId={productId}
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
                                // Append elements to active page
                                const sourceElements = newPages.flatMap(p => p.elements); // Or just first page?
                                // Let's take elements from the FIRST page of source design to avoid confusion, 
                                // or if multi-page mismatch. 
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
                    onRefreshAssets={async () => { if (onFetchAssets) await onFetchAssets('all'); }}
                    onSaveAsset={async (a) => { }}
                    onSelectElement={setSelectedElement} canvasDimensions={getCanvasPx()}
                    customFetch={customFetch}
                />
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <ContextualToolbar
                        selectedElement={currentElements.find(el => el.id === selectedElement)} onUpdateElement={updateElement}
                        onDeleteElement={deleteElement} onDuplicateElement={duplicateElement}
                        userFonts={filteredUserFonts} userColors={filteredUserColors} onCrop={() => setIsCropModalOpen(true)}
                        isPublicMode={isPublicMode}
                    />
                    <div className="h-10 bg-white border-b flex items-center px-4 gap-3 z-30 shrink-0">
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
                                    <button onClick={(e) => { e.stopPropagation(); const n = prompt('Name:', page.name); if (n) renamePage(page.id, n); }} className="p-1 opacity-0 group-hover:opacity-100"><Pencil className="w-2.5 h-2.5" /></button>
                                    {pages.length > 1 && <button onClick={(e) => { e.stopPropagation(); deletePage(page.id); }} className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full border text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500"><X className="w-2 h-2" /></button>}
                                </div>
                            ))}
                            <button onClick={addPage} className="h-7 w-7 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-600"><UploadCloud className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>

                    <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-[#e5e5e5] pattern-bg">
                        <div className="relative" style={{ transform: `scale(${zoom / 100})`, transition: 'transform 0.1s ease-out' }}>
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
                                onUpdateSafeAreaOffset={(offset) => { setSafeAreaOffset(offset); }}
                                onUpdateSafeAreaWidth={(val) => { setSafeAreaWidth(val); }}
                                onUpdateSafeAreaHeight={(val) => { setSafeAreaHeight(val); }}
                                baseImage={currentPages.baseImage}
                                baseImageProperties={currentPages.baseImageProperties as any}
                                baseImageColor={currentPages.baseImageColor}
                                baseImageColorEnabled={currentPages.baseImageColorEnabled}
                                onUpdateBaseImage={(props) => {
                                    setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageProperties: { ...p.baseImageProperties, ...props } as any } : p));
                                }}
                                baseImageAsMask={currentPages.baseImageAsMask}
                            />
                        </div>

                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-white/20 z-50">
                            <button onClick={() => setZoom(Math.max(10, zoom - 10))} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><X className="w-4 h-4" /></button>
                            <span className="text-sm font-medium w-12 text-center text-gray-700">{zoom}%</span>
                            <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><Pencil className="w-4 h-4" /></button>
                        </div>

                        <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-50">
                            <button onClick={addPage} className="w-10 h-10 bg-white shadow-xl rounded-lg flex items-center justify-center text-indigo-600 hover:bg-gray-50 transition-all border border-gray-100"><ImageIcon className="w-5 h-5 font-bold" /></button>
                        </div>
                    </div>
                </div>

                <div className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${showSummary ? 'w-80 opacity-100' : 'w-0 opacity-0'}`}>
                    <Summary
                        elements={processedElements as any} selectedElement={selectedElement} onSelectElement={setSelectedElement} onDeleteElement={deleteElement}
                        onUpdateElement={updateElement}
                        zoom={zoom} onZoomChange={setZoom} showSafeArea={showSafeArea}
                        onToggleSafeArea={() => setShowSafeArea(!showSafeArea)}
                        safeAreaPadding={safeAreaPadding} onSafeAreaPaddingChange={setSafeAreaPadding}
                        safeAreaRadius={safeAreaRadius} onSafeAreaRadiusChange={setSafeAreaRadius}
                        safeAreaOffset={safeAreaOffset} onResetSafeAreaOffset={() => setSafeAreaOffset({ x: 0, y: 0 })}
                        onToggleRulers={() => setShowRulers(!showRulers)} showRulers={showRulers} unit={unit} onUnitChange={setUnit} paperSize={paperSize} onPaperSizeChange={setPaperSize}
                        customPaperDimensions={customPaperDimensions} onCustomPaperDimensionsChange={setCustomPaperDimensions} onReset={() => { setPages(history[0] || [{ id: 'default', name: 'Side 1', elements: [] }]); }}
                        userColors={filteredUserColors} selectedColorAssetId={selectedColorAssetId} onSelectedColorAssetIdChange={setSelectedColorAssetId}
                        onToggleSummary={() => setShowSummary(false)}
                        baseImageColorEnabled={currentPages.baseImageColorEnabled || false}
                        onBaseImageColorEnabledChange={(enabled) => setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageColorEnabled: enabled } : p))}
                        baseImageColor={currentPages.baseImageColor}
                        onBaseImageColorChange={(color) => setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageColor: color } : p))}
                        baseImageAsMask={currentPages.baseImageAsMask || false}
                        onToggleBaseImageAsMask={(enabled) => setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageAsMask: enabled } : p))}
                        activePaletteColors={activeColorPalette}
                        shopifyOptions={productData?.options || []} shopifyVariants={productData?.variants || []} selectedVariantId={selectedVariantId} onVariantChange={setSelectedVariantId}
                        productOutputSettings={productOutputSettings}
                        onProductOutputSettingsChange={setProductOutputSettings}
                        isPublicMode={isPublicMode}
                        designerLayout={designerLayout} onDesignerLayoutChange={setDesignerLayout} buttonText={buttonText} onButtonTextChange={setButtonText}
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
                onSelectImage={(url, isVar, applyVal) => {
                    // We can reuse the logic from Designer.tsx or pass checking logic here
                    // For core, simpler handling is usually preferred or passing handleBaseImageSelect as prop
                    const img = new Image();
                    img.onload = () => {
                        const props = { x: 0, y: 0, scale: 1, width: img.naturalWidth, height: img.naturalHeight };
                        setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImage: url, baseImageProperties: props } : p));
                    };
                    img.src = url;
                }}
                currentBaseImage={currentPages.baseImage}
            />
        </div>
    );
}
