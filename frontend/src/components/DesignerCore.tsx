import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Trash2,
    Pencil,
    MoreVertical,
    Plus,
    Image as ImageIcon,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
import { Summary } from './Summary';
import { Header } from './Header';
import { ContextualToolbar } from './ContextualToolbar';
import { BaseImageModal } from './BaseImageModal';
import { ImageCropModal } from './ImageCropModal';
import {
    PageData,
    ShopifyProduct
} from '../types';
import { toast } from 'sonner';

// Hooks
import { useCanvasState } from '@/hooks/designer/useCanvasState';
import { useDesignerExport } from '@/hooks/designer/useDesignerExport';

export interface DesignerCoreProps {
    isPublicMode: boolean;
    productId: string | undefined;
    productData: ShopifyProduct | null;
    initialPages?: PageData[];
    initialConfig?: any;
    initialDesignId?: string;
    onSave?: (data: any) => Promise<any>;
    onFetchAssets?: (type: string) => Promise<any[]>;
    onBack: () => void;
    width: number;
    height: number;
    onReset?: () => void;
    userFonts?: any[];
    userColors?: any[];
    userOptions?: any[];
    userGalleries?: any[];
    savedDesigns?: any[];
    allDesigns?: any[];
    pricingConfigComponent?: React.ReactNode;
    customFetch?: any;
    onDeleteDesign?: (id: string, name: string) => void;
    onClearAllDesigns?: () => void;
}

