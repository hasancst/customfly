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

      const [fontsRes, colorsRes, optionsRes, designsRes] = await Promise.all([
        fetch('/imcst_api/assets?type=font'),
        fetch('/imcst_api/assets?type=color'),
        fetch('/imcst_api/assets?type=option'),
        fetch(`/imcst_api/design/product/${productId}`)
      ]);

      setAssets({
        fonts: fontsRes.ok ? await fontsRes.json() : [],
        colors: colorsRes.ok ? await colorsRes.json() : [],
        options: optionsRes.ok ? await optionsRes.json() : []
      });

      if (designsRes.ok) setSavedDesigns(await designsRes.json());

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [productId, fetch]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div>Loading Admin Designer...</div>;


  const latestDesign = savedDesigns && savedDesigns.length > 0
    ? [...savedDesigns].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    : null;

  return (
    <>
      <Toaster />
      <DesignerCore
        isPublicMode={false}
        initialPages={latestDesign?.designJson || undefined}
        initialConfig={latestDesign ? {
          designName: latestDesign.name // Optional: restore name if DesignerCore supports it
        } : {}}
        productId={productId}
        productData={productData}
        userFonts={assets.fonts}
        userColors={assets.colors}
        userOptions={assets.options}
        savedDesigns={savedDesigns}
        pricingConfigComponent={productId ? <PricingTab productId={productId} customFetch={fetch} /> : null}
        customFetch={fetch}
        onSave={async (data) => {
          const res = await fetch('/imcst_api/design', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, shopifyProductId: productId })
          });
          return res.ok ? await res.json() : null;
        }}
        onBack={() => window.history.back()}
      />
    </>
  );
}
