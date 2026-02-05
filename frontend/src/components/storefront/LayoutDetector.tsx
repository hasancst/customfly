import { useEffect, useState } from 'react';
import { RedirectDesigner } from './RedirectDesigner';
import { InlineDesigner } from './InlineDesigner';
import { ModalDesigner } from './ModalDesigner';
import { WizardDesigner } from './WizardDesigner';

interface LayoutDetectorProps {
    productId: string;
    shop: string;
}

export function LayoutDetector({ productId, shop }: LayoutDetectorProps) {
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchConfig() {
            try {
                const baseUrl = (window as any).IMCST_BASE_URL || '';
                const fetchUrl = `${baseUrl}/imcst_public_api/public/config/${productId}?shop=${shop}`;
                console.log('[IMCST] Fetching config:', fetchUrl);

                const response = await fetch(fetchUrl);
                if (response.ok) {
                    const data = await response.json();
                    setConfig(data);
                } else {
                    const errorText = await response.text();
                    console.error('[IMCST] Config fetch failed:', response.status, errorText);
                    setError(`Failed to load: ${response.status}`);
                }
            } catch (err: any) {
                console.error('[IMCST] Config fetch error:', err);
                setError(err.message || 'Network error');
            } finally {
                setLoading(false);
            }
        }

        if (productId && shop) {
            fetchConfig();
        }
    }, [productId, shop]);

    if (!productId || !shop) {
        return (
            <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg text-sm text-amber-800">
                Missing shop or product information
            </div>
        );
    }

    if (loading) return <div className="p-4 text-center text-gray-500">Loading designer...</div>;

    if (error) {
        return (
            <RedirectDesigner
                productId={productId}
                shop={shop}
                config={{ ...config, designerLayout: 'redirect' }}
            />
        );
    }

    const layout = config?.designerLayout || 'modal';

    switch (layout) {
        case 'inline':
            return <InlineDesigner productId={productId} shop={shop} config={config} />;
        case 'modal':
            return <ModalDesigner productId={productId} shop={shop} config={config} />;
        case 'wizard':
            return <WizardDesigner productId={productId} shop={shop} config={config} />;
        case 'redirect':
        default:
            return <RedirectDesigner productId={productId} shop={shop} config={config} />;
    }
}
