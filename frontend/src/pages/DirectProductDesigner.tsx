import { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Canvas } from '../components/Canvas';
import { useCanvasState } from '../hooks/designer/useCanvasState';
import { toast, Toaster } from 'sonner';
import { Loader2, Image as ImageIcon, Type, ShoppingBag, RotateCcw, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TextTool } from '../components/TextTool';
import { ImageTool } from '../components/ImageTool';
import { PublicCustomizationPanel } from '../components/PublicCustomizationPanel';
import { Button } from "@/components/ui/button";
import { getProxiedUrl } from '@/utils/urlUtils';
import { evaluateVisibility } from '../utils/logicEvaluator';

const PAPER_DIMENSIONS: Record<string, { width: number; height: number }> = {
    'Default': { width: 264.5833, height: 264.5833 }, // Square fallback in mm (~1000px at 3.77)
    'A3': { width: 297, height: 420 },
    'A4': { width: 210, height: 297 },
    'A5': { width: 148, height: 210 },
    'Letter': { width: 215.9, height: 279.4 },
    'Legal': { width: 215.9, height: 355.6 },
    'Tabloid': { width: 279.4, height: 431.8 },
};

const getCanvasDimensions = (config: any) => {
    const unit: 'mm' | 'cm' | 'inch' = config?.unit || 'cm';
    const pxPerUnit: Record<string, number> = {
        'mm': 3.7795275591,
        'cm': 37.795275591,
        'inch': 96
    };
    const currentPxPerUnit = pxPerUnit[unit] || 37.795275591;

    // 1. Custom Dimensions (Highest priority)
    if (config?.paperSize === 'Custom' && config?.customPaperDimensions) {
        const w = (config.customPaperDimensions.width || 0) * currentPxPerUnit;
        const h = (config.customPaperDimensions.height || 0) * currentPxPerUnit;

        // Safety fallback if dimensions are 0 or NaN
        if (w > 0 && h > 0) {
            return { width: w, height: h };
        }
    }

    // 2. Standard Paper Sizes (Map to MM first, then to pixels)
    const paperSizeKey = config?.paperSize || 'Default';
    const dimensions = PAPER_DIMENSIONS[paperSizeKey] || PAPER_DIMENSIONS['Default'];

    // We treat PAPER_DIMENSIONS as MM. Convert MM -> Pixels.
    const mmToPx = 3.7795275591;

    const w = (dimensions.width || 264.5833) * mmToPx;
    const h = (dimensions.height || 264.5833) * mmToPx;

    return {
        width: w || 1000,
        height: h || 1000
    };
};

interface DirectProductDesignerProps {
    productId: string;
    shop: string;
}

