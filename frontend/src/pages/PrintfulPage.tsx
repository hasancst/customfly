import { useState, useEffect } from 'react';
import { Page, Tabs, Card, Banner } from '@shopify/polaris';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import CatalogTab from '../components/printful/CatalogTab';
import ProductsTab from '../components/printful/ProductsTab';

export default function PrintfulPage() {
    const fetch = useAuthenticatedFetch();
    const [selected, setSelected] = useState(0); // Start with Catalog (index 0 after removing Connection)
    const [connectionStatus, setConnectionStatus] = useState<any>({ connected: true }); // Optimistic: assume connected
    const [loading, setLoading] = useState(true);

    const tabs = [
        {
            id: 'catalog',
            content: 'Catalog',
            panelID: 'catalog-panel',
        },
        {
            id: 'products',
            content: 'Imported Products',
            panelID: 'products-panel',
        },
    ];

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        try {
            setLoading(true);
            const response = await fetch('/imcst_api/printful/status');
            
            if (response.ok) {
                const data = await response.json();
                setConnectionStatus(data);
            } else if (response.status === 429) {
                // Rate limit - keep previous state or assume connected
                console.warn('[Printful] API rate limit (429), keeping previous state');
                if (!connectionStatus) {
                    // If no previous state, assume connected (optimistic)
                    setConnectionStatus({ connected: true });
                }
            } else {
                setConnectionStatus({ connected: false });
            }
        } catch (error) {
            console.error('Failed to check Printful connection:', error);
            setConnectionStatus({ connected: false });
        } finally {
            setLoading(false);
        }
    };

    const handleConnectionChange = () => {
        checkConnection();
    };

    return (
        <Page
            title="Printful Integration"
            subtitle="Import products from Printful and enable customization"
        >
            {!loading && connectionStatus?.connected === false && (
                <Banner
                    title="Printful not connected"
                    status="warning"
                    action={{
                        content: 'Go to Settings',
                        url: '/settings'
                    }}
                >
                    Please connect your Printful account in Settings to access catalog and import products.
                </Banner>
            )}

            <Tabs tabs={tabs} selected={selected} onSelect={setSelected}>
                <Card>
                    {selected === 0 && (
                        <CatalogTab
                            connected={connectionStatus?.connected !== false} // Optimistic: true unless explicitly false
                        />
                    )}
                    {selected === 1 && (
                        <ProductsTab
                            connected={connectionStatus?.connected !== false} // Optimistic: true unless explicitly false
                        />
                    )}
                </Card>
            </Tabs>
        </Page>
    );
}
