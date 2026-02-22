import { useState, useEffect, useCallback, useMemo } from 'react';
import type { MouseEvent } from 'react';
import { Page, Layout, Card, ResourceList, ResourceItem, Text, Badge, Filters, ChoiceList, Tabs, Button, Tooltip, Spinner, Box, InlineStack, Icon, Toast, Select, Pagination } from '@shopify/polaris';
import { ViewIcon, PlusIcon, MinusIcon, SandboxIcon, StoreIcon } from '@shopify/polaris-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import RecommendationDashboard from '../components/ai/RecommendationDashboard';

interface Variant {
    id: string;
    gid: string;
    title: string;
    sku?: string;
    price: string;
}

interface Collection {
    id: string;
    gid: string;
    title: string;
}

interface Product {
    id: string;
    gid: string;
    title: string;
    vendor: string;
    tags: string;
    handle: string;
    status: string;
    shop: string;
    variants: Variant[];
    collections: Collection[];
    createdAt: string;
    image?: {
        src: string;
    };
}

const NO_IMAGE_URL = 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png';

const SafeThumbnail = ({ source, alt }: { source: string; alt: string }) => {
    const [hasError, setHasError] = useState(false);
    return (
        <div className="w-20 h-20 rounded border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
            <img
                src={hasError || !source ? NO_IMAGE_URL : source}
                alt={alt}
                className="w-full h-full object-cover"
                onError={() => setHasError(true)}
            />
        </div>
    );
};

