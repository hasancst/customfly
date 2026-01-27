import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Fullscreen } from '@shopify/app-bridge/actions';
import { Toolbar } from '../components/Toolbar';
import { Canvas } from '../components/Canvas';
import { Summary } from '../components/Summary';
import { Header } from '../components/Header';
import { ContextualToolbar } from '../components/ContextualToolbar';
import { ImageCropModal } from '../components/ImageCropModal';
import { BaseImageModal } from '../components/BaseImageModal';
import { CanvasElement, ShopifyVariant, ShopifyOption, ShopifyProduct } from '../types';
import { evaluateVisibility } from '../utils/logicEvaluator';
import { useSearchParams, useParams } from 'react-router-dom';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { POPULAR_GOOGLE_FONTS } from '../constants/fonts';
import { toast } from 'sonner';
import { ChevronLeft, Pencil, X, Image as ImageIcon, UploadCloud, Crop, Palette } from 'lucide-react';
import { Button } from '../components/ui/button';

interface PageData {
  id: string;
  name: string;
  elements: CanvasElement[];
  baseImage?: string;
  baseImageProperties?: {
    x: number;
    y: number;
    scale: number;
    width?: number;
    height?: number;
    crop?: { x: number; y: number; width: number; height: number };
  };
  baseImageColor?: string;
  baseImageColorEnabled?: boolean;
  useVariantImage?: boolean;
}

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

  if (colors.length === 0 && /^#[0-9A-Fa-f]{3,6}$/.test(value.trim())) {
    colors.push({ name: 'Color', value: value.trim() });
  }

  return colors;
};

