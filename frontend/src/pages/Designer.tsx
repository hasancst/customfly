import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Toolbar } from '../components/Toolbar';
import { Canvas } from '../components/Canvas';
import { Summary } from '../components/Summary';
import { Header } from '../components/Header';
import { ContextualToolbar } from '../components/ContextualToolbar';
import { ImageCropModal } from '../components/ImageCropModal';
import { CanvasElement } from '../types';
import { useSearchParams, useParams } from 'react-router-dom';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { POPULAR_GOOGLE_FONTS } from '../constants/fonts';
import { toast } from 'sonner';
import { ChevronLeft, Pencil, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';

interface ShopifyVariant {
  id: string;
  title: string;
  price: string;
  sku?: string;
}

interface ShopifyProduct {
  id: string;
  title: string;
  variants: ShopifyVariant[];
}

interface PageData {
  id: string;
  name: string;
  elements: CanvasElement[];
}

export default function App() {
  // console.log("Designer component initializing...");
  const [searchParams] = useSearchParams();
  const { productId: routeProductId } = useParams();
  const productId = routeProductId || searchParams.get('productId');
  const [pages, setPages] = useState<PageData[]>([{ id: 'default', name: 'Side 1', elements: [] }]);
  const [activePageId, setActivePageId] = useState<string>('default');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [history, setHistory] = useState<PageData[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(100);
  const [showSafeArea, setShowSafeArea] = useState(true);
  const [safeAreaPadding, setSafeAreaPadding] = useState(10);
  const [safeAreaShape, setSafeAreaShape] = useState<'rectangle' | 'circle' | 'oval'>('rectangle');
  const [safeAreaOffset, setSafeAreaOffset] = useState({ x: 0, y: 0 });
  const [productData, setProductData] = useState<ShopifyProduct | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [productVariant] = useState({
    color: 'white',
    size: 'M',
    material: 'cotton'
  });
  const [showRulers, setShowRulers] = useState(false);
  const [unit, setUnit] = useState<'cm' | 'mm' | 'inch'>('cm');
  const [paperSize, setPaperSize] = useState<string>('A4');
  const [customPaperDimensions, setCustomPaperDimensions] = useState({ width: 210, height: 297 });
  const [enableBounce] = useState(false);
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);
  const [designName, setDesignName] = useState('');
  const [savedDesigns, setSavedDesigns] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [userFonts, setUserFonts] = useState<any[]>([]);
  const [userColors, setUserColors] = useState<any[]>([]);
  const [showSummary, setShowSummary] = useState(true);
  const [renamingPage, setRenamingPage] = useState<{ id: string, name: string } | null>(null);
  const [newPageName, setNewPageName] = useState('');
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const fetch = useAuthenticatedFetch();
  const hasFetchedProduct = useRef(false);

  // Helper to get active page and sync elements
  const elements = useMemo(() => {
    const activePageIndex = pages.findIndex(p => p.id === activePageId);
    const activePage = pages[activePageIndex] || pages[0];
    return activePage.elements;
  }, [pages, activePageId]);

  const setElements = (newElements: CanvasElement[] | ((prev: CanvasElement[]) => CanvasElement[])) => {
    setPages(prev => {
      const updated = prev.map(p => {
        if (p.id === activePageId || (activePageId === 'default' && prev.length === 1)) {
          return {
            ...p,
            elements: typeof newElements === 'function' ? newElements(p.elements) : newElements
          };
        }
        return p;
      });
      return updated;
    });
  };

  useEffect(() => {
    async function fetchAssets() {
      try {
        const [fontsRes, colorsRes] = await Promise.all([
          fetch('/imcst_api/assets?type=font'),
          fetch('/imcst_api/assets?type=color')
        ]);
        if (fontsRes.ok) setUserFonts(await fontsRes.json());
        if (colorsRes.ok) setUserColors(await colorsRes.json());
      } catch (err) {
        console.error("Failed to fetch assets in Designer:", err);
      }
    }
    fetchAssets();
  }, [fetch]);

  // Handle Dynamic Font Loading (Google & Custom)
  useEffect(() => {
    if (userFonts.length > 0) {
      // 1. Prepare Google Fonts
      const googleFontsToLoad = new Set<string>();
      userFonts.forEach(font => {
        if (font.config?.fontType === 'google') {
          if (font.config?.googleConfig === 'specific' && font.config?.specificFonts) {
            const names = font.config.specificFonts.split(/[,\n]/).map((n: string) => n.trim()).filter(Boolean);
            names.forEach((n: string) => googleFontsToLoad.add(n));
          } else if (font.config?.googleConfig === 'all') {
            POPULAR_GOOGLE_FONTS.forEach(n => googleFontsToLoad.add(n));
          }
        }
      });

      if (googleFontsToLoad.size > 0) {
        const linkId = 'google-fonts-loader';
        let link = document.getElementById(linkId) as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          document.head.appendChild(link);
        }
        const families = Array.from(googleFontsToLoad).map(f => f.replace(/ /g, '+')).join('|');
        link.href = `https://fonts.googleapis.com/css?family=${families}&display=swap`;
      }

      // 2. Prepare Custom Fonts (@font-face)
      const styleId = 'custom-fonts-loader';
      let style = document.getElementById(styleId) as HTMLStyleElement;
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
      }

      let css = '';
      userFonts.forEach(font => {
        if (font.config?.fontType === 'custom' && font.value) {
          css += `
            @font-face {
              font-family: "${font.name}";
              src: url("${font.value}");
              font-display: swap;
            }
          `;
        }
      });
      style.textContent = css;
    }
  }, [userFonts]);

  // Responsive Zoom: Default to 50%
  useEffect(() => {
    setZoom(50);
  }, []);

  // Fetch product data
  useEffect(() => {
    if (!productId || hasFetchedProduct.current) return;
    hasFetchedProduct.current = true;

    async function fetchProductData() {
      try {
        const response = await fetch(`/imcst_api/products/${productId}`);
        if (response.ok) {
          const data = await response.json();
          setProductData(data);
          if (data.variants && data.variants.length > 0) {
            setSelectedVariantId(data.variants[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch product data:', error);
      }
    }

    fetchProductData();
  }, [productId]);

  const fetchDesigns = useCallback(async () => {
    if (!productId) return;
    try {
      const response = await fetch(`/imcst_api/design/product/${productId}`);
      if (response.ok) {
        const designs = await response.json();
        setSavedDesigns(designs);

        if (!currentDesignId && designs.length > 0) {
          const latest = designs[0];
          setCurrentDesignId(latest.id);
          setDesignName(latest.name);

          if (Array.isArray(latest.designJson) && latest.designJson.length > 0 && !latest.designJson[0].elements) {
            const mig = [{ id: 'default', name: 'Side 1', elements: latest.designJson }];
            setPages(mig);
            addToHistory(mig);
          } else {
            setPages(latest.designJson);
            setActivePageId(latest.designJson[0].id);
            addToHistory(latest.designJson);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch designs:', error);
    }
  }, [productId, currentDesignId, fetch]);

  useEffect(() => {
    fetchDesigns();
  }, [productId]);

  const loadDesign = (design: any) => {
    setCurrentDesignId(design.id);
    setDesignName(design.name);
    if (Array.isArray(design.designJson) && design.designJson.length > 0 && !design.designJson[0].elements) {
      const mig = [{ id: 'default', name: 'Side 1', elements: design.designJson }];
      setPages(mig);
      setActivePageId('default');
      addToHistory(mig);
    } else {
      setPages(design.designJson);
      setActivePageId(design.designJson[0].id);
      addToHistory(design.designJson);
    }
    toast.success(`Loaded design: ${design.name}`);
  };

  const saveDesign = useCallback(async (nameOverride?: string) => {
    setIsSaving(true);
    let finalName = nameOverride || designName;
    if (!finalName || finalName === 'Untitled Design') {
      finalName = `design-${savedDesigns.length + 1}`;
      setDesignName(finalName);
    }

    try {
      const response = await fetch('/imcst_api/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentDesignId,
          shopifyProductId: productId,
          name: finalName,
          designJson: pages, // Save full pages array
          previewUrl: '',
        }),
      });
      const data = await response.json();
      if (!currentDesignId) setCurrentDesignId(data.id);

      const listRes = await fetch(`/imcst_api/design/product/${productId}`);
      if (listRes.ok) setSavedDesigns(await listRes.json());
    } catch (error) {
      console.error('Failed to save design:', error);
      toast.error('Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [productId, currentDesignId, designName, pages, fetch, savedDesigns]);

  const deleteDesign = async (id: string, name: string) => {
    try {
      const response = await fetch(`/imcst_api/design/${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success(`Deleted: ${name}`);
        if (id === currentDesignId) createNewDesign();
        await fetchDesigns();
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (isMod && !isInput) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo(); else undo();
          return;
        }
        if (e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
        if (e.key.toLowerCase() === 's') { e.preventDefault(); saveDesign(); return; }
      }

      if (!isInput) {
        if (e.key === '+' || e.key === '=') { setZoom(prev => Math.min(200, prev + 10)); return; }
        if (e.key === '-' || e.key === '_') { setZoom(prev => Math.max(50, prev - 10)); return; }
        if (e.key === '0') { setZoom(100); return; }
      }

      if (!selectedElement || isInput) return;
      const element = elements.find(el => el.id === selectedElement);
      if (!element) return;
      const step = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); updateElement(selectedElement, { y: element.y - step }); break;
        case 'ArrowDown': e.preventDefault(); updateElement(selectedElement, { y: element.y + step }); break;
        case 'ArrowLeft': e.preventDefault(); updateElement(selectedElement, { x: element.x - step }); break;
        case 'ArrowRight': e.preventDefault(); updateElement(selectedElement, { x: element.x + step }); break;
        case 'Delete': case 'Backspace': e.preventDefault(); deleteElement(selectedElement); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, elements, historyIndex, history, zoom]);

  const addToHistory = (currentPages: PageData[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(currentPages)));
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const addElement = (element: CanvasElement) => {
    const nextZ = elements.length > 0 ? Math.max(...elements.map(e => e.zIndex)) + 1 : 1;
    const newElement = { ...element, zIndex: nextZ };
    const newElements = [...elements, newElement];

    const updatedPages = pages.map(p =>
      p.id === activePageId ? { ...p, elements: newElements } : p
    );

    setPages(updatedPages);
    setSelectedElement(element.id);
    addToHistory(updatedPages);
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>, skipHistory = false) => {
    const newEls = elements.map(el => el.id === id ? { ...el, ...updates } : el);

    const updatedPages = pages.map(p =>
      p.id === activePageId ? { ...p, elements: newEls } : p
    );

    setPages(updatedPages);
    if (!skipHistory) {
      addToHistory(updatedPages);
    }
  };

  const deleteElement = useCallback((id: string) => {
    const newEls = elements.filter(el => el.id !== id);
    setElements(newEls);
    setSelectedElement(null);
    const updatedPages = pages.map(p => p.id === activePageId ? { ...p, elements: newEls } : p);
    addToHistory(updatedPages);
  }, [elements, pages, activePageId]);

  const duplicateElement = (id: string) => {
    const element = elements.find(el => el.id === id);
    if (element) {
      const nextZ = elements.length > 0 ? Math.max(...elements.map(e => e.zIndex)) + 1 : 1;
      const newEl = { ...element, id: `${element.type}-${Date.now()}`, x: element.x + 20, y: element.y + 20, zIndex: nextZ };
      const newEls = [...elements, newEl];
      setElements(newEls);
      setSelectedElement(newEl.id);
      const updatedPages = pages.map(p => p.id === activePageId ? { ...p, elements: newEls } : p);
      addToHistory(updatedPages);
    }
  };

  const addPage = () => {
    if (pages.length >= 20) { toast.error('Limit of 20 sides reached'); return; }
    const newId = `page-${Date.now()}`;
    const newPages = [...pages, { id: newId, name: `Side ${pages.length + 1}`, elements: [] }];
    setPages(newPages);
    setActivePageId(newId);
    setSelectedElement(null);
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
    const newPages = pages.map(p => p.id === id ? { ...p, name } : p);
    setPages(newPages);
    addToHistory(newPages);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const p = history[historyIndex - 1];
      setPages(p);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const p = history[historyIndex + 1];
      setPages(p);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const resetCanvas = () => {
    setElements([]);
    setSelectedElement(null);
    const updatedPages = pages.map(p => p.id === activePageId ? { ...p, elements: [] } : p);
    addToHistory(updatedPages);
  };

  const createNewDesign = () => {
    if (confirm('Start a new design?')) {
      const newPages = [{ id: 'default', name: 'Side 1', elements: [] }];
      setPages(newPages);
      setActivePageId('default');
      setSelectedElement(null);
      setHistory([]);
      setHistoryIndex(-1);
      setCurrentDesignId(null);
      setDesignName('');
      toast.success('Started new design');
    }
  };

  const startRenaming = (page: PageData) => {
    setRenamingPage({ id: page.id, name: page.name });
    setNewPageName(page.name);
  };

  const handleRenameSubmit = () => {
    if (renamingPage && newPageName.trim()) {
      renamePage(renamingPage.id, newPageName.trim());
      setRenamingPage(null);
    }
  };
  const handleCropComplete = (croppedAreaPixels: { x: number, y: number, width: number, height: number }) => {
    const el = elements.find(e => e.id === selectedElement);
    if (el && el.type === 'image') {
      updateElement(el.id, {
        crop: croppedAreaPixels,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <Header
        onUndo={undo}
        onRedo={redo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        title={productData?.title}
        onSave={() => saveDesign()}
        designName={designName}
        onDesignNameChange={setDesignName}
        isSaving={isSaving}
        savedDesigns={savedDesigns}
        onLoadDesign={loadDesign}
        onDeleteDesign={deleteDesign}
        onNewDesign={createNewDesign}
        showSummary={showSummary}
        onToggleSummary={() => setShowSummary(!showSummary)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Toolbar
          onAddElement={addElement}
          selectedElement={elements.find(el => el.id === selectedElement)}
          onUpdateElement={updateElement}
          onCrop={() => setIsCropModalOpen(true)}
        />

        <div className="flex-1 flex flex-col relative bg-gray-100 overflow-hidden">
          <ContextualToolbar
            selectedElement={elements.find(el => el.id === selectedElement)}
            onUpdateElement={updateElement}
            onDeleteElement={deleteElement}
            onDuplicateElement={duplicateElement}
            userFonts={userFonts}
            userColors={userColors}
            onCrop={() => setIsCropModalOpen(true)}
          />

          {/* Page Navigation at the top of canvas area */}
          <div className="h-10 bg-white border-b border-gray-200 flex items-center px-4 gap-3 z-30 shrink-0">
            <div className="flex items-center gap-1.5 py-1 px-2.5 bg-gray-50 rounded-md border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Side:</span>
              <span className="text-xs font-bold text-indigo-600">{pages.findIndex(p => p.id === activePageId) + 1}/{pages.length}</span>
            </div>

            <div className="w-px h-5 bg-gray-200" />

            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full scrollbar-hide py-1">
              {pages.map((page) => (
                <div key={page.id} className="group/page relative flex items-center">
                  <button
                    onClick={() => setActivePageId(page.id)}
                    className={`h-7 px-3 rounded-md text-[10px] font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${activePageId === page.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    {page.name}
                    <div
                      onClick={(e) => { e.stopPropagation(); startRenaming(page); }}
                      className="p-1 hover:bg-black/10 rounded transition-colors cursor-pointer"
                    >
                      <Pencil className="w-2.5 h-2.5 opacity-60 group-hover/page:opacity-100 transition-opacity text-current" />
                    </div>
                  </button>
                  {pages.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePage(page.id); }}
                      className={`absolute -top-1 -right-1 w-3.5 h-3.5 bg-white text-gray-400 border border-gray-200 rounded-full flex items-center justify-center opacity-0 group-hover/page:opacity-100 transition-opacity hover:bg-red-500 hover:text-white hover:border-red-500 z-10 shadow-sm`}
                    >
                      <X className="w-2 h-2" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addPage}
                disabled={pages.length >= 20}
                className="h-7 w-7 flex items-center justify-center bg-white border border-dashed border-gray-300 text-gray-400 rounded-md hover:border-indigo-500 hover:text-indigo-600 transition-all shrink-0"
                title="Add Side"
              >
                <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden group">
            <Canvas
              elements={elements}
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
              paperSize={paperSize}
              customPaperDimensions={customPaperDimensions}
              safeAreaPadding={safeAreaPadding}
              safeAreaShape={safeAreaShape}
              safeAreaOffset={safeAreaOffset}
              onUpdateSafeAreaOffset={setSafeAreaOffset}
            />

            {!showSummary && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSummary(true)}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-50 h-10 w-6 rounded-l-xl rounded-r-none bg-white border border-r-0 border-gray-200 shadow-lg hover:bg-gray-50 text-indigo-600 animate-in slide-in-from-right duration-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className={`transition-all duration-500 ease-in-out overflow-hidden flex shrink-0 ${showSummary ? 'w-80 opacity-100' : 'w-0 opacity-0'}`}>
          <div className="w-80 h-full">
            <Summary
              elements={elements}
              selectedElement={selectedElement}
              onSelectElement={setSelectedElement}
              onDeleteElement={deleteElement}
              zoom={zoom}
              onZoomChange={setZoom}
              showSafeArea={showSafeArea}
              onToggleSafeArea={setShowSafeArea}
              safeAreaPadding={safeAreaPadding}
              onSafeAreaPaddingChange={setSafeAreaPadding}
              safeAreaShape={safeAreaShape}
              onSafeAreaShapeChange={setSafeAreaShape}
              onReset={resetCanvas}
              shopifyVariants={productData?.variants || []}
              selectedVariantId={selectedVariantId}
              onVariantChange={setSelectedVariantId}
              showRulers={showRulers}
              onToggleRulers={setShowRulers}
              unit={unit}
              onUnitChange={setUnit}
              paperSize={paperSize}
              onPaperSizeChange={setPaperSize}
              customPaperDimensions={customPaperDimensions}
              onCustomPaperDimensionsChange={setCustomPaperDimensions}
              onResetSafeAreaOffset={() => setSafeAreaOffset({ x: 0, y: 0 })}
              onToggleSummary={() => setShowSummary(false)}
            />
          </div>
        </div>
      </div>

      <Dialog open={!!renamingPage} onOpenChange={(open) => !open && setRenamingPage(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">Rename Design Side</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="side-name" className="text-sm font-semibold text-gray-700">Side Name</Label>
              <Input
                id="side-name"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                className="h-11 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                autoFocus
              />
              <p className="text-[10px] text-gray-500 italic">Example: Front, Back, Left Sleeve, etc.</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRenamingPage(null)}
              className="rounded-xl font-bold h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameSubmit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold h-11 border-b-2 border-indigo-800"
            >
              Update Side Name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedElement && elements.find(e => e.id === selectedElement)?.type === 'image' && (
        <ImageCropModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          imageUrl={elements.find(e => e.id === selectedElement)?.src || ''}
          onCropComplete={handleCropComplete}
          initialCrop={elements.find(e => e.id === selectedElement)?.crop}
        />
      )}
    </div>
  );
}
