import Designer from '@/pages/Designer';
import AdminDashboard from '@/pages/AdminDashboard';
import Assets from '@/pages/Assets';
import AssetDetail from '@/pages/AssetDetail';
import Settings from '@/pages/Settings';
import Help from '@/pages/Help';
import ExitIframe from '@/pages/ExitIframe';
import { RoutePropagator } from '@/components/RoutePropagator';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider as AppBridgeProvider, NavigationMenu } from "@shopify/app-bridge-react";
import { AppProvider as PolarisProvider, Frame } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";

export default function App() {
    console.log("App component mounting...");
    const config = {
        apiKey: (window as any).imcst_shopify_key || import.meta.env.VITE_SHOPIFY_API_KEY,
        host: new URLSearchParams(window.location.search).get("host") || "",
        forceRedirect: true
    };
    console.log("AppBridge Config:", { apiKey: config.apiKey ? "FOUND" : "MISSING", host: config.host ? "FOUND" : "MISSING" });

    return (
        <PolarisProvider i18n={enTranslations}>
            <AppBridgeProvider config={config}>
                <BrowserRouter>
                    <Frame>
                        <RoutePropagator />
                        <NavigationMenu
                            navigationLinks={[
                                {
                                    label: 'Products',
                                    destination: '/dashboard',
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
                        <Routes>
                            <Route path="/dashboard" element={<AdminDashboard />} />
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/assets" element={<Assets />} />
                            <Route path="/assets/:id" element={<AssetDetail />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/help" element={<Help />} />
                            <Route path="/designer/:productId" element={<Designer />} />
                            <Route path="/designer" element={<Designer />} />
                            <Route path="/exitiframe" element={<ExitIframe />} />
                        </Routes>
                    </Frame>
                </BrowserRouter>
            </AppBridgeProvider>
        </PolarisProvider>
    );
}
