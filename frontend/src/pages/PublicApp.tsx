import { BrowserRouter, Routes, Route, useParams, useSearchParams } from 'react-router-dom';
import EmbeddedView from '../components/public/EmbeddedView';
import ModalView from '../components/public/ModalView';
import WizardView from '../components/public/WizardView';
import DesignerPublic from './DesignerPublic';
import { LayoutDetector } from '../components/storefront/LayoutDetector';
import { PublicLayout } from '../components/layouts/PublicLayout';
import { Toaster } from '@/components/ui/sonner';

// Wrapper components to extract params
function EmbeddedWrapper() {
    const { productId } = useParams();
    const [searchParams] = useSearchParams();
    const shop = searchParams.get('shop') || '';
    return (
        <PublicLayout showHeader={false} showFooter={false}>
            <EmbeddedView productId={productId!} shop={shop} />
        </PublicLayout>
    );
}

function ModalWrapper() {
    const { productId } = useParams();
    const [searchParams] = useSearchParams();
    const shop = searchParams.get('shop') || '';
    return (
        <PublicLayout showHeader={true} showFooter={false}>
            <ModalView productId={productId!} shop={shop} />
        </PublicLayout>
    );
}

const OpenWrapper = () => {
    const { productId } = useParams();
    const [searchParams] = useSearchParams();
    const shop = searchParams.get('shop') || '';
    // Open Mode shares the full-screen layout similar to Admin but read-only
    return (
        <div className="h-screen w-full bg-gray-50 flex flex-col">
            <Toaster position="top-center" />
            {/* Note: In open mode, we might want a simple Public Header later */}
            <div className="flex-1 overflow-hidden">
                <DesignerPublic
                    productId={productId}
                    shopDomain={shop}
                    isPublicMode={true}
                    layout="redirect"
                />
            </div>
        </div>
    );
};

function WizardWrapper() {
    const { productId } = useParams();
    const [searchParams] = useSearchParams();
    const shop = searchParams.get('shop') || '';
    return (
        <PublicLayout showHeader={true} showFooter={true}>
            <WizardView productId={productId!} shop={shop} />
        </PublicLayout>
    );
}

function StorefrontWrapper() {
    const { productId: pathProductId } = useParams();
    const [searchParams] = useSearchParams();
    const shop = searchParams.get('shop') || '';
    const productId = pathProductId || searchParams.get('productId') || '';

    return <LayoutDetector productId={productId} shop={shop} />;
}

export default function PublicApp() {
    return (
        <div className="imcst-public-app font-sans">
            <Toaster position="top-center" />
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<StorefrontWrapper />} />
                    <Route path="/public/storefront/:productId" element={<StorefrontWrapper />} />
                    <Route path="/public/designer/embedded/:productId" element={<EmbeddedWrapper />} />
                    <Route path="/public/designer/modal/:productId" element={<ModalWrapper />} />
                    <Route path="/public/designer/wizard/:productId" element={<WizardWrapper />} />
                    <Route path="/public/designer/open/:productId" element={<OpenWrapper />} />
                    <Route path="*" element={<StorefrontWrapper />} />
                </Routes>
            </BrowserRouter>
        </div>
    );
}
