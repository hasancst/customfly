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
  const [assets, setAssets] = useState<{ fonts: any[], colors: any[], options: any[] }>({ fonts: [], colors: [], options: [] });
  const [savedDesigns, setSavedDesigns] = useState<any[]>([]);

  // Admin Fullscreen
  useEffect(() => {
    if (shopifyApp) {
      const fullscreen = Fullscreen.create(shopifyApp);
      fullscreen.dispatch(Fullscreen.Action.ENTER);
      return () => { fullscreen.dispatch(Fullscreen.Action.EXIT); };
    }
  }, [shopifyApp]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const prodRes = await fetch(`/imcst_api/products/${productId}`);
      if (prodRes.ok) setProductData(await prodRes.json());

      const [fontsRes, colorsRes, optionsRes, designsRes, configRes] = await Promise.all([
        fetch('/imcst_api/assets?type=font'),
        fetch('/imcst_api/assets?type=color'),
        fetch('/imcst_api/assets?type=option'),
        fetch(`/imcst_api/design/product/${productId}`),
        fetch(`/imcst_api/config/${productId}`)
      ]);

      setAssets({
        fonts: fontsRes.ok ? await fontsRes.json() : [],
        colors: colorsRes.ok ? await colorsRes.json() : [],
        options: optionsRes.ok ? await optionsRes.json() : []
      });

      if (designsRes.ok) setSavedDesigns(await designsRes.json());
      if (configRes.ok) setConfig(await configRes.json());

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [productId, fetch]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div>Loading Admin Designer...</div>;

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
        productId={productId}
        productData={productData}
        userFonts={assets.fonts}
        userColors={assets.colors}
        userOptions={assets.options}
        savedDesigns={savedDesigns}
        pricingConfigComponent={productId ? <PricingTab productId={productId} customFetch={fetch} /> : null}
        customFetch={fetch}
        onSave={async (data) => {
          // 1. Save Design
          const designRes = await fetch('/imcst_api/design', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: data.name,
              designJson: data.designJson,
              isTemplate: data.isTemplate,
              previewUrl: data.previewUrl,
              shopifyProductId: productId
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
            loadData();
            return await designRes.json();
          }
          return null;
        }}
        onBack={() => window.history.back()}
      />
    </>
  );
}
