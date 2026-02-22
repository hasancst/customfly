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
import StoreTemplates from '@/pages/StoreTemplates';
import TemplateDesigner from '@/pages/TemplateDesigner';
import PrintfulPage from '@/pages/PrintfulPage';
import AIChat from '@/components/ai/AIChat';
import { RoutePropagator } from '@/components/RoutePropagator';
import { BrowserRouter, Routes, Route, Navigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { Provider as AppBridgeProvider, NavigationMenu } from "@shopify/app-bridge-react";
import { AppProvider as PolarisProvider, Frame } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";

export default function App() {
    const rawParams = new URLSearchParams(window.location.search);
    const urlParams = new URLSearchParams();
    rawParams.forEach((val, key) => {
        if (val !== 'undefined' && val !== 'null' && val !== '') {
            urlParams.set(key, val);
        }
    });
    const cleanSearch = urlParams.toString() ? `?${urlParams.toString()}` : '';

    const LinkComponent = ({ children, url, ...rest }: any) => {
        const location = useLocation();
        const search = location.search;

        // Sanitize search params for internal links
        const params = new URLSearchParams(search);
        const cleanParams = new URLSearchParams();
        params.forEach((val, key) => {
            if (val !== 'undefined' && val !== 'null' && val !== '') {
                cleanParams.set(key, val);
            }
        });
        const sanitizedSearch = cleanParams.toString() ? `?${cleanParams.toString()}` : '';

        const newUrl = url + (url.includes('?') ? '&' : (sanitizedSearch ? '?' : '')) + (sanitizedSearch.startsWith('?') ? sanitizedSearch.substring(1) : sanitizedSearch);

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

    console.log("App initialization:", {
        host: config.host ? "detected" : "MISSING",
        apiKey: config.apiKey ? "present" : "MISSING",
        isPublic,
        url: window.location.href
    });

    return (
        <PolarisProvider i18n={enTranslations} linkComponent={LinkComponent}>
            <BrowserRouter>
                {isPublic ? (
                    <MainContent cleanSearch={cleanSearch} isPublic={true} />
                ) : (
                    <AppBridgeProvider config={config}>
                        <RoutePropagator />
                        <MainContent cleanSearch={cleanSearch} isPublic={false} />
                    </AppBridgeProvider>
                )}
            </BrowserRouter>
        </PolarisProvider>
    );
}

function MainContent({ cleanSearch, isPublic }: { cleanSearch: string, isPublic: boolean }) {
    const location = useLocation();
    const isDesigner = location.pathname.includes('/designer');

    const content = (
        <>
            {!isPublic && (
                <NavigationMenu
                    navigationLinks={[
                        {
                            label: 'Products',
                            destination: '/dashboard',
                        },
                        {
                            label: 'Templates',
                            destination: '/templates',
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
                <Route path="/" element={<Navigate to={`/dashboard${cleanSearch}`} replace />} />
                <Route path="/templates" element={<StoreTemplates />} />
                <Route path="/template-designer/:templateId" element={<TemplateDesigner />} />
                <Route path="/template-designer" element={<TemplateDesigner />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/help" element={<Help />} />
                <Route path="/exitiframe" element={<ExitIframe />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/printful" element={<PrintfulPage />} />
                <Route path="/production/:designId" element={<ProductionExport />} />
                <Route path="/designer/:productId" element={<Designer />} />
                <Route path="/designer" element={<Designer />} />
                <Route path="/assets/:id" element={<AssetDetail />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/designer" element={<GlobalSettingsDesigner />} />
            </Routes>
            {!isPublic && <AIChat />}
        </>
    );

    if (isDesigner) {
        return content;
    }

    return <Frame>{content}</Frame>;
}

