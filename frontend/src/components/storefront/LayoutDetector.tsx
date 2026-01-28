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

    useEffect(() => {
        async function fetchConfig() {
            try {
                const response = await fetch(`/imcst_api/public/config/${productId}?shop=${shop}`);
                if (response.ok) {
                    const data = await response.json();
                    setConfig(data);
                }
            } catch (error) {
                console.error('Failed to fetch product config:', error);
            } finally {
                setLoading(false);
            }
        }

        if (productId && shop) {
            fetchConfig();
        }
    }, [productId, shop]);

    if (loading) return <div className="p-4 text-center text-gray-500">Loading designer...</div>;

    const layout = config?.designerLayout || 'redirect';

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
