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
import { X, Image as ImageIcon, Pencil, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { POPULAR_GOOGLE_FONTS } from '../constants/fonts';

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

    const [pages, setPages] = useState<PageData[]>(initialPages);
    const [activePageId, setActivePageId] = useState<string>(initialPages[0]?.id || 'default');
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [history, setHistory] = useState<PageData[][]>([JSON.parse(JSON.stringify(initialPages))]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [zoom, setZoom] = useState(80);
    const [showSummary, setShowSummary] = useState(true);

    // Configuration State - Editable by Admin, Read-only for customers
    const [showSafeArea, setShowSafeArea] = useState(initialConfig.showSafeArea ?? true);
    const [showRulers, setShowRulers] = useState(initialConfig.showRulers ?? false);
    const [unit, setUnit] = useState<'cm' | 'mm' | 'inch'>(initialConfig.unit || 'cm');
    const [paperSize, setPaperSize] = useState(initialConfig.paperSize || 'Custom');
    const [customPaperDimensions, setCustomPaperDimensions] = useState(initialConfig.customPaperDimensions || { width: 264.5833, height: 264.5833 });
    const [safeAreaPadding] = useState(initialConfig.safeAreaPadding ?? 10);
    const [safeAreaRadius, setSafeAreaRadius] = useState(initialConfig.safeAreaRadius ?? 0);
    const [safeAreaWidth] = useState(initialConfig.safeAreaWidth);
    const [safeAreaHeight] = useState(initialConfig.safeAreaHeight);
    const [safeAreaOffset, setSafeAreaOffset] = useState(initialConfig.safeAreaOffset || { x: 0, y: 0 });

    // Fixed Admin Settings
    const [designerLayout, setDesignerLayout] = useState(initialConfig.designerLayout || 'redirect');
    const [buttonText, setButtonText] = useState(initialConfig.buttonText || 'Design It');
    const [productOutputSettings, setProductOutputSettings] = useState(initialConfig.productOutputSettings || null);

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

    // Dynamic Font Loading
    useEffect(() => {
        if (filteredUserFonts.length > 0) {
            // 1. Google Fonts
            const googleFamilies = new Set<string>();
            filteredUserFonts.forEach(f => {
                if (f.config?.fontType === 'google') {
                    if (f.config?.googleConfig === 'specific' && f.config?.specificFonts) {
                        f.config.specificFonts.split(/[,\n]/).forEach((n: string) => {
                            const trimmed = n.trim();
                            // Only add if it doesn't look like a custom font (no '|', no data URL, no http)
                            if (trimmed && !trimmed.includes('|') && !trimmed.includes('data:') && !trimmed.includes('://')) {
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
                link.href = `https://fonts.googleapis.com/css?family=${Array.from(googleFamilies).map(f => f.replace(/ /g, '+')).join('|')}&display=swap`;
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
            filteredUserFonts.forEach(f => {
                // Single custom font asset
                if (f.config?.fontType === 'custom' && f.value && !f.value.includes('|')) {
                    css += `@font-face { font-family: "${f.name}"; src: url("${f.value}"); font-display: swap; }\n`;
                }

                // Font group with multiple custom fonts (Name|Data or Name|URL)
                if (f.value) {
                    const lines = f.value.split('\n');
                    lines.forEach((line: string) => {
                        if (line.includes('|')) {
                            const [name, data] = line.split('|');
                            // Support both base64 data URLs and S3 URLs
                            if (name && data && (data.trim().startsWith('data:') || data.trim().startsWith('http'))) {
                                css += `@font-face { font-family: "${name.trim()}"; src: url("${data.trim()}"); font-display: swap; }\n`;
                            }
                        }
                    });
                }
            });
            style.textContent = css;
        }
    }, [filteredUserFonts]);

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
                            elements={currentElements}
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
                            isSaving={isSaving || isAutoSaving}
                            buttonText={buttonText}
                            userGalleries={filteredUserGalleries}
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
                        <span className={`${isPublicModeProp ? 'text-xl' : 'text-base'} font-black text-indigo-900 uppercase tracking-widest whitespace-nowrap`}>Side: {pages.findIndex(p => p.id === activePageId) + 1}/{pages.length}</span>

                        {isPublicModeProp && hasVariants && (
                            <div className="flex items-center gap-3 border-l pl-3 ml-1 flex-1 overflow-hidden">
                                {productData?.options?.map((option, idx) => (
                                    <div key={option.name} className="flex items-center gap-2 shrink-0">
                                        <Label className="text-sm font-medium text-gray-400 whitespace-nowrap uppercase tracking-wider">{option.name}:</Label>
                                        <Select
                                            value={(idx === 0 ? selectedVariant?.option1 : idx === 1 ? selectedVariant?.option2 : selectedVariant?.option3) || ""}
                                            onValueChange={(val) => handleOptionChange(idx, val)}
                                        >
                                            <SelectTrigger className="h-12 px-5 py-2 min-w-[100px] text-lg font-bold bg-white border border-gray-100 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-50 transition-all">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border shadow-xl">
                                                {option.values?.map(val => (
                                                    <SelectItem key={val} value={val} className="text-lg font-medium py-2 px-5">{val}</SelectItem>
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

                    <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
                        <div
                            ref={zoomContainerRef}
                            className="flex-1 relative"
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
                                    // Robust ID parsing (handles GIDs like gid://shopify/ProductVariant/123 -> "123")
                                    const rawSelectedId = String(selectedVariantId);
                                    const vKey = rawSelectedId.match(/\d+/)?.[0] || rawSelectedId;

                                    // 0. Check current side specific variant mockup
                                    const pageVariantMockup = currentPages?.variantBaseImages?.[rawSelectedId] || currentPages?.variantBaseImages?.[vKey];
                                    if (pageVariantMockup && pageVariantMockup !== 'none') return pageVariantMockup;

                                    // 1. Check Admin Configured variant images (Global Config Compatibility)
                                    // vKey is numeric string, selectedVariantId might be GID string
                                    const vConfig = initialConfig?.variantBaseImages?.[vKey] || initialConfig?.variantBaseImages?.[rawSelectedId];

                                    // Handle both string URL or object structure { default: { url: '...' } }
                                    let adminVariantImage = '';
                                    if (typeof vConfig === 'string') {
                                        adminVariantImage = vConfig;
                                    } else if (vConfig) {
                                        adminVariantImage = vConfig.default?.url || vConfig.url || '';
                                    }

                                    // 2. Fallback to Shopify variant image from productData
                                    const sVariant = productData?.variants?.find(v => {
                                        const vid = String(v.id).match(/\d+/)?.[0] || String(v.id);
                                        return vid === vKey;
                                    });
                                    const shopifyImage = (typeof sVariant?.image === 'string' ? sVariant.image : (sVariant?.image as any)?.url || (sVariant?.image as any)?.src);

                                    // 3. Page default base image
                                    const defaultImage = currentPages.baseImage;

                                    // 4. Ultimate Fallback to Shopify Product main image
                                    const sProductImage = productData?.images?.[0];
                                    const productFallback = (typeof sProductImage === 'string' ? sProductImage : (sProductImage as any)?.url || (sProductImage as any)?.src);

                                    // Get the final image
                                    let finalImage = adminVariantImage || shopifyImage || defaultImage || productFallback;

                                    if (!finalImage) return undefined;

                                    // Fix base64 images missing the data URI prefix
                                    if (typeof finalImage === 'string' && !finalImage.startsWith('http') && !finalImage.startsWith('data:')) {
                                        // Raw base64 data detected, add proper prefix
                                        finalImage = `data:image/jpeg;base64,${finalImage}`;
                                    }

                                    return finalImage;
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


                    </div>
                </div>

                <div className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${showSummary ? 'w-[420px] opacity-100 border-l border-gray-200' : 'w-0 opacity-0'}`}>
                    <Summary
                        elements={processedElements as any} selectedElement={selectedElement} onSelectElement={setSelectedElement} onDeleteElement={deleteElement}
                        showSafeArea={showSafeArea}
                        onToggleSafeArea={() => setShowSafeArea(!showSafeArea)}
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
                        baseImage={(() => {
                            if (currentPages?.baseImage === 'none') return undefined;

                            const rawSelectedId = String(selectedVariantId);
                            const vKey = rawSelectedId.match(/\d+/)?.[0] || rawSelectedId;

                            // 1. Explicit UI Assignment
                            const variantImage = currentPages?.variantBaseImages?.[rawSelectedId] || currentPages?.variantBaseImages?.[vKey];
                            if (variantImage && variantImage !== 'none') return variantImage;

                            // 2. Shopify Variant Image (AUTOMATIC)
                            const sVariant = productData?.variants?.find((v: any) => {
                                const vid = String(v.id).match(/\d+/)?.[0] || String(v.id);
                                return vid === vKey || String(v.id) === rawSelectedId;
                            });
                            const sVariantImage = (typeof sVariant?.image === 'string' ? sVariant.image : (sVariant?.image as any)?.url || (sVariant?.image as any)?.src);
                            if (sVariantImage) return sVariantImage;

                            // 3. Global Page Base Image
                            if (currentPages?.baseImage) return currentPages.baseImage;

                            // 4. Fallback to Shopify Product main image
                            const sProductImage = productData?.images?.[0];
                            return (typeof sProductImage === 'string' ? sProductImage : (sProductImage as any)?.url || (sProductImage as any)?.src) || undefined;
                        })()}
                        onOpenBaseImageModal={() => setIsBaseImageModalOpen(true)}
                        designerLayout={designerLayout}
                        onDesignerLayoutChange={setDesignerLayout}
                        buttonText={buttonText}
                        onButtonTextChange={setButtonText}
                        onUpdateElement={updateElement}
                        onSave={(isTemp, settings) => handleSave(isTemp, false, settings)}
                        isSaving={isSaving || isAutoSaving}
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
