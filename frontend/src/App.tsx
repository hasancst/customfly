import Designer from '@/pages/Designer';
import AdminDashboard from '@/pages/AdminDashboard';
import Assets from '@/pages/Assets';
import AssetDetail from '@/pages/AssetDetail';
import Settings from '@/pages/Settings';
import Orders from '@/pages/Orders';
import ProductionExport from '@/pages/ProductionExport';
import GlobalSettingsDesigner from '@/pages/GlobalSettingsDesigner';
import Pricing from '@/pages/Pricing';
import Help from '@/pages/Help';
import ExitIframe from '@/pages/ExitIframe';
import { RoutePropagator } from '@/components/RoutePropagator';
import { BrowserRouter, Routes, Route, Navigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { Provider as AppBridgeProvider, NavigationMenu } from "@shopify/app-bridge-react";
import { AppProvider as PolarisProvider, Frame } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";

export default function App() {
    const urlParams = new URLSearchParams(window.location.search);

    const LinkComponent = ({ children, url, ...rest }: any) => {
        const location = useLocation();
        const search = location.search;
        const newUrl = url + (url.includes('?') ? '&' : '?') + (search.startsWith('?') ? search.substring(1) : search);

        return (
            <RouterLink to={newUrl} {...rest}>
                {children}
            </RouterLink>
        );
    };

    const config = {
        apiKey: (window as any).imcst_shopify_key || import.meta.env.VITE_SHOPIFY_API_KEY,
        host: urlParams.get("host") || "",
        forceRedirect: false
    };

    const isPublic = !config.host;

    console.log("App startup", { isPublic, host: config.host ? "present" : "missing" });

    return (
        <PolarisProvider i18n={enTranslations} linkComponent={LinkComponent}>
            <BrowserRouter>
                {isPublic ? (
                    <MainContent />
                ) : (
                    <AppBridgeProvider config={config}>
                        <RoutePropagator />
                        <MainContent />
                    </AppBridgeProvider>
                )}
            </BrowserRouter>
        </PolarisProvider>
    );
}

function MainContent() {
    const location = useLocation();
    const isDesigner = location.pathname.includes('/designer');

    const content = (
        <>
            {!isDesigner && (
                <NavigationMenu
                    navigationLinks={[
                        {
                            label: 'Products',
                            destination: '/dashboard',
                        },
                        {
                            label: 'Pricing',
                            destination: '/pricing',
                        },
                        {
                            label: 'Orders',
                            destination: '/orders',
                        },
                        {
                            label: 'Assets',
                            destination: '/assets',
                        },
                        {
                            label: 'Settings',
                            destination: '/settings',
                        },
                        {
                            label: 'Help',
                            destination: '/help',
                        }
                    ]}
                />
            )}
            <Routes>
                <Route path="/dashboard" element={<AdminDashboard />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/production/:designId" element={<ProductionExport />} />
                <Route path="/assets/:id" element={<AssetDetail />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/designer" element={<GlobalSettingsDesigner />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/help" element={<Help />} />
                <Route path="/designer/:productId" element={<Designer />} />
                <Route path="/designer" element={<Designer />} />
                <Route path="/storefront/:productId" element={<StorefrontEntry />} />
                <Route path="/exitiframe" element={<ExitIframe />} />
            </Routes>
        </>
    );

    if (isDesigner) {
        return content;
    }

    return <Frame>{content}</Frame>;
}

import { LayoutDetector } from '@/components/storefront/LayoutDetector';
function StorefrontEntry() {
    const location = useLocation();
    const productId = location.pathname.split('/').pop() || '';
    const shop = new URLSearchParams(location.search).get('shop') || '';

    if (!productId || !shop) return <div>Missing productId or shop</div>;

    return <LayoutDetector productId={productId} shop={shop} />;
}