export default function App() {
  const [searchParams] = useSearchParams();
  const { productId: routeProductId } = useParams();

  const dataParam = searchParams.get('data');
  const parsedData = useMemo(() => {
    if (!dataParam) return null;
    try {
      return JSON.parse(dataParam);
    } catch (e) {
      console.error("Failed to parse data param", e);
      return null;
    }
  }, [dataParam]);

  const productId = routeProductId || searchParams.get('productId') || parsedData?.product_id;

  const [pages, setPages] = useState<PageData[]>([{ id: 'default', name: 'Side 1', elements: [] }]);
  const [activePageId, setActivePageId] = useState<string>('default');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [history, setHistory] = useState<PageData[][]>([[{ id: 'default', name: 'Side 1', elements: [] }]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [zoom, setZoom] = useState(50);

  const [showSafeArea, setShowSafeArea] = useState(true);
  const [safeAreaPadding, setSafeAreaPadding] = useState(10);
  const [safeAreaShape, setSafeAreaShape] = useState<'rectangle' | 'circle' | 'oval'>('rectangle');
  const [safeAreaOffset, setSafeAreaOffset] = useState({ x: 0, y: 0 });

  const [productData, setProductData] = useState<ShopifyProduct | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(parsedData?.variant_id || '');
  const [showRulers, setShowRulers] = useState(false);
  const [unit, setUnit] = useState<'cm' | 'mm' | 'inch'>('cm');
  const [paperSize, setPaperSize] = useState<string>('Custom');
  const [customPaperDimensions, setCustomPaperDimensions] = useState({ width: 264.5833, height: 264.5833 });

  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);
  const [designName, setDesignName] = useState('');
  const [savedDesigns, setSavedDesigns] = useState<any[]>([]);
  const [allDesigns, setAllDesigns] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [userFonts, setUserFonts] = useState<any[]>([]);
  const [userColors, setUserColors] = useState<any[]>([]);
  const [userOptions, setUserOptions] = useState<any[]>([]);
  const [selectedColorAssetId, setSelectedColorAssetId] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(true);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isBaseImageModalOpen, setIsBaseImageModalOpen] = useState(false);
  const [productVariant] = useState({ color: 'white', size: 'M', material: 'cotton' });
  const [enableBounce] = useState(false);

  const fetch = useAuthenticatedFetch();
  const shopifyApp = useAppBridge();

  // Fullscreen
  useEffect(() => {
    if (shopifyApp) {
      const fullscreen = Fullscreen.create(shopifyApp);
      fullscreen.dispatch(Fullscreen.Action.ENTER);
      return () => { fullscreen.dispatch(Fullscreen.Action.EXIT); };
    }
  }, [shopifyApp]);

  // Lock scroll
  useEffect(() => {
    if (productId) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [productId]);

  const addToHistory = useCallback((currentPages: PageData[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(currentPages)));
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
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

  const fetchDesigns = useCallback(async () => {
    if (!productId) return [];
    try {
      let productDesigns: any[] = [];
      const response = await fetch(`/imcst_api/design/product/${productId}`);
      if (response.ok) {
        productDesigns = await response.json();
        setSavedDesigns(productDesigns);
      }

      const allRes = await fetch('/imcst_api/design');
      if (allRes.ok) {
        const allDesignsData = await allRes.json();
        setAllDesigns(allDesignsData);
      }
      return productDesigns;
    } catch (error) {
      console.error('Failed to fetch designs:', error);
      return [];
    }
  }, [productId, fetch]);

  // Auto-load product data and most recent design
  const hasAutoLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (productId && hasAutoLoadedRef.current !== productId) {
      async function initializeProduct() {
        try {
          // Fetch product data
          const response = await fetch(`/imcst_api/products/${productId}`);
          if (response.ok) {
            const data = await response.json();
            setProductData(data);
            if (data.variants && data.variants.length > 0) {
              setSelectedVariantId(prev => prev || data.variants[0].id);
            }
          }

          // Fetch designs for this product
          const productDesignsResponse = await fetch(`/imcst_api/design/product/${productId}`);
          if (productDesignsResponse.ok) {
            const designs = await productDesignsResponse.json();
            setSavedDesigns(designs);

            // Auto-load the most recent design if it exists
            if (designs && designs.length > 0) {
              const mostRecent = designs[0]; // Already sorted by updatedAt desc
              console.log('Auto-loading most recent design:', mostRecent.name);

              const designJson = mostRecent.designJson;
              if (Array.isArray(designJson) && designJson.length > 0) {
                const normalizedPages = designJson[0]?.elements ? designJson : [{ id: 'default', name: 'Side 1', elements: designJson }];
                setPages(normalizedPages);
                setActivePageId(normalizedPages[0].id);
                setCurrentDesignId(mostRecent.id);
                setDesignName(mostRecent.name);
                setHistory([normalizedPages]);
                setHistoryIndex(0);
              }
            }
          }

          // Fetch all designs for templates
          const allRes = await fetch('/imcst_api/design');
          if (allRes.ok) {
            const allDesignsData = await allRes.json();
            setAllDesigns(allDesignsData);
          }

          // Mark this product as initialized
          hasAutoLoadedRef.current = productId;
        } catch (error) {
          console.error('Failed to initialize product:', error);
        }
      }
      initializeProduct();
    }
  }, [productId, fetch]);

  // Derived filters
  const filteredUserFonts = useMemo(() => userFonts.filter(a => !a.config?.productId || String(a.config.productId) === String(productId)), [userFonts, productId]);
  const filteredUserColors = useMemo(() => userColors.filter(a => !a.config?.productId || String(a.config.productId) === String(productId)), [userColors, productId]);
  const filteredUserOptions = useMemo(() => userOptions.filter(a => !a.config?.productId || String(a.config.productId) === String(productId)), [userOptions, productId]);

  const activePaletteColors = useMemo(() => {
    const asset = filteredUserColors.find(a => a.id === selectedColorAssetId);
    if (!asset) return [];
    return parseAssetColors(asset.value);
  }, [filteredUserColors, selectedColorAssetId]);

  const currentElements = useMemo(() => {
    const p = pages.find(p => p.id === activePageId);
    return p ? p.elements : (pages[0]?.elements || []);
  }, [pages, activePageId]);

  const processedElements = useMemo(() => {
    const opts: Record<string, string> = {};
    const variant = productData?.variants.find(v => v.id === selectedVariantId);
    if (variant && productData) productData.options.forEach((o, i) => { const v = (variant as any)[`option${i + 1}`]; if (v) opts[o.name] = v; });
    const vals: Record<string, string> = {};
    currentElements.forEach(e => { if (e.type === 'text') vals[e.id] = e.text || ''; });
    return currentElements.map(el => ({
      ...el,
      isHiddenByLogic: !evaluateVisibility(el, { variantId: selectedVariantId, options: opts, elementValues: vals })
    }));
  }, [currentElements, selectedVariantId, productData]);

  const setElements = useCallback((newElements: CanvasElement[] | ((prev: CanvasElement[]) => CanvasElement[])) => {
    setPages(prev => {
      const updated = prev.map(p => {
        if (p.id === activePageId) {
          return {
            ...p,
            elements: typeof newElements === 'function' ? newElements(p.elements) : newElements
          };
        }
        return p;
      });
      return updated;
    });
  }, [activePageId]);

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

  const addElement = useCallback((element: CanvasElement) => {
    let finalX = element.x;
    let finalY = element.y;
    if (element.opacity !== 0 && element.x > -500) {
      const mmToPx = 3.7795275591;
      const canvasWidth = customPaperDimensions.width * mmToPx;
      const canvasHeight = customPaperDimensions.height * mmToPx;
      finalX = (canvasWidth / 2) - ((element.width || 200) / 2);
      finalY = (canvasHeight / 2) - ((element.height || 100) / 2);
    }
    setPages(prev => {
      const updated = prev.map(p => {
        if (p.id === activePageId) {
          const nextZ = p.elements.length > 0 ? Math.max(...p.elements.map(e => e.zIndex)) + 1 : 1;
          return { ...p, elements: [...p.elements, { ...element, x: finalX, y: finalY, zIndex: nextZ }] };
        }
        return p;
      });
      addToHistory(updated);
      return updated;
    });
    setSelectedElement(element.id);
  }, [activePageId, addToHistory, customPaperDimensions]);

  const loadDesign = (design: any, mode: 'full' | 'base_only' | 'options_only' = 'full') => {
    if (mode === 'full') {
      setCurrentDesignId(design.id);
      setDesignName(design.name);
    }

    const designJson = design.designJson;
    if (!Array.isArray(designJson) || designJson.length === 0) return;

    const normalizedPages = designJson[0]?.elements ? designJson : [{ id: 'default', name: 'Side 1', elements: designJson }];

    if (mode === 'full') {
      setPages(normalizedPages);
      setActivePageId(normalizedPages[0].id);
      addToHistory(normalizedPages);
    } else if (mode === 'base_only') {
      setPages(prev => prev.map(p => p.id === activePageId ? {
        ...p,
        baseImage: normalizedPages[0].baseImage,
        baseImageProperties: normalizedPages[0].baseImageProperties,
        baseImageColor: normalizedPages[0].baseImageColor,
        baseImageColorEnabled: normalizedPages[0].baseImageColorEnabled,
        useVariantImage: normalizedPages[0].useVariantImage
      } : p));
    } else if (mode === 'options_only') {
      setPages(prev => prev.map(p => {
        if (p.id === activePageId) {
          const newElements = normalizedPages[0].elements.map((el: any) => ({
            ...el,
            id: `${el.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }));
          return { ...p, elements: [...p.elements, ...newElements] };
        }
        return p;
      }));
    }
    toast.success(`Applied ${mode.replace('_', ' ')} from ${design.name}`);
  };

  const saveDesign = useCallback(async (isTemplate = false) => {
    setIsSaving(true);
    let finalName = designName || (isTemplate ? `Template-${Date.now()}` : `Design-${savedDesigns.length + 1}`);

    try {
      const response = await fetch('/imcst_api/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: isTemplate ? null : currentDesignId,
          shopifyProductId: isTemplate ? null : productId,
          name: finalName,
          designJson: pages,
          isTemplate: !!isTemplate
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (!isTemplate) setCurrentDesignId(data.id);
        fetchDesigns();
        toast.success(isTemplate ? `Saved to Store Library as Template` : `Saved successfully`);
      }
    } catch (error) {
      toast.error('Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [productId, currentDesignId, designName, pages, fetch, savedDesigns, fetchDesigns]);

  const deleteDesign = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      const response = await fetch(`/imcst_api/design/${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success(`Deleted: ${name}`);
        if (id === currentDesignId) createNewDesign();
        fetchDesigns();
      }
    } catch (error) { toast.error('Delete failed'); }
  };

  const handleBaseImageSelect = (url: string, isVariantImage: boolean = false) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(900 / img.naturalWidth, 900 / img.naturalHeight, 1);
      setPages(prev => {
        const updated = prev.map(p => p.id === activePageId ? {
          ...p, baseImage: url, useVariantImage: isVariantImage,
          baseImageProperties: { x: 0, y: 0, scale, width: img.naturalWidth, height: img.naturalHeight }
        } : p);
        addToHistory(updated);
        return updated;
      });
    };
    img.src = url;
  };

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

  const createNewDesign = () => {
    const fresh = [{ id: 'default', name: 'Side 1', elements: [] }];
    setPages(fresh);
    setActivePageId('default');
    setCurrentDesignId(null);
    setDesignName('');
    setHistory([fresh]);
    setHistoryIndex(0);
  };

  const undo = () => { if (historyIndex > 0) { setPages(history[historyIndex - 1]); setHistoryIndex(historyIndex - 1); } };
  const redo = () => { if (historyIndex < history.length - 1) { setPages(history[historyIndex + 1]); setHistoryIndex(historyIndex + 1); } };

  const handleCropComplete = (croppedAreaPixels: { x: number, y: number, width: number, height: number }) => {
    const el = pages.find(p => p.id === activePageId)?.elements.find(e => e.id === selectedElement);
    if (el && el.type === 'image') {
      updateElement(el.id, { crop: croppedAreaPixels, width: el.width, height: el.width! / (croppedAreaPixels.width / croppedAreaPixels.height) });
    }
  };

  const handleSaveAsset = useCallback(async (asset: any) => {
    const res = await fetch(asset.id ? `/imcst_api/assets/${asset.id}` : '/imcst_api/assets', {
      method: asset.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asset)
    });
    if (res.ok) { fetchAssets(); return await res.json(); }
    return null;
  }, [fetch, fetchAssets]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if (isMod && e.key.toLowerCase() === 's') { e.preventDefault(); saveDesign(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveDesign]);

  if (!productId) return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><Palette className="w-12 h-12 text-gray-300 mx-auto mb-4" /><h2 className="text-xl font-bold">No Product</h2></div></div>;

  return (
    <div className="fixed inset-0 z-[99999] bg-gray-100 flex flex-col overflow-hidden">
      <Header
        onUndo={undo} onRedo={redo} canUndo={historyIndex > 0} canRedo={historyIndex < history.length - 1}
        title={productData?.title} onSave={saveDesign} designName={designName} onDesignNameChange={setDesignName}
        isSaving={isSaving} savedDesigns={savedDesigns} allDesigns={allDesigns} onLoadDesign={loadDesign} onDeleteDesign={deleteDesign}
        showSummary={showSummary} onToggleSummary={() => setShowSummary(!showSummary)} onClose={() => window.history.back()}
      />
      <div className="flex flex-1 overflow-hidden">
        <Toolbar
          onAddElement={addElement} selectedElement={currentElements.find(el => el.id === selectedElement)}
          onUpdateElement={updateElement} onDuplicateElement={duplicateElement} onCrop={() => setIsCropModalOpen(true)}
          elements={currentElements} productData={productData} userColors={filteredUserColors} userOptions={filteredUserOptions}
          onRefreshAssets={fetchAssets} onSaveAsset={handleSaveAsset} onSelectElement={setSelectedElement} canvasDimensions={customPaperDimensions}
        />
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <ContextualToolbar
            selectedElement={currentElements.find(el => el.id === selectedElement)} onUpdateElement={updateElement}
            onDeleteElement={deleteElement} onDuplicateElement={duplicateElement}
            userFonts={filteredUserFonts} userColors={filteredUserColors} onCrop={() => setIsCropModalOpen(true)}
          />
          <div className="h-10 bg-white border-b flex items-center px-4 gap-3 z-30 shrink-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Side: {pages.findIndex(p => p.id === activePageId) + 1}/{pages.length}</span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {pages.map(page => (
                <div key={page.id} className="group relative flex items-center">
                  <button onClick={() => setActivePageId(page.id)} className={`h-7 px-3 rounded-md text-[10px] font-bold border transition-all ${activePageId === page.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200'}`}>{page.name}</button>
                  <button onClick={(e) => { e.stopPropagation(); const n = prompt('Name:', page.name); if (n) renamePage(page.id, n); }} className="p-1 opacity-0 group-hover:opacity-100"><Pencil className="w-2.5 h-2.5" /></button>
                  {pages.length > 1 && <button onClick={(e) => { e.stopPropagation(); deletePage(page.id); }} className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full border text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500"><X className="w-2 h-2" /></button>}
                </div>
              ))}
              <button onClick={addPage} className="h-7 w-7 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-600"><UploadCloud className="w-3.5 h-3.5" /></button>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-gray-500 hover:text-indigo-600 gap-1.5" onClick={() => setIsBaseImageModalOpen(true)}>
                <ImageIcon className="w-3.5 h-3.5" />
                {pages.find(p => p.id === activePageId)?.baseImage ? 'Change Base' : 'Set Base Image'}
              </Button>
              {pages.find(p => p.id === activePageId)?.baseImage && (
                <Button variant="ghost" size="sm" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => { setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImage: undefined } : p)); }}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 relative overflow-hidden bg-gray-200">
            <Canvas
              elements={processedElements.filter(e => !e.isHiddenByLogic)}
              selectedElement={selectedElement}
              onSelectElement={setSelectedElement}
              onUpdateElement={updateElement}
              onDeleteElement={deleteElement}
              onDuplicateElement={duplicateElement}
              zoom={zoom}
              showSafeArea={showSafeArea}
              productVariant={productVariant}
              showRulers={showRulers}
              unit={unit}
              enableBounce={enableBounce}
              safeAreaPadding={safeAreaPadding}
              safeAreaShape={safeAreaShape}
              safeAreaOffset={safeAreaOffset}
              onUpdateSafeAreaOffset={(offset) => setSafeAreaOffset(offset)}
              baseImage={pages.find(p => p.id === activePageId)?.baseImage}
              baseImageProperties={pages.find(p => p.id === activePageId)?.baseImageProperties as any}
              baseImageColor={pages.find(p => p.id === activePageId)?.baseImageColor}
              paperSize={paperSize}
              customPaperDimensions={customPaperDimensions}
              onUpdateBaseImage={(props) => {
                setPages(prev => prev.map(p =>
                  p.id === activePageId ? { ...p, baseImageProperties: { ...p.baseImageProperties, ...props } as any } : p
                ));
              }}
            />
            {!showSummary && <Button variant="ghost" size="icon" onClick={() => setShowSummary(true)} className="absolute right-0 top-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-lg rounded-l-xl z-50"><ChevronLeft className="w-4 h-4" /></Button>}
          </div>
        </div>
        <div className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${showSummary ? 'w-80 opacity-100' : 'w-0 opacity-0'}`}>
          <Summary
            elements={processedElements as any} selectedElement={selectedElement} onSelectElement={setSelectedElement} onDeleteElement={deleteElement}
            zoom={zoom} onZoomChange={setZoom} showSafeArea={showSafeArea} onToggleSafeArea={setShowSafeArea} safeAreaPadding={safeAreaPadding} onSafeAreaPaddingChange={setSafeAreaPadding}
            safeAreaShape={safeAreaShape} onSafeAreaShapeChange={setSafeAreaShape} safeAreaOffset={safeAreaOffset} onResetSafeAreaOffset={() => setSafeAreaOffset({ x: 0, y: 0 })}
            onToggleRulers={() => setShowRulers(!showRulers)} showRulers={showRulers} unit={unit} onUnitChange={setUnit} paperSize={paperSize} onPaperSizeChange={setPaperSize}
            customPaperDimensions={customPaperDimensions} onCustomPaperDimensionsChange={setCustomPaperDimensions} onReset={() => { setElements([]); addToHistory(pages.map(p => p.id === activePageId ? { ...p, elements: [] } : p)); }}
            userColors={filteredUserColors} selectedColorAssetId={selectedColorAssetId} onSelectedColorAssetIdChange={setSelectedColorAssetId} onToggleSummary={() => setShowSummary(false)}
            baseImageColorEnabled={pages.find(p => p.id === activePageId)?.baseImageColorEnabled || false}
            onToggleBaseImageColor={(enabled) => setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageColorEnabled: enabled } : p))}
            shopifyOptions={productData?.options || []} shopifyVariants={productData?.variants || []} selectedVariantId={selectedVariantId} onVariantChange={setSelectedVariantId}
          />
        </div>
      </div>
      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        imageUrl={(currentElements.find(e => e.id === selectedElement) as any)?.url || (currentElements.find(e => e.id === selectedElement) as any)?.src || ''}
        onCropComplete={handleCropComplete}
        initialCrop={currentElements.find(e => e.id === selectedElement)?.crop}
      />
      <BaseImageModal
        isOpen={isBaseImageModalOpen}
        onClose={() => setIsBaseImageModalOpen(false)}
        productData={productData}
        selectedVariantId={selectedVariantId}
        onSelectImage={(url) => handleBaseImageSelect(url, productData?.variants.find(v => v.id === selectedVariantId)?.image === url)}
        currentBaseImage={pages.find(p => p.id === activePageId)?.baseImage}
      />
    </div>
  );
}