export function DirectProductDesigner({ productId, shop }: DirectProductDesignerProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [config, setConfig] = useState<any>(null);
    const [shopifyProduct, setShopifyProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState<{ fonts: any[], colors: any[], options: any[], galleries: any[] }>({ fonts: [], colors: [], options: [], galleries: [] });

    // Core State
    const [activeTool, setActiveTool] = useState<'text' | 'image' | 'upload' | null>(null);
    const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(true);
    const [optionsRoot, setOptionsRoot] = useState<HTMLElement | null>(null);

    // Canvas Hook - Independent instance
    const {
        pages,
        setPages,
        activePage,
        setActivePageId,
        selectedElement: selectedElementId,
        setSelectedElement,
        updateElement,
        addElement,
        deleteElement,
        duplicateElement,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useCanvasState([{ id: 'default', name: 'Side 1', elements: [] }]);

    const selectedElement = activePage?.elements.find(el => el.id === selectedElementId) || null;
    const [selectedVariantId, setSelectedVariantId] = useState<string>(searchParams.get('variant') || '');
    const [zoom, setZoom] = useState(100);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
    const { width: canvasWidth, height: canvasHeight } = useMemo(() => {
        const dims = getCanvasDimensions(config);
        console.log('[IMCST DEBUG] Canvas Dimensions:', {
            paperSize: config?.paperSize,
            unit: config?.unit,
            customDims: config?.customPaperDimensions,
            calculated: dims
        });
        return dims;
    }, [config]);

    // Processed Elements with Logic Evaluation
    const processedElements = useMemo(() => {
        if (!activePage) return [];

        const currentVariant = shopifyProduct?.variants?.find((v: any) => String(v.id) === selectedVariantId) || shopifyProduct?.variants?.[0];

        // Map option names to values for logic evaluator
        const optionsMap: Record<string, string> = {};
        if (shopifyProduct && currentVariant) {
            shopifyProduct.options.forEach((opt: any, idx: number) => {
                const val = idx === 0 ? currentVariant.option1 : idx === 1 ? currentVariant.option2 : currentVariant.option3;
                optionsMap[opt.name] = val;
                optionsMap[`option${idx + 1}`] = val;
            });
        }

        const context = {
            variantId: String(selectedVariantId),
            options: optionsMap,
            elementValues: activePage.elements.reduce((acc, el) => {
                acc[el.id] = el.text || el.src || el.checked || el.selectedColor;
                if (el.label) acc[el.label] = acc[el.id];
                return acc;
            }, {} as Record<string, any>)
        };

        return activePage.elements.map(el => {
            const isVisible = evaluateVisibility(el, context);
            return {
                ...el,
                isVisible: isVisible,
                isHiddenByLogic: !isVisible
            };
        });
    }, [activePage?.elements, selectedVariantId, shopifyProduct]);

    // 1. Theme Integration Logic (Runs only when configured)
    useEffect(() => {
        if (isConfigured !== true) {
            document.body.classList.remove('imcst-split-mode-active');
            return;
        }

        const syncWithTheme = () => {
            const optRoot = document.getElementById('direct-options-root');
            if (optRoot) {
                setOptionsRoot(optRoot);
                document.body.classList.add('imcst-split-mode-active');
            }

            const canvasRoot = document.getElementById('direct-canvas-root');
            if (canvasRoot) {
                const parent = canvasRoot.parentElement;
                if (parent) {
                    // Force parent visibility (themes often hide empty media wrappers)
                    parent.style.setProperty('display', 'block', 'important');
                    parent.style.setProperty('visibility', 'visible', 'important');
                    parent.style.setProperty('opacity', '1', 'important');
                    parent.style.position = 'relative';
                    parent.style.minHeight = '500px';

                    // Hide original media
                    const media = parent.querySelectorAll('img, svg, video, .product__media-item, .product-media, .shopify-model-viewer-ui, .product__media-toggle, .thumbnail-list, .slider-buttons');
                    media.forEach((el: any) => {
                        if (canvasRoot.contains(el)) return;
                        el.style.display = 'none';
                        el.style.opacity = '0';
                    });
                }
            }

            // Hide Theme ATC
            const atcSelectors = ['form[action*="/cart/add"]', '.product-form__buttons', '.product-form__submit', '[name="add"]', '.add-to-cart'];
            atcSelectors.forEach(s => {
                document.querySelectorAll(s).forEach((el: any) => {
                    if (optRoot && !el.contains(optRoot)) {
                        el.style.display = 'none';
                        el.style.opacity = '0';
                        el.style.pointerEvents = 'none';
                    }
                });
            });
        };

        syncWithTheme();
        const observer = new MutationObserver(syncWithTheme);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            document.body.classList.remove('imcst-split-mode-active');
        };
    }, [isConfigured]);

    // 2. Adaptive Zoom Logic
    useEffect(() => {
        if (loading || !isConfigured) return;

        const updateZoom = () => {
            const target = containerRef.current;
            if (!target) return;

            const containerWidth = Math.min(800, target.clientWidth || 500);
            let containerHeight = Math.min(800, target.clientHeight);
            if (containerHeight < 100) containerHeight = containerWidth;

            // Ensure dimensions are valid to avoid Infinity/NaN scale
            if (canvasWidth > 0 && canvasHeight > 0) {
                // Limit zoom to fit container, but never more than 100% for public storefront
                const scale = Math.min(containerWidth / canvasWidth, containerHeight / canvasHeight);
                const finalZoom = Math.max(1, Math.min(100, scale * 100));
                console.log("[IMCST] Zoom Applied:", { containerWidth, canvasWidth, scale, finalZoom });
                setZoom(finalZoom);
            } else {
                console.warn("[IMCST] Invalid canvas dimensions for zoom:", { canvasWidth, canvasHeight });
                setZoom(100);
            }
        };

        const resizeObserver = new ResizeObserver(updateZoom);
        if (containerRef.current) resizeObserver.observe(containerRef.current);

        updateZoom();
        return () => resizeObserver.disconnect();
    }, [loading, optionsRoot, isConfigured, canvasWidth, canvasHeight]);

    // 3. Variant Sync
    useEffect(() => {
        if (!shopifyProduct || !isConfigured) return;
        if (!selectedVariantId && shopifyProduct.variants?.length) {
            const firstId = String(shopifyProduct.variants[0].id);
            setSelectedVariantId(firstId);
            setSearchParams(prev => {
                prev.set('variant', firstId);
                return prev;
            }, { replace: true });
        }
    }, [shopifyProduct, selectedVariantId, isConfigured]);

    // 4. Selection Sync
    useEffect(() => {
        if (selectedElement && isConfigured) {
            setIsMobilePanelOpen(true);
            if (selectedElement.type === 'text' || (selectedElement as any).type === 'monogram') setActiveTool('text');
            else if (selectedElement.type === 'image') setActiveTool('image');
        }
    }, [selectedElement, isConfigured]);

    // 5. Variant Media Sync
    useEffect(() => {
        if (!selectedVariantId || !config || !isConfigured || pages.length === 0) return;

        const variantMap = config.variantBaseImages;
        if (!variantMap || typeof variantMap !== 'object') return;

        const variantDesign = variantMap[selectedVariantId];
        if (!variantDesign) return;

        // Current side key - default to 'default'
        const sideKey = (activePage?.id === 'default' || pages.length === 1) ? 'default' : activePage?.id;
        const mockData = variantDesign[sideKey] || variantDesign['default'];

        if (mockData && mockData.url && (mockData.url !== activePage?.baseImage || !activePage?.baseImage)) {
            setPages(prev => prev.map(p => {
                if (p.id === (activePage?.id || 'default')) {
                    const currentProps = p.baseImageProperties || { x: 0, y: 0, scale: 1 };
                    const newProps = mockData.properties || currentProps;

                    return {
                        ...p,
                        baseImage: mockData.url,
                        baseImageProperties: {
                            ...currentProps,
                            ...newProps,
                            // Ensure basic properties exist
                            x: newProps.x ?? currentProps.x ?? 0,
                            y: newProps.y ?? currentProps.y ?? 0,
                            scale: newProps.scale ?? currentProps.scale ?? 1
                        }
                    };
                }
                return p;
            }));
        }
    }, [selectedVariantId, config, isConfigured, activePage?.id]);

    async function init() {
        try {
            const baseUrl = (window as any).IMCST_BASE_URL || '';

            // Fetch initial product data and config
            const prodRes = await fetch(`${baseUrl}/imcst_public_api/product/${shop}/${productId}?t=${Date.now()}`);
            const prodData = await prodRes.json();

            console.log('[DirectProductDesigner] Received data from backend:', {
                hasConfig: !!prodData.config,
                hasDesign: !!prodData.design,
                hasProduct: !!prodData.product,
                configKeys: prodData.config ? Object.keys(prodData.config) : [],
                designPages: prodData.design?.length || 0
            });
            console.log('[DirectProductDesigner] Base Image Configuration:', {
                'design[0].baseImage': prodData.design?.[0]?.baseImage,
                'design[0].variantBaseImages': prodData.design?.[0]?.variantBaseImages,
                'design[0].baseImageScale': prodData.design?.[0]?.baseImageScale,
                'config.baseImage': prodData.config?.baseImage,
                'config.variantBaseImages': prodData.config?.variantBaseImages,
                'config.baseImageScale': prodData.config?.baseImageScale
            });

            if (!prodData.config || Object.keys(prodData.config).length === 0) {
                console.log("[IMCST] Product not configured. Disabling designer.");
                setIsConfigured(false);
                setLoading(false);
                return;
            }

            setConfig(prodData.config);
            setShopifyProduct(prodData.product);
            setIsConfigured(true);

            // Populate Design Pages
            if (prodData.design && prodData.design.length > 0) {
                setPages(prodData.design);
                setActivePageId(prodData.design[0].id);
            } else {
                // No saved design, create initial page from config
                const configBaseImage = prodData.config.baseImage;
                // Don't set baseImage if it's 'none' or empty - let Canvas handle placeholder
                const initialBaseImage = (configBaseImage && configBaseImage !== 'none') ? configBaseImage : '';

                const initialSide = {
                    id: 'default',
                    name: 'Side 1',
                    elements: [],
                    baseImage: initialBaseImage,
                    baseImageColor: prodData.config.baseImageColor,
                    baseImageColorEnabled: prodData.config.baseImageColorEnabled,
                    baseImageColorMode: prodData.config.baseImageColorMode || 'transparent',
                    baseImageAsMask: prodData.config.baseImageAsMask,
                    baseImageMaskInvert: prodData.config.baseImageMaskInvert,
                    baseImageProperties: prodData.config.baseImageProperties || { x: 0, y: 0, scale: 1 }
                };
                setPages([initialSide]);
                console.log('[IMCST DEBUG] Initial Page Setup:', {
                    pageId: initialSide.id,
                    elementsCount: initialSide.elements.length,
                    baseImage: initialSide.baseImage,
                    baseImageProps: initialSide.baseImageProperties
                });
                setActivePageId('default');
            }

            const allAssets = await fetch(`${baseUrl}/imcst_api/public/assets?shop=${shop}`).then(r => r.json()).catch(() => []);
            setAssets({
                fonts: allAssets.filter((a: any) => a.type === 'font'),
                colors: allAssets.filter((a: any) => a.type === 'color'),
                options: allAssets.filter((a: any) => a.type === 'option'),
                galleries: allAssets.filter((a: any) => a.type === 'gallery')
            });
            setLoading(false);
        } catch (err) {
            console.error("Init failed", err);
            setIsConfigured(false);
            setLoading(false);
        }
    }

    // Effect for calling init 
    useEffect(() => {
        init();
    }, [productId, shop]);

    const handleVariantChange = (vid: string) => {
        setSelectedVariantId(vid);
        setSearchParams(prev => {
            prev.set('variant', vid);
            return prev;
        }, { replace: true });
    };

    const handleAddToCart = async () => {
        const toastId = toast.loading("Adding to cart...");
        try {
            const baseUrl = (window as any).IMCST_BASE_URL || '';
            const previewUrl = "https://placeholder";

            const saveRes = await fetch(`${baseUrl}/imcst_api/public/design`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shop,
                    shopifyProductId: productId,
                    name: `Design ${new Date().toISOString()}`,
                    designJson: pages,
                    previewUrl,
                    variantId: selectedVariantId
                })
            });

            if (!saveRes.ok) throw new Error("Failed to save design");
            const savedDesign = await saveRes.json();

            const cartRes = await fetch('/cart/add.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: [{
                        id: parseInt(selectedVariantId),
                        quantity: 1,
                        properties: {
                            '_Design ID': savedDesign.id,
                            '_Preview': previewUrl
                        }
                    }]
                })
            });

            if (!cartRes.ok) throw new Error("Failed to add to Shopify cart");

            toast.dismiss(toastId);
            toast.success("Added to cart!");
            window.location.href = '/cart';
        } catch (err) {
            console.error(err);
            toast.dismiss(toastId);
            toast.error("Error adding to cart");
        }
    };

    if (loading) {
        return (
            <div className="w-full h-[600px] bg-gray-50 flex flex-col items-center justify-center animate-pulse gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                <span className="text-gray-400 font-medium">Loading Customizer...</span>
            </div>
        );
    }

    if (isConfigured === false) {
        return null;
    }


    const handleOptionChange = (index: number, value: string) => {
        if (!shopifyProduct) return;
        const currentVariant = shopifyProduct.variants.find((v: any) => String(v.id) === selectedVariantId) || shopifyProduct.variants[0];

        const newVariant = shopifyProduct.variants.find((v: any) => {
            const opt1 = index === 0 ? value : (currentVariant?.option1 || "");
            const opt2 = index === 1 ? value : (currentVariant?.option2 || "");
            const opt3 = index === 2 ? value : (currentVariant?.option3 || "");
            return v.option1 === opt1 && v.option2 === opt2 && v.option3 === opt3;
        });

        if (newVariant) {
            handleVariantChange(String(newVariant.id));
        }
    };

    const ToolsPanel = (
        <div className={`
            imcst-tools-container
            ${optionsRoot ? 'w-full' : 'fixed inset-x-0 bottom-0 z-50 bg-white border-t rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] md:relative md:transform-none md:w-[400px] md:border-l md:border-t-0 md:shadow-none md:h-auto md:overflow-y-auto'}
            ${!optionsRoot && (isMobilePanelOpen ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]')}
            transition-transform duration-300
        `}>
            {!optionsRoot && (
                <div
                    className="md:hidden w-full h-8 flex items-center justify-center cursor-pointer"
                    onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
                >
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                </div>
            )}

            <div className={`p-4 md:p-6 space-y-6 ${optionsRoot ? 'px-0 pt-0' : 'h-[80vh] md:h-auto overflow-y-auto'}`}>
                {/* 1. Page Customization Options (Unified with Backend Logic) */}
                <div className="space-y-4">
                    <PublicCustomizationPanel
                        elements={processedElements}
                        onUpdateElement={updateElement}
                        onSelectElement={(id) => {
                            setSelectedElement(id);
                            // If user clicks a text/image in the list, we might want to switch tool, but usually Public panel handles it
                        }}
                        onReset={() => {
                            if (confirm("Reset current design?")) {
                                setPages(prev => prev.map(p => ({ ...p, elements: [] })));
                            }
                        }}
                        productData={shopifyProduct}
                        selectedVariant={shopifyProduct?.variants?.find((v: any) => String(v.id) === selectedVariantId)}
                        handleOptionChange={handleOptionChange}
                        userGalleries={assets.galleries}
                        baseUrl={(window as any).IMCST_BASE_URL || ''}
                        shop={shop}
                        onAddElement={addElement}
                        onDeleteElement={deleteElement}
                    />
                </div>

                {/* 2. Add New Tools (Optional based on config) */}
                <div className="space-y-4 border-t pt-6">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Add Extras</label>

                    {!activeTool ? (
                        <div className="flex gap-2">
                            {config?.enabledTools?.text !== false && (
                                <button
                                    onClick={() => setActiveTool('text')}
                                    className="flex-1 flex items-center justify-center py-3 px-4 rounded-xl border border-slate-200 hover:border-black transition-all gap-2 group bg-slate-50"
                                >
                                    <Type className="w-4 h-4" />
                                    <span className="text-xs font-bold">Add Text</span>
                                </button>
                            )}

                            {config?.enabledTools?.image !== false && (
                                <button
                                    onClick={() => setActiveTool('image')}
                                    className="flex-1 flex items-center justify-center py-3 px-4 rounded-xl border border-slate-200 hover:border-black transition-all gap-2 group bg-slate-50"
                                >
                                    <ImageIcon className="w-4 h-4" />
                                    <span className="text-xs font-bold">Add Image</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            {activeTool === 'text' && (
                                <motion.div key="text-tool" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-[10px] uppercase text-slate-900 flex items-center gap-2">
                                            <Type className="w-3 h-3" /> Add Text
                                        </span>
                                        <button onClick={() => { setActiveTool(null); setSelectedElement(null); }} className="text-xs font-bold text-slate-400 hover:text-black bg-white w-6 h-6 rounded-full flex items-center justify-center border shadow-sm">✕</button>
                                    </div>
                                    <TextTool
                                        onAddElement={(el) => {
                                            addElement(el);
                                            setActiveTool(null);
                                        }}
                                        selectedElement={(selectedElement && (selectedElement.type === 'text' || (selectedElement as any).type === 'monogram')) ? selectedElement : undefined}
                                        onUpdateElement={updateElement}
                                        canvasDimensions={{ width: canvasWidth, height: canvasHeight }}
                                        userFonts={assets.fonts}
                                        isPublicMode={true}
                                    />
                                </motion.div>
                            )}

                            {activeTool === 'image' && (
                                <motion.div key="image-tool" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-[10px] uppercase text-slate-900 flex items-center gap-2">
                                            <ImageIcon className="w-3 h-3" /> Add Image
                                        </span>
                                        <button onClick={() => { setActiveTool(null); setSelectedElement(null); }} className="text-xs font-bold text-slate-400 hover:text-black bg-white w-6 h-6 rounded-full flex items-center justify-center border shadow-sm">✕</button>
                                    </div>
                                    <ImageTool
                                        onAddElement={(el) => {
                                            addElement(el);
                                            setActiveTool(null);
                                        }}
                                        selectedElement={(selectedElement && selectedElement.type === 'image') ? selectedElement : undefined}
                                        onUpdateElement={updateElement}
                                        shop={shop}
                                        isPublicMode={true}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>

                {/* 3. Page Switcher (If multiple) */}
                {pages.length > 1 && (
                    <div className="space-y-3 border-t pt-6">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Layers className="w-3 h-3" /> Switch Side
                        </label>
                        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                            {pages.map((p, idx) => (
                                <button
                                    key={p.id}
                                    onClick={() => setActivePageId(p.id)}
                                    className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all ${activePage?.id === p.id ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-black'}`}
                                >
                                    {p.name || `Side ${idx + 1}`}
                                </button>
                            ))}
                        </div>
                    </div>
                )}


                {/* Add to Cart Actions */}
                <div className="pt-6 border-t mt-auto">
                    <Button
                        onClick={handleAddToCart}
                        className="w-full h-14 bg-black text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl"
                    >
                        <ShoppingBag className="w-6 h-6" />
                        <span>{config?.buttonText || 'Add to Cart'}</span>
                    </Button>
                </div>
            </div>
        </div>
    );

    const CanvasContent = (
        <div
            ref={containerRef}
            className="relative flex-1 w-full h-full min-h-[500px] flex items-center justify-center cursor-default bg-transparent z-10"
            onClick={() => setSelectedElement(null)}
        >
            <div
                className="transform-gpu transition-transform duration-300 ease-out relative"
                style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'center center',
                    width: `${canvasWidth}px`,
                    height: `${canvasHeight}px`,
                    flexShrink: 0
                }}
            >
                <Canvas
                    width={canvasWidth}
                    height={canvasHeight}
                    elements={processedElements}
                    selectedElement={selectedElementId}
                    onSelectElement={(id) => setSelectedElement(id)}
                    onUpdateElement={updateElement}
                    onDeleteElement={deleteElement}
                    onDuplicateElement={duplicateElement}
                    zoom={100} // we scale via CSS
                    productVariant={{ color: 'white', size: '', material: '' }}
                    enableBounce={false}
                    unit={config?.unit || 'cm'}
                    paperSize={config?.paperSize || 'Default'}
                    customPaperDimensions={config?.customPaperDimensions}
                    showSafeArea={config?.showSafeArea ?? false} // Default false on storefront
                    safeAreaPadding={config?.safeAreaPadding}
                    safeAreaRadius={config?.safeAreaRadius}
                    safeAreaWidth={config?.safeAreaWidth}
                    safeAreaHeight={config?.safeAreaHeight}
                    safeAreaOffset={config?.safeAreaOffset || { x: 0, y: 0 }}
                    showRulers={false} // Never show rulers on storefront
                    showGrid={false} // Never show grid on storefront
                    baseImage={(() => {
                        const rawSelectedId = String(selectedVariantId || '');
                        const vKey = rawSelectedId.match(/\d+/)?.[0] || rawSelectedId;

                        // Helper to normalize base image data (supports both legacy string and new object format)
                        const normalizeBaseImage = (img: any) => {
                            if (!img) return null;

                            // New format (object with source)
                            if (typeof img === 'object' && img.source && img.url) {
                                return img;
                            }

                            // Legacy format (plain string URL)
                            if (typeof img === 'string' && img !== 'none') {
                                return {
                                    source: 'manual',
                                    url: img,
                                    metadata: {}
                                };
                            }

                            return null;
                        };

                        // Helper to process URLs
                        const processUrl = (u: any): string | undefined => {
                            if (!u || u === 'none') return undefined;

                            let rawUrl: any = undefined;

                            if (typeof u === 'string') {
                                rawUrl = u;
                            } else if (typeof u === 'object') {
                                // Cari di kunci-kunci umum di mana URL biasanya disimpan
                                rawUrl = u.url || u.src || u.image || u.default?.url || u.previewUrl || u.originalUrl;

                                // Jika masih belum ketemu, coba ambil string pertama yang mirip URL
                                if (!rawUrl) {
                                    const values = Object.values(u);
                                    rawUrl = values.find(v => typeof v === 'string' && (v.startsWith('http') || v.startsWith('data:') || v.startsWith('/')));
                                }
                            }

                            if (typeof rawUrl !== 'string' || !rawUrl) return undefined;

                            const cleaned = rawUrl.includes('|') ? rawUrl.split('|')[1].trim() : rawUrl;
                            return getProxiedUrl(cleaned);
                        };

                        // Helper to check if URL is a placeholder
                        const isPlaceholder = (url: any): boolean => {
                            if (!url || typeof url !== 'string') return false;
                            return url.includes('placehold.co') || url.includes('placeholder.co');
                        };

                        console.log('[DirectProductDesigner] Base Image Resolution Debug:', {
                            selectedVariantId,
                            rawSelectedId,
                            vKey,
                            'config.variantBaseImages': config?.variantBaseImages,
                            'config.baseImage': config?.baseImage,
                        });

                        // 1. Check variant-specific selection (admin explicitly selected for this variant)
                        const variantSelection = config?.variantBaseImages?.[rawSelectedId] || config?.variantBaseImages?.[vKey];
                        if (variantSelection) {
                            const normalized = normalizeBaseImage(variantSelection);
                            if (normalized?.url) {
                                const processed = processUrl(normalized.url);
                                if (processed && !isPlaceholder(processed)) {
                                    console.log('[DirectProductDesigner] Using variant-specific selection:', normalized.source, processed);
                                    return processed;
                                }
                            }
                        }

                        // 2. Check global selection (admin explicitly selected global base image)
                        const globalSelection = config?.baseImage;
                        if (globalSelection) {
                            const normalized = normalizeBaseImage(globalSelection);
                            if (normalized?.url) {
                                const processed = processUrl(normalized.url);
                                if (processed && !isPlaceholder(processed)) {
                                    console.log('[DirectProductDesigner] Using global selection:', normalized.source, processed);
                                    return processed;
                                }
                            }
                        }

                        // 3. System placeholder (no selection made)
                        console.log('[DirectProductDesigner] No base image selected, using system placeholder');
                        return '/images/system-placeholder.png';
                    })()}
                    baseImageColor={activePage?.baseImageColor || config?.baseImageColor}
                    baseImageColorEnabled={activePage?.baseImageColorEnabled || config?.baseImageColorEnabled}
                    baseImageColorMode={activePage?.baseImageColorMode || config?.baseImageColorMode || 'transparent'}
                    baseImageAsMask={activePage?.baseImageAsMask || config?.baseImageAsMask}
                    baseImageMaskInvert={activePage?.baseImageMaskInvert || config?.baseImageMaskInvert}
                    baseImageScale={(() => {
                        const vid = String(selectedVariantId || '');
                        const vKey = vid.match(/\d+/)?.[0] || vid;
                        return activePage?.variantBaseScales?.[vid] ||
                            activePage?.variantBaseScales?.[vKey] ||
                            activePage?.baseImageScale ||
                            config?.baseImageScale;
                    })()}
                    baseImageProperties={{
                        x: 0,
                        y: 0,
                        scale: 1,
                        width: 1000,
                        height: 1000,
                        ...(config?.baseImageProperties || {}),
                        ...(activePage?.baseImageProperties || {})
                    }}
                    isPublicMode={true}
                    onUpdateBaseImage={(updates) => {
                        updateElement('FAKE_ID_NOT_NEEDED_FOR_BASE', {}, true);
                        setPages(prev => prev.map(p => {
                            if (p.id === activePage?.id) {
                                return {
                                    ...p,
                                    baseImageProperties: {
                                        x: p.baseImageProperties?.x ?? 0,
                                        y: p.baseImageProperties?.y ?? 0,
                                        scale: p.baseImageProperties?.scale ?? 1,
                                        ...(p.baseImageProperties || {}),
                                        ...updates
                                    } as any
                                };
                            }
                            return p;
                        }));
                    }}
                    onUpdateSafeAreaOffset={() => { }}
                    onUpdateSafeAreaWidth={() => { }}
                    onUpdateSafeAreaHeight={() => { }}
                />
            </div>

            {/* Subtle Controls */}
            <div className="absolute bottom-4 left-4 z-10 flex gap-1.5">
                <button onClick={undo} disabled={!canUndo} className="p-1.5 bg-white/90 hover:bg-white rounded border border-slate-200 disabled:opacity-30 shadow-sm transition-all">
                    <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                </button>
                {canRedo && (
                    <button onClick={redo} className="p-1.5 bg-white/90 hover:bg-white rounded border border-slate-200 transform scale-x-[-1] shadow-sm transition-all">
                        <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                )}
            </div>
            {/* CSS Overrides to make Canvas native for Direct Mode */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .imcst-direct-designer .flex-1 > .transform-gpu > div {
                    padding: 0 !important;
                    overflow: visible !important;
                }
                .imcst-direct-designer .custom-scrollbar::-webkit-scrollbar {
                    display: none !important;
                }
            `}} />
        </div>
    );

    return (
        <div className={`imcst-direct-designer w-full bg-white text-slate-900 font-sans ${optionsRoot ? 'imcst-is-split' : 'flex flex-col md:flex-row min-h-[600px]'}`}>
            <Toaster position="top-center" />

            {/* CANVAS: Always rendered here (main-public.tsx mounts us in the media area) */}
            <div className={`relative flex flex-col items-center justify-center overflow-hidden ${optionsRoot ? 'w-full h-full' : 'flex-1 bg-gray-100/50 md:h-screen md:sticky md:top-0'}`}>
                {CanvasContent}
            </div>

            {/* TOOLS & OPTIONS: Portal to direct area if split mode, else render locally */}
            {optionsRoot ? createPortal(ToolsPanel, optionsRoot) : ToolsPanel}
        </div>
    );
}
