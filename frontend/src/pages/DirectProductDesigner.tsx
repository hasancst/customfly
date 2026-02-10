import { useEffect, useState, useRef } from 'react';
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

            const containerWidth = target.clientWidth || 500;
            // For themes, we often want to fill the width. 
            // If height is 0 or too small, use a default 1:1 aspect ratio for scaling.
            let containerHeight = target.clientHeight;
            if (containerHeight < 100) containerHeight = containerWidth;

            // Assuming 1000px internal coordinate system for Canvas
            const scale = Math.min(containerWidth / canvasWidth, containerHeight / canvasHeight);
            setZoom(Math.max(10, scale * 100));
        };

        const resizeObserver = new ResizeObserver(updateZoom);
        if (containerRef.current) resizeObserver.observe(containerRef.current);

        updateZoom();
        return () => resizeObserver.disconnect();
    }, [loading, optionsRoot, isConfigured]);

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

        if (mockData && mockData.url && mockData.url !== activePage?.baseImage) {
            setPages(prev => prev.map(p => {
                if (p.id === (activePage?.id || 'default')) {
                    return {
                        ...p,
                        baseImage: mockData.url,
                        baseImageProperties: mockData.properties || p.baseImageProperties
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
                // Fix for old saved designs having placeholders
                const fixedDesign = prodData.design.map((p: any) => {
                    const isPlaceholder = p.baseImage?.includes('placehold.co') || p.baseImage?.includes('placeholder.co');
                    if (isPlaceholder || !p.baseImage) {
                        return { ...p, baseImage: prodData.config.baseImage };
                    }
                    return p;
                });
                setPages(fixedDesign);
            } else {
                // Initialize with config defaults
                const initialSide = {
                    id: 'default',
                    name: 'Side 1',
                    elements: [],
                    baseImage: prodData.config.baseImage,
                    baseImageColor: prodData.config.baseImageColor,
                    baseImageColorEnabled: prodData.config.baseImageColorEnabled,
                    baseImageAsMask: prodData.config.baseImageAsMask,
                    baseImageProperties: prodData.config.baseImageProperties || { x: 0, y: 0, scale: 1 }
                };
                setPages([initialSide]);
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

    // Layout Constants
    const getPixelsPerUnit = () => {
        const unit = config?.unit || 'cm';
        switch (unit) {
            case 'mm': return 3.7795275591;
            case 'cm': return 37.795275591;
            case 'inch': return 96;
            default: return 37.795275591;
        }
    };

    const canvasWidth = (config?.paperSize === 'Custom' && config?.customPaperDimensions?.width)
        ? config.customPaperDimensions.width * getPixelsPerUnit()
        : 1000;
    const canvasHeight = (config?.paperSize === 'Custom' && config?.customPaperDimensions?.height)
        ? config.customPaperDimensions.height * getPixelsPerUnit()
        : 1000;

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
                        elements={activePage?.elements || []}
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
            className="flex-1 relative overflow-hidden flex items-center justify-center cursor-default bg-slate-100 w-full h-full min-h-[500px] md:min-h-[600px] z-10"
            onClick={() => setSelectedElement(null)}
        >
            <div
                className="transform-gpu transition-transform duration-200 ease-out relative"
                style={{
                    transform: `scale(${zoom / 100})`,
                    width: `${canvasWidth}px`,
                    height: `${canvasHeight}px`,
                    flexShrink: 0
                }}
            >
                <Canvas
                    elements={activePage?.elements || []}
                    selectedElement={selectedElementId}
                    onSelectElement={(id) => setSelectedElement(id)}
                    onUpdateElement={updateElement}
                    onDeleteElement={deleteElement}
                    onDuplicateElement={duplicateElement}
                    zoom={100} // we scale via CSS
                    showSafeArea={false}
                    productVariant={{ color: 'white', size: '', material: '' }}
                    showRulers={false}
                    unit={config?.unit || 'cm'}
                    enableBounce={false}
                    paperSize={config?.paperSize || 'Custom'}
                    customPaperDimensions={config?.customPaperDimensions}
                    safeAreaPadding={config?.safeAreaPadding}
                    safeAreaRadius={config?.safeAreaRadius}
                    safeAreaWidth={config?.safeAreaWidth}
                    safeAreaHeight={config?.safeAreaHeight}
                    safeAreaOffset={config?.safeAreaOffset || { x: 0, y: 0 }}
                    baseImage={(() => {
                        const activeImg = activePage?.baseImage;
                        const configImg = config?.baseImage;

                        // Ignore placeholder.co from activePage and use config instead
                        const isPlaceholder = activeImg?.includes('placehold.co') || activeImg?.includes('placeholder.co');
                        const raw = (activeImg && !isPlaceholder) ? activeImg : (configImg || '');

                        return getProxiedUrl(raw);
                    })()}
                    baseImageColor={activePage?.baseImageColor || config?.baseImageColor}
                    baseImageColorEnabled={activePage?.baseImageColorEnabled || config?.baseImageColorEnabled}
                    baseImageColorMode={activePage?.baseImageColorMode || config?.baseImageColorMode}
                    baseImageAsMask={activePage?.baseImageAsMask || config?.baseImageAsMask}
                    baseImageMaskInvert={activePage?.baseImageMaskInvert || config?.baseImageMaskInvert}
                    baseImageScale={config?.baseImageScale}
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
                        updateElement('FAKE_ID_NOT_NEEDED_FOR_BASE', {}, true); // Trigger history if needed, but base image usually doesn't need it
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
                    background: transparent !important;
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
            <div className={`relative flex flex-col overflow-hidden ${optionsRoot ? 'w-full h-full' : 'flex-1 bg-gray-100/50 md:h-screen md:sticky md:top-0'}`}>
                {CanvasContent}
            </div>

            {/* TOOLS & OPTIONS: Portal to direct area if split mode, else render locally */}
            {optionsRoot ? createPortal(ToolsPanel, optionsRoot) : ToolsPanel}
        </div>
    );
}
