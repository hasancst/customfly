import { useState, useEffect } from 'react';
import {
    BlockStack,
    Text,
    Spinner,
    EmptyState,
    InlineGrid,
    Banner,
    Pagination,
    InlineStack,
    Toast
} from '@shopify/polaris';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';
import ProductCard from './ProductCard';
import ImportModal from './ImportModal';

interface CatalogTabProps {
    connected: boolean;
    isTemplateMode?: boolean;
}

const ITEMS_PER_PAGE = 20;

export default function CatalogTab({ connected, isTemplateMode = false }: CatalogTabProps) {
    const fetch = useAuthenticatedFetch();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [toastActive, setToastActive] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastError, setToastError] = useState(false);

    useEffect(() => {
        if (connected) {
            loadCatalog(1);
        }
    }, [connected]);

    const loadCatalog = async (page: number) => {
        try {
            setLoading(true);
            setError('');

            const offset = (page - 1) * ITEMS_PER_PAGE;
            const response = await fetch(`/imcst_api/printful/catalog?limit=${ITEMS_PER_PAGE}&offset=${offset}`);
            const data = await response.json();

            if (response.ok) {
                // Printful API v2 returns { data: [...], paging: {...} }
                const catalogData = data.data || data.result || [];
                setProducts(catalogData);
                setCurrentPage(page);
                
                // Check if there are more products
                // Printful returns paging info: { total: number, offset: number, limit: number }
                if (data.paging) {
                    setTotalProducts(data.paging.total || 0);
                    setHasMore(offset + catalogData.length < data.paging.total);
                } else {
                    // If no paging info, assume there might be more if we got a full page
                    setHasMore(catalogData.length === ITEMS_PER_PAGE);
                }
            } else {
                setError(data.error || 'Failed to load catalog');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load catalog');
        } finally {
            setLoading(false);
        }
    };

    const handleImportClick = (product: any) => {
        setSelectedProduct(product);
        setShowImportModal(true);
    };

    const handleImportSuccess = () => {
        setShowImportModal(false);
        setSelectedProduct(null);
        
        // Show success toast
        setToastMessage(isTemplateMode 
            ? 'Product imported successfully with global design settings!' 
            : 'Product imported successfully!');
        setToastError(false);
        setToastActive(true);
    };

    const handleImportError = (message: string) => {
        // Show error toast
        setToastMessage(message);
        setToastError(true);
        setToastActive(true);
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            loadCatalog(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (hasMore) {
            loadCatalog(currentPage + 1);
        }
    };

    if (!connected) {
        return (
            <EmptyState
                heading="Printful not connected"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
                <p>Connect your Printful account to browse and import products.</p>
            </EmptyState>
        );
    }

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <Spinner size="large" />
                <Text as="p" variant="bodyMd" tone="subdued">
                    Loading Printful catalog...
                </Text>
            </div>
        );
    }

    if (error) {
        return (
            <Banner 
                title="Error loading catalog" 
                status="critical"
                action={{
                    content: 'Retry',
                    onAction: () => loadCatalog(currentPage)
                }}
            >
                <p>{error}</p>
                {error.includes('AI usage limit') && (
                    <p style={{ marginTop: '8px' }}>
                        <strong>Note:</strong> Printful has hourly API rate limits. Please wait a few minutes and try again.
                    </p>
                )}
                {error.includes('limit') && !error.includes('AI usage') && (
                    <p style={{ marginTop: '8px' }}>
                        <strong>Note:</strong> You've reached Printful's API rate limit. Please try again in a few minutes.
                    </p>
                )}
            </Banner>
        );
    }

    if (products.length === 0) {
        return (
            <EmptyState
                heading="No products found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
                <p>No products available in Printful catalog.</p>
            </EmptyState>
        );
    }

    return (
        <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
                Printful Product Catalog
            </Text>

            <Text as="p" variant="bodyMd" tone="subdued">
                Browse products from Printful and import them to your store. Each product will be automatically configured for customization.
                {totalProducts > 0 && ` (${totalProducts} products available)`}
            </Text>

            <InlineGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="400">
                {products.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onImport={handleImportClick}
                    />
                ))}
            </InlineGrid>

            {/* Pagination */}
            {products.length > 0 && (
                <InlineStack align="center">
                    <Pagination
                        hasPrevious={currentPage > 1}
                        onPrevious={handlePreviousPage}
                        hasNext={hasMore}
                        onNext={handleNextPage}
                        label={`Page ${currentPage}`}
                    />
                </InlineStack>
            )}

            {showImportModal && selectedProduct && (
                <ImportModal
                    product={selectedProduct}
                    onClose={() => setShowImportModal(false)}
                    onSuccess={handleImportSuccess}
                    onError={handleImportError}
                    isTemplateMode={isTemplateMode}
                />
            )}

            {toastActive && (
                <Toast
                    content={toastMessage}
                    onDismiss={() => setToastActive(false)}
                    error={toastError}
                />
            )}
        </BlockStack>
    );
}
