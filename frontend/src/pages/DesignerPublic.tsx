import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DesignerCore } from '../components/DesignerCore';
import { Toaster } from 'sonner';

interface DesignerPublicProps {
    productId?: string;
    shopDomain?: string;
    isPublicMode?: boolean;
    layout?: string;
}

export default function DesignerPublic({
    productId: propProductId,
    shopDomain,
    isPublicMode = true,
    layout: _layout
}: DesignerPublicProps = {}) {
    const params = useParams();
    const [searchParams] = useSearchParams();

    const productId = propProductId || params.productId;
    const shop = shopDomain || searchParams.get('shop') || '';

    const [productData, setProductData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState<{ fonts: any[], colors: any[], options: any[] }>({ fonts: [], colors: [], options: [] });

    // Load Data
    useEffect(() => {
        async function init() {
            if (!productId || !shop) return;
            try {
                setLoading(true);
                // 1. Fetch Product
                const prodRes = await fetch(`/imcst_public_api/products/${productId}?shop=${shop}`);
                if (prodRes.ok) setProductData(await prodRes.json());

                // 2. Fetch Assets
                const [fontsRes, colorsRes, optionsRes] = await Promise.all([
                    fetch(`/imcst_api/public/assets?shop=${shop}&type=font`),
                    fetch(`/imcst_api/public/assets?shop=${shop}&type=color`),
                    fetch(`/imcst_api/public/assets?shop=${shop}&type=option`)
                ]);

                setAssets({
                    fonts: fontsRes.ok ? await fontsRes.json() : [],
                    colors: colorsRes.ok ? await colorsRes.json() : [],
                    options: optionsRes.ok ? await optionsRes.json() : []
                });

            } catch (err) {
                console.error("Public Init Error", err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [productId, shop]);

    if (loading) return <div className="flex h-screen items-center justify-center">Loading Designer...</div>;

    return (
        <>
            <Toaster position="top-center" />
            <DesignerCore
                isPublicMode={isPublicMode}
                productId={productId}
                productData={productData}
                userFonts={assets.fonts}
                userColors={assets.colors}
                userOptions={assets.options}
                onSave={async (data) => {
                    // Internal public save logic or add-to-cart event
                    console.log("Public Save", data);
                    return data;
                }}
                customFetch={window.fetch}
            />
        </>
    );
}
