import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, ResourceList, ResourceItem, Text, Badge, InlineStack, Button, Thumbnail, Filters, ChoiceList } from '@shopify/polaris';
import { ExportIcon, EditIcon } from '@shopify/polaris-icons';
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
    const [selectedItems, setSelectedItems] = useState<string[] | 'All'>([]);
    const fetch = useAuthenticatedFetch();
    const navigate = useNavigate();
    const location = useLocation();

    // Filters
    const [statusFilter, setStatusFilter] = useState<string[]>(['ordered']);
    const [queryValue, setQueryValue] = useState<string>('');

    const fetchOrdersWithDesigns = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter.length > 0) params.append('status', statusFilter[0]);
            if (queryValue) params.append('query', queryValue);

            const response = await fetch(`/imcst_api/designs?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setDesigns(data);
            }
        } catch (error) {
            console.error('Failed to fetch designs:', error);
        } finally {
            setIsLoading(false);
        }
    }, [fetch, statusFilter, queryValue]);

    useEffect(() => {
        fetchOrdersWithDesigns();
    }, [fetchOrdersWithDesigns]);

    const handleBulkExport = () => {
        const itemsToExport = selectedItems === 'All' ? designs.map(d => d.id) : selectedItems;
        if (!itemsToExport || itemsToExport.length === 0) return;

        alert(`Starting bulk export for ${itemsToExport.length} designs. Please allow popups if blocked.`);

        // Trigger downloads with a slight delay to prevent browser blocks
        itemsToExport.forEach((id, index) => {
            setTimeout(() => {
                // We open the production page in a hidden manner or just new tab
                // For a high-res capture, we must actually render it.
                // Opening in new tabs is the most reliable way without complex background workers
                window.open(`/production/${id}${location.search}`, '_blank');
            }, index * 1500); // 1.5s delay between tabs
        });
    };

    const resourceListFilters = (
        <Filters
            queryValue={queryValue}
            onQueryChange={setQueryValue}
            onQueryClear={() => setQueryValue('')}
            filters={[
                {
                    key: 'status',
                    label: 'Status',
                    filter: (
                        <ChoiceList
                            title="Status"
                            titleHidden
                            choices={[
                                { label: 'Ordered', value: 'ordered' },
                                { label: 'Draft', value: 'draft' },
                            ]}
                            selected={statusFilter}
                            onChange={setStatusFilter}
                        />
                    ),
                    shortcut: true,
                },
            ]}
            onClearAll={() => {
                setStatusFilter(['ordered']);
                setQueryValue('');
            }}
        />
    );

    const renderDesignItem = (item: SavedDesign) => {
        const { id, shopifyOrderId, name, previewUrl, customerEmail, createdAt, shopifyProductId } = item;
        const date = new Date(createdAt).toLocaleDateString();

        return (
            <ResourceItem
                id={id}
                media={<Thumbnail source={previewUrl || ''} alt={name} size="large" />}
                accessibilityLabel={`View design for order ${shopifyOrderId}`}
                onClick={() => navigate(`/production/${id}${location.search}`)}
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                        <Text variant="bodyMd" fontWeight="bold" as="h3">
                            {shopifyOrderId ? `Order #${shopifyOrderId}` : 'No Order'} - {name}
                        </Text>
                        <div className="text-gray-500 text-sm">
                            {customerEmail || 'No email'} • {date}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge tone={item.status === 'ordered' ? 'success' : 'attention'}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Badge>
                        <div onClick={(e) => e.stopPropagation()}>
                            <InlineStack gap="200">
                                <Button
                                    icon={EditIcon}
                                    onClick={() => navigate(`/designer/${shopifyProductId || ''}?designId=${id}&host=${new URLSearchParams(location.search).get('host')}`)}
                                    variant="tertiary"
                                >
                                    Edit
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

    const bulkActions = [
        {
            content: 'Export Production Files',
            onAction: handleBulkExport,
        },
        {
            content: 'Mark as Processed',
            onAction: () => console.log('Mark as processed'),
        }
    ];

    return (
        <Page
            title="Custom Orders"
            subtitle="Manage and download custom designs from customer orders"
            primaryAction={{
                content: 'Refresh',
                onAction: fetchOrdersWithDesigns,
            }}
        >
            <Layout>
                <Layout.Section>
                    <Card padding="0">
                        <ResourceList
                            resourceName={{ singular: 'design', plural: 'designs' }}
                            items={designs}
                            renderItem={renderDesignItem}
                            loading={isLoading}
                            filterControl={resourceListFilters}
                            selectedItems={selectedItems}
                            onSelectionChange={setSelectedItems}
                            bulkActions={bulkActions}
                        />
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
