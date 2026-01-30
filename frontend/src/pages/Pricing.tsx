import React, { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, ResourceList, ResourceItem, Text, Badge, Box, Tabs, Banner } from '@shopify/polaris';
import { PricingTab } from '../components/PricingTab';
import { PromoCodesManager } from '../components/PromoCodesManager';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Pricing() {
    const fetch = useAuthenticatedFetch();
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedTab, setSelectedTab] = useState(0);
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const tabs = [
        { id: 'global-defaults', content: 'Global Defaults', panelID: 'global-defaults-panel' },
        { id: 'product-overrides', content: 'Product Overrides', panelID: 'product-overrides-panel' },
        { id: 'promo-codes', content: 'Promo Codes', panelID: 'promo-codes-panel' },
    ];

    const loadConfigs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/imcst_api/pricing/configs');
            if (res.ok) {
                const data = await res.json();
                // Filter out the global config from the product list
                setConfigs(data.filter((c: any) => c.shopifyProductId !== 'global_settings_config'));
            }
        } catch (error) {
            console.error("Failed to load pricing configs:", error);
        } finally {
            setLoading(false);
        }
    }, [fetch]);

    useEffect(() => {
        if (selectedTab === 1) {
            loadConfigs();
        }
    }, [selectedTab, loadConfigs]);

    const handleTabChange = useCallback((index: number) => setSelectedTab(index), []);

    return (
        <Page title="Pricing Management" fullWidth>
            <div className="mb-6">
                <Banner tone="info">
                    <p>
                        Configure how customers are charged for product customizations.
                        <strong> Global Defaults</strong> apply to all products unless you set a
                        <strong> Product Override</strong> in the Product Designer.
                    </p>
                </Banner>
            </div>

            <Layout>
                <Layout.Section>
                    <Card padding="0">
                        <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
                            <Box padding="600">
                                {selectedTab === 0 ? (
                                    <div className="max-w-3xl mx-auto">
                                        <PricingTab productId="global_settings_config" customFetch={fetch} />
                                    </div>
                                ) : selectedTab === 1 ? (
                                    <ResourceList
                                        resourceName={{ singular: 'override', plural: 'overrides' }}
                                        items={configs}
                                        loading={loading}
                                        renderItem={(item) => {
                                            const { shopifyProductId, currency, textPricing, globalPricing } = item;
                                            return (
                                                <ResourceItem
                                                    id={shopifyProductId}
                                                    onClick={() => navigate(`/designer/${shopifyProductId}${location.search}`)}
                                                    accessibilityLabel={`Edit pricing for product ${shopifyProductId}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-1">
                                                            <Text variant="bodyMd" fontWeight="bold" as="p">
                                                                Product ID: {shopifyProductId}
                                                            </Text>
                                                            <div className="flex gap-2">
                                                                {globalPricing?.enabled && (
                                                                    <Badge tone="success">{`Base Fee: ${currency} ${globalPricing.basePrice}`}</Badge>
                                                                )}
                                                                <Badge tone="info">{`Text: ${textPricing?.mode.replace('_', ' ')}`}</Badge>
                                                            </div>
                                                        </div>
                                                        <Badge>Customized</Badge>
                                                    </div>
                                                </ResourceItem>
                                            );
                                        }}
                                        emptyState={
                                            <div className="text-center py-12">
                                                <Text variant="bodyMd" as="p" tone="subdued">
                                                    No product-specific pricing overrides found.
                                                </Text>
                                            </div>
                                        }
                                    />
                                ) : (
                                    <PromoCodesManager />
                                )}
                            </Box>
                        </Tabs>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