export function DesignerCore({
    isPublicMode,
    productId,
    productData,
    initialPages = [{ id: 'default', name: 'Side 1', elements: [] }],
    initialConfig = {},
    initialDesignId,
    onSave,
    onBack,
    userFonts = [],
    userColors = [],
    userOptions = [],
    userGalleries = [],
    savedDesigns = [],
    allDesigns = [],
    pricingConfigComponent,
    onReset,
    onDeleteDesign,
    onClearAllDesigns,
    customFetch,
}: DesignerCoreProps) {
    // Ensure initialPages have IDs for selection to work correctly
    const [preparedInitialPages] = useState(() => initialPages.map(p => ({
        ...p,
        elements: p.elements.map(el => ({
            ...el,
            id: el.id || Math.random().toString(36).substr(2, 9)
        }))
    })));

    // Canvas & Element State via Hook
    const {
        pages,
        setPages,
        activePageId,
        setActivePageId,
        activePage,
        selectedElement,
        setSelectedElement,
        updateElement,
        addElement,
        deleteElement,
        duplicateElement,
        addPage,
        deletePage,
        renamePage,
        undo,
        redo,
        addToHistory,
        canUndo,
        canRedo,
    } = useCanvasState(preparedInitialPages);

    // Editor UI States
    const [zoom, setZoom] = useState(50);
    const [showSummary, setShowSummary] = useState(true);
    const [designName, setDesignName] = useState(initialConfig.designName || '');
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedPagesJson, setLastSavedPagesJson] = useState<string>(JSON.stringify(initialPages));
    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

    const { handleTestExport } = useDesignerExport();
    const [isBaseImageModalOpen, setIsBaseImageModalOpen] = useState(false);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const zoomContainerRef = useRef<HTMLDivElement>(null);

    // Config States
    const [showSafeArea, setShowSafeArea] = useState(initialConfig.showSafeArea ?? true);
    const [hideSafeAreaLine, setHideSafeAreaLine] = useState(initialConfig.hideSafeAreaLine ?? false);
    const [safeAreaPadding] = useState(initialConfig.safeAreaPadding ?? 10);
    const [safeAreaRadius, setSafeAreaRadius] = useState(initialConfig.safeAreaRadius ?? 0);
    const [safeAreaWidth, setSafeAreaWidth] = useState<number | undefined>(initialConfig.safeAreaWidth);
    const [safeAreaHeight, setSafeAreaHeight] = useState<number | undefined>(initialConfig.safeAreaHeight);
    const [safeAreaOffset, setSafeAreaOffset] = useState(initialConfig.safeAreaOffset || { x: 0, y: 0 });
    const [showRulers, setShowRulers] = useState(initialConfig.showRulers ?? false);
    const [unit, setUnit] = useState<'cm' | 'mm' | 'inch'>(initialConfig.unit || 'cm');
    const [paperSize, setPaperSize] = useState<string>(initialConfig.paperSize || 'Custom');
    const [customPaperDimensions, setCustomPaperDimensions] = useState(initialConfig.customPaperDimensions || { width: 264.5833, height: 264.5833 });
    const [designerLayout, setDesignerLayout] = useState(initialConfig.designerLayout || 'redirect');
    const [buttonText, setButtonText] = useState(initialConfig.buttonText || 'Design It');
    const [outputSettings, setOutputSettings] = useState<any>(initialConfig.outputSettings || null);

    // Sync config from parent when it loads/updates
    useEffect(() => {
        if (initialConfig.outputSettings) {
            setOutputSettings(initialConfig.outputSettings);
        }
    }, [initialConfig.outputSettings]);

    // Asset Selection States (for admin/config mode)
    const [selectedVariantId, setSelectedVariantId] = useState<string>('');
    const [selectedBaseColorAssetId, setSelectedBaseColorAssetId] = useState<string | null>(initialConfig.selectedBaseColorAssetId || initialConfig.assets?.selectedBaseColorAssetId || null);
    const [selectedElementColorAssetId, setSelectedElementColorAssetId] = useState<string | null>(initialConfig.selectedColorAssetId || initialConfig.assets?.selectedColorAssetId || null);
    const [selectedFontAssetId, setSelectedFontAssetId] = useState<string | null>(initialConfig.fontAssetId || initialConfig.assets?.fontAssetId || null);
    const [selectedOptionAssetId, setSelectedOptionAssetId] = useState<string | null>(initialConfig.optionAssetId || initialConfig.assets?.optionAssetId || null);
    const [selectedGalleryAssetId, setSelectedGalleryAssetId] = useState<string | null>(initialConfig.galleryAssetId || initialConfig.assets?.galleryAssetId || null);
    const [selectedShapeAssetId, setSelectedShapeAssetId] = useState<string | null>(initialConfig.shapeAssetId || initialConfig.assets?.shapeAssetId || null);

    const activeBasePaletteColors = React.useMemo(() => {
        if (!selectedBaseColorAssetId || !userColors) return [];
        const asset = userColors.find(a => String(a.id) === String(selectedBaseColorAssetId));
        if (!asset || !asset.value) return [];
        return asset.value.split('\n')
            .filter(Boolean)
            .map((line: string) => {
                const [name, color] = line.split('|');
                return { name: name.trim(), value: (color || name).trim() };
            });
    }, [selectedBaseColorAssetId, userColors]);

    // Robust Base Image Resolution Hook
    const resolvedBaseImage = React.useMemo(() => {
        if (activePage?.baseImage === 'none') return undefined;

        const rawSelectedId = String(selectedVariantId);
        // Ensure valid ID
        if (!rawSelectedId || rawSelectedId === 'null' || rawSelectedId === 'undefined') {
            return activePage?.baseImage;
        }

        const vKey = rawSelectedId.match(/\d+/)?.[0] || rawSelectedId;

        // 1. Explicit UI Assignment (Designer choice for this variant)
        // Check both raw ID and numeric key to be safe
        const variantImage = activePage?.variantBaseImages?.[rawSelectedId] || activePage?.variantBaseImages?.[vKey];
        if (variantImage && variantImage !== 'none') return variantImage;

        // 2. Legacy config variant mockups
        const vConfig = initialConfig?.variantBaseImages?.[vKey] || initialConfig?.variantBaseImages?.[rawSelectedId];
        const legacyUrl = typeof vConfig === 'string' ? vConfig : (vConfig?.url || vConfig?.default?.url);
        if (legacyUrl) return legacyUrl;

        // 3. Shopify Variant Image (AUTOMATIC)
        // This ensures that if a variant has an image in Shopify, it is used by default
        const sVariant = productData?.variants?.find((v: any) => {
            const vid = String(v.id).match(/\d+/)?.[0] || String(v.id);
            return vid === vKey || String(v.id) === rawSelectedId;
        });
        const sVariantImage = (typeof sVariant?.image === 'string' ? sVariant.image : (sVariant?.image as any)?.url || (sVariant?.image as any)?.src);
        if (sVariantImage) return sVariantImage;

        // 4. Global Page Base Image (Designer default background)
        if (activePage?.baseImage) return activePage.baseImage;

        // 5. Shopify Product Image (Ultimate Fallback)
        const sProductImage = productData?.images?.[0];
        const finalFallback = (typeof sProductImage === 'string' ? sProductImage : (sProductImage as any)?.url || (sProductImage as any)?.src);

        return finalFallback || undefined;
    }, [activePage, selectedVariantId, initialConfig, productData]);

    // Initialize selected variant
    useEffect(() => {
        if (productData?.variants && productData.variants.length > 0 && !selectedVariantId) {
            setSelectedVariantId(String(productData.variants[0].id));
        }
    }, [productData, selectedVariantId]);

    const handleSave = async (isTemplate = false, isSilent = false, outputSettingsOverride?: any) => {
        if (!onSave) return;

        const currentPagesJson = JSON.stringify(pages);
        if (isSilent && currentPagesJson === lastSavedPagesJson && !outputSettingsOverride) return;

        setIsSaving(true);

        try {
            const data = {
                id: initialDesignId,
                name: designName,
                productId,
                isTemplate,
                config: {
                    ...initialConfig,
                    designName,
                    showSafeArea,
                    hideSafeAreaLine,
                    safeAreaPadding,
                    safeAreaRadius,
                    safeAreaWidth,
                    safeAreaHeight,
                    safeAreaOffset,
                    showRulers,
                    unit,
                    paperSize,
                    customPaperDimensions,
                    designerLayout,
                    buttonText,
                    outputSettings: outputSettingsOverride || outputSettings,
                    selectedBaseColorAssetId,
                    selectedColorAssetId: selectedElementColorAssetId,
                    fontAssetId: selectedFontAssetId,
                    optionAssetId: selectedOptionAssetId,
                    galleryAssetId: selectedGalleryAssetId,
                    shapeAssetId: selectedShapeAssetId,
                },
                designJson: pages.map(p => ({
                    ...p,
                    elements: p.elements
                }))
            };

            await onSave(data);
            setLastSavedPagesJson(currentPagesJson);
            setLastSavedTime(new Date());
            if (!isSilent) toast.success("Design saved successfully");
        } catch (err) {
            console.error('Save failed:', err);
            if (!isSilent) toast.error("Failed to save design");
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save every 30 seconds
    useEffect(() => {
        if (isPublicMode) return;
        const interval = setInterval(() => handleSave(false, true), 30000);
        return () => clearInterval(interval);
    }, [pages, isPublicMode, lastSavedPagesJson]);

    // Zoom handlers
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

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
            }
            if (selectedElement && (e.key === 'Delete' || e.key === 'Backspace')) {
                deleteElement(selectedElement);
            }
            if (selectedElement && (e.metaKey || e.ctrlKey) && e.key === 'd') {
                e.preventDefault();
                duplicateElement(selectedElement);
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
    }, [selectedElement, undo, redo, deleteElement, duplicateElement]);

    const handleLoadDesign = useCallback((design: any, mode: 'full' | 'base_only' | 'options_only') => {
        if (!design || !design.designJson) return;

        if (mode === 'full') {
            const pagesWithIds = design.designJson.map((p: any) => ({
                ...p,
                elements: (p.elements || []).map((el: any) => ({
                    ...el,
                    id: el.id || Math.random().toString(36).substr(2, 9)
                }))
            }));
            setPages(pagesWithIds);
            if (design.name) setDesignName(design.name);
            toast.success("Design loaded successfully");
        } else {
            toast.info("Partial load not fully implemented in Admin yet");
        }
    }, [setPages, setDesignName]);

    return (
        <div className="flex h-screen bg-gray-50 designer-root overflow-hidden">
            <div className="w-[420px] shrink-0 h-full">
                <Toolbar
                    isPublicMode={isPublicMode}
                    onAddElement={addElement}
                    selectedElement={activePage?.elements.find(el => el.id === selectedElement)}
                    onUpdateElement={updateElement}
                    elements={activePage?.elements || []}
                    productData={productData}
                    userFonts={userFonts}
                    userColors={userColors}
                    userOptions={userOptions}
                    userGalleries={userGalleries}
                    onSelectElement={setSelectedElement}
                    onDeleteElement={deleteElement}
                    customFetch={customFetch}
                    shop={productData?.shop}
                    onCrop={() => setIsCropModalOpen(true)}
                />
            </div>

            <div className="flex-1 flex flex-col relative overflow-hidden">
                <Header
                    onUndo={undo}
                    onRedo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    title={productData?.title || "Product Builder"}
                    onSave={(isTemplate) => handleSave(isTemplate)}
                    showPreview={true}
                    onPreview={() => {
                        if (isPublicMode) {
                            toast.info("Preview available in storefront");
                        } else {
                            if (productData?.handle && (productData as any)?.shop) {
                                window.open(`https://${(productData as any).shop}/products/${productData.handle}`, '_blank');
                            } else {
                                toast.info("Preview requires saving or shop context");
                            }
                        }
                    }}
                    designName={designName}
                    onDesignNameChange={setDesignName}
                    isSaving={isSaving}
                    savedDesigns={savedDesigns}
                    allDesigns={allDesigns}
                    onLoadDesign={handleLoadDesign}
                    onDeleteDesign={onDeleteDesign}
                    onClearAllDesigns={onClearAllDesigns}
                    showSummary={showSummary}
                    onToggleSummary={() => setShowSummary(!showSummary)}
                    onClose={onBack}
                    isPublicMode={isPublicMode}
                    buttonText={buttonText}
                    lastSavedTime={lastSavedTime}
                    productId={productId}
                    pricingConfigComponent={pricingConfigComponent}
                />

                <ContextualToolbar
                    selectedElement={activePage?.elements.find(el => el.id === selectedElement) || undefined}
                    onUpdateElement={(id, updates) => updateElement(id, updates)}
                    onDeleteElement={() => selectedElement && deleteElement(selectedElement)}
                    onDuplicateElement={() => selectedElement && duplicateElement(selectedElement)}
                    userFonts={userFonts}
                    userColors={userColors}
                    isPublicMode={isPublicMode}
                    onCrop={() => setIsCropModalOpen(true)}
                />

                <div className="h-12 bg-white border-b border-gray-100 px-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Side:</span>
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                            {pages.map((page, index) => (
                                <div key={page.id} className="relative group">
                                    <button
                                        onClick={() => {
                                            setActivePageId(page.id);
                                            setSelectedElement(null);
                                        }}
                                        onDoubleClick={() => {
                                            if (isPublicMode) return;
                                            const newName = window.prompt("Rename Side:", page.name || `Side ${index + 1}`);
                                            if (newName) renamePage(page.id, newName);
                                        }}
                                        className={`px-3 py-1 pr-6 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activePageId === page.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {page.name || `Side ${index + 1}`}
                                    </button>
                                    {!isPublicMode && activePageId === page.id && (
                                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <span className="cursor-pointer p-0.5 hover:bg-gray-100 rounded-full">
                                                        <MoreVertical className="w-3 h-3 text-gray-400" />
                                                    </span>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="z-[1000004]">
                                                    <DropdownMenuItem onClick={() => {
                                                        const newName = window.prompt("Rename Side:", page.name || `Side ${index + 1}`);
                                                        if (newName) renamePage(page.id, newName);
                                                    }}>
                                                        <Pencil className="w-3 h-3 mr-2" />
                                                        Rename
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        disabled={pages.length <= 1}
                                                        onClick={() => {
                                                            if (confirm("Delete this side?")) deletePage(page.id);
                                                        }}
                                                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                                    >
                                                        <Trash2 className="w-3 h-3 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {!isPublicMode && (
                                <button
                                    onClick={addPage}
                                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white hover:text-indigo-600 hover:shadow-sm text-gray-400 transition-all"
                                    title="Add Side"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Base:</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-700 truncate max-w-[150px]">
                                {activePage?.baseImage === 'none' ? 'None' : (activePage?.baseImage ? 'Custom Image' : 'Default')}
                            </span>
                            <div className="flex items-center gap-2 border-l pl-2 ml-1">
                                <button
                                    onClick={() => setIsBaseImageModalOpen(true)}
                                    className="h-7 px-3 rounded-md text-[10px] font-bold border bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center gap-1.5"
                                >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    {activePage?.baseImage && activePage.baseImage !== 'none' ? 'Change' : 'Add'}
                                </button>

                                {((activePage?.baseImage && activePage.baseImage !== 'none') || (!activePage?.baseImage && productData?.variants?.find((v: any) => String(v.id) === String(selectedVariantId))?.image)) && (
                                    <button
                                        onClick={() => {
                                            const updatedPages = pages.map(p => p.id === activePageId ? {
                                                ...p,
                                                baseImage: 'none',
                                                baseImageProperties: { x: 0, y: 0, scale: 1 }
                                            } : p);
                                            setPages(updatedPages);
                                            addToHistory(updatedPages);
                                        }}
                                        className="h-7 px-2 rounded-md text-[10px] font-bold border bg-white text-red-500 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all flex items-center justify-center"
                                        title="Remove base image"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div ref={zoomContainerRef} className="flex-1 relative">
                    <Canvas
                        elements={activePage?.elements || []}
                        productVariant={productData?.variants?.find((v: any) => String(v.id) === String(selectedVariantId)) || (productData?.variants?.[0] as any)}
                        selectedElement={selectedElement}
                        onSelectElement={setSelectedElement}
                        onUpdateElement={updateElement}
                        onDeleteElement={deleteElement}
                        onDuplicateElement={duplicateElement}
                        zoom={zoom}
                        onZoomChange={setZoom}
                        enableBounce={true}
                        showSafeArea={showSafeArea}
                        showRulers={showRulers}
                        unit={unit}
                        paperSize={paperSize}
                        customPaperDimensions={customPaperDimensions}
                        safeAreaPadding={safeAreaPadding}
                        safeAreaRadius={safeAreaRadius}
                        safeAreaWidth={safeAreaWidth}
                        safeAreaHeight={safeAreaHeight}
                        safeAreaOffset={safeAreaOffset}
                        baseImage={resolvedBaseImage}
                        onUpdateSafeAreaOffset={(offset) => setSafeAreaOffset(offset)}
                        onUpdateSafeAreaWidth={setSafeAreaWidth}
                        onUpdateSafeAreaHeight={setSafeAreaHeight}
                        baseImageProperties={{
                            x: activePage?.baseImageProperties?.x ?? 0,
                            y: activePage?.baseImageProperties?.y ?? 0,
                            scale: activePage?.baseImageProperties?.scale ?? 1,
                            width: activePage?.baseImageProperties?.width,
                            height: activePage?.baseImageProperties?.height,
                        }}
                        baseImageColor={activePage?.baseImageColor}
                        baseImageColorEnabled={activePage?.baseImageColorEnabled}
                        baseImageAsMask={activePage?.baseImageAsMask}
                        baseImageMaskInvert={activePage?.baseImageMaskInvert}
                        onUpdateBaseImage={(props) => {
                            setPages(prev => prev.map(p => p.id === activePageId ? {
                                ...p,
                                baseImageProperties: {
                                    x: 0, y: 0, scale: 1, ...p.baseImageProperties, ...props
                                }
                            } : p));
                        }}
                        isPublicMode={isPublicMode}
                        hideSafeAreaLine={hideSafeAreaLine}
                    />
                </div>
            </div>

            {showSummary && (
                <div className="w-[420px] shrink-0 h-full">
                    <Summary
                        elements={activePage?.elements || []}
                        selectedElement={selectedElement}
                        onSelectElement={setSelectedElement}
                        onDeleteElement={deleteElement}
                        showSafeArea={showSafeArea}
                        onToggleSafeArea={() => setShowSafeArea(!showSafeArea)}
                        safeAreaRadius={safeAreaRadius}
                        onSafeAreaRadiusChange={setSafeAreaRadius}
                        safeAreaOffset={safeAreaOffset}
                        onResetSafeAreaOffset={() => setSafeAreaOffset({ x: 0, y: 0 })}
                        showRulers={showRulers}
                        onToggleRulers={() => setShowRulers(!showRulers)}
                        unit={unit}
                        onUnitChange={setUnit}
                        paperSize={paperSize}
                        onPaperSizeChange={setPaperSize}
                        customPaperDimensions={customPaperDimensions}
                        onCustomPaperDimensionsChange={setCustomPaperDimensions}
                        onReset={() => {
                            if (onReset) {
                                onReset();
                            } else {
                                if (isPublicMode) {
                                    if (window.confirm("Are you sure you want to reset the design to its original state?")) {
                                        setPages(initialPages);
                                        addToHistory(initialPages);
                                        toast.success("Design reset to original");
                                    }
                                } else {
                                    // Admin mode: Clear canvas
                                    if (window.confirm("Are you sure you want to clear all elements from the canvas? This cannot be undone.")) {
                                        const clearedPages = pages.map(p => ({
                                            ...p,
                                            elements: []
                                        }));
                                        setPages(clearedPages);
                                        addToHistory(clearedPages);
                                        toast.success("Canvas cleared");
                                    }
                                }
                            }
                        }}
                        onToggleSummary={() => setShowSummary(!showSummary)}
                        userColors={userColors}
                        userGalleries={userGalleries}
                        activeBasePaletteColors={activeBasePaletteColors}
                        shopifyOptions={productData?.options || []}
                        shopifyVariants={productData?.variants || []}
                        selectedVariantId={selectedVariantId}
                        onVariantChange={setSelectedVariantId}
                        isPublicMode={isPublicMode}
                        onOpenBaseImageModal={() => setIsBaseImageModalOpen(true)}
                        onRemoveBaseImage={() => {
                            const updated = pages.map(p => p.id === activePageId ? {
                                ...p,
                                baseImage: 'none',
                                baseImageProperties: { x: 0, y: 0, scale: 1 }
                            } : p);
                            setPages(updated);
                            addToHistory(updated);
                            toast.success('Mockup removed');
                        }}
                        baseImageColorEnabled={activePage?.baseImageColorEnabled ?? false}
                        onBaseImageColorEnabledChange={(enabled) => {
                            setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageColorEnabled: enabled } : p));
                        }}
                        baseImageColor={activePage?.baseImageColor}
                        onBaseImageColorChange={(color) => {
                            setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageColor: color } : p));
                        }}
                        baseImageAsMask={activePage?.baseImageAsMask ?? false}
                        onToggleBaseImageAsMask={(enabled) => {
                            setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageAsMask: enabled } : p));
                            addToHistory(pages.map(p => p.id === activePageId ? { ...p, baseImageAsMask: enabled } : p));
                        }}
                        baseImageMaskInvert={activePage?.baseImageMaskInvert ?? false}
                        onToggleBaseImageMaskInvert={(enabled) => {
                            setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageMaskInvert: enabled } : p));
                            addToHistory(pages.map(p => p.id === activePageId ? { ...p, baseImageMaskInvert: enabled } : p));
                        }}
                        baseImage={(() => {
                            if (activePage?.baseImage === 'none') return undefined;

                            const rawSelectedId = String(selectedVariantId);
                            const vKey = rawSelectedId.match(/\d+/)?.[0] || rawSelectedId;

                            // 1. Explicit UI Assignment (Designer choice for this variant)
                            const variantImage = activePage?.variantBaseImages?.[rawSelectedId] || activePage?.variantBaseImages?.[vKey];
                            if (variantImage && variantImage !== 'none') return variantImage;

                            // 2. Legacy config variant mockups
                            const vConfig = initialConfig?.variantBaseImages?.[vKey] || initialConfig?.variantBaseImages?.[rawSelectedId];
                            const legacyUrl = typeof vConfig === 'string' ? vConfig : (vConfig?.url || vConfig?.default?.url);
                            if (legacyUrl) return legacyUrl;

                            // 3. Shopify Variant Image (AUTOMATIC)
                            const sVariant = productData?.variants?.find((v: any) => {
                                const vid = String(v.id).match(/\d+/)?.[0] || String(v.id);
                                return vid === vKey || String(v.id) === rawSelectedId;
                            });
                            const sVariantImage = (typeof sVariant?.image === 'string' ? sVariant.image : (sVariant?.image as any)?.url || (sVariant?.image as any)?.src);
                            if (sVariantImage) return sVariantImage;

                            // 4. Global Page Base Image (Designer default background)
                            if (activePage?.baseImage) return activePage.baseImage;

                            // 5. Shopify Product Image (Ultimate Fallback)
                            const sProductImage = productData?.images?.[0];
                            const finalFallback = (typeof sProductImage === 'string' ? sProductImage : (sProductImage as any)?.url || (sProductImage as any)?.src);

                            return finalFallback || undefined;
                        })()}
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
                        designerLayout={designerLayout}
                        onDesignerLayoutChange={setDesignerLayout}
                        buttonText={buttonText}
                        onButtonTextChange={setButtonText}
                        outputSettings={outputSettings}
                        onProductOutputSettingsChange={(newSettings) => setOutputSettings((prev: any) => ({ ...prev, ...newSettings }))}
                        onSave={(isT, settings) => handleSave(isT, false, settings)}
                        onTestExport={() => handleTestExport({
                            designName,
                            outputSettings,
                            setIsSaving,
                            setSelectedElement
                        })}
                        isSaving={isSaving}
                        hideSafeAreaLine={hideSafeAreaLine}
                        onToggleHideSafeAreaLine={() => setHideSafeAreaLine(!hideSafeAreaLine)}
                    />
                </div>
            )}

            <BaseImageModal
                isOpen={isBaseImageModalOpen}
                onClose={() => setIsBaseImageModalOpen(false)}
                productData={productData}
                selectedVariantId={selectedVariantId}
                currentBaseImage={activePage?.baseImage}
                variantBaseImages={activePage?.variantBaseImages}
                onSelectImage={(url, _isVariantImage, targetVariantId) => {
                    const finalUrl = url || 'none';
                    if (targetVariantId === 'all') {
                        const updated: PageData[] = pages.map(p => ({
                            ...p,
                            baseImage: finalUrl,
                            baseImageProperties: { x: 0, y: 0, scale: 1 }
                        }));
                        setPages(updated);
                        addToHistory(updated);
                    } else if (targetVariantId) {
                        // Assignment for a specific variant (standardize key to numeric if possible)
                        const vKey = String(targetVariantId).match(/\d+/)?.[0] || String(targetVariantId);
                        const updated: PageData[] = pages.map(p => p.id === activePageId ? {
                            ...p,
                            variantBaseImages: {
                                ...(p.variantBaseImages || {}),
                                [targetVariantId]: finalUrl === 'none' ? undefined : finalUrl,
                                [vKey]: finalUrl === 'none' ? undefined : finalUrl
                            }
                        } : p);
                        setPages(updated);
                        addToHistory(updated);
                    } else {
                        // Default fallback (should not happen with new modal, but for safety)
                        const updated: PageData[] = pages.map(p => p.id === activePageId ? {
                            ...p,
                            baseImage: finalUrl,
                            baseImageProperties: { x: 0, y: 0, scale: 1 }
                        } : p);
                        setPages(updated);
                        addToHistory(updated);
                    }
                    setIsBaseImageModalOpen(false);
                }}
            />

            <ImageCropModal
                isOpen={isCropModalOpen}
                onClose={() => setIsCropModalOpen(false)}
                imageUrl={(activePage?.elements.find(el => el.id === selectedElement) as any)?.src || activePage?.baseImage || ''}
                initialCrop={(activePage?.elements.find(el => el.id === selectedElement) as any)?.crop || activePage?.baseImageProperties?.crop}
                onCropComplete={(crop) => {
                    const activeElement = activePage?.elements.find(el => el.id === selectedElement);
                    if (activeElement && activeElement.type === 'image') {
                        updateElement(activeElement.id, { crop });
                    } else if (activePage) {
                        setPages(prev => prev.map(p => p.id === activePageId ? {
                            ...p,
                            baseImageProperties: { ...p.baseImageProperties, crop } as any
                        } : p));
                    }
                }}
            />
        </div>
    );
}