export default function AdminDashboard() {
    const [products, setProducts] = useState<Product[]>([]);
    const [customProducts, setCustomProducts] = useState<Product[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [configs, setConfigs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [queryValue, setQueryValue] = useState('');
    const [selectedTab, setSelectedTab] = useState(0);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
    const [sortValue, setSortValue] = useState('newest');
    
    // Pagination state
    const [pageInfo, setPageInfo] = useState<any>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const fetch = useAuthenticatedFetch();
    const [toastActive, setToastActive] = useState(false);
    const [toastContent, setToastContent] = useState('');

    const showToast = useCallback((content: string) => {
        setToastContent(content);
        setToastActive(true);
    }, []);

    useEffect(() => {
        async function fetchData() {
            try {
                console.log('[DASHBOARD] Fetching data...');
                setIsLoading(true);
                const [prodRes, collRes, configRes] = await Promise.all([
                    fetch('/imcst_api/products'),
                    fetch('/imcst_api/collections'),
                    fetch('/imcst_api/configured-products')
                ]);

                console.log('[DASHBOARD] Fetch response statuses:', {
                    products: prodRes.status,
                    collections: collRes.status,
                    config: configRes.status
                });


                let prodData: Product[] = [];
                let collData: Collection[] = [];

                if (prodRes.ok) {
                    const contentType = prodRes.headers.get("content-type");
                    console.log('[DASHBOARD] Products content-type:', contentType);
                    if (!contentType?.includes("application/json")) {
                        console.error('[DASHBOARD] Products returned non-JSON:', await prodRes.text());
                    } else {
                        const data = await prodRes.json();
                        console.log('[DASHBOARD] Products received:', data);
                        // Handle both old format (array) and new format (object with products and pageInfo)
                        if (Array.isArray(data)) {
                            prodData = data;
                        } else if (data.products && Array.isArray(data.products)) {
                            prodData = data.products;
                            setPageInfo(data.pageInfo);
                        }
                    }
                }

                if (collRes.ok) {
                    const contentType = collRes.headers.get("content-type");
                    console.log('[DASHBOARD] Collections content-type:', contentType);
                    if (!contentType?.includes("application/json")) {
                        console.error('[DASHBOARD] Collections returned non-JSON:', await collRes.text());
                    } else {
                        const data = await collRes.json();
                        console.log('[DASHBOARD] Collections received:', data.length);
                        if (Array.isArray(data)) collData = data;
                    }
                }

                let configData: any[] = [];
                if (configRes.ok) {
                    const contentType = configRes.headers.get("content-type");
                    console.log('[DASHBOARD] Config content-type:', contentType);
                    if (!contentType?.includes("application/json")) {
                        console.error('[DASHBOARD] Config returned non-JSON:', await configRes.text());
                    } else {
                        configData = await configRes.json();
                    }
                }

                setProducts(prodData);
                setCollections(collData);
                setConfigs(configData);

                const configuredIds = configData.map(c => c.shopifyProductId);
                const activeCustomProducts = prodData.filter(p => configuredIds.includes(p.id));
                setCustomProducts(activeCustomProducts);
                console.log('[DASHBOARD] State update complete. Products to show:', prodData.length);

            } catch (error) {
                console.error('[DASHBOARD] Fetch error:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    const loadMoreProducts = useCallback(async (direction: 'next' | 'prev') => {
        if (isLoadingMore) return;
        
        try {
            setIsLoadingMore(true);
            const cursor = direction === 'next' ? pageInfo?.endCursor : pageInfo?.startCursor;
            const param = direction === 'next' ? 'after' : 'before';
            
            const response = await fetch(`/imcst_api/products?${param}=${cursor}&limit=50`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.products && Array.isArray(data.products)) {
                    setProducts(data.products);
                    setPageInfo(data.pageInfo);
                    
                    // Update custom products
                    const configuredIds = configs.map(c => c.shopifyProductId);
                    const activeCustomProducts = data.products.filter((p: Product) => configuredIds.includes(p.id));
                    setCustomProducts(activeCustomProducts);
                }
            }
        } catch (error) {
            console.error('[DASHBOARD] Load more error:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [fetch, pageInfo, configs, isLoadingMore]);

    const handleToggleStatus = useCallback(async (product: Product) => {
        setIsUpdating(product.gid);
        const newStatus = product.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
        try {
            const response = await fetch(`/imcst_api/products/${product.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                showToast(`Status updated to ${newStatus}`);
                setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: newStatus } : p));
                setCustomProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: newStatus } : p));
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        } finally {
            setIsUpdating(null);
        }
    }, [fetch]);

    const addToCustom = useCallback(async (product: Product) => {
        try {
            // Save to database app (initialize config)
            const response = await fetch('/imcst_api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product.id,
                    baseImage: product.image?.src || ''
                })
            });

            if (response.ok) {
                showToast("Product design enabled");
                setCustomProducts(prev => {
                    if (prev.find(p => p.id === product.id)) return prev;
                    return [...prev, product];
                });
                // Navigate to Designer
                console.log('Navigating to designer with path:', `/designer/${product.id}${location.search}`);
                navigate(`/designer/${product.id}${location.search}`);
            } else {
                console.error("Failed to save product config");
            }
        } catch (error) {
            console.error("Error adding to custom:", error);
        }
    }, [fetch, navigate]);



    const removeFromCustom = useCallback(async (product: Product) => {
        try {
            const response = await fetch(`/imcst_api/config/${product.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast("Product design disabled");
                setCustomProducts(prev => prev.filter(p => p.id !== product.id));
                console.log('Product removed from custom');
            } else {
                console.error("Failed to remove product config");
            }
        } catch (error) {
            console.error("Error removing from custom:", error);
        }
    }, [fetch]);

    const handleLayoutChange = useCallback(async (productId: string, layout: string) => {
        try {
            const response = await fetch('/imcst_api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, designerLayout: layout })
            });
            if (response.ok) {
                showToast(`Layout updated to ${layout}`);
                setConfigs(prev => prev.map(c => c.shopifyProductId === productId ? { ...c, designerLayout: layout } : c));
            }
        } catch (error) {
            console.error('Failed to update layout:', error);
        }
    }, [fetch]);

    const handleQueryValueChange = useCallback((value: string) => setQueryValue(value), []);
    const handleTagsChange = useCallback((value: string[]) => setSelectedTags(value), []);
    const handleCollectionsChange = useCallback((value: string[]) => setSelectedCollections(value), []);
    const handleQueryValueRemove = useCallback(() => setQueryValue(''), []);
    const handleTagsRemove = useCallback(() => setSelectedTags([]), []);
    const handleCollectionsRemove = useCallback(() => setSelectedCollections([]), []);
    const handleTabChange = useCallback((selectedTabIndex: number) => setSelectedTab(selectedTabIndex), []);

    const handleClearAll = useCallback(() => {
        handleQueryValueRemove();
        handleTagsRemove();
        handleCollectionsRemove();
    }, [handleQueryValueRemove, handleTagsRemove, handleCollectionsRemove]);

    const allTags = useMemo(() => {
        const tagsSet = new Set<string>();
        products.forEach(p => {
            if (p.tags) {
                p.tags.split(',').forEach(t => tagsSet.add(t.trim()));
            }
        });
        return Array.from(tagsSet).sort().map(tag => ({ label: tag, value: tag }));
    }, [products]);

    const collectionOptions = useMemo(() => {
        return collections.map(c => ({ label: c.title, value: c.id.toString() }));
    }, [collections]);

    const sortedProducts = useMemo(() => {
        const baseItems = selectedTab === 0 ? products : customProducts;
        let result = baseItems.filter((product) => {
            const query = queryValue.toLowerCase();
            const matchesTitle = product.title.toLowerCase().includes(query);
            const matchesTagsQuery = product.tags ? product.tags.toLowerCase().includes(query) : false;
            const matchesVariants = product.variants?.some(v =>
                v.title.toLowerCase().includes(query) || (v.sku && v.sku.toLowerCase().includes(query))
            );
            const searchMatch = !query || matchesTitle || matchesTagsQuery || matchesVariants;

            const tagMatch = selectedTags.length === 0 || selectedTags.some(tag =>
                product.tags && product.tags.split(',').map(t => t.trim()).includes(tag)
            );

            const collectionMatch = selectedCollections.length === 0 || selectedCollections.some(collId =>
                product.collections && product.collections.some(c => c.id === collId)
            );

            return searchMatch && tagMatch && collectionMatch;
        });

        return [...result].sort((a, b) => {
            switch (sortValue) {
                case 'a-z': return a.title.localeCompare(b.title);
                case 'z-a': return b.title.localeCompare(a.title);
                case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                default: return 0;
            }
        });
    }, [products, customProducts, queryValue, selectedTags, selectedCollections, sortValue, selectedTab]);

    const resourceName = { singular: 'product', plural: 'products' };

    const filterControl = (
        <Filters
            queryValue={queryValue}
            filters={[
                {
                    key: 'collections',
                    label: 'Collection',
                    filter: <ChoiceList title="Collection" titleHidden choices={collectionOptions} selected={selectedCollections} onChange={handleCollectionsChange} allowMultiple />,
                    shortcut: true,
                },
                {
                    key: 'tags',
                    label: 'Tags',
                    filter: <ChoiceList title="Tags" titleHidden choices={allTags} selected={selectedTags} onChange={handleTagsChange} allowMultiple />,
                    shortcut: true,
                },
            ]}
            onQueryChange={handleQueryValueChange}
            onQueryClear={handleQueryValueRemove}
            onClearAll={handleClearAll}
        />
    );

    const tabs = [
        { id: 'all-products', content: 'Semua Produk', panelID: 'all-products-content' },
        { id: 'custom-products', content: 'Produk Aktif', panelID: 'custom-products-content' },
    ];

    const renderProductItem = (product: Product) => {
        const { id, gid, title, vendor, image, tags, variants, collections: productColls, status, handle, shop } = product;
        const media = <SafeThumbnail source={image?.src || ''} alt={title} />;
        const variantCount = variants?.length || 0;
        const tagsCount = tags ? tags.split(',').length : 0;
        const collsCount = productColls?.length || 0;

        const adminUrl = `https://${shop}/admin/products/${id}`;
        const storefrontUrl = `https://${shop}/products/${handle}`;

        return (
            <ResourceItem
                id={id}
                media={media}
                accessibilityLabel={`View details for ${title}`}
                onClick={() => {
                    console.log('Navigating to designer via list item:', `/designer/${id}${location.search}`);
                    navigate(`/designer/${id}${location.search}`);
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <Text variant="bodyMd" fontWeight="bold" as="h3">
                            {title}
                        </Text>
                        <div style={{ color: '#637381', fontSize: '13px' }}>{vendor}</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px', alignItems: 'center' }}>
                            {customProducts.some(p => p.id === product.id) && (
                                <Tooltip content={`Click to ${status === 'ACTIVE' ? 'Draft' : 'Activate'}`}>
                                    <div onClick={(e: MouseEvent) => { e.stopPropagation(); handleToggleStatus(product); }} style={{ cursor: 'pointer' }}>
                                        {isUpdating === gid ? (
                                            <Spinner size="small" />
                                        ) : (
                                            <Badge tone={status === 'ACTIVE' ? 'success' : 'critical'}>
                                                {status === 'ACTIVE' ? 'Designer Active' : 'Designer Disabled'}
                                            </Badge>
                                        )}
                                    </div>
                                </Tooltip>
                            )}
                            {customProducts.some(p => p.id === product.id) && (
                                <div style={{ minWidth: '120px' }} onClick={(e) => e.stopPropagation()}>
                                    <Select
                                        label="Layout"
                                        labelHidden
                                        options={[
                                            { label: 'Direct Customize', value: 'inline' },
                                            { label: 'Modal', value: 'modal' },
                                            { label: 'Wizard', value: 'wizard' },
                                        ]}
                                        value={configs.find(c => c.shopifyProductId === product.id)?.designerLayout || 'modal'}
                                        onChange={(value) => handleLayoutChange(product.id, value)}
                                    />
                                </div>
                            )}
                            <Badge tone="info">{`${variantCount} Var`}</Badge>
                            {collsCount > 0 && <Badge tone="warning">{`${collsCount} Coll`}</Badge>}
                            {tagsCount > 0 && <Badge tone="attention">{`${tagsCount} Tag`}</Badge>}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

                        <div style={{ display: 'flex', alignItems: 'center' }} onClick={(e: MouseEvent) => e.stopPropagation()}>
                            <InlineStack gap="200">
                                <div className="flex gap-2">
                                    {customProducts.some(p => p.id === product.id) ? (
                                        <>
                                            <Tooltip content="Edit Design">
                                                <div className="border border-gray-200 rounded-md flex items-center justify-center hover:bg-indigo-50 transition-colors">
                                                    <Button
                                                        variant="plain"
                                                        icon={<Icon source={SandboxIcon} tone="info" />}
                                                        onClick={() => {
                                                            navigate(`/designer/${product.id}${location.search}`);
                                                        }}
                                                    />
                                                </div>
                                            </Tooltip>
                                            <Tooltip content="Remove and Disable Design">
                                                <div className="border border-gray-200 rounded-md flex items-center justify-center hover:bg-red-50 transition-colors">
                                                    <Button
                                                        variant="plain"
                                                        icon={<Icon source={MinusIcon} tone="critical" />}
                                                        onClick={() => {
                                                            removeFromCustom(product);
                                                        }}
                                                    />
                                                </div>
                                            </Tooltip>
                                        </>
                                    ) : (
                                        <Tooltip content="Add to Designer">
                                            <div className="border border-gray-200 rounded-md flex items-center justify-center hover:bg-green-50 transition-colors">
                                                <Button
                                                    variant="plain"
                                                    icon={<Icon source={PlusIcon} tone="success" />}
                                                    onClick={() => {
                                                        addToCustom(product);
                                                    }}
                                                />
                                            </div>
                                        </Tooltip>
                                    )}
                                    <Tooltip content="View on Storefront">
                                        <div className="border border-gray-200 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors">
                                            <Button
                                                variant="plain"
                                                icon={<Icon source={ViewIcon} />}
                                                onClick={() => window.open(storefrontUrl, '_blank')}
                                            />
                                        </div>
                                    </Tooltip>
                                    <Tooltip content="Edit in Shopify Admin">
                                        <div className="border border-gray-200 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors">
                                            <Button
                                                variant="plain"
                                                icon={<Icon source={StoreIcon} />}
                                                onClick={() => window.open(adminUrl, '_blank')}
                                            />
                                        </div>
                                    </Tooltip>
                                </div>
                            </InlineStack>
                        </div>
                    </div>
                </div>
            </ResourceItem>
        );
    }

    const emptyState = (
        <Box padding="400">
            <div style={{ textAlign: 'center' }}>
                <Text variant="bodyMd" as="p" tone="subdued">
                    No products found.
                </Text>
            </div>
        </Box>
    );

    return (
        <Page title="Product Inventory" fullWidth>
            <Layout>
                <Layout.Section>
                    <Card padding="0">
                        <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
                            {selectedTab <= 1 ? (
                                <>
                                    <ResourceList
                                        resourceName={resourceName}
                                        items={sortedProducts}
                                        loading={isLoading}
                                        filterControl={selectedTab === 0 ? filterControl : undefined}
                                        sortValue={sortValue}
                                        sortOptions={[
                                            { label: 'Newest', value: 'newest' },
                                            { label: 'Oldest', value: 'oldest' },
                                            { label: 'A-Z', value: 'a-z' },
                                            { label: 'Z-A', value: 'z-a' },
                                        ]}
                                        onSortChange={(selected) => setSortValue(selected)}
                                        renderItem={renderProductItem}
                                        emptyState={emptyState}
                                    />
                                    {pageInfo && (pageInfo.hasNextPage || pageInfo.hasPreviousPage) && (
                                        <Box padding="400">
                                            <InlineStack align="center">
                                                <Pagination
                                                    hasPrevious={pageInfo.hasPreviousPage}
                                                    onPrevious={() => loadMoreProducts('prev')}
                                                    hasNext={pageInfo.hasNextPage}
                                                    onNext={() => loadMoreProducts('next')}
                                                    label="Products"
                                                />
                                            </InlineStack>
                                            {isLoadingMore && (
                                                <Box paddingBlockStart="200">
                                                    <InlineStack align="center">
                                                        <Spinner size="small" />
                                                        <Text as="span" variant="bodySm" tone="subdued">
                                                            Loading products...
                                                        </Text>
                                                    </InlineStack>
                                                </Box>
                                            )}
                                        </Box>
                                    )}
                                </>
                            ) : (
                                <RecommendationDashboard />
                            )}
                        </Tabs>
                    </Card>
                </Layout.Section>
            </Layout>
            {toastActive && (
                <Toast content={toastContent} onDismiss={() => setToastActive(false)} duration={3000} />
            )}
        </Page>
    );
}
