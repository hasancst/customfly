import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, ResourceList, ResourceItem, Text, Badge, Box, InlineStack, Button, Thumbnail } from '@shopify/polaris';
import { ViewIcon, ExportIcon } from '@shopify/polaris-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

interface SavedDesign {
    id: string;
    shop: string;
    shopifyProductId: string;
    shopifyOrderId: string;
    name: string;
    previewUrl: string;
    status: string;
    customerEmail: string;
    createdAt: string;
}

export default function Orders() {
    const [designs, setDesigns] = useState<SavedDesign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const fetch = useAuthenticatedFetch();
    const navigate = useNavigate();
    const location = useLocation();

    const fetchOrdersWithDesigns = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/imcst_api/designs?status=ordered');
            if (response.ok) {
                const data = await response.json();
                setDesigns(data);
            }
        } catch (error) {
            console.error('Failed to fetch designs:', error);
        } finally {
            setIsLoading(false);
        }
    }, [fetch]);

    useEffect(() => {
        fetchOrdersWithDesigns();
    }, [fetchOrdersWithDesigns]);

    const renderDesignItem = (item: SavedDesign) => {
        const { id, shopifyOrderId, name, previewUrl, customerEmail, createdAt } = item;
        const date = new Date(createdAt).toLocaleDateString();

        return (
            <ResourceItem
                id={id}
                media={<Thumbnail source={previewUrl || ''} alt={name} size="large" />}
                accessibilityLabel={`View design for order ${shopifyOrderId}`}
                onClick={() => window.open(previewUrl || '', '_blank')}
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                        <Text variant="bodyMd" fontWeight="bold" as="h3">
                            Order #{shopifyOrderId || 'N/A'} - {name}
                        </Text>
                        <div className="text-gray-500 text-sm">
                            {customerEmail || 'No email'} • {date}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge tone="success">Ordered</Badge>
                        <div onClick={(e) => e.stopPropagation()}>
                            <InlineStack gap="200">
                                <Button
                                    icon={ViewIcon}
                                    onClick={() => window.open(previewUrl || '', '_blank')}
                                    variant="tertiary"
                                >
                                    View
                                </Button>
                                <Button
                                    icon={ExportIcon}
                                    onClick={() => navigate(`/production/${id}${location.search}`)}
                                    variant="primary"
                                >
                                    High-Res
                                </Button>
                            </InlineStack>
                        </div>
                    </div>
                </div>
            </ResourceItem>
        );
    };

    return (
        <Page title="Custom Orders" subtitle="Manage and download custom designs from customer orders">
            <Layout>
                <Layout.Section>
                    <Card padding="0">
                        <ResourceList
                            resourceName={{ singular: 'design', plural: 'designs' }}
                            items={designs}
                            renderItem={renderDesignItem}
                            loading={isLoading}
                            emptyState={
                                <Box padding="1000">
                                    <div className="text-center">
                                        <Text variant="bodyMd" as="p" tone="subdued">
                                            No custom orders found yet.
                                        </Text>
                                    </div>
                                </Box>
                            }
                        />
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
