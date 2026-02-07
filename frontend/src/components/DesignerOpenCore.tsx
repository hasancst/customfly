import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
import { Summary } from './Summary';
import { ContextualToolbar } from './ContextualToolbar';
import { ImageCropModal } from './ImageCropModal';
import { BaseImageModal } from './BaseImageModal';
import { PublicCustomizationPanel } from './PublicCustomizationPanel';
import { Header } from './Header';
import { CanvasElement, ShopifyProduct, PageData } from '../types';
import { X, Image as ImageIcon, Undo2, Redo2, Grid3x3, Download, RotateCcw, Ruler, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { POPULAR_GOOGLE_FONTS } from '../constants/fonts';
import { cleanAssetName } from '../utils/fonts';
import { evaluateVisibility } from '@/utils/logicEvaluator';
import { getProxiedUrl } from '@/utils/urlUtils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

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
    initialVariantId?: string;
    onSave?: (data: any) => Promise<any>;
    onFetchAssets?: (type: string) => Promise<any>;
    onFetchDesigns?: () => Promise<any>;
    onBack?: () => void;
    userFonts?: any[];
    userColors?: any[];
    userOptions?: any[];
    userGalleries?: any[];
    savedDesigns?: any[];
    allDesigns?: any[];
    pricingConfigComponent?: React.ReactNode;
    customFetch?: any;
    shop?: string;
    baseUrl?: string;
    onDeleteDesign?: (id: string, name: string) => void;
    onClearAllDesigns?: () => void;
}

// DesignerOpenCore.tsx - Optimized for Public Use
// Changes: Removed Admin config state, hardcoded isPublicMode, restricted Toolbar

