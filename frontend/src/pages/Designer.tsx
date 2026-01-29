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
import { ChevronLeft, Pencil, X, Image as ImageIcon, UploadCloud, Palette } from 'lucide-react';
import { Button } from '../components/ui/button';
import { evaluateVisibility } from '../utils/logicEvaluator';

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
  baseImageAsMask?: boolean;
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
  const [safeAreaRadius, setSafeAreaRadius] = useState(0);
  const [safeAreaWidth, setSafeAreaWidth] = useState<number | undefined>(undefined);
  const [safeAreaHeight, setSafeAreaHeight] = useState<number | undefined>(undefined);
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
  const [customPaperDimensions, setCustomPaperDimensions] = useState({ width: 264.5833, height: 264.5833 }); // Exactly 1000px
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);

  const [designName, setDesignName] = useState('');
  const [savedDesigns, setSavedDesigns] = useState<any[]>([]);
  const [allDesigns, setAllDesigns] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [userFonts, setUserFonts] = useState<any[]>([]);
  const [userColors, setUserColors] = useState<any[]>([]);
  const [userOptions, setUserOptions] = useState<any[]>([]);
  const [variantBaseImages, setVariantBaseImages] = useState<Record<string, Record<string, { url: string, properties: any }>>>({});
  const [selectedColorAssetId, setSelectedColorAssetId] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(true);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isBaseImageModalOpen, setIsBaseImageModalOpen] = useState(false);
  const [productVariant] = useState({ color: 'white', size: 'M', material: 'cotton' });

  const [designerLayout, setDesignerLayout] = useState('redirect');
  const [buttonText, setButtonText] = useState('Design It');
  const [enableBounce] = useState(false);
  const [productOutputSettings, setProductOutputSettings] = useState<any>(null);

  // Autosave states
  const [lastSavedPagesJson, setLastSavedPagesJson] = useState<string>('');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

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
          let globalSettings: any = null;
          if (!config || config.error) {
            const globalConfigUrl = isPublicMode
              ? `/imcst_api/public/shop_config?shop=${shopDomain}`
              : `/imcst_api/shop_config`;
            const globalRes = await fetch(globalConfigUrl);
            const text = await globalRes.text();

            if (globalRes.ok) {
              try {
                if (text.trim().startsWith('<')) {
                  console.warn("[DEBUG] Global config returned HTML instead of JSON. Server or Proxy error likely.", text.substring(0, 100));
                } else {
                  globalSettings = JSON.parse(text);
                  config = { ...globalSettings, isGlobal: true };
                }
              } catch (parseErr) {
                console.error("[DEBUG] Error parsing global config JSON:", parseErr, "Body prefix:", text.substring(0, 100));
              }
            }
          }

          // Determine Effective Config
          const effectiveConfig = config?.config ? config.config : config;

          // Apply Config
          if (effectiveConfig) {
            const c = effectiveConfig;
            if (c.selectedColorAssetId) setSelectedColorAssetId(c.selectedColorAssetId);
            if (c.safeAreaPadding !== undefined) setSafeAreaPadding(c.safeAreaPadding);
            if (c.safeAreaRadius !== undefined) setSafeAreaRadius(c.safeAreaRadius);
            if (c.safeAreaWidth !== undefined) setSafeAreaWidth(c.safeAreaWidth);
            if (c.safeAreaHeight !== undefined) setSafeAreaHeight(c.safeAreaHeight);
            if (c.safeAreaOffset && typeof c.safeAreaOffset.x === 'number') setSafeAreaOffset(c.safeAreaOffset);
            if (c.paperSize) setPaperSize(c.paperSize);
            if (c.customPaperDimensions) setCustomPaperDimensions(c.customPaperDimensions);
            if (c.unit) setUnit(c.unit as any);
            if (c.showRulers !== undefined) setShowRulers(c.showRulers);
            if (c.showSafeArea !== undefined) setShowSafeArea(c.showSafeArea);
            if (c.designerLayout) setDesignerLayout(c.designerLayout);
            if (c.buttonText) setButtonText(c.buttonText);
            if (c.variantBaseImages) setVariantBaseImages(c.variantBaseImages);
            if (c.productOutputSettings) setProductOutputSettings(c.productOutputSettings);
          }

          // Fetch designs for this product
          const designsRes = await fetch(`/imcst_api/design/product/${productId}`);
          let designs: any[] = [];
          if (designsRes.ok) {
            designs = await designsRes.json();
            setSavedDesigns(designs);

            // Determine Initial Design (Target or Most Recent)
            let designToLoad = null;
            if (!isPublicMode && targetDesignId) {
              const specRes = await fetch(`/imcst_api/designs/${targetDesignId}`);
              if (specRes.ok) designToLoad = await specRes.json();
            }
            if (!designToLoad && designs.length > 0) designToLoad = designs[0];

            if (designToLoad) {
              const designJson = designToLoad.designJson;
              if (Array.isArray(designJson) && designJson.length > 0) {
                const normalizedPages = designJson[0]?.elements ? designJson : [{ id: 'default', name: 'Side 1', elements: designJson }];
                setPages(normalizedPages);
                setLastSavedPagesJson(JSON.stringify(normalizedPages));
                setActivePageId(normalizedPages[0].id);
                setCurrentDesignId(designToLoad.id);
                setDesignName(designToLoad.name);
                setHistory([normalizedPages]);
                setHistoryIndex(0);
                setLastSavedTime(new Date(designToLoad.updatedAt || designToLoad.createdAt));
              }
            } else if (globalSettings?.designJson && Array.isArray(globalSettings.designJson) && globalSettings.designJson.length > 0) {
              // Load Global Design as initial state (New Design)
              const gDesign = globalSettings.designJson;
              setPages(gDesign);
              setLastSavedPagesJson(JSON.stringify(gDesign));
              setActivePageId(gDesign[0].id);
              setCurrentDesignId(null);
              setDesignName(''); // Let user name it
              setHistory([gDesign]);
              setHistoryIndex(0);
            }
          }

          // Apply Base Image from Config (overrides design base image if set)
          if (effectiveConfig?.baseImage) {
            const c = effectiveConfig;
            setPages(prev => prev.map(p => ({
              ...p,
              baseImage: c.baseImage,
              baseImageAsMask: typeof c.baseImageAsMask === 'boolean' ? c.baseImageAsMask : p.baseImageAsMask,
              baseImageColor: c.baseImageColor || p.baseImageColor,
              baseImageProperties: c.baseImageProperties || p.baseImageProperties,
              baseImageColorEnabled: typeof c.baseImageColorEnabled === 'boolean' ? c.baseImageColorEnabled : p.baseImageColorEnabled
            })));
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
  }, [productId, fetch, isPublicMode, shopDomain, targetDesignId]);

  // Effect to switch base images when variant changes
  useEffect(() => {
    if (selectedVariantId && variantBaseImages[selectedVariantId]) {
      const variantConfig = variantBaseImages[selectedVariantId];
      setPages(prev => prev.map(p => {
        if (variantConfig[p.id]) {
          return {
            ...p,
            baseImage: variantConfig[p.id].url,
            baseImageProperties: variantConfig[p.id].properties
          };
        }
        return p;
      }));
    }
  }, [selectedVariantId, variantBaseImages]);

  // Derived filters
  const filteredUserFonts = useMemo(() => userFonts.filter(a => !a.config?.productId || String(a.config.productId) === String(productId)), [userFonts, productId]);
  const filteredUserColors = useMemo(() => userColors.filter(a => !a.config?.productId || String(a.config.productId) === String(productId)), [userColors, productId]);
  const filteredUserOptions = useMemo(() => userOptions.filter(a => !a.config?.productId || String(a.config.productId) === String(productId)), [userOptions, productId]);

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

  // Helper to get current canvas dimensions in pixels with ultra-strict NaN protection
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

    // Convert and force to number
    const w = Number(paper.width || 210) * mmToPx;
    const h = Number(paper.height || 297) * mmToPx;

    return {
      width: isNaN(w) ? 1000 : w,
      height: isNaN(h) ? 1000 : h
    };
  }, [paperSize, customPaperDimensions]);

  const addElement = useCallback((element: CanvasElement) => {
    const canvas = getCanvasPx();

    // Strict casting of element properties
    let finalX = Number(element.x);
    let finalY = Number(element.y);
    let finalOpacity = Number(element.opacity);

    // Protection for element dimensions
    const elW = Number(element.width) || 200;
    const elH = Number(element.height) || 50;

    // Detect if centering is needed (off-canvas, placeholder, NaN, or default (100,100))
    const isNeedsCentering = isNaN(finalX) || isNaN(finalY) || finalX < -500 || (finalX === 100 && finalY === 100) || finalOpacity === 0;

    if (isNeedsCentering) {
      finalX = (canvas.width / 2) - (elW / 2);
      finalY = (canvas.height / 2) - (elH / 2);
      finalOpacity = 100;
      console.log('Final Centering (Strict):', { id: element.id, x: finalX, y: finalY });
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

  const loadDesign = (design: any, mode: 'full' | 'base_only' | 'options_only' = 'full') => {
    if (mode === 'full') {
      setCurrentDesignId(design.id);
      setDesignName(design.name);
    }

    const designJson = typeof design.designJson === 'string' ? JSON.parse(design.designJson) : design.designJson;

    // Normalize pages accurately
    const pages = Array.isArray(designJson)
      ? designJson
      : (designJson.pages || [{ id: 'default', name: 'Side 1', elements: designJson.elements || [] }]);

    const firstPage = pages[0] || { elements: [] };

    if (mode === 'full') {
      setPages(pages);
      setActivePageId(pages[0].id);
      addToHistory(pages);
    } else if (mode === 'base_only') {
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

  const saveDesign = useCallback(async (isTemplate = false, isSilent = false) => {
    if (!isSilent) setIsSaving(true);
    else setIsAutoSaving(true);

    let finalName = designName || (isTemplate ? `Template-${Date.now()}` : `Design-${savedDesigns.length + 1}`);
    const currentPageJson = JSON.stringify(pages);

    try {
      const saveUrl = isPublicMode ? '/imcst_api/public/design' : '/imcst_api/design';
      let previewUrl = '';
      const canvasElement = document.getElementById('canvas-paper');
      if (canvasElement && !isSilent) { // Skip preview for silent auto-saves speed
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
        if (!isTemplate) {
          setCurrentDesignId(data.id);
          setLastSavedPagesJson(currentPageJson);
          setLastSavedTime(new Date());
        }
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

        if (!isSilent) toast.success(isTemplate ? `Saved to Store Library as Template` : `Saved successfully`);
        return data;
      }
    } catch (error) {
      if (!isSilent) toast.error('Save failed');
    } finally {
      setIsSaving(false);
      setIsAutoSaving(false);
    }
  }, [productId, currentDesignId, designName, pages, fetch, savedDesigns, fetchDesigns, isPublicMode, shopDomain, selectedVariantId]);

  // Autosave Interval
  useEffect(() => {
    const timer = setInterval(() => {
      const currentPagesJson = JSON.stringify(pages);
      // Only autosave if content changed AND we have a productId
      if (productId && currentPagesJson !== lastSavedPagesJson && !isSaving && !isAutoSaving && lastSavedPagesJson) {
        saveDesign(false, true);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(timer);
  }, [pages, lastSavedPagesJson, productId, saveDesign, isSaving, isAutoSaving]);

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

  const handleBaseImageSelect = (url: string, isVariantImage: boolean = false, applyToVariant: boolean = false) => {
    const img = new Image();
    img.onload = () => {
      const props = { x: 0, y: 0, scale: 1, width: img.naturalWidth, height: img.naturalHeight };

      if (applyToVariant && selectedVariantId) {
        const newVariantBaseImages = {
          ...variantBaseImages,
          [selectedVariantId]: {
            ...(variantBaseImages[selectedVariantId] || {}),
            [activePageId]: { url, properties: props }
          }
        };
        setVariantBaseImages(newVariantBaseImages);
        saveConfig({ variantBaseImages: newVariantBaseImages });

        setPages(prev => prev.map(p => p.id === activePageId ? {
          ...p,
          baseImage: url,
          baseImageProperties: props
        } : p));
        toast.success("Assigned to this variant");
      } else {
        setPages(prev => {
          const updated = prev.map(p => p.id === activePageId ? {
            ...p,
            baseImage: url,
            useVariantImage: isVariantImage,
            baseImageProperties: props,
            baseImageColor: p.baseImageColor,
            baseImageColorEnabled: p.baseImageColorEnabled
          } : p);
          addToHistory(updated);
          return updated;
        });
        saveConfig({ baseImage: url, baseImageProperties: props });
      }
    };
    img.src = url;
  };

  const handleSaveAsset = () => {
    // Placeholder if needed by ContextualToolbar
  };

  const currentPages = useMemo(() => {
    const found = (pages || []).find(p => p.id === activePageId);
    if (found) return found;
    return (pages && pages.length > 0) ? pages[0] : { id: 'default', name: 'Side 1', elements: [] };
  }, [pages, activePageId]);

  const currentElements = currentPages?.elements || [];
  const activeElement = useMemo(() => currentElements.find(e => e.id === selectedElement), [currentElements, selectedElement]);

  const processedElements = useMemo(() => currentElements, [currentElements]);

  const activeColorPalette = useMemo(() => {
    const asset = userColors.find(a => a.id === selectedColorAssetId);
    if (!asset) return [];
    return parseAssetColors(asset.value);
  }, [userColors, selectedColorAssetId]);

  return (
    <div className="fixed inset-0 z-[99999] bg-gray-100 flex flex-col overflow-hidden">
      <Header
        onUndo={undo} onRedo={redo} canUndo={historyIndex > 0} canRedo={historyIndex < history.length - 1}
        title={productData?.title} onSave={saveDesign} designName={designName} onDesignNameChange={setDesignName}
        isSaving={isSaving || isAutoSaving} lastSavedTime={lastSavedTime}
        productId={productId}
        isPublicMode={isPublicMode} buttonText={buttonText}
        savedDesigns={savedDesigns} allDesigns={allDesigns} onLoadDesign={loadDesign} onDeleteDesign={deleteDesign}
        showSummary={showSummary} onToggleSummary={() => setShowSummary(!showSummary)} onClose={() => window.history.back()}
      />
      <div className="flex flex-1 overflow-hidden">
        <Toolbar
          onAddElement={addElement} selectedElement={currentElements.find(el => el.id === selectedElement)}
          onUpdateElement={updateElement} onDeleteElement={deleteElement} onCrop={() => setIsCropModalOpen(true)}
          elements={currentElements} productData={productData} userColors={filteredUserColors} userOptions={filteredUserOptions}
          onRefreshAssets={fetchAssets} onSaveAsset={handleSaveAsset} onSelectElement={setSelectedElement} canvasDimensions={getCanvasPx()}
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
                productVariant={productVariant as any}
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
                onUpdateSafeAreaOffset={(offset) => { setSafeAreaOffset(offset); saveConfig({ safeAreaOffset: offset }); }}
                onUpdateSafeAreaWidth={(val) => { setSafeAreaWidth(val); saveConfig({ safeAreaWidth: val }); }}
                onUpdateSafeAreaHeight={(val) => { setSafeAreaHeight(val); saveConfig({ safeAreaHeight: val }); }}
                baseImage={pages.find(p => p.id === activePageId)?.baseImage}
                baseImageProperties={pages.find(p => p.id === activePageId)?.baseImageProperties as any}
                baseImageColor={pages.find(p => p.id === activePageId)?.baseImageColor}
                baseImageColorEnabled={pages.find(p => p.id === activePageId)?.baseImageColorEnabled}
                onUpdateBaseImage={(props) => {
                  setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageProperties: { ...p.baseImageProperties, ...props } as any } : p));
                  saveConfig({ baseImageProperties: { ...currentPages?.baseImageProperties, ...props } });
                }}
                baseImageAsMask={pages.find(p => p.id === activePageId)?.baseImageAsMask}
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
            zoom={zoom} onZoomChange={setZoom} showSafeArea={showSafeArea} onToggleSafeArea={() => { setShowSafeArea(!showSafeArea); saveConfig({ showSafeArea: !showSafeArea }); }}
            safeAreaPadding={safeAreaPadding} onSafeAreaPaddingChange={(val) => { setSafeAreaPadding(val); saveConfig({ safeAreaPadding: val }); }}
            safeAreaRadius={safeAreaRadius} onSafeAreaRadiusChange={(val) => { setSafeAreaRadius(val); saveConfig({ safeAreaRadius: val }); }}
            safeAreaOffset={safeAreaOffset} onResetSafeAreaOffset={() => { setSafeAreaOffset({ x: 0, y: 0 }); saveConfig({ safeAreaOffset: { x: 0, y: 0 } }); }}
            onToggleRulers={() => { setShowRulers(!showRulers); saveConfig({ showRulers: !showRulers }); }} showRulers={showRulers} unit={unit} onUnitChange={(val) => { setUnit(val); saveConfig({ unit: val }); }} paperSize={paperSize} onPaperSizeChange={(val) => { setPaperSize(val); saveConfig({ paperSize: val }); }}
            customPaperDimensions={customPaperDimensions} onCustomPaperDimensionsChange={(val) => { setCustomPaperDimensions(val); saveConfig({ customPaperDimensions: val }); }} onReset={() => { setPages(history[0] || [{ id: 'default', name: 'Side 1', elements: [] }]); }}
            userColors={filteredUserColors} selectedColorAssetId={selectedColorAssetId} onSelectedColorAssetIdChange={(val) => {
              setSelectedColorAssetId(val);
              saveConfig({ selectedColorAssetId: val });
            }} onToggleSummary={() => setShowSummary(false)}
            baseImageColorEnabled={pages.find(p => p.id === activePageId)?.baseImageColorEnabled || false}
            onBaseImageColorEnabledChange={(enabled) => {
              setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageColorEnabled: enabled } : p));
              saveConfig({ baseImageColorEnabled: enabled });
            }}
            baseImageColor={pages.find(p => p.id === activePageId)?.baseImageColor}
            onBaseImageColorChange={(color) => {
              setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageColor: color } : p));
              saveConfig({ baseImageColor: color });
            }}
            baseImageAsMask={pages.find(p => p.id === activePageId)?.baseImageAsMask || false}
            onToggleBaseImageAsMask={(enabled: boolean) => {
              setPages(prev => prev.map(p => p.id === activePageId ? { ...p, baseImageAsMask: enabled } : p));
              saveConfig({ baseImageAsMask: enabled });
            }}
            activePaletteColors={activeColorPalette}
            shopifyOptions={productData?.options || []} shopifyVariants={productData?.variants || []} selectedVariantId={selectedVariantId} onVariantChange={setSelectedVariantId}
            productOutputSettings={productOutputSettings}
            onProductOutputSettingsChange={(settings) => {
              setProductOutputSettings(settings);
              saveConfig({ productOutputSettings: settings });
            }}
            isPublicMode={isPublicMode}
            designerLayout={designerLayout} onDesignerLayoutChange={setDesignerLayout} buttonText={buttonText} onButtonTextChange={setButtonText}
          />
        </div>
      </div>

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
        onSelectImage={(url, isVar, applyVal) => handleBaseImageSelect(url, isVar, applyVal)}
        currentBaseImage={pages.find(p => p.id === activePageId)?.baseImage}
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
