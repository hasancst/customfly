import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Fullscreen } from '@shopify/app-bridge/actions';
import { DesignerCore } from '../components/DesignerCore';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { PricingTab } from '../components/PricingTab';
import { Toaster } from 'sonner'; // Added toast

export default function DesignerAdmin() {
  const { productId } = useParams();
  const fetch = useAuthenticatedFetch();
  const shopifyApp = useAppBridge();

  const [productData, setProductData] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<{ fonts: any[], colors: any[], options: any[], galleries: any[] }>({ fonts: [], colors: [], options: [], galleries: [] });
  const [savedDesigns, setSavedDesigns] = useState<any[]>([]);

  // Admin Fullscreen
  useEffect(() => {
    if (shopifyApp) {
      const fullscreen = Fullscreen.create(shopifyApp);
      fullscreen.dispatch(Fullscreen.Action.ENTER);
      return () => { fullscreen.dispatch(Fullscreen.Action.EXIT); };
    }
  }, [shopifyApp]);

  const loadData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);

      const [assetsRes, designsRes, configRes, prodRes] = await Promise.all([
        fetch('/imcst_api/assets'),
        fetch(`/imcst_api/design/product/${productId}`),
        fetch(`/imcst_api/config/${productId}`),
        fetch(`/imcst_api/products/${productId}?_t=${Date.now()}`) // Add cache-busting timestamp
      ]);

      if (prodRes && prodRes.ok) {
        const newProductData = await prodRes.json();
        setProductData(newProductData);
        console.log('[Designer] Product data refreshed:', newProductData);
      }

      if (assetsRes && assetsRes.ok) {
        const allAssets = await assetsRes.json();
        setAssets({
          fonts: allAssets.filter((a: any) => a.type === 'font'),
          colors: allAssets.filter((a: any) => a.type === 'color'),
          options: allAssets.filter((a: any) => a.type === 'option'),
          galleries: allAssets.filter((a: any) => a.type === 'gallery')
        });
      }

      if (designsRes && designsRes.ok) setSavedDesigns(await designsRes.json());
      if (configRes && configRes.ok) setConfig(await configRes.json());

    } catch (err) {
      console.error(err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [productId, fetch]);

  // Refresh product data when window regains focus (user might have updated Shopify)
  useEffect(() => {
    const handleFocus = () => {
      console.log('[Designer] Window focused, refreshing product data...');
      loadData(true); // Background refresh
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadData]);

  const deleteDesign = async (id: string, name: string) => {
    try {
      const res = await fetch(`/imcst_api/design/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedDesigns(prev => prev.filter(d => d.id !== id));
        let toast = (await import('sonner')).toast;
        toast.success(`Design "${name}" deleted`);
      } else {
        let toast = (await import('sonner')).toast;
        toast.error("Failed to delete design");
      }
    } catch (err) {
      console.error(err);
      let toast = (await import('sonner')).toast;
      toast.error("Deletion error");
    }
  };

  const clearAllDesigns = async () => {
    try {
      if (savedDesigns.length === 0) return;

      // Delete all concurrently
      const deletePromises = savedDesigns.map(d =>
        fetch(`/imcst_api/design/${d.id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      setSavedDesigns([]);
      let toast = (await import('sonner')).toast;
      toast.success("All designs cleared");
    } catch (err) {
      console.error(err);
      let toast = (await import('sonner')).toast;
      toast.error("Failed to clear all designs");
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-50 border-t-indigo-600 animate-spin"></div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900">CustomFly Designer</h2>
          <p className="text-sm font-medium text-gray-500 animate-pulse">Initializing creative workspace...</p>
        </div>
      </div>
    );
  }

  // Construct default pages if no designs exist, using config data
  const hasConfig = config && !config.error;
  const defaultPages = hasConfig ? [{
    id: 'default',
    name: 'Side 1',
    elements: [],
    baseImage: config.baseImage || '',
    baseImageProperties: config.baseImageProperties || { x: 0, y: 0, scale: 1, width: 1000, height: 1000 }
  }] : undefined;

  const latestDesign = savedDesigns && savedDesigns.length > 0
    ? [...savedDesigns].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    : null;

  return (
    <>
      <Toaster />
      <DesignerCore
        isPublicMode={false}
        initialPages={latestDesign?.designJson || defaultPages || undefined}
        initialConfig={hasConfig ? config : {}}
        initialDesignId={latestDesign?.id} // Pass initial ID
        productId={productId}
        productData={productData}
        userFonts={assets.fonts}
        userColors={assets.colors}
        userOptions={assets.options}
        userGalleries={assets.galleries}
        savedDesigns={savedDesigns}
        onDeleteDesign={deleteDesign}
        onClearAllDesigns={clearAllDesigns}
        onRefreshProduct={() => loadData(true)} // Add refresh callback
        pricingConfigComponent={productId ? <PricingTab productId={productId} customFetch={fetch} /> : null}
        customFetch={fetch}
        onSave={async (data) => {
          // Determine shopifyProductId based on saveType
          // 'product' = save for this product only (visible to customers)
          // 'global' = save to template library (reusable across products)
          const finalShopifyProductId = data.saveType === 'global' ? 'GLOBAL' : productId;
          
          console.log('[Designer] Saving design:', {
            saveType: data.saveType,
            isTemplate: data.isTemplate,
            shopifyProductId: finalShopifyProductId,
            productId,
            'designJson[0].baseImage': data.designJson[0]?.baseImage,
            'designJson[0].variantBaseImages': data.designJson[0]?.variantBaseImages,
            'config.baseImage': data.config.baseImage,
            'config.variantBaseImages': data.config.variantBaseImages
          });

          // 1. Save Design
          const designRes = await fetch('/imcst_api/design', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: data.id, // Pass ID to enable update
              name: data.name,
              designJson: data.designJson,
              isTemplate: data.isTemplate,
              previewUrl: data.previewUrl,
              shopifyProductId: finalShopifyProductId
            })
          });

          // 2. Save Config (MerchantConfig)
          const configRes = await fetch('/imcst_api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId,
              ...data.config,
              // Special: Sync active page's base image to merchant config
              baseImage: data.designJson[0]?.baseImage || data.config.baseImage,
              baseImageProperties: data.designJson[0]?.baseImageProperties || data.config.baseImageProperties
            })
          });

          if (designRes.ok && configRes.ok) {
            // Refresh local data to sync
            loadData(true);
            return await designRes.json();
          }
          return null;
        }}
        onBack={() => window.history.back()}
        width={1000}
        height={1000}
      />
    </>
  );
}
