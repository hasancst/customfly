import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { POPULAR_GOOGLE_FONTS } from '../constants/fonts';
import { cleanAssetName } from '../utils/fonts';
import { getProxiedUrl } from '@/utils/urlUtils';
import { SYSTEM_PLACEHOLDER_URL } from '../constants/images';

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
    onRefreshProduct?: () => void; // NEW: Callback to refresh product data
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
    const [designId, setDesignId] = useState<string | undefined>(initialDesignId);
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
    const [unit, setUnit] = useState<'cm' | 'mm' | 'inch' | 'px'>(initialConfig.unit || 'cm');
    const [paperSize, setPaperSize] = useState<string>(initialConfig.paperSize || 'Custom');
    const [customPaperDimensions, setCustomPaperDimensions] = useState(initialConfig.customPaperDimensions || { width: 264.5833, height: 264.5833 });
    const [designerLayout, setDesignerLayout] = useState(initialConfig.designerLayout || 'redirect');
    const [outputSettings, setOutputSettings] = useState<any>(initialConfig.outputSettings || null);
    const [showGrid] = useState(initialConfig.showGrid ?? false);
    const [baseImageScale, setBaseImageScale] = useState(initialConfig.baseImageScale ?? 80);
    const [baseImageColorMode, setBaseImageColorMode] = useState<'opaque' | 'transparent'>(initialConfig.baseImageColorMode || 'transparent');

    // Toolbar Feature Flags
    const [enabledGrid, setEnabledGrid] = useState(initialConfig.enabledGrid ?? true);
    const [enabledUndoRedo, setEnabledUndoRedo] = useState(initialConfig.enabledUndoRedo ?? true);
    const [enabledDownload, setEnabledDownload] = useState(initialConfig.enabledDownload ?? true);
    const [enabledReset, setEnabledReset] = useState(initialConfig.enabledReset ?? true);

    // Asset Selection States (for admin/config mode)
    const [selectedVariantId, setSelectedVariantId] = useState<string>('');
    const [selectedBaseColorAssetId, setSelectedBaseColorAssetId] = useState<string | null>(initialConfig.selectedBaseColorAssetId || initialConfig.assets?.selectedBaseColorAssetId || null);
    const [selectedElementColorAssetId, setSelectedElementColorAssetId] = useState<string | null>(initialConfig.selectedColorAssetId || initialConfig.assets?.selectedColorAssetId || null);
    const [selectedFontAssetId, setSelectedFontAssetId] = useState<string | null>(initialConfig.fontAssetId || initialConfig.assets?.fontAssetId || null);
    const [selectedOptionAssetId, setSelectedOptionAssetId] = useState<string | null>(initialConfig.optionAssetId || initialConfig.assets?.optionAssetId || null);
    const [selectedGalleryAssetId, setSelectedGalleryAssetId] = useState<string | null>(initialConfig.galleryAssetId || initialConfig.assets?.galleryAssetId || null);
    const [selectedShapeAssetId, setSelectedShapeAssetId] = useState<string | null>(initialConfig.shapeAssetId || initialConfig.assets?.shapeAssetId || null);

    const filteredUserFonts = useMemo(() => {
        if (selectedFontAssetId) return userFonts.filter(a => String(a.id) === String(selectedFontAssetId));
        return userFonts.filter(a => !a.config?.productId || String(a.config.productId) === String(productId));
    }, [userFonts, selectedFontAssetId, productId]);

    // Dynamic Font Loading - Load ALL fonts that are either in the filtered list OR used by elements
    const usedFontAssetIds = useMemo(() => {
        const ids = new Set<string>();
        pages.forEach(p => {
            p.elements.forEach(el => {
                if (el.fontAssetId) ids.add(String(el.fontAssetId));
            });
        });
        return Array.from(ids).sort().join(',');
    }, [pages]);

    useEffect(() => {
        // Collect all fonts that need loading
        const fontsToLoad = new Set<any>(filteredUserFonts);

        // Also find fonts used by elements that might not be in the filtered list
        if (usedFontAssetIds) {
            const ids = usedFontAssetIds.split(',');
            ids.forEach(id => {
                const asset = userFonts.find(a => String(a.id) === id);
                if (asset) fontsToLoad.add(asset);
            });
        }

        if (fontsToLoad.size > 0) {
            // 1. Google Fonts
            const googleFamilies = new Set<string>();
            fontsToLoad.forEach(f => {
                if (f.config?.fontType === 'google') {
                    if (f.config?.googleConfig === 'specific' && f.config?.specificFonts) {
                        f.config.specificFonts.split(/[,\n]/).forEach((n: string) => {
                            const trimmed = n.trim();
                            if (trimmed && trimmed.length < 100 && !trimmed.includes('|') && !trimmed.includes('data:')) {
                                googleFamilies.add(trimmed);
                            }
                        });
                    } else if (f.config?.googleConfig === 'all') {
                        POPULAR_GOOGLE_FONTS.forEach(n => googleFamilies.add(n));
                    }
                }
            });

            if (googleFamilies.size > 0) {
                const linkId = 'designer-google-fonts';
                let link = document.getElementById(linkId) as HTMLLinkElement;
                if (!link) {
                    link = document.createElement('link');
                    link.id = linkId;
                    link.rel = 'stylesheet';
                    document.head.appendChild(link);
                }
                const newHref = `https://fonts.googleapis.com/css?family=${Array.from(googleFamilies).map(f => f.replace(/ /g, '+')).join('|')}&display=swap`;
                if (link.href !== newHref) link.href = newHref;
            }

            // 2. Custom @font-face
            const styleId = 'designer-custom-fonts';
            let style = document.getElementById(styleId) as HTMLStyleElement;
            if (!style) {
                style = document.createElement('style');
                style.id = styleId;
                document.head.appendChild(style);
            }
            let css = '';
            const fontsArray = Array.from(fontsToLoad);
            console.log('[DesignerCore] Loading fonts:', {
                fontsToLoadCount: fontsArray.length,
                fontsToLoad: fontsArray.map(f => ({ name: f.name, hasValue: !!f.value, fontType: f.config?.fontType }))
            });
            
            fontsToLoad.forEach(f => {
                if (f.config?.fontType === 'custom' && f.value && !f.value.includes('|')) {
                    const cleanName = cleanAssetName(f.name);
                    console.log('[DesignerCore] Loading single font:', {
                        originalName: f.name,
                        cleanName,
                        url: f.value.substring(0, 50) + '...'
                    });
                    css += `@font-face { font-family: "${cleanName}"; src: url("${f.value}"); font-display: swap; }\n`;
                }

                if (f.value && f.value.includes('|')) {
                    const lines = f.value.split('\n');
                    lines.forEach((line: string) => {
                        if (line.includes('|')) {
                            const [name, data] = line.split('|');
                            if (name && data && (data.trim().startsWith('data:') || data.trim().startsWith('http'))) {
                                const cleanName = cleanAssetName(name.trim());
                                console.log('[DesignerCore] Loading variation font:', {
                                    originalName: name.trim(),
                                    cleanName,
                                    url: data.trim().substring(0, 50) + '...'
                                });
                                css += `@font-face { font-family: "${cleanName}"; src: url("${data.trim()}"); font-display: swap; }\n`;
                            }
                        }
                    });
                }
            });
            
            if (style.textContent !== css) {
                console.log('[DesignerCore] Updating font CSS:', {
                    cssLength: css.length,
                    fontFaceCount: (css.match(/@font-face/g) || []).length
                });
                style.textContent = css;
            }
        }
    }, [filteredUserFonts, usedFontAssetIds, userFonts]);

    // Sync config from parent when it loads/updates
    useEffect(() => {
        if (initialConfig.outputSettings) {
            setOutputSettings(initialConfig.outputSettings);
        }
    }, [initialConfig.outputSettings]);

    // --- Variant Specific Design Logic ---
    const [isUniqueMode, setIsUniqueMode] = useState<boolean>(initialConfig.isUniqueMode || false);
    const [uniqueDesignBehavior, setUniqueDesignBehavior] = useState<'duplicate' | 'empty'>(initialConfig.uniqueDesignBehavior || 'duplicate');
    const [variantAssets, setVariantAssets] = useState<Record<string, any>>(initialConfig.variantAssets || {});
    const [globalDesigns, setGlobalDesigns] = useState<PageData[]>(preparedInitialPages);
    const [variantDesigns, setVariantDesigns] = useState<Record<string, PageData[]>>(initialConfig.variantDesigns || {});
    const prevVariantRef = useRef<string | null>(null); // Start null to skip first effect run if needed, or handle init
    const pagesRef = useRef(pages);

    // Keep pagesRef in sync for logic
    useEffect(() => { pagesRef.current = pages; }, [pages]);

    // Handle Variant Switching with Persistence
    useEffect(() => {
        if (prevVariantRef.current === null && selectedVariantId) {
            prevVariantRef.current = selectedVariantId;
            // Initial load of variant-specific assets AND pages if unique
            const vKey = String(selectedVariantId).match(/\d+/)?.[0] || String(selectedVariantId);
            const isTargetUnique = isUniqueMode || !!variantDesigns[selectedVariantId] || !!variantDesigns[vKey];

            if (isTargetUnique) {
                // Load variant design if it exists
                const existingDesign = variantDesigns[selectedVariantId] || variantDesigns[vKey];
                if (existingDesign) {
                    setPages(existingDesign);
                    if (!existingDesign.find(p => p.id === activePageId)) {
                        setActivePageId(existingDesign[0]?.id || 'default');
                    }
                }

                // Load assets for this variant
                const assets = variantAssets[selectedVariantId] || variantAssets[vKey];
                if (assets) {
                    setSelectedBaseColorAssetId(assets.selectedBaseColorAssetId || null);
                    setSelectedElementColorAssetId(assets.selectedElementColorAssetId || null);
                    setSelectedFontAssetId(assets.selectedFontAssetId || null);
                    setSelectedOptionAssetId(assets.selectedOptionAssetId || null);
                    setSelectedGalleryAssetId(assets.selectedGalleryAssetId || null);
                    setSelectedShapeAssetId(assets.selectedShapeAssetId || null);
                }
            }
            return;
        }

        if (prevVariantRef.current && prevVariantRef.current !== selectedVariantId) {
            const oldId = prevVariantRef.current;
            const newId = selectedVariantId;
            const currentWork = pagesRef.current;
            const vKey = String(oldId).match(/\d+/)?.[0] || String(oldId);

            // 1. Save work from OLD bucket
            // If global unique mode is ON, or this specific variant was unlinked
            if (isUniqueMode || variantDesigns[oldId] || variantDesigns[vKey]) {
                setVariantDesigns(prev => ({ ...prev, [oldId]: currentWork, [vKey]: currentWork }));
                // Also save current asset selections for this variant
                setVariantAssets(prev => ({
                    ...prev,
                    [oldId]: {
                        selectedBaseColorAssetId,
                        selectedElementColorAssetId,
                        selectedFontAssetId,
                        selectedOptionAssetId,
                        selectedGalleryAssetId,
                        selectedShapeAssetId
                    },
                    [vKey]: {
                        selectedBaseColorAssetId,
                        selectedElementColorAssetId,
                        selectedFontAssetId,
                        selectedOptionAssetId,
                        selectedGalleryAssetId,
                        selectedShapeAssetId
                    }
                }));
            } else {
                setGlobalDesigns(currentWork);
            }

            // 2. Load work for NEW bucket
            const nextVKey = String(newId).match(/\d+/)?.[0] || String(newId);
            const isTargetUnique = isUniqueMode || variantDesigns[newId] || variantDesigns[nextVKey];

            if (isTargetUnique) {
                // If unique mode is ON but NO design exists yet, use behavior logic
                const existingDesign = variantDesigns[newId] || variantDesigns[nextVKey];
                const nextPages = existingDesign || (
                    uniqueDesignBehavior === 'empty'
                        ? preparedInitialPages.map(p => ({ ...p, elements: [] }))
                        : JSON.parse(JSON.stringify(currentWork || pagesRef.current || globalDesigns || preparedInitialPages))
                );

                setPages(nextPages);

                // Load assets for this variant if they exist
                const assets = variantAssets[newId] || variantAssets[nextVKey];
                if (assets) {
                    setSelectedBaseColorAssetId(assets.selectedBaseColorAssetId || null);
                    setSelectedElementColorAssetId(assets.selectedElementColorAssetId || null);
                    setSelectedFontAssetId(assets.selectedFontAssetId || null);
                    setSelectedOptionAssetId(assets.selectedOptionAssetId || null);
                    setSelectedGalleryAssetId(assets.selectedGalleryAssetId || null);
                    setSelectedShapeAssetId(assets.selectedShapeAssetId || null);
                }

                if (!nextPages.find(p => p.id === activePageId)) {
                    setActivePageId(nextPages[0]?.id || 'default');
                }
            } else {
                const nextGlobal = (variantDesigns[oldId] || isUniqueMode) ? globalDesigns : currentWork;
                setPages(nextGlobal);
                if (!nextGlobal.find(p => p.id === activePageId)) {
                    setActivePageId(nextGlobal[0]?.id || 'default');
                }
            }

            prevVariantRef.current = newId;
        }
    }, [selectedVariantId, variantDesigns, isUniqueMode]);
    // Intentionally omitting globalDesigns to avoid cycles, using ref logic

    const toggleVariantLink = (link: boolean) => {
        const vKey = String(selectedVariantId).match(/\d+/)?.[0] || String(selectedVariantId);

        if (!link) {
            // Unlink: Respect behavior choice
            const nextPages = uniqueDesignBehavior === 'empty'
                ? pages.map(p => ({ ...p, elements: [] }))
                : JSON.parse(JSON.stringify(pages));

            setVariantDesigns(prev => ({
                ...prev,
                [selectedVariantId]: nextPages,
                [vKey]: nextPages
            }));
            setPages(nextPages);
            toast.success(`Variant unlinked. ${uniqueDesignBehavior === 'empty' ? 'Started with empty design.' : 'Duplicated current design.'}`);
        } else {
            // Link: Remove from variantDesigns, load global
            if (confirm("This will discard the custom design for this variant and use the global design. Continue?")) {
                const newDesigns = { ...variantDesigns };
                delete newDesigns[selectedVariantId];
                delete newDesigns[vKey];
                setVariantDesigns(newDesigns);
                setPages(globalDesigns);
                toast.success("Variant linked to global design");
            }
        }
    };

    const isVariantLinked = !isUniqueMode && !variantDesigns[selectedVariantId] && !variantDesigns[String(selectedVariantId).match(/\d+/)?.[0] || ''];

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

    // Optimized Base Image Resolution Hook
    const resolvedBaseImage = React.useMemo(() => {
        // Base resolution priority
        const rawSelectedId = String(selectedVariantId || '');
        const vKey = rawSelectedId.match(/\d+/)?.[0] || rawSelectedId;

        // 1. Explicit Assignment for THIS variant (Highest Priority)
        const variantImage = activePage?.variantBaseImages?.[rawSelectedId] || activePage?.variantBaseImages?.[vKey];
        if (variantImage && variantImage !== 'none') return getProxiedUrl(variantImage);

        // If variant is explicitly set to 'none', we treat it as "no variant mockup" 
        // and fall through to global page mockup.

        // 2. Explicit Global Selection for THIS page (Middle Priority)
        if (activePage?.baseImage === 'none') {
            // User explicitly removed the mockup for this page
            // Skip Shopify fallbacks and use system default
            return SYSTEM_PLACEHOLDER_URL;
        }

        const isPlaceholder = activePage?.baseImage?.includes('placehold.co') || activePage?.baseImage?.includes('placeholder.co') || !activePage?.baseImage;
        if (activePage?.baseImage && !isPlaceholder) {
            return getProxiedUrl(activePage.baseImage);
        }

        // 3. Shopify Variant Image (Automated Fallback)
        const sVariant = productData?.variants?.find((v: any) => {
            const vid = String(v.id).match(/\d+/)?.[0] || String(v.id);
            return vid === vKey || String(v.id) === rawSelectedId;
        });
        const sVariantImage = (typeof sVariant?.image === 'string' ? sVariant.image : (sVariant?.image as any)?.url || (sVariant?.image as any)?.src);
        if (sVariantImage) return getProxiedUrl(sVariantImage);

        // 4. Shopify Product Image (Lower Priority)
        const sProductImage = productData?.images?.[0];
        const productFallback = (typeof sProductImage === 'string' ? sProductImage : (sProductImage as any)?.url || (sProductImage as any)?.src);
        if (productFallback) return getProxiedUrl(productFallback);

        // 5. System Placeholder (ULTIMATE FALLBACK - Custom Fly Branded)
        return SYSTEM_PLACEHOLDER_URL;
    }, [activePage, selectedVariantId, productData]);

    const resolvedBaseScale = React.useMemo(() => {
        const rawSelectedId = String(selectedVariantId || '');
        const vKey = rawSelectedId.match(/\d+/)?.[0] || rawSelectedId;

        // 1. Explicit Scale for THIS variant
        const variantScale = activePage?.variantBaseScales?.[rawSelectedId] || activePage?.variantBaseScales?.[vKey];
        if (variantScale !== undefined) return variantScale;

        // 2. Explicit Scale for THIS page
        if (activePage?.baseImageScale !== undefined) return activePage.baseImageScale;

        // 3. Global Scale
        return baseImageScale;
    }, [selectedVariantId, activePage, baseImageScale]);

    // Initialize selected variant
    useEffect(() => {
        if (productData?.variants && productData.variants.length > 0 && !selectedVariantId) {
            setSelectedVariantId(String(productData.variants[0].id));
        }
    }, [productData, selectedVariantId]);

    const handleSave = async (isTemplate = false, isSilent = false, saveTypeOrOutputSettings?: 'product' | 'global' | any) => {
        if (!onSave) return;

        const currentPagesJson = JSON.stringify(pages);
        
        // Determine if third parameter is saveType or outputSettings
        const isSaveType = saveTypeOrOutputSettings === 'product' || saveTypeOrOutputSettings === 'global';
        const saveType = isSaveType ? saveTypeOrOutputSettings as ('product' | 'global') : undefined;
        const outputSettingsOverride = isSaveType ? undefined : saveTypeOrOutputSettings;
        
        if (isSilent && currentPagesJson === lastSavedPagesJson && !outputSettingsOverride) return;

        setIsSaving(true);

        // Determine what acts as the "Master" design for the save payload
        // If current variant is unlinked, 'pages' is just that variant.
        // We should save 'globalDesigns' as the main designJson, unless we want to force current as global?
        // Usually, designJson is the "Global/Default". variantDesigns are overrides.
        // If we are currently editing global (linked), then 'pages' IS variable global.

        const isLinkedCurrent = !variantDesigns[selectedVariantId] && !variantDesigns[String(selectedVariantId).match(/\d+/)?.[0] || ''];
        const finalGlobal = isLinkedCurrent ? pages : globalDesigns;

        // Update variant designs map with current if unlinked
        const finalVariantDesigns = { ...variantDesigns };
        if (!isLinkedCurrent) {
            const vKey = String(selectedVariantId).match(/\d+/)?.[0] || String(selectedVariantId);
            finalVariantDesigns[selectedVariantId] = pages;
            finalVariantDesigns[vKey] = pages;
        }

        try {
            const data = {
                id: designId,
                name: designName,
                productId,
                isTemplate,
                saveType, // Pass saveType to parent
                config: {
                    ...initialConfig,
                    designName,
                    isUniqueMode,
                    uniqueDesignBehavior,
                    variantDesigns: finalVariantDesigns,
                    variantAssets: variantAssets, // Save the per-variant asset configs
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
                    outputSettings: outputSettingsOverride || outputSettings,
                    showGrid,
                    enabledGrid,
                    enabledUndoRedo,
                    enabledDownload,
                    enabledReset,
                    selectedBaseColorAssetId,
                    selectedColorAssetId: selectedElementColorAssetId,
                    fontAssetId: selectedFontAssetId,
                    optionAssetId: selectedOptionAssetId,
                    galleryAssetId: selectedGalleryAssetId,
                    shapeAssetId: selectedShapeAssetId,
                    baseImageScale,
                    baseImageColorMode,
                },
                designJson: finalGlobal.map(p => ({
                    ...p,
                    elements: p.elements
                }))
            };

            const result = await onSave(data);
            if (result && result.id) {
                setDesignId(result.id);
            }
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
                    onSave={(isTemplate, isSilent, saveType) => handleSave(isTemplate, isSilent, saveType)}
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
                    shop={productData?.shop}
                    onCrop={() => setIsCropModalOpen(true)}
                />

                <div className="h-14 bg-white border-b border-gray-100 px-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">Sides :</span>

                        <div className="flex items-center gap-2">
                            {pages.map((page, index) => (
                                <div key={page.id} className="flex items-center gap-1">
                                    <button
                                        onClick={() => setActivePageId(page.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 flex items-center gap-2 whitespace-nowrap ${activePageId === page.id
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                                            : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                                            }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${activePageId === page.id ? 'bg-indigo-500 animate-pulse' : 'bg-gray-300'}`} />
                                        {page.name || `Side ${index + 1}`}
                                    </button>

                                    {activePageId === page.id && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-40 rounded-xl p-1.5 border-gray-100 shadow-xl">
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const n = prompt('Rename page:', page.name);
                                                        if (n) renamePage(page.id, n);
                                                    }}
                                                    className="text-xs font-bold rounded-lg p-2.5 focus:bg-indigo-50 focus:text-indigo-600 cursor-pointer"
                                                >
                                                    <Pencil className="w-3.5 h-3.5 mr-2 opacity-50" /> Rename Side
                                                </DropdownMenuItem>
                                                {pages.length > 1 && (
                                                    <DropdownMenuItem
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm('Are you sure you want to delete this side?')) deletePage(page.id);
                                                        }}
                                                        className="text-xs font-bold text-red-500 focus:text-red-600 focus:bg-red-50 rounded-lg p-2.5 cursor-pointer mt-1"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 mr-2 opacity-50" /> Delete Side
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            ))}

                            {!isPublicMode && (
                                <button
                                    onClick={addPage}
                                    className="p-2 flex items-center justify-center rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all group shrink-0"
                                    title="Add New Side"
                                >
                                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
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
                        baseImageColorMode={baseImageColorMode}
                        baseImageAsMask={activePage?.baseImageAsMask ?? false}
                        baseImageMaskInvert={activePage?.baseImageMaskInvert ?? false}
                        baseImageScale={resolvedBaseScale}
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
                        showGrid={showGrid}
                    />
                </div>
            </div>
            {
                showSummary && (
                    <div className="w-[420px] shrink-0 h-full">
                        <Summary
                            zoom={zoom}
                            onZoomChange={setZoom}
                            isUniqueMode={isUniqueMode}
                            onToggleUniqueMode={setIsUniqueMode}
                            uniqueDesignBehavior={uniqueDesignBehavior}
                            onUniqueDesignBehaviorChange={setUniqueDesignBehavior}
                            isVariantLinked={isVariantLinked}
                            onToggleVariantLink={toggleVariantLink}
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
                            onSyncVariantImages={async (variants) => {
                                // Sync variant images from Shopify to mockups
                                const updated = pages.map(p => {
                                    if (p.id !== activePageId) return p;

                                    const newVariantBaseImages = { ...(p.variantBaseImages || {}) };
                                    
                                    // Assign each variant's image to the mockup
                                    variants.forEach((variant: any) => {
                                        if (variant.image) {
                                            const vId = String(variant.id);
                                            const vKey = vId.match(/\d+/)?.[0] || vId;
                                            newVariantBaseImages[vId] = variant.image;
                                            newVariantBaseImages[vKey] = variant.image;
                                        }
                                    });

                                    return {
                                        ...p,
                                        variantBaseImages: newVariantBaseImages
                                    };
                                });
                                
                                setPages(updated);
                                addToHistory(updated);
                            }}
                            onRemoveBaseImage={() => {
                                const vId = String(selectedVariantId || '');
                                const vKey = vId.match(/\d+/)?.[0] || vId;

                                const updated = pages.map(p => {
                                    if (p.id !== activePageId) return p;

                                    const newVariantBaseImages = { ...(p.variantBaseImages || {}) };
                                    if (vId) delete newVariantBaseImages[vId];
                                    if (vKey) delete newVariantBaseImages[vKey];

                                    return {
                                        ...p,
                                        baseImage: 'none',
                                        baseImageProperties: { x: 0, y: 0, scale: 1 },
                                        variantBaseImages: newVariantBaseImages
                                    };
                                });
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
                            baseImageScale={resolvedBaseScale}
                            onBaseImageScaleChange={(sc) => {
                                const vId = String(selectedVariantId || '');
                                const vKey = vId.match(/\d+/)?.[0] || vId;
                                if (vId && !isVariantLinked) {
                                    setPages(prev => prev.map(p => p.id === activePageId ? {
                                        ...p,
                                        variantBaseScales: {
                                            ...(p.variantBaseScales || {}),
                                            [vId]: sc,
                                            ...(vKey !== vId ? { [vKey]: sc } : {})
                                        }
                                    } : p));
                                } else {
                                    setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageScale: sc } : p));
                                }
                                setBaseImageScale(sc);
                            }}
                            baseImageColorMode={baseImageColorMode}
                            onBaseImageColorModeChange={setBaseImageColorMode}
                            baseImage={resolvedBaseImage}
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
                            // Toolbar feature flags
                            enabledGrid={enabledGrid}
                            onToggleEnabledGrid={() => setEnabledGrid(!enabledGrid)}
                            enabledUndoRedo={enabledUndoRedo}
                            onToggleEnabledUndoRedo={() => setEnabledUndoRedo(!enabledUndoRedo)}
                            enabledDownload={enabledDownload}
                            onToggleEnabledDownload={() => setEnabledDownload(!enabledDownload)}
                            enabledReset={enabledReset}
                            onToggleEnabledReset={() => setEnabledReset(!enabledReset)}
                        />
                    </div>
                )
            }

            <BaseImageModal
                isOpen={isBaseImageModalOpen}
                onClose={() => setIsBaseImageModalOpen(false)}
                productData={productData}
                selectedVariantId={selectedVariantId}
                currentBaseImage={activePage?.baseImage}
                variantBaseImages={activePage?.variantBaseImages}
                onSelectImage={(url, source, targetVariantId) => {
                    // Normalize base image - always store as string URL, not object
                    // This prevents [object Object] errors when URL is used in img src
                    const normalizedUrl = (!url || url === 'none') ? 'none' : url;

                    console.log('[DesignerCore] Base image selected:', {
                        url: normalizedUrl,
                        source,
                        targetVariantId,
                        type: typeof normalizedUrl
                    });

                    if (targetVariantId === 'all') {
                        // Set global base image for all pages
                        setPages(prev => {
                            const updated = prev.map(p => ({
                                ...p,
                                baseImage: normalizedUrl,
                                baseImageProperties: { x: 0, y: 0, scale: 1 }
                            }));
                            addToHistory(updated);
                            return updated;
                        });
                    } else if (targetVariantId) {
                        // Set variant-specific base image
                        const vKey = String(targetVariantId).match(/\d+/)?.[0] || String(targetVariantId);
                        setPages(prev => {
                            const updated = prev.map(p => p.id === activePageId ? {
                                ...p,
                                variantBaseImages: {
                                    ...(p.variantBaseImages || {}),
                                    [targetVariantId]: normalizedUrl === 'none' ? undefined : normalizedUrl,
                                    [vKey]: normalizedUrl === 'none' ? undefined : normalizedUrl
                                }
                            } : p);
                            addToHistory(updated);
                            return updated;
                        });
                    } else {
                        // Set base image for current page
                        setPages(prev => {
                            const updated = prev.map(p => p.id === activePageId ? {
                                ...p,
                                baseImage: normalizedUrl,
                                baseImageProperties: { x: 0, y: 0, scale: 1 }
                            } : p);
                            addToHistory(updated);
                            return updated;
                        });
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
        </div >
    );
}
