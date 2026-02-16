import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Fullscreen } from '@shopify/app-bridge/actions';
import { Toolbar } from '../components/Toolbar';
import { Canvas } from '../components/Canvas';
import { Summary } from '../components/Summary';
import { ContextualToolbar } from '../components/ContextualToolbar';
import { ImageCropModal } from '../components/ImageCropModal';
import { BaseImageModal } from '../components/BaseImageModal';
import { CanvasElement, PageData } from '../types';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { ChevronLeft, Image as ImageIcon, UploadCloud, Save, Copy, DollarSign } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Button } from '../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { PricingTab } from '../components/PricingTab';

const parseAssetColors = (value: string) => {
    if (!value) return [];
    const lines = value.split('\n').filter(Boolean);
    const colors: { name: string, value: string }[] = [];
    lines.forEach(line => {
        if (line.includes('|')) {
            const [name, val] = line.split('|');
            colors.push({ name: name.trim(), value: val.trim() });
        } else {
            colors.push({ name: line.trim(), value: line.trim() });
        }
    });
    return colors;
};

// Dummy product for global settings
const DUMMY_PRODUCT = {
    id: 'global_dummy',
    title: 'Global Default Settings',
    variants: [{ id: 'dummy_variant', title: 'Default Variant', price: '0.00', image: '/images/system-placeholder.png' }],
    options: [{ name: 'Size', position: 1, values: ['S', 'M', 'L'] }],
    images: ['/images/system-placeholder.png']
};

// Dummy Base Image (Placeholder)
const DUMMY_BASE_IMAGE = '/images/system-placeholder.png';

const DEFAULT_ELEMENTS: CanvasElement[] = [
    {
        id: 'default-text',
        type: 'text',
        text: 'Your Text Here',
        x: 300,
        y: 300,
        width: 200,
        height: 50,
        rotation: 0,
        opacity: 1,
        color: '#000000',
        fontFamily: 'Roboto',
        fontSize: 32,
        textAlign: 'center',
        zIndex: 1
    },
    {
        id: 'default-image',
        type: 'image',
        src: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png', // Placeholder icon
        x: 400,
        y: 400,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        zIndex: 2
    }
];

