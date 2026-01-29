import { BrowserRouter, Routes, Route, useParams, useSearchParams } from 'react-router-dom';
import EmbeddedView from '../components/public/EmbeddedView';
import ModalView from '../components/public/ModalView';
import WizardView from '../components/public/WizardView';
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

export default function PublicApp() {
    return (
        <div className="imcst-public-app font-sans">
            <Toaster position="top-center" />
            <BrowserRouter>
                <Routes>
                    <Route path="/public/designer/embedded/:productId" element={<EmbeddedWrapper />} />
                    <Route path="/public/designer/modal/:productId" element={<ModalWrapper />} />
                    <Route path="/public/designer/wizard/:productId" element={<WizardWrapper />} />
                </Routes>
            </BrowserRouter>
        </div>
    );
}
