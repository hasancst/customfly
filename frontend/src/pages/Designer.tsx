import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Fullscreen } from '@shopify/app-bridge/actions';
import { Toolbar } from '../components/Toolbar';
import { Canvas } from '../components/Canvas';
import { Summary } from '../components/Summary';
import { Header } from '../components/Header';
import { ContextualToolbar } from '../components/ContextualToolbar';
import { ImageCropModal } from '../components/ImageCropModal';
import { BaseImageModal } from '../components/BaseImageModal';
import { CanvasElement, ShopifyProduct } from '../types';
import { useSearchParams, useParams } from 'react-router-dom';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { toast } from 'sonner';
import { Pencil, X, Image as ImageIcon } from 'lucide-react';

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

  return colors;
};

// Internal Core Component
function DesignerCore({
  isPublicMode,
  shopDomain,
  productId,
  fetch,
  shopifyApp,
  parsedData,
  layout = 'full'
}: {
  isPublicMode: boolean,
  shopDomain: string | null,
  productId: string | undefined,
  fetch: any,
  shopifyApp: any,
  parsedData: any,
  layout?: 'full' | 'modal' | 'wizard'
}) {
  const [searchParams] = useSearchParams();
  const targetDesignId = searchParams.get('designId');

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

  // Listen for variant changes from parent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'IMCST_VARIANT_CHANGE') {
        const newVariantId = event.data.variantId;
        if (newVariantId && newVariantId !== selectedVariantId) {
          console.log('[IMCST] Variant changed via postMessage:', newVariantId);
          setSelectedVariantId(newVariantId);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedVariantId]);
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
  const [designerLayout, setDesignerLayout] = useState('redirect');
  const [buttonText, setButtonText] = useState('Design It');

  // Fullscreen (only for admin mode)
  useEffect(() => {
    if (shopifyApp && !isPublicMode) {
      const fullscreen = Fullscreen.create(shopifyApp);
      fullscreen.dispatch(Fullscreen.Action.ENTER);
      return () => { fullscreen.dispatch(Fullscreen.Action.EXIT); };
    }
  }, [shopifyApp, isPublicMode]);

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
      const baseUrl = isPublicMode ? `/imcst_api/public/assets?shop=${shopDomain}&type=` : '/imcst_api/assets?type=';
      const [fontsRes, colorsRes, optionsRes] = await Promise.all([
        fetch(`${baseUrl}font`),
        fetch(`${baseUrl}color`),
        fetch(`${baseUrl}option`)
      ]);
      if (fontsRes.ok) setUserFonts(await fontsRes.json());
      if (colorsRes.ok) setUserColors(await colorsRes.json());
      if (optionsRes.ok) setUserOptions(await optionsRes.json());
    } catch (err) {
      console.error("Failed to fetch assets:", err);
    }
  }, [fetch, isPublicMode, shopDomain]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const fetchDesigns = useCallback(async () => {
    if (!productId || isPublicMode) return [];
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
  }, [productId, fetch, isPublicMode]);

  // Auto-load product data and most recent design
  const hasAutoLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (productId && hasAutoLoadedRef.current !== productId) {
      async function initializeProduct() {
        try {
          // Fetch product data
          const productUrl = isPublicMode
            ? `/imcst_api/public/products/${productId}?shop=${shopDomain}`
            : `/imcst_api/products/${productId}`;

          const response = await fetch(productUrl);
          if (response.ok) {
            const data = await response.json();
            setProductData(data);
            if (data.variants && data.variants.length > 0) {
              setSelectedVariantId(prev => prev || data.variants[0].id);
            }
          }

          // Fetch config for base settings
          const configUrl = isPublicMode
            ? `/imcst_api/public/config/${productId}?shop=${shopDomain}`
            : `/imcst_api/config/${productId}`;

          const configRes = await fetch(configUrl);
          let config: any = null;
          if (configRes.ok) {
            config = await configRes.json();
          }

          // Fallback to global shop config if product config is missing/invalid
          if (!config || config.error) {
            const globalConfigUrl = isPublicMode
              ? `/imcst_api/public/shop_config?shop=${shopDomain}`
              : `/imcst_api/shop_config`;
            const globalRes = await fetch(globalConfigUrl);
            if (globalRes.ok) {
              const globalData = await globalRes.json();
              config = { ...globalData, isGlobal: true };
            }
          }

          // Fetch designs for this product (Admin only)
          if (!isPublicMode) {
            let initialDesign: any = null;
            if (targetDesignId) {
              const specRes = await fetch(`/imcst_api/designs/${targetDesignId}`);
              if (specRes.ok) initialDesign = await specRes.json();
            }

            const designsRes = await fetch(`/imcst_api/design/product/${productId}`);
            if (designsRes.ok) {
              const designs = await designsRes.json();
              setSavedDesigns(designs);

              const designToLoad = initialDesign || (designs && designs.length > 0 ? designs[0] : null);

              if (designToLoad) {
                const designJson = designToLoad.designJson;
                if (Array.isArray(designJson) && designJson.length > 0) {
                  const normalizedPages = designJson[0]?.elements ? designJson : [{ id: 'default', name: 'Side 1', elements: designJson }];
                  setPages(normalizedPages);
                  setActivePageId(normalizedPages[0].id);
                  setCurrentDesignId(designToLoad.id);
                  setDesignName(designToLoad.name);
                  setHistory([normalizedPages]);
                  setHistoryIndex(0);
                }
              }
            }
          }

          if (config) {
            if (config.selectedColorAssetId) setSelectedColorAssetId(config.selectedColorAssetId);
            if (config.safeAreaPadding !== undefined) setSafeAreaPadding(config.safeAreaPadding);
            if (config.safeAreaShape) setSafeAreaShape(config.safeAreaShape as any);
            if (config.safeAreaOffset) setSafeAreaOffset(config.safeAreaOffset);
            if (config.paperSize) setPaperSize(config.paperSize);
            if (config.customPaperDimensions) setCustomPaperDimensions(config.customPaperDimensions);
            if (config.unit) setUnit(config.unit as any);
            if (config.showRulers !== undefined) setShowRulers(config.showRulers);
            if (config.showSafeArea !== undefined) setShowSafeArea(config.showSafeArea);
            if (config.designerLayout) setDesignerLayout(config.designerLayout);
            if (config.buttonText) setButtonText(config.buttonText);

            // Always apply base image from config if it exists (even if design was loaded)
            if (config.baseImage) {
              setPages(prev => prev.map(p => ({
                ...p,
                baseImage: config.baseImage,
                baseImageColor: config.baseImageColor || p.baseImageColor,
                baseImageProperties: config.baseImageProperties || p.baseImageProperties,
                baseImageColorEnabled: typeof config.baseImageColorEnabled === 'boolean' ? config.baseImageColorEnabled : p.baseImageColorEnabled
              })));
            }
          }

          // Fetch all designs for templates (Admin only)
          if (!isPublicMode) {
            const allRes = await fetch('/imcst_api/design');
            if (allRes.ok) {
              const allDesignsData = await allRes.json();
              setAllDesigns(allDesignsData);
            }
          }

        } catch (error) {
          console.error('Failed to initialize product:', error);
        }
      }
      initializeProduct();
      hasAutoLoadedRef.current = productId;
    }
  }, [productId, fetch, isPublicMode, shopDomain]);

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
      const firstPage = normalizedPages[0];
      setPages(prev => prev.map(p => p.id === activePageId ? {
        ...p,
        baseImage: firstPage.baseImage,
        baseImageProperties: firstPage.baseImageProperties,
        baseImageColor: firstPage.baseImageColor,
        baseImageColorEnabled: firstPage.baseImageColorEnabled
      } : p));
    }
  };

  const addPage = () => {
    const newId = `page-${Date.now()}`;
    setPages(prev => {
      const updated = [...prev, { id: newId, name: `Side ${prev.length + 1}`, elements: [] }];
      addToHistory(updated);
      return updated;
    });
    setActivePageId(newId);
  };

  const deletePage = (id: string) => {
    if (pages.length === 1) return;
    setPages(prev => {
      const updated = prev.filter(p => p.id !== id);
      addToHistory(updated);
      return updated;
    });
    if (activePageId === id) setActivePageId(pages[0].id);
  };

  const renamePage = (id: string, name: string) => {
    setPages(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, name } : p);
      addToHistory(updated);
      return updated;
    });
  };

  const saveDesign = useCallback(async (isTemplate = false) => {
    setIsSaving(true);
    let finalName = designName || (isTemplate ? `Template-${Date.now()}` : `Design-${savedDesigns.length + 1}`);

    try {
      const saveUrl = isPublicMode ? '/imcst_api/public/design' : '/imcst_api/design';
      let previewUrl = '';
      const canvasElement = document.getElementById('canvas-paper');
      if (canvasElement) {
        try {
          const canvas = await html2canvas(canvasElement, {
            useCORS: true,
            scale: 2, // High quality
            backgroundColor: null,
            ignoreElements: (element) => {
              return element.classList.contains('imcst-preview-hide');
            }
          });
          previewUrl = canvas.toDataURL('image/png', 0.8);
        } catch (err) {
          console.error('Failed to capture canvas:', err);
        }
      }

      const response = await fetch(saveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: isPublicMode ? shopDomain : undefined,
          id: isTemplate ? null : currentDesignId,
          shopifyProductId: isTemplate ? null : productId,
          name: finalName,
          designJson: pages,
          isTemplate: !!isTemplate,
          previewUrl: previewUrl || undefined
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (!isTemplate) setCurrentDesignId(data.id);
        if (!isPublicMode) fetchDesigns();

        // If in public mode, notify the storefront SDK to add to cart
        if (isPublicMode) {
          window.parent.postMessage({
            type: 'IMCST_ADD_TO_CART',
            designId: data.id,
            previewUrl: previewUrl,
            productId: productId,
            variantId: selectedVariantId,
            designName: finalName
          }, '*');
        }

        toast.success(isTemplate ? `Saved to Store Library as Template` : `Saved successfully`);
        return data; // Return data for potential chaining
      }
    } catch (error) {
      toast.error('Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [productId, currentDesignId, designName, pages, fetch, savedDesigns, fetchDesigns, isPublicMode, shopDomain]);

  const saveConfig = useCallback(async (updates: any) => {
    if (isPublicMode) return; // Customer cannot save merchant config
    try {
      await fetch('/imcst_api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          ...updates
        }),
      });
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }, [productId, fetch, isPublicMode]);

  const deleteDesign = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      const response = await fetch(`/imcst_api/design/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchDesigns();
        toast.success('Design deleted');
      }
    } catch (error) {
      toast.error('Failed to delete design');
    }
  };

  const resetDesign = () => {
    if (confirm('Are you sure you want to reset the design? This will remove all elements.')) {
      const resetPages = pages.map(p => ({ ...p, elements: [] }));
      setPages(resetPages);
      setSelectedElement(null);
      addToHistory(resetPages);
    }
  };

  const currentPages = useMemo(() => pages.find(p => p.id === activePageId || pages[0]), [pages, activePageId]);
  const currentElements = currentPages?.elements || [];
  const activeElement = useMemo(() => currentElements.find(e => e.id === selectedElement), [currentElements, selectedElement]);

  const activeColorPalette = useMemo(() => {
    const asset = userColors.find(a => a.id === selectedColorAssetId);
    if (!asset) return [];
    return parseAssetColors(asset.value);
  }, [userColors, selectedColorAssetId]);

  return (
    <div className="flex h-screen w-full bg-[#f1f1f1] overflow-hidden select-none designer-view">
      <Toolbar
        onAddElement={addElement}
        onUpdateElement={updateElement}
        onDuplicateElement={duplicateElement}
        elements={currentElements}
        productData={productData}
        userColors={userColors}
        userOptions={userOptions}
        onRefreshAssets={fetchAssets}
        selectedElement={activeElement}
      />

      <div className="flex-1 flex flex-col relative min-w-0">
        {layout === 'full' && (
          <Header
            onUndo={undo}
            onRedo={redo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            title={productData?.title || 'Designer'}
            buttonText={buttonText}
            onSave={(isTemplate) => saveDesign(isTemplate)}
            isSaving={isSaving}
            designName={designName}
            onDesignNameChange={setDesignName}
            savedDesigns={savedDesigns}
            allDesigns={allDesigns}
            onLoadDesign={loadDesign}
            onDeleteDesign={deleteDesign}
            showSummary={showSummary}
            onToggleSummary={() => setShowSummary(!showSummary)}
            isPublicMode={isPublicMode}
          />
        )}

        <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-[#e5e5e5] pattern-bg">
          <ContextualToolbar
            selectedElement={activeElement}
            onUpdateElement={updateElement}
            onDeleteElement={deleteElement}
            onDuplicateElement={duplicateElement}
            userFonts={userFonts}
            userColors={userColors}
            onCrop={() => setIsCropModalOpen(true)}
            isPublicMode={isPublicMode}
          />

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
              productVariant={productVariant as any}
              showRulers={showRulers}
              unit={unit}
              enableBounce={false}
              paperSize={paperSize}
              customPaperDimensions={customPaperDimensions}
              safeAreaPadding={safeAreaPadding}
              safeAreaShape={safeAreaShape}
              safeAreaOffset={safeAreaOffset}
              onUpdateSafeAreaOffset={(offset) => { setSafeAreaOffset(offset); saveConfig({ safeAreaOffset: offset }); }}
              baseImage={currentPages?.baseImage}
              baseImageColor={currentPages?.baseImageColor}
              baseImageColorEnabled={currentPages?.baseImageColorEnabled}
              baseImageProperties={currentPages?.baseImageProperties || { x: 0, y: 0, scale: 1 }}
              onUpdateBaseImage={(props) => {
                setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageProperties: { ...p.baseImageProperties, ...props } as any } : p));
                saveConfig({ baseImageProperties: { ...currentPages?.baseImageProperties, ...props } });
              }}
            />
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-white/20 z-50">
            <button onClick={() => setZoom(Math.max(10, zoom - 10))} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><X className="w-4 h-4" /></button>
            <span className="text-sm font-medium w-12 text-center text-gray-700">{zoom}%</span>
            <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><Pencil className="w-4 h-4" /></button>
          </div>

          <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-50">
            <div className="flex flex-col gap-1">
              {pages.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-2 group">
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => renamePage(p.id, e.target.value)}
                    className={`text-[10px] bg-white/80 border-none rounded px-2 py-1 w-20 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 outline-none shadow-sm ${activePageId === p.id ? 'opacity-100' : ''}`}
                  />
                  <button
                    onClick={() => setActivePageId(p.id)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all bg-white shadow-lg border-2 overflow-hidden relative ${activePageId === p.id ? 'border-indigo-600 scale-110' : 'border-transparent hover:border-gray-300'}`}
                  >
                    {p.baseImage ? (
                      <img src={p.baseImage} className="w-full h-full object-contain" alt={p.name} />
                    ) : (
                      <span className="text-[10px] font-bold text-gray-500">{idx + 1}</span>
                    )}
                    {activePageId === p.id && (
                      <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                      </div>
                    )}
                  </button>
                  {pages.length > 1 && (
                    <button onClick={() => deletePage(p.id)} className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity -ml-6 -mt-8 z-10 shadow-sm"><X className="w-3 h-3" /></button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addPage} className="w-10 h-10 bg-white shadow-xl rounded-lg flex items-center justify-center text-indigo-600 hover:bg-gray-50 transition-all border border-gray-100"><ImageIcon className="w-5 h-5 font-bold" /></button>
          </div>
        </div>
      </div>

      {showSummary && (
        <Summary
          selectedElement={selectedElement}
          onSelectElement={setSelectedElement}
          onDeleteElement={deleteElement}
          zoom={zoom}
          onZoomChange={setZoom}
          onReset={resetDesign}
          variant={productVariant}
          elements={currentElements}
          showSafeArea={showSafeArea}
          onToggleSafeArea={() => { setShowSafeArea(!showSafeArea); saveConfig({ showSafeArea: !isPublicMode ? !showSafeArea : undefined }); }}
          safeAreaPadding={safeAreaPadding}
          onSafeAreaPaddingChange={(val) => { setSafeAreaPadding(val); saveConfig({ safeAreaPadding: val }); }}
          safeAreaShape={safeAreaShape}
          onSafeAreaShapeChange={(val) => { setSafeAreaShape(val); saveConfig({ safeAreaShape: val }); }}
          safeAreaOffset={safeAreaOffset}
          onResetSafeAreaOffset={() => { setSafeAreaOffset({ x: 0, y: 0 }); saveConfig({ safeAreaOffset: { x: 0, y: 0 } }); }}
          onToggleRulers={() => { setShowRulers(!showRulers); saveConfig({ showRulers: !showRulers }); }}
          showRulers={showRulers}
          unit={unit}
          onUnitChange={(val) => { setUnit(val); saveConfig({ unit: val }); }}
          paperSize={paperSize}
          onPaperSizeChange={(val) => { setPaperSize(val); saveConfig({ paperSize: val }); }}
          customPaperDimensions={customPaperDimensions}
          onCustomPaperDimensionsChange={(val) => { setCustomPaperDimensions(val); saveConfig({ customPaperDimensions: val }); }}
          onOpenCropModal={() => setIsCropModalOpen(true)}
          onOpenBaseImageModal={() => setIsBaseImageModalOpen(true)}
          onBaseImageColorEnabledChange={(val) => {
            setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageColorEnabled: val } : p));
            saveConfig({ baseImageColorEnabled: val });
          }}
          onBaseImageColorChange={(val) => {
            setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageColor: val } : p));
            saveConfig({ baseImageColor: val });
          }}
          baseImageColorEnabled={currentPages?.baseImageColorEnabled || false}
          baseImageColor={currentPages?.baseImageColor || '#ffffff'}
          colorPalette={activeColorPalette}
          onToggleSummary={() => setShowSummary(!showSummary)}
          designerLayout={designerLayout}
          onDesignerLayoutChange={(val) => { setDesignerLayout(val); saveConfig({ designerLayout: val }); }}
          buttonText={buttonText}
          onButtonTextChange={(val) => { setButtonText(val); saveConfig({ buttonText: val }); }}
          isPublicMode={isPublicMode}
        />
      )}

      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        imageUrl={currentPages?.baseImage || ''}
        onCropComplete={(crop) => {
          setPages(prev => prev.map(p => p.id === activePageId ? {
            ...p,
            baseImageProperties: { ...p.baseImageProperties, crop } as any
          } : p));
          saveConfig({ baseImageProperties: { ...currentPages?.baseImageProperties, crop } });
        }}
      />

      <BaseImageModal
        isOpen={isBaseImageModalOpen}
        onClose={() => setIsBaseImageModalOpen(false)}
        productData={productData}
        selectedVariantId={selectedVariantId}
        onSelectImage={(url: string, isVariantImage: boolean = false) => {
          const img = new Image();
          img.onload = () => {
            const scale = Math.min(900 / img.naturalWidth, 900 / img.naturalHeight, 1);
            const props = { x: 0, y: 0, scale, width: img.naturalWidth, height: img.naturalHeight };
            setPages(prev => {
              const updated = prev.map(p => p.id === activePageId ? {
                ...p,
                baseImage: url,
                useVariantImage: isVariantImage,
                baseImageProperties: props,
                baseImageColor: p.baseImageColor, // Preserve existing color
                baseImageColorEnabled: p.baseImageColorEnabled // Preserve existing color enabled state
              } : p);
              addToHistory(updated);
              return updated;
            });
            // Also save to merchant config for persistence
            saveConfig({ baseImage: url, baseImageProperties: props });
          };
          img.src = url;
        }}
        currentBaseImage={currentPages?.baseImage}
      />
    </div>
  );
}

// Separate components to handle hook calls safely
export function DesignerAdmin(props: any) {
  const authenticatedFetch = useAuthenticatedFetch();
  const shopifyApp = useAppBridge();
  return <DesignerCore {...props} fetch={authenticatedFetch} shopifyApp={shopifyApp} />;
}

export function DesignerPublic(props: any) {
  return <DesignerCore {...props} fetch={window.fetch.bind(window)} shopifyApp={null} />;
}

// MAIN EXPORT
export default function Designer() {
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

  // Detect if this is public/customer access (from storefront) or admin access
  const isPublicMode = parsedData?.mode === 'button' || !searchParams.get('host');
  const shopDomain = parsedData?.shop || searchParams.get('shop');
  const productId = routeProductId || searchParams.get('productId') || parsedData?.product_id;

  const props = {
    isPublicMode,
    shopDomain,
    productId: String(productId),
    parsedData
  };

  if (isPublicMode) {
    return <DesignerPublic {...props} />;
  }

  return <DesignerAdmin {...props} />;
}
