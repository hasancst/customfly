import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DesignerOpenCore } from '../components/DesignerOpenCore';
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

    const [configData, setConfigData] = useState<any>(null);
    const [shopifyProduct, setShopifyProduct] = useState<any>(null);
    const [initialDesign, setInitialDesign] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState<{ fonts: any[], colors: any[], options: any[] }>({ fonts: [], colors: [], options: [] });

    // Load Data
    useEffect(() => {
        async function init() {
            if (!productId || !shop) return;
            try {
                setLoading(true);
                // 1. Fetch Product
                const baseUrl = (window as any).IMCST_BASE_URL || '';
                const prodRes = await fetch(`${baseUrl}/imcst_public_api/product/${shop}/${productId}`);
                if (prodRes.ok) {
                    const data = await prodRes.json();
                    console.log("[DesignerPublic] Fetched product data:", data);
                    setConfigData(data.config);
                    setInitialDesign(data.design);
                    setShopifyProduct(data.product);
                } else {
                    console.error("[DesignerPublic] Failed to fetch product data", prodRes.status);
                }

                // 2. Fetch Assets
                const [fontsRes, colorsRes, optionsRes] = await Promise.all([
                    fetch(`${baseUrl}/imcst_api/public/assets?shop=${shop}&type=font`),
                    fetch(`${baseUrl}/imcst_api/public/assets?shop=${shop}&type=color`),
                    fetch(`${baseUrl}/imcst_api/public/assets?shop=${shop}&type=option`)
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
            <DesignerOpenCore
                isPublicMode={isPublicMode}
                productId={productId}
                productData={shopifyProduct}
                initialPages={initialDesign || [{ id: 'default', name: 'Side 1', elements: [] }]}
                initialConfig={{ ...configData, buttonText: configData?.buttonText || 'Add to Cart' }}
                userFonts={assets.fonts}
                userColors={assets.colors}
                userOptions={assets.options}
                onSave={async (data) => {
                    const baseUrl = (window as any).IMCST_BASE_URL || '';
                    try {
                        // 1. Upload Production File if provided as base64
                        let productionFileUrl = '';
                        if (data.productionFileBase64) {
                            try {
                                const uploadRes = await fetch(`${baseUrl}/imcst_public_api/upload`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        shop,
                                        imageBase64: data.productionFileBase64
                                    })
                                });
                                if (uploadRes.ok) {
                                    const uploadData = await uploadRes.json();
                                    productionFileUrl = uploadData.url;
                                }
                            } catch (err) {
                                console.error("Production upload failed", err);
                            }
                        }

                        // 2. Save Design to our backend
                        const res = await fetch(`${baseUrl}/imcst_api/public/design`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                shop,
                                shopifyProductId: productId,
                                name: data.name,
                                designJson: data.designJson,
                                previewUrl: data.previewUrl,
                                productionFileUrl: productionFileUrl || undefined
                            })
                        });

                        if (!res.ok) {
                            const errData = await res.json();
                            throw new Error(errData.error || "Failed to save design");
                        }

                        const savedDesign = await res.json();

                        // 2. Add to Shopify Cart
                        console.log("[DesignerPublic] Raw variantId from designer:", data.variantId);
                        const cleanVariantId = data.variantId?.toString().match(/\d+/)?.[0] || data.variantId;
                        console.log("[DesignerPublic] Clean numeric variantId:", cleanVariantId);

                        if (!cleanVariantId) {
                            throw new Error("Missing variant ID. Please select a variant.");
                        }

                        const cartRes = await fetch('/cart/add.js', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                items: [{
                                    id: parseInt(cleanVariantId),
                                    quantity: 1,
                                    properties: {
                                        '_Design ID': savedDesign.id,
                                        '_Design Preview': savedDesign.previewUrl,
                                        '_Production File': productionFileUrl || undefined
                                    }
                                }]
                            })
                        });

                        if (cartRes.ok) {
                            // 3. Success -> Redirect to Cart
                            window.location.href = '/cart';
                        } else {
                            const cartErr = await cartRes.json();
                            throw new Error(cartErr.description || "Failed to add to cart");
                        }

                        return savedDesign;
                    } catch (err: any) {
                        console.error("Add to cart error:", err);
                        const { toast } = await import('sonner');
                        toast.error(err.message || "Something went wrong adding to cart");
                        throw err;
                    }
                }}
                customFetch={window.fetch}
            />
        </>
    );
}
