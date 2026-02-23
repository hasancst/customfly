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

      let latestProductData: any = null;
      if (prodRes && prodRes.ok) {
        latestProductData = await prodRes.json();
        setProductData(latestProductData);
        console.log('[Designer] Product data refreshed:', latestProductData);
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

      if (configRes && configRes.ok) {
        const configData = await configRes.json();
        // Check if product already has a config (non-empty object = already in designer)
        const hasConfig = configData && Object.keys(configData).length > 0 && !configData.error;

        if (hasConfig) {
          setConfig(configData);
        } else if (!isBackground) {
          // Product not yet in designer (empty config returned) - auto-create initial config
          // This happens when user clicks "Customfly Designer" from More Actions in Shopify Admin
          console.log('[Designer] Product has no config, auto-creating for product:', productId);
          const baseImageSrc = latestProductData?.image?.src || '';
          const createRes = await fetch('/imcst_api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId,
              baseImage: baseImageSrc
            })
          });
          if (createRes.ok) {
            const newConfig = await createRes.json();
            setConfig(newConfig);
            let toast = (await import('sonner')).toast;
            toast.success('✅ Produk berhasil ditambahkan ke Customfly Designer!');
            console.log('[Designer] Auto-created config for product:', productId);
          } else {
            console.error('[Designer] Failed to auto-create config');
            setConfig({});
          }
        } else {
          setConfig(configData);
        }
      }

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

  // If config has printArea with layers, use those as initial elements
  const configElements = hasConfig && config.printArea?.layers ? config.printArea.layers : [];

  const defaultPages = hasConfig ? [{
    id: 'default',
    name: 'Side 1',
    elements: configElements, // Use layers from config as initial elements
    baseImage: config.baseImage || '',
    baseImageProperties: config.baseImageProperties || { x: 0, y: 0, scale: 1, width: 1000, height: 1000 }
  }] : undefined;

  const latestDesign = savedDesigns && savedDesigns.length > 0
    ? [...savedDesigns].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    : null;

  // IMPORTANT: If config has layers, merge them with saved design
  // This ensures AI-added layers appear even if there's a saved design
  let initialPages = latestDesign?.designJson || defaultPages || undefined;
  if (initialPages && configElements.length > 0) {
    // Merge config layers into the first page
    initialPages = initialPages.map((page: any, index: number) => {
      if (index === 0) {
        return {
          ...page,
          elements: configElements // Override with config layers
        };
      }
      return page;
    });
  }

  return (
    <>
      <Toaster />
      <DesignerCore
        isPublicMode={false}
        initialPages={initialPages}
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
              baseImageProperties: data.designJson[0]?.baseImageProperties || data.config.baseImageProperties,
              // CRITICAL: Sync printArea.layers with current design elements
              // This ensures config.printArea stays in sync with saved design
              printArea: {
                layers: data.designJson[0]?.elements || []
              }
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