export function DesignerOpenCore({
    isPublicMode = true,
    productId,
    productData,
    initialPages = [{ id: 'default', name: 'Side 1', elements: [] }],
    initialConfig = {},
    initialVariantId,
    onSave,
    onFetchAssets,
    // onFetchDesigns, // Unused
    onBack,
    userFonts = [],
    userColors = [],
    userOptions = [],
    userGalleries = [],
    savedDesigns = [],
    allDesigns = [],
    customFetch,
    shop,
    baseUrl = '',
    onDeleteDesign,
    onClearAllDesigns,
}: DesignerOpenCoreProps) {
    const isPublicModeProp = isPublicMode;

    const [pages, setPages] = useState<PageData[]>(() => {
        if (!isPublicMode) return initialPages;
        return initialPages.map(p => ({
            ...p,
            elements: p.elements.map(el => {
                if ((el.type === 'text' || el.type === 'textarea' || el.type === 'monogram') && el.hideTextPreview) {
                    return { ...el, text: '' };
                }
                return el;
            })
        }));
    });
    const [activePageId, setActivePageId] = useState<string>(initialPages[0]?.id || 'default');
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [history, setHistory] = useState<PageData[][]>([JSON.parse(JSON.stringify(initialPages))]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [zoom, setZoom] = useState(80);
    const [showSummary, setShowSummary] = useState(true);

    // Configuration State - Editable by Admin, Read-only for customers
    const [showSafeArea, setShowSafeArea] = useState(initialConfig.showSafeArea ?? true);
    const [showRulers, setShowRulers] = useState(isPublicMode ? false : (initialConfig.showRulers ?? false));
    const [showGrid, setShowGrid] = useState(initialConfig.showGrid ?? false);
    const [unit, setUnit] = useState<'cm' | 'mm' | 'inch'>(initialConfig.unit || 'cm');
    const [paperSize, setPaperSize] = useState(initialConfig.paperSize || 'Custom');
    const [customPaperDimensions, setCustomPaperDimensions] = useState(initialConfig.customPaperDimensions || { width: 264.5833, height: 264.5833 });
    const [safeAreaPadding] = useState(initialConfig.safeAreaPadding ?? 10);
    const [safeAreaRadius, setSafeAreaRadius] = useState(initialConfig.safeAreaRadius ?? 0);
    const [safeAreaWidth] = useState(initialConfig.safeAreaWidth);
    const [safeAreaHeight] = useState(initialConfig.safeAreaHeight);
    const [safeAreaOffset, setSafeAreaOffset] = useState(initialConfig.safeAreaOffset || { x: 0, y: 0 });
    const [hideSafeAreaLine, setHideSafeAreaLine] = useState(initialConfig.hideSafeAreaLine ?? false);

    // Toolbar Feature Flags
    const [enabledGrid, setEnabledGrid] = useState(initialConfig.enabledGrid ?? true);
    const [enabledUndoRedo, setEnabledUndoRedo] = useState(initialConfig.enabledUndoRedo ?? true);
    const [enabledDownload, setEnabledDownload] = useState(initialConfig.enabledDownload ?? true);
    const [enabledReset, setEnabledReset] = useState(initialConfig.enabledReset ?? true);

    // Fixed Admin Settings
    const [designerLayout, setDesignerLayout] = useState(initialConfig.designerLayout || 'redirect');
    const [buttonText, setButtonText] = useState(initialConfig.buttonText || 'Design It');
    const [productOutputSettings, setProductOutputSettings] = useState(initialConfig.productOutputSettings || null);

    const [designName, setDesignName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);

    const [selectedVariantId, setSelectedVariantId] = useState<string>(() => {
        if (!initialVariantId) return '';
        // Normalize GIDs if present (gid://shopify/ProductVariant/123 -> 123)
        return String(initialVariantId).match(/\d+/)?.[0] || String(initialVariantId);
    });
    const [selectedBaseColorAssetId, setSelectedBaseColorAssetId] = useState<string | null>(initialConfig.assets?.selectedBaseColorAssetId || initialConfig.selectedBaseColorAssetId || null);
    const [selectedElementColorAssetId, setSelectedElementColorAssetId] = useState<string | null>(initialConfig.assets?.colorAssetId || initialConfig.colorAssetId || initialConfig.selectedColorAssetId || null);
    const [selectedFontAssetId, setSelectedFontAssetId] = useState<string | null>(initialConfig.assets?.fontAssetId || initialConfig.fontAssetId || null);
    const [selectedOptionAssetId, setSelectedOptionAssetId] = useState<string | null>(initialConfig.assets?.optionAssetId || initialConfig.optionAssetId || null);
    const [selectedGalleryAssetId, setSelectedGalleryAssetId] = useState<string | null>(initialConfig.assets?.galleryAssetId || initialConfig.galleryAssetId || null);
    const [selectedShapeAssetId, setSelectedShapeAssetId] = useState<string | null>(initialConfig.assets?.shapeAssetId || initialConfig.shapeAssetId || null);

    const [isUniqueMode] = useState<boolean>(initialConfig.isUniqueMode || false);
    const [uniqueDesignBehavior] = useState<'duplicate' | 'empty'>(initialConfig.uniqueDesignBehavior || 'duplicate');
    const [variantAssets] = useState<Record<string, any>>(initialConfig.variantAssets || {});

    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [isBaseImageModalOpen, setIsBaseImageModalOpen] = useState(false);

    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

    // --- Variant Specific Design Logic (Mirrored from DesignerCore) ---
    const [globalDesigns, setGlobalDesigns] = useState<PageData[]>(initialPages);
    const [variantDesigns, setVariantDesigns] = useState<Record<string, PageData[]>>(initialConfig.variantDesigns || {});
    const prevVariantRef = useRef<string | null>(null);
    const pagesRef = useRef(pages);

    // Keep pagesRef in sync
    useEffect(() => { pagesRef.current = pages; }, [pages]);

    // Handle Variant Switching - Load admin defaults or user session changes
    useEffect(() => {
        // If first run, just set prev and return (or maybe load initial if variant selected?)
        if (prevVariantRef.current === null && selectedVariantId) {
            prevVariantRef.current = selectedVariantId;
            const vKey = String(selectedVariantId).match(/\d+/)?.[0] || String(selectedVariantId);

            if (isUniqueMode || variantDesigns[selectedVariantId] || variantDesigns[vKey]) {
                let design = variantDesigns[selectedVariantId] || variantDesigns[vKey] || (
                    uniqueDesignBehavior === 'empty'
                        ? initialPages.map(p => ({ ...p, elements: [] }))
                        : JSON.parse(JSON.stringify(globalDesigns || initialPages))
                );

                if (isPublicMode) {
                    design = design.map(p => ({
                        ...p,
                        elements: p.elements.map(el => {
                            if ((el.type === 'text' || el.type === 'textarea' || el.type === 'monogram') && el.hideTextPreview) {
                                return { ...el, text: '' };
                            }
                            return el;
                        })
                    }));
                }
                setPages(design);

                // Also initial load assets
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
            const currentWork = pagesRef.current; // The user's current edits

            const oldVKey = String(oldId).match(/\d+/)?.[0] || String(oldId);
            const newVKey = String(newId).match(/\d+/)?.[0] || String(newId);

            // 1. Save work from OLD bucket (Memory only for session)
            if (isUniqueMode || variantDesigns[oldId] || variantDesigns[oldVKey]) {
                setVariantDesigns(prev => ({ ...prev, [oldId]: currentWork, [oldVKey]: currentWork }));
            } else {
                setGlobalDesigns(currentWork);
            }

            // 2. Load work for NEW bucket
            const isTargetUnique = isUniqueMode || variantDesigns[newId] || variantDesigns[newVKey];

            if (isTargetUnique) {
                const newDesign = variantDesigns[newId] || variantDesigns[newVKey] || (
                    uniqueDesignBehavior === 'empty'
                        ? initialPages.map(p => ({ ...p, elements: [] }))
                        : JSON.parse(JSON.stringify(currentWork || globalDesigns || initialPages))
                );
                setPages(newDesign);

                // Load assets for this variant
                const assets = variantAssets[newId] || variantAssets[newVKey];
                if (assets) {
                    setSelectedBaseColorAssetId(assets.selectedBaseColorAssetId || null);
                    setSelectedElementColorAssetId(assets.selectedElementColorAssetId || null);
                    setSelectedFontAssetId(assets.selectedFontAssetId || null);
                    setSelectedOptionAssetId(assets.selectedOptionAssetId || null);
                    setSelectedGalleryAssetId(assets.selectedGalleryAssetId || null);
                    setSelectedShapeAssetId(assets.selectedShapeAssetId || null);
                }

                if (!newDesign.find(p => p.id === activePageId)) {
                    setActivePageId(newDesign[0]?.id || 'default');
                }
            } else {
                const nextGlobal = (variantDesigns[oldId] || variantDesigns[oldVKey] || isUniqueMode) ? globalDesigns : currentWork;
                setPages(nextGlobal);

                if (!nextGlobal.find(p => p.id === activePageId)) {
                    setActivePageId(nextGlobal[0]?.id || 'default');
                }
            }

            prevVariantRef.current = newId;
        }
    }, [selectedVariantId, isUniqueMode, variantAssets, variantDesigns]);

    // Initialize selected variant and validate
    useEffect(() => {
        if (productData?.variants && productData.variants.length > 0) {
            // Validate if the current selectedVariantId actually exists in the product
            const normalizedSelected = String(selectedVariantId).match(/\d+/)?.[0] || String(selectedVariantId);

            const isValid = productData.variants.some(v => {
                const vid = String(v.id).match(/\d+/)?.[0] || String(v.id);
                return vid === normalizedSelected;
            });

            if (!selectedVariantId || !isValid) {
                const firstId = String(productData.variants[0].id).match(/\d+/)?.[0] || String(productData.variants[0].id);
                setSelectedVariantId(firstId);
            }
        } else if (productData) {
            console.warn("[DesignerOpenCore] productData present but no variants found:", productData);
        }
    }, [productData]); // Run when productData loads. DO NOT include selectedVariantId to avoid loops, relying on initial mount check.

    // Robust Base Image Resolution
    const resolvedBaseImage = useMemo(() => {
        const activePage = pages.find(p => p.id === activePageId);
        if (activePage?.baseImage === 'none') return undefined;

        const rawSelectedId = String(selectedVariantId);
        const vKey = rawSelectedId.match(/\d+/)?.[0] || rawSelectedId;

        // Helper to clean "Label|URL"
        const cleanUrl = (u: any) => {
            if (typeof u !== 'string') return u;
            return u.includes('|') ? u.split('|')[1].trim() : u;
        };

        // 1. Explicit UI Assignment (Designer choice for this variant)
        let variantImage = activePage?.variantBaseImages?.[rawSelectedId] || activePage?.variantBaseImages?.[vKey];
        variantImage = cleanUrl(variantImage);
        if (variantImage && variantImage !== 'none') return variantImage;

        // 2. Legacy config variant mockups
        const vConfig = initialConfig?.variantBaseImages?.[vKey] || initialConfig?.variantBaseImages?.[rawSelectedId];
        let legacyUrl = typeof vConfig === 'string' ? vConfig : (vConfig?.url || vConfig?.default?.url);
        legacyUrl = cleanUrl(legacyUrl);
        if (legacyUrl) return legacyUrl;

        // 3. Shopify Variant Image (AUTOMATIC)
        const sVariant = productData?.variants?.find((v: any) => {
            const vid = String(v.id).match(/\d+/)?.[0] || String(v.id);
            return vid === vKey || String(v.id) === rawSelectedId;
        });
        let sVariantImage = (typeof sVariant?.image === 'string' ? sVariant.image : (sVariant?.image as any)?.url || (sVariant?.image as any)?.src);
        sVariantImage = cleanUrl(sVariantImage);
        if (sVariantImage) {
            // Fix base64 if needed
            if (!sVariantImage.startsWith('http') && !sVariantImage.startsWith('data:')) return `data:image/jpeg;base64,${sVariantImage}`;
            return sVariantImage;
        }

        // 4. Global Page Base Image
        if (activePage?.baseImage) return cleanUrl(activePage.baseImage);

        // 5. Fallback to Shopify Product main image
        const sProductImage = productData?.images?.[0];
        const finalFallback = (typeof sProductImage === 'string' ? sProductImage : (sProductImage as any)?.url || (sProductImage as any)?.src);

        return getProxiedUrl(cleanUrl(finalFallback) || undefined);

    }, [pages, activePageId, selectedVariantId, initialConfig.variantBaseImages, productData]);


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
                    const newEls = p.elements.map(el => {
                        if (el.id === id) {
                            // In public mode, if we are updating text, src, or other content, 
                            // we should ensure the element is visible on the canvas.
                            const isContentUpdate = updates.text !== undefined || updates.src !== undefined ||
                                updates.checked !== undefined || updates.numberValue !== undefined;

                            return {
                                ...el,
                                ...updates,
                                isVisible: (isPublicModeProp && isContentUpdate) ? true : (updates.isVisible ?? el.isVisible)
                            };
                        }
                        return el;
                    });
                    return { ...p, elements: newEls };
                }
                return p;
            });
            if (!skipHistory) addToHistory(updated);
            return updated;
        });
    }, [activePageId, addToHistory, isPublicModeProp]);

    const deleteElement = useCallback((id: string) => {
        setPages(prev => {
            const updated = prev.map(p => {
                if (p.id === activePageId) {
                    const el = p.elements.find(e => e.id === id);
                    const isCustomizableType = el && [
                        'text', 'monogram', 'field', 'textarea',
                        'image', 'gallery', 'dropdown', 'button',
                        'checkbox', 'number', 'time', 'file_upload'
                    ].includes(el.type);

                    // In public mode, don't hard-delete elements that are customization "slots"
                    const isGalleryAdded = id.includes('added-');
                    if (isPublicModeProp && el && (el.label || isCustomizableType) && !isGalleryAdded) {
                        return {
                            ...p,
                            elements: p.elements.map(e => e.id === id ? { ...e, isVisible: false, text: '', src: '' } : e)
                        };
                    }
                    return { ...p, elements: p.elements.filter(el => el.id !== id) };
                }
                return p;
            });
            addToHistory(updated);
            return updated;
        });
        setSelectedElement(null);
    }, [activePageId, addToHistory, isPublicModeProp]);

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

    const handleSave = async (_isTemplate = false, isSilent = false, outputSettingsOverride?: any) => {
        if (!onSave) return;
        if (!isSilent) setIsSaving(true);
        else setIsAutoSaving(true);

        const currentSettings = outputSettingsOverride || productOutputSettings;

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
                const dpi = currentSettings?.dpi || 300;
                const scale = Math.max(2, Math.min(8, dpi / 72)); // Scale factor for DPI

                const prodCanvas = await html2canvas(canvasElement, {
                    useCORS: true,
                    scale: scale,
                    backgroundColor: currentSettings?.includeBaseMockup ? undefined : null,
                    ignoreElements: (element: Element) => {
                        if (element.classList.contains('imcst-preview-hide')) return true;

                        // Exclude base image if not enabled in settings
                        if (!currentSettings?.includeBaseMockup && element.classList.contains('imcst-base-image')) {
                            return true;
                        }

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
                showGrid,
                enabledGrid,
                enabledUndoRedo,
                enabledDownload,
                enabledReset,
                productOutputSettings: currentSettings
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

    const handleReset = useCallback(() => {
        if (!window.confirm("Are you sure you want to reset your design? All changes will be lost.")) return;
        const resetState = JSON.parse(JSON.stringify(initialPages));
        setPages(resetState);
        setHistory([resetState]);
        setHistoryIndex(0);
        toast.success("Design reset to original template");
    }, [initialPages]);

    const handleDownload = async () => {
        const canvasElement = document.getElementById('canvas-paper');
        if (!canvasElement) {
            toast.error("Canvas element not found");
            return;
        }

        const id = toast.loading("Preparing download...");
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(canvasElement, {
                useCORS: true,
                scale: 2,
                backgroundColor: null,
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `design-${designName || 'custom'}-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
            toast.success("Download started", { id });
        } catch (err) {
            console.error('Download failed:', err);
            toast.error("Download failed", { id });
        }
    };

    const currentPages = useMemo(() => {
        const found = pages.find(p => p.id === activePageId);
        return found || pages[0] || { id: 'default', name: 'Side 1', elements: [] };
    }, [pages, activePageId]);

    const currentElements = currentPages?.elements || [];

    const logicContext = useMemo(() => {
        const elementValues: Record<string, any> = {};
        currentElements.forEach(el => {
            if (el.type === 'checkbox') elementValues[el.id] = el.checked;
            else if (el.type === 'number') elementValues[el.id] = el.numberValue;
            else elementValues[el.id] = el.text || el.src;
        });

        const selectedVariant = productData?.variants?.find(v => {
            const vid = String(v.id).match(/\d+/)?.[0] || String(v.id);
            const svid = String(selectedVariantId).match(/\d+/)?.[0] || String(selectedVariantId);
            return vid === svid;
        });

        return {
            variantId: String(selectedVariantId),
            options: {
                option1: selectedVariant?.option1 || '',
                option2: selectedVariant?.option2 || '',
                option3: selectedVariant?.option3 || '',
            },
            elementValues
        };
    }, [currentElements, selectedVariantId, productData]);

    const processedElements = useMemo(() => {
        // Only show elements that are not locked or restricted for customers to see in layers
        // Also evaluate conditional logic
        return currentElements.map(el => ({
            ...el,
            isHiddenByLogic: !evaluateVisibility(el as any, logicContext)
        }));
    }, [currentElements, logicContext]);

    const activeBasePaletteColors = useMemo(() => {
        const asset = userColors.find((a: any) => String(a.id) === String(selectedBaseColorAssetId));
        if (!asset) return [];
        return parseAssetColors(asset.value);
    }, [userColors, selectedBaseColorAssetId]);


    const filteredUserFonts = useMemo(() => {
        if (selectedFontAssetId) return userFonts.filter(a => String(a.id) === String(selectedFontAssetId));
        return userFonts.filter(a => !a.config?.productId || String(a.config.productId) === String(productId));
    }, [userFonts, selectedFontAssetId, productId]);

    const filteredUserColors = useMemo(() => {
        if (selectedElementColorAssetId) return userColors.filter(a => String(a.id) === String(selectedElementColorAssetId));
        return userColors.filter(a => !a.config?.productId || String(a.config.productId) === String(productId));
    }, [userColors, selectedElementColorAssetId, productId]);

    const filteredUserOptions = useMemo(() => {
        if (selectedOptionAssetId) return userOptions.filter(a => String(a.id) === String(selectedOptionAssetId));
        return userOptions.filter(a => !a.config?.productId || String(a.config.productId) === String(productId));
    }, [userOptions, selectedOptionAssetId, productId]);

    const filteredUserGalleries = useMemo(() => {
        if (selectedGalleryAssetId) return userGalleries.filter(a => String(a.id) === String(selectedGalleryAssetId));
        return userGalleries.filter(a => !a.config?.productId || String(a.config.productId) === String(productId));
    }, [userGalleries, selectedGalleryAssetId, productId]);

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
            fontsToLoad.forEach(f => {
                if (f.config?.fontType === 'custom' && f.value && !f.value.includes('|')) {
                    css += `@font-face { font-family: "${cleanAssetName(f.name)}"; src: url("${f.value}"); font-display: swap; }\n`;
                }

                if (f.value && f.value.includes('|')) {
                    const lines = f.value.split('\n');
                    lines.forEach((line: string) => {
                        if (line.includes('|')) {
                            const [name, data] = line.split('|');
                            if (name && data && (data.trim().startsWith('data:') || data.trim().startsWith('http'))) {
                                css += `@font-face { font-family: "${cleanAssetName(name.trim())}"; src: url("${data.trim()}"); font-display: swap; }\n`;
                            }
                        }
                    });
                }
            });
            if (style.textContent !== css) style.textContent = css;
        }
    }, [filteredUserFonts, usedFontAssetIds, userFonts]);

    const selectedVariant = useMemo(() =>
        (productData?.variants || []).find(v => String(v.id) === String(selectedVariantId)),
        [productData, selectedVariantId]
    );


    const handleOptionChange = (optionIndex: number, value: string) => {
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
            setSelectedVariantId(String(match.id));
        } else {
            // Fallback: Find first variant that has the NEW option value at the correct position
            // This handles "Linked Options" behavior where switching one option might require changing others
            const fallbackMatch = productData.variants.find(v => {
                const variantOptionValue = optionIndex === 0 ? v.option1 : optionIndex === 1 ? v.option2 : v.option3;
                return variantOptionValue === value;
            });

            if (fallbackMatch) {
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
                title={productData?.title} onSave={(isTemplate) => handleSave(isTemplate, false)} designName={designName} onDesignNameChange={setDesignName}
                isSaving={isSaving || isAutoSaving} lastSavedTime={lastSavedTime}
                productId={productId}
                isPublicMode={isPublicModeProp} buttonText={buttonText}
                savedDesigns={savedDesigns} allDesigns={allDesigns}
                onDeleteDesign={onDeleteDesign} onClearAllDesigns={onClearAllDesigns}
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
                {isPublicMode ? (
                    <div className="w-[420px] shrink-0 h-full relative z-20 shadow-2xl">
                        <PublicCustomizationPanel
                            elements={processedElements as any}
                            selectedElement={selectedElement}
                            onSelectElement={setSelectedElement}
                            onUpdateElement={updateElement}
                            onReset={() => {
                                const resetState = JSON.parse(JSON.stringify(initialPages));
                                setPages(resetState);
                                setHistory([resetState]);
                                setHistoryIndex(0);
                                toast.success("Design reset to original template");
                            }}
                            onSave={handleSave}
                            onDeleteElement={deleteElement}
                            isSaving={isSaving || isAutoSaving}
                            buttonText={buttonText}
                            userGalleries={filteredUserGalleries}
                            baseUrl={baseUrl}
                            shop={shop}
                            onAddElement={addElement}
                        />
                    </div>
                ) : (
                    <div className="w-[420px] shrink-0 h-full border-r border-gray-200">
                        <Toolbar
                            onAddElement={addElement} selectedElement={currentElements.find(el => el.id === selectedElement)}
                            onUpdateElement={updateElement} onDeleteElement={deleteElement} onCrop={() => setIsCropModalOpen(true)}
                            elements={currentElements} productData={productData} userColors={filteredUserColors} userOptions={filteredUserOptions}
                            onRefreshAssets={async () => { if (onFetchAssets) await onFetchAssets('all'); }}
                            onSaveAsset={async (_a) => { }}
                            onSelectElement={setSelectedElement} canvasDimensions={getCanvasPx()}
                            customFetch={customFetch}
                            isPublicMode={isPublicMode}
                            userGalleries={filteredUserGalleries}
                            shop={shop}
                            baseUrl={baseUrl}
                        />
                    </div>
                )}
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <ContextualToolbar
                        selectedElement={currentElements.find(el => el.id === selectedElement)} onUpdateElement={updateElement}
                        onDeleteElement={deleteElement} onDuplicateElement={duplicateElement}
                        userFonts={filteredUserFonts} userColors={filteredUserColors} onCrop={() => setIsCropModalOpen(true)}
                        isPublicMode={isPublicModeProp}
                    />
                    <div className={`${isPublicModeProp ? 'h-20 border-b-4' : 'h-16 border-b-2'} bg-white border-gray-200 flex items-center px-10 gap-8 relative shrink-0 shadow-xl z-30`}>
                        {/* Page Navigation on the Left */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                            {pages.map((page, index) => (
                                <button
                                    key={page.id}
                                    onClick={() => setActivePageId(page.id)}
                                    className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all border-2 flex items-center gap-3 whitespace-nowrap ${activePageId === page.id
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md ring-4 ring-indigo-500/10'
                                            : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600'
                                        }`}
                                >
                                    <div className={`w-2.5 h-2.5 rounded-full ${activePageId === page.id ? 'bg-indigo-500 animate-pulse' : 'bg-gray-200'}`} />
                                    <span className="uppercase tracking-widest">{page.name || `Side ${index + 1}`}</span>
                                </button>
                            ))}

                            {!isPublicModeProp && (
                                <button
                                    onClick={addPage}
                                    className="p-2.5 flex items-center justify-center rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 text-gray-300 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all group shrink-0"
                                    title="Add Side"
                                >
                                    <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Base Image Controls stay here */}
                        </div>
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
                                            className="h-7 w-7 flex items-center justify-center rounded-md border bg-white text-red-500 border-gray-200 hover:bg-red-50 hover:border-red-200 transition-all"
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
                                            <span className="text-[10px] font-medium text-gray-600">Set as Mask</span>
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

                        <div className="ml-auto flex items-center gap-6">
                            {enabledUndoRedo && (
                                <div className="flex items-center gap-1 border-r pr-4">
                                    <TooltipProvider delayDuration={150}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button onClick={undo} disabled={historyIndex === 0} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors">
                                                    <Undo2 className="w-5 h-5 text-gray-700" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors">
                                                    <Redo2 className="w-5 h-5 text-gray-700" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            )}

                            {/* Icons Group */}
                            <div className="flex items-center gap-3">
                                <TooltipProvider delayDuration={150}>
                                    <div className="flex items-center gap-1 bg-indigo-50/50 rounded-xl px-2 py-1 border border-indigo-100">
                                        <button
                                            onClick={() => setZoom(Math.max(10, zoom - 10))}
                                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-indigo-400 hover:text-indigo-600"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="text-[11px] font-black text-indigo-900 min-w-[45px] text-center tracking-tighter">
                                            {Math.round(zoom)}%
                                        </span>
                                        <button
                                            onClick={() => setZoom(Math.min(200, zoom + 10))}
                                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-indigo-400 hover:text-indigo-600"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {enabledGrid && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button onClick={() => setShowGrid(!showGrid)} className={`p-2.5 rounded-xl transition-all ${showGrid ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'hover:bg-gray-100 text-gray-600'}`}>
                                                        <Grid3x3 className="w-5 h-5" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>Show Grid</TooltipContent>
                                            </Tooltip>
                                        )}

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button onClick={() => setShowRulers(!showRulers)} className={`p-2.5 rounded-xl transition-all ${showRulers ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'hover:bg-gray-100 text-gray-600'}`}>
                                                    <Ruler className="w-5 h-5" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>Show Rulers</TooltipContent>
                                        </Tooltip>

                                        {enabledDownload && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button onClick={handleDownload} className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-600 transition-all hover:scale-110">
                                                        <Download className="w-5 h-5" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>Download Design</TooltipContent>
                                            </Tooltip>
                                        )}

                                        {enabledReset && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button onClick={handleReset} className="p-2.5 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-xl transition-all hover:scale-110">
                                                        <RotateCcw className="w-5 h-5" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>Reset Design</TooltipContent>
                                            </Tooltip>
                                        )}

                                        {!isPublicModeProp && (
                                            <button onClick={addPage} className="p-2.5 rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </TooltipProvider>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
                        <div
                            ref={zoomContainerRef}
                            className="flex-1 relative flex flex-col"
                        >

                            <Canvas
                                elements={processedElements}
                                selectedElement={selectedElement}
                                onSelectElement={setSelectedElement}
                                onUpdateElement={updateElement}
                                onDeleteElement={deleteElement}
                                onDuplicateElement={duplicateElement}
                                zoom={zoom}
                                onZoomChange={setZoom}
                                showSafeArea={showSafeArea}
                                productVariant={{ color: 'white' } as any}
                                showRulers={showRulers}
                                showGrid={showGrid}
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
                                baseImage={resolvedBaseImage}
                                baseImageProperties={currentPages.baseImageProperties as any}
                                baseImageColor={currentPages.baseImageColor}
                                baseImageColorEnabled={currentPages.baseImageColorEnabled}
                                onUpdateBaseImage={(props) => {
                                    setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageProperties: { ...p.baseImageProperties, ...props } as any } : p));
                                }}
                                baseImageAsMask={currentPages.baseImageAsMask}
                                baseImageMaskInvert={currentPages.baseImageMaskInvert}
                                isPublicMode={isPublicModeProp}
                                hideSafeAreaLine={hideSafeAreaLine}
                            />
                        </div>


                    </div>
                </div>

                <div className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${showSummary ? 'w-[420px] opacity-100 border-l border-gray-200' : 'w-0 opacity-0'}`}>
                    <Summary
                        zoom={zoom}
                        onZoomChange={setZoom}
                        elements={processedElements as any} selectedElement={selectedElement} onSelectElement={setSelectedElement} onDeleteElement={deleteElement}
                        showSafeArea={showSafeArea}
                        onToggleSafeArea={() => setShowSafeArea(!showSafeArea)}
                        hideSafeAreaLine={hideSafeAreaLine}
                        onToggleHideSafeAreaLine={() => setHideSafeAreaLine(!hideSafeAreaLine)}
                        safeAreaRadius={safeAreaRadius} onSafeAreaRadiusChange={setSafeAreaRadius}
                        safeAreaOffset={safeAreaOffset} onResetSafeAreaOffset={() => setSafeAreaOffset({ x: 0, y: 0 })}
                        shop={shop}
                        onToggleRulers={() => setShowRulers(!showRulers)} showRulers={showRulers} unit={unit} onUnitChange={setUnit} paperSize={paperSize} onPaperSizeChange={setPaperSize}
                        customPaperDimensions={customPaperDimensions} onCustomPaperDimensionsChange={setCustomPaperDimensions}
                        onReset={() => {
                            // Revert to the admin-configured initial state
                            const resetState = JSON.parse(JSON.stringify(initialPages));
                            setPages(resetState);
                            setHistory([resetState]);
                            setHistoryIndex(0);
                            toast.success("Design reset to original template");
                        }}
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
                        userGalleries={filteredUserGalleries}
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
                        outputSettings={productOutputSettings}
                        onProductOutputSettingsChange={(settings) => setProductOutputSettings(settings)}
                        isPublicMode={isPublicModeProp}
                        baseImage={resolvedBaseImage}
                        onOpenBaseImageModal={() => setIsBaseImageModalOpen(true)}
                        designerLayout={designerLayout}
                        onDesignerLayoutChange={setDesignerLayout}
                        buttonText={buttonText}
                        onButtonTextChange={setButtonText}
                        onUpdateElement={updateElement}
                        onSave={(isTemp, settings) => handleSave(isTemp, false, settings)}
                        isSaving={isSaving || isAutoSaving}
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
            </div>

            <ImageCropModal
                isOpen={isCropModalOpen}
                onClose={() => setIsCropModalOpen(false)}
                imageUrl={(currentPages.elements.find(el => el.id === selectedElement) as any)?.src || currentPages.baseImage || ''}
                initialCrop={(currentPages.elements.find(el => el.id === selectedElement) as any)?.crop || currentPages.baseImageProperties?.crop}
                onCropComplete={(crop) => {
                    const activeElement = currentPages.elements.find(el => el.id === selectedElement);
                    if (activeElement && activeElement.type === 'image') {
                        updateElement(activeElement.id, { crop });
                    } else {
                        setPages(prev => prev.map(p => p.id === activePageId ? {
                            ...p,
                            baseImageProperties: { ...p.baseImageProperties, crop } as any
                        } : p));
                    }
                }}
            />

            <BaseImageModal
                isOpen={isBaseImageModalOpen}
                onClose={() => setIsBaseImageModalOpen(false)}
                productData={productData}
                selectedVariantId={selectedVariantId}
                currentBaseImage={currentPages.baseImage}
                variantBaseImages={currentPages.variantBaseImages}
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
                        const updated: PageData[] = pages.map(p => p.id === activePageId ? {
                            ...p,
                            variantBaseImages: {
                                ...(p.variantBaseImages || {}),
                                [targetVariantId]: finalUrl === 'none' ? undefined : finalUrl
                            }
                        } : p);
                        setPages(updated);
                        addToHistory(updated);
                    } else {
                        const updated: PageData[] = pages.map(p => p.id === activePageId ? { ...p, baseImage: finalUrl, baseImageAsMask: false, baseImageMaskInvert: false } : p);
                        setPages(updated);
                        addToHistory(updated);
                    }
                    setIsBaseImageModalOpen(false);
                }}
            />
        </div>
    );
}