export default function GlobalSettingsDesigner() {
    const [pages, setPages] = useState<PageData[]>([{ id: 'default', name: 'Front', elements: DEFAULT_ELEMENTS, baseImage: DUMMY_BASE_IMAGE }]);
    const [activePageId, setActivePageId] = useState<string>('default');
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [zoom, setZoom] = useState(50);
    const [showSummary, setShowSummary] = useState(true);

    const [showSafeArea, setShowSafeArea] = useState(true);
    const [safeAreaPadding, setSafeAreaPadding] = useState(10);
    const [safeAreaRadius, setSafeAreaRadius] = useState(0);
    const [safeAreaWidth, setSafeAreaWidth] = useState<number | undefined>(undefined);
    const [safeAreaHeight, setSafeAreaHeight] = useState<number | undefined>(undefined);
    const [safeAreaOffset, setSafeAreaOffset] = useState({ x: 0, y: 0 });

    const [productData] = useState<any>(DUMMY_PRODUCT);
    const [selectedVariantId] = useState<string>('dummy_variant');
    const [showRulers, setShowRulers] = useState(false);
    const [unit, setUnit] = useState<'cm' | 'mm' | 'inch' | 'px'>('cm');
    const [paperSize, setPaperSize] = useState<string>('Custom');
    const [customPaperDimensions, setCustomPaperDimensions] = useState({ width: 264.5833, height: 264.5833 });

    const [isSaving, setIsSaving] = useState(false);

    const [userFonts, setUserFonts] = useState<any[]>([]);
    const [userColors, setUserColors] = useState<any[]>([]);
    const [userOptions, setUserOptions] = useState<any[]>([]);
    const [selectedColorAssetId, setSelectedColorAssetId] = useState<string | null>(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [isBaseImageModalOpen, setIsBaseImageModalOpen] = useState(false);
    const [productVariant] = useState({ color: 'white', size: 'M', material: 'cotton' });
    const [enableBounce] = useState(false);
    const [outputSettings, setOutputSettings] = useState<any>(null);
    const [buttonText, setButtonText] = useState('Design It');
    const [headerTitle, setHeaderTitle] = useState('Product Customizer');
    const [baseImageScale, setBaseImageScale] = useState(80);
    const [baseImageColorMode, setBaseImageColorMode] = useState<'opaque' | 'transparent'>('transparent');
    const [enabledDownload, setEnabledDownload] = useState(true);
    const [enabledReset, setEnabledReset] = useState(true);

    const fetch = useAuthenticatedFetch();
    const shopifyApp = useAppBridge();

    useEffect(() => {
        if (shopifyApp) {
            const fullscreen = Fullscreen.create(shopifyApp);
            fullscreen.dispatch(Fullscreen.Action.ENTER);
            return () => { fullscreen.dispatch(Fullscreen.Action.EXIT); };
        }
    }, [shopifyApp]);

    const addToHistory = useCallback(() => {
        setHistoryIndex((prev: number) => prev + 1);
    }, [historyIndex]);

    const fetchAssets = useCallback(async () => {
        try {
            const [fontsRes, colorsRes, optionsRes] = await Promise.all([
                fetch('/imcst_api/assets?type=font'),
                fetch('/imcst_api/assets?type=color'),
                fetch('/imcst_api/assets?type=option')
            ]);
            if (fontsRes.ok) setUserFonts(await fontsRes.json());
            if (colorsRes.ok) setUserColors(await colorsRes.json());
            if (optionsRes.ok) setUserOptions(await optionsRes.json());
        } catch (err) {
            console.error("Failed to fetch assets:", err);
        }
    }, [fetch]);

    useEffect(() => { fetchAssets(); }, [fetchAssets]);

    // Load Global Config
    useEffect(() => {
        const loadGlobalConfig = async () => {
            try {
                const res = await fetch('/imcst_api/global_design');
                const text = await res.text();

                if (res.ok) {
                    try {
                        if (text.trim().startsWith('<')) {
                            console.warn("[GlobalSettings] Server returned HTML. Session might be invalid or redirected.", text.substring(0, 100));
                            return;
                        }
                        const data = JSON.parse(text);

                        if (data && data.designJson) {
                            setPages(data.designJson);
                            setActivePageId(data.designJson[0].id);
                            setHistoryIndex(0);
                        }
                        if (data && data.config) {
                            const config = data.config;
                            if (config.safeAreaPadding !== undefined) setSafeAreaPadding(config.safeAreaPadding);
                            if (config.safeAreaRadius !== undefined) setSafeAreaRadius(config.safeAreaRadius);
                            if (config.safeAreaWidth !== undefined) setSafeAreaWidth(config.safeAreaWidth);
                            if (config.safeAreaHeight !== undefined) setSafeAreaHeight(config.safeAreaHeight);
                            if (config.safeAreaOffset) setSafeAreaOffset(config.safeAreaOffset);
                            if (config.paperSize) setPaperSize(config.paperSize);
                            if (config.customPaperDimensions) setCustomPaperDimensions(config.customPaperDimensions);
                            if (config.unit) setUnit(config.unit);
                            if (config.showRulers !== undefined) setShowRulers(config.showRulers);
                            if (config.showSafeArea !== undefined) setShowSafeArea(config.showSafeArea);
                            if (config.outputSettings) setOutputSettings(config.outputSettings);
                            if (config.selectedColorAssetId) setSelectedColorAssetId(config.selectedColorAssetId);
                            if (config.buttonText) setButtonText(config.buttonText);
                            if (config.headerTitle) setHeaderTitle(config.headerTitle);
                            if (config.baseImageScale !== undefined) setBaseImageScale(config.baseImageScale);
                            if (config.baseImageColorMode) setBaseImageColorMode(config.baseImageColorMode);
                            if (config.enabledDownload !== undefined) setEnabledDownload(config.enabledDownload);
                            if (config.enabledReset !== undefined) setEnabledReset(config.enabledReset);
                        }
                    } catch (parseErr) {
                        console.error("[GlobalSettings] JSON Parse Error:", parseErr);
                    }
                } else {
                    console.error("[GlobalSettings] Fetch failed:", res.status, text);
                }
            } catch (err) {
                console.error("Failed to load global config", err);
            }
        };
        loadGlobalConfig();
    }, [fetch]);

    const currentElements = useMemo(() => {
        const p = pages.find(p => p.id === activePageId);
        return p ? p.elements : (pages[0]?.elements || []);
    }, [pages, activePageId]);

    const activePaletteColors = useMemo(() => {
        const asset = userColors.find(a => a.id === selectedColorAssetId);
        if (!asset) return [];
        return parseAssetColors(asset.value);
    }, [userColors, selectedColorAssetId]);

    // Simplified Update Handlers (removed variants filtering logic since it's global)
    const processedElements = useMemo(() => {
        return currentElements.map(el => ({ ...el, isHiddenByLogic: false }));
    }, [currentElements]);

    const updateElement = useCallback((id: string, updates: Partial<CanvasElement>, skipHistory = false) => {
        setPages(prev => {
            const updated = prev.map(p => {
                if (p.id === activePageId) {
                    const newEls = p.elements.map(el => el.id === id ? { ...el, ...updates } : el);
                    return { ...p, elements: newEls };
                }
                return p;
            });
            if (!skipHistory) addToHistory();
            return updated;
        });
    }, [activePageId, addToHistory]);

    const deleteElement = useCallback((id: string) => {
        setPages(prev => {
            const updated = prev.map(p => {
                if (p.id === activePageId) return { ...p, elements: p.elements.filter(el => el.id !== id) };
                return p;
            });
            addToHistory();
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
                        const nextZ = Math.max(0, ...p.elements.map(e => e.zIndex)) + 1;
                        const newEl = { ...el, id: `${el.type}-${Date.now()}`, x: el.x + 20, y: el.y + 20, zIndex: nextZ };
                        return { ...p, elements: [...p.elements, newEl] };
                    }
                }
                return p;
            });
            addToHistory();
            return updated;
        });
    }, [activePageId, addToHistory]);

    const addElement = useCallback((element: CanvasElement) => {
        // Basic add logic (simplified from Designer.tsx)
        setPages(prev => {
            const updated = prev.map(p => {
                if (p.id === activePageId) {
                    const nextZ = Math.max(0, ...p.elements.map(e => e.zIndex)) + 1;
                    return { ...p, elements: [...p.elements, { ...element, zIndex: nextZ }] };
                }
                return p;
            });
            addToHistory();
            return updated;
        });
        setSelectedElement(element.id);
    }, [activePageId, addToHistory]);

    const saveGlobalConfig = useCallback(async (outputSettingsOverride?: any) => {
        setIsSaving(true);
        console.log("Saving Global Config...", { headerTitle, buttonText, outputSettingsOverride, outputSettings });

        try {
            const config = {
                safeAreaPadding, safeAreaRadius, safeAreaWidth, safeAreaHeight, safeAreaOffset,
                paperSize, customPaperDimensions, unit, showRulers, showSafeArea,
                outputSettings: outputSettingsOverride || outputSettings, selectedColorAssetId, buttonText, headerTitle,
                baseImageScale, baseImageColorMode, enabledDownload, enabledReset
            };

            const res = await fetch('/imcst_api/global_design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    designJson: pages,
                    config
                })
            });

            const data = await res.json();
            console.log("Save response:", data);

            if (res.ok) {
                toast.success('Global Settings Saved');
            } else {
                toast.error('Failed to save settings: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error("Save error:", err);
            toast.error('Error saving settings');
        } finally {
            setIsSaving(false);
        }
    }, [
        pages, safeAreaPadding, safeAreaRadius, safeAreaWidth, safeAreaHeight, safeAreaOffset,
        paperSize, customPaperDimensions, unit, showRulers, showSafeArea,
        outputSettings, selectedColorAssetId, buttonText, headerTitle, baseImageScale, baseImageColorMode, enabledDownload, enabledReset
    ]);

    const applyToAllProducts = async () => {
        if (!confirm('Are you sure you want to apply these settings to ALL products? This will overwrite their default configuration if they don\'t have specific overrides.')) return;
        setIsSaving(true);
        try {
            const res = await fetch('/imcst_api/global_design/apply_all', { method: 'POST' });
            if (res.ok) toast.success('Settings applied to all products!');
            else toast.error('Failed to apply settings');
        } catch (err) {
            console.error(err);
            toast.error('Error applying settings');
        } finally {
            setIsSaving(false);
        }
    };


    // Helper for canvas resize
    const getCanvasDimensions = () => {
        // Simplified sizing logic
        return { width: 1000, height: 1000 };
    };

    const handleBaseImageSelect = (url: string) => {
        console.log('[ADMIN DEBUG] Base Image Selected:', url);

        // If no URL provided, clear the base image
        if (!url || url === 'none') {
            setPages(prev => prev.map(p => p.id === activePageId ? {
                ...p,
                baseImage: '', // Use empty string instead of 'none'
                baseImageProperties: {
                    x: 0,
                    y: 0,
                    scale: 1,
                    width: 0,
                    height: 0
                }
            } : p));
            return;
        }

        // Load image to get dimensions
        const img = new Image();
        img.onload = () => {
            console.log('[ADMIN DEBUG] Image Loaded:', { url, width: img.naturalWidth, height: img.naturalHeight });
            setPages(prev => prev.map(p => p.id === activePageId ? {
                ...p,
                baseImage: url, // Save the actual URL
                baseImageProperties: {
                    x: 0,
                    y: 0,
                    scale: (baseImageScale || 80) / 100,
                    width: img.naturalWidth,
                    height: img.naturalHeight
                }
            } : p));
        };
        img.onerror = () => {
            console.error('[ADMIN DEBUG] Failed to load image:', url);
            toast.error('Failed to load image');
        };
        img.src = url;
    };

    const addPage = () => {
        const newId = `page-${Date.now()}`;
        setPages(prev => [...prev, { id: newId, name: `Side ${prev.length + 1}`, elements: [], baseImage: DUMMY_BASE_IMAGE }]);
        setActivePageId(newId);
    };

    return (
        <div className="fixed inset-0 z-[99999] bg-gray-100 flex flex-col overflow-hidden">
            <div className="h-14 bg-white border-b flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => window.history.back()}><ChevronLeft className="w-5 h-5" /> Back</Button>
                    <h1 className="text-lg font-bold">Global Product Settings</h1>
                </div>
                <div className="flex items-center gap-3">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-100">
                                <DollarSign className="w-4 h-4 mr-2" />
                                Pricing Config
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl">
                            <DialogHeader className="p-6 pb-0">
                                <DialogTitle className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                        <DollarSign className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    Global Pricing Configuration
                                </DialogTitle>
                            </DialogHeader>
                            <div className="p-6">
                                <PricingTab productId="global_settings_config" />
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" onClick={applyToAllProducts} disabled={isSaving}>
                        <Copy className="w-4 h-4 mr-2" />
                        Apply to All Products
                    </Button>
                    <Button onClick={() => saveGlobalConfig()} disabled={isSaving} className="bg-indigo-600 text-white hover:bg-indigo-700">
                        <Save className="w-4 h-4 mr-2" />
                        Save Settings
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="w-80 bg-white border-r border-gray-200 z-40 flex flex-col shrink-0">
                    <Toolbar
                        onAddElement={addElement} selectedElement={currentElements.find(el => el.id === selectedElement)}
                        onUpdateElement={updateElement} onDeleteElement={deleteElement} onCrop={() => setIsCropModalOpen(true)}
                        elements={currentElements} productData={productData} userColors={userColors} userOptions={userOptions}
                        onRefreshAssets={fetchAssets} onSaveAsset={async () => null} onSelectElement={setSelectedElement} canvasDimensions={getCanvasDimensions()}
                    />
                </div>
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <ContextualToolbar
                        selectedElement={currentElements.find(el => el.id === selectedElement)} onUpdateElement={updateElement}
                        onDeleteElement={deleteElement} onDuplicateElement={duplicateElement}
                        userFonts={userFonts} userColors={userColors} onCrop={() => setIsCropModalOpen(true)}
                    />

                    <div className="h-10 bg-white border-b flex items-center px-4 gap-3 z-30 shrink-0">
                        <span className="text-xs font-bold text-gray-500">SIDES:</span>
                        <div className="flex items-center gap-2">
                            {pages.map(p => (
                                <button key={p.id} onClick={() => setActivePageId(p.id)} className={`px-3 py-1 text-xs rounded border ${activePageId === p.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200'}`}>
                                    {p.name}
                                </button>
                            ))}
                            <button onClick={addPage} className="p-1 hover:bg-gray-100 rounded"><UploadCloud className="w-4 h-4 text-gray-400" /></button>
                        </div>
                        <div className="ml-auto">
                            <Button variant="ghost" size="sm" onClick={() => setIsBaseImageModalOpen(true)} className="text-xs">
                                <ImageIcon className="w-3 h-3 mr-1" /> Change Placeholder Image
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 relative overflow-hidden bg-gray-200">
                        <Canvas
                            elements={processedElements}
                            selectedElement={selectedElement}
                            onSelectElement={setSelectedElement}
                            onUpdateElement={updateElement}
                            onDeleteElement={deleteElement}
                            onDuplicateElement={duplicateElement}
                            zoom={zoom}
                            showSafeArea={showSafeArea}
                            productVariant={productVariant as any}
                            showRulers={showRulers}
                            unit={unit}
                            enableBounce={enableBounce}
                            safeAreaPadding={safeAreaPadding}
                            safeAreaRadius={safeAreaRadius}
                            safeAreaWidth={safeAreaWidth}
                            safeAreaHeight={safeAreaHeight}
                            safeAreaOffset={safeAreaOffset}
                            onUpdateSafeAreaOffset={(offset) => setSafeAreaOffset(offset)}
                            onUpdateSafeAreaWidth={(val) => setSafeAreaWidth(val)}
                            onUpdateSafeAreaHeight={(val) => setSafeAreaHeight(val)}
                            baseImage={pages.find(p => p.id === activePageId)?.baseImage}
                            baseImageProperties={pages.find(p => p.id === activePageId)?.baseImageProperties as any}
                            baseImageColor={pages.find(p => p.id === activePageId)?.baseImageColor}
                            baseImageColorEnabled={pages.find(p => p.id === activePageId)?.baseImageColorEnabled}
                            onUpdateBaseImage={(props) => {
                                setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageProperties: { ...(p.baseImageProperties || {}), ...props } as any } : p));
                            }}
                            paperSize={paperSize}
                            customPaperDimensions={customPaperDimensions}
                            baseImageAsMask={pages.find(p => p.id === activePageId)?.baseImageAsMask ?? false}
                            baseImageMaskInvert={pages.find(p => p.id === activePageId)?.baseImageMaskInvert ?? false}
                            baseImageColorMode={baseImageColorMode}
                            baseImageScale={pages.find(p => p.id === activePageId)?.baseImageScale ?? baseImageScale}
                        />
                    </div>
                </div>

                <div className={`transition-all duration-300 w-80 bg-white border-l z-40 flex flex-col ${showSummary ? 'translate-x-0' : 'translate-x-full w-0 border-l-0'}`}>
                    <Summary
                        showSummary={showSummary}
                        onToggleSummary={() => setShowSummary(!showSummary)}
                        elements={processedElements}
                        selectedElement={selectedElement}
                        onSelectElement={setSelectedElement}
                        onUpdateElement={updateElement}
                        onDeleteElement={deleteElement}
                        zoom={zoom}
                        onZoomChange={setZoom}
                        showSafeArea={showSafeArea}
                        onToggleSafeArea={() => setShowSafeArea(!showSafeArea)}
                        safeAreaPadding={safeAreaPadding}
                        onSafeAreaPaddingChange={setSafeAreaPadding}
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
                        onReset={() => setPages([{ id: 'default', name: 'Front', elements: DEFAULT_ELEMENTS, baseImage: DUMMY_BASE_IMAGE }])}
                        userColors={userColors}
                        selectedBaseColorAssetId={selectedColorAssetId}
                        onSelectedBaseColorAssetIdChange={setSelectedColorAssetId}
                        selectedElementColorAssetId={null}
                        onSelectedElementColorAssetIdChange={() => { }}
                        activeBasePaletteColors={activePaletteColors}
                        baseImageColorEnabled={pages.find(p => p.id === activePageId)?.baseImageColorEnabled ?? false}
                        onBaseImageColorEnabledChange={(v: boolean) => setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageColorEnabled: v } : p))}
                        baseImageColor={pages.find(p => p.id === activePageId)?.baseImageColor}
                        onBaseImageColorChange={(c) => setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageColor: c } : p))}
                        baseImageAsMask={pages.find(p => p.id === activePageId)?.baseImageAsMask ?? false}
                        onToggleBaseImageAsMask={(v) => setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageAsMask: v } : p))}
                        baseImageMaskInvert={pages.find(p => p.id === activePageId)?.baseImageMaskInvert ?? false}
                        onToggleBaseImageMaskInvert={(v) => setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageMaskInvert: v } : p))}
                        baseImageScale={pages.find(p => p.id === activePageId)?.baseImageScale ?? baseImageScale}
                        onBaseImageScaleChange={(sc) => {
                            setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageScale: sc } : p));
                            setBaseImageScale(sc);
                        }}
                        baseImageColorMode={baseImageColorMode}
                        onBaseImageColorModeChange={setBaseImageColorMode}
                        outputSettings={outputSettings}
                        onProductOutputSettingsChange={setOutputSettings}
                        buttonText={buttonText}
                        onButtonTextChange={setButtonText}
                        headerTitle={headerTitle}
                        onHeaderTitleChange={setHeaderTitle}
                        enabledDownload={enabledDownload}
                        onToggleEnabledDownload={() => setEnabledDownload(prev => !prev)}
                        enabledReset={enabledReset}
                        onToggleEnabledReset={() => setEnabledReset(prev => !prev)}
                        isGlobalSettings={true}
                        onSave={(_, settings) => saveGlobalConfig(settings)}
                        baseImage={pages.find(p => p.id === activePageId)?.baseImage}
                        onRemoveBaseImage={() => handleBaseImageSelect('none')}
                        onOpenBaseImageModal={() => setIsBaseImageModalOpen(true)}
                    />
                </div>
            </div>

            <Toaster richColors closeButton />

            <ImageCropModal
                isOpen={isCropModalOpen}
                onClose={() => setIsCropModalOpen(false)}
                imageUrl={pages.find(p => p.id === activePageId)?.elements.find(e => e.id === selectedElement)?.src || ''}
                onCropComplete={() => { }}
            />

            <BaseImageModal
                isOpen={isBaseImageModalOpen}
                onClose={() => setIsBaseImageModalOpen(false)}
                onSelectImage={(url) => handleBaseImageSelect(url)}
                productData={productData}
                selectedVariantId={selectedVariantId}
                currentBaseImage={pages.find(p => p.id === activePageId)?.baseImage}
            />
        </div>
    );
}
