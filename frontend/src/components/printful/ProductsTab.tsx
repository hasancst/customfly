import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BlockStack,
    Text,
    Spinner,
    EmptyState,
    DataTable,
    Button,
    InlineStack,
    Badge,
    Banner
} from '@shopify/polaris';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';

interface ProductsTabProps {
    connected: boolean;
}

export default function ProductsTab({ connected }: ProductsTabProps) {
    const fetch = useAuthenticatedFetch();
    const navigate = useNavigate();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [syncing, setSyncing] = useState<string | null>(null);

    useEffect(() => {
        if (connected) {
            loadProducts();
        }
    }, [connected]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch('/imcst_api/printful/products');
            const data = await response.json();

            if (response.ok) {
                setProducts(data.products || []);
            } else {
                setError(data.error || 'Failed to load products');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async (productId: string, shopifyProductId: string) => {
        try {
            setSyncing(productId);

            const response = await fetch(`/imcst_api/printful/sync/${shopifyProductId}`, {
                method: 'POST'
            });

            const data = await response.json();

            if (response.ok) {
                alert('Product synced successfully!');
                loadProducts();
            } else {
                alert(data.error || 'Failed to sync product');
            }
        } catch (err: any) {
            alert(err.message || 'Failed to sync product');
        } finally {
            setSyncing(null);
        }
    };

    const handleDelete = async (productId: string) => {
        if (!confirm('Remove this product mapping? (Shopify product will not be deleted)')) {
            return;
        }

        try {
            const response = await fetch(`/imcst_api/printful/products/${productId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok) {
                loadProducts();
            } else {
                alert(data.error || 'Failed to delete product mapping');
            }
        } catch (err: any) {
            alert(err.message || 'Failed to delete product mapping');
        }
    };

    const handleOpenDesigner = (shopifyProductId: string) => {
        navigate(`/designer/${shopifyProductId}`);
    };

    if (!connected) {
        return (
            <EmptyState
                heading="Printful not connected"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
                <p>Connect your Printful account to view imported products.</p>
            </EmptyState>
        );
    }

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <Spinner size="large" />
                <Text as="p" variant="bodyMd" tone="subdued">
                    Loading imported products...
                </Text>
            </div>
        );
    }

    if (error) {
        return (
            <Banner title="Error loading products" status="critical">
                {error}
            </Banner>
        );
    }

    if (products.length === 0) {
        return (
            <EmptyState
                heading="No products imported yet"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
                <p>Import products from the Catalog tab to get started.</p>
            </EmptyState>
        );
    }

    const rows = products.map((product) => [
        product.printfulProductId,
        product.shopifyProductId || 'N/A',
        <Badge tone={product.status === 'synced' ? 'success' : 'attention'}>
            {product.status}
        </Badge>,
        new Date(product.createdAt).toLocaleDateString(),
        <InlineStack gap="200">
            <Button
                size="slim"
                onClick={() => handleOpenDesigner(product.shopifyProductId)}
                disabled={!product.shopifyProductId}
            >
                Open Designer
            </Button>
            <Button
                size="slim"
                onClick={() => handleSync(product.id, product.shopifyProductId)}
                loading={syncing === product.id}
                disabled={!product.shopifyProductId}
            >
                Sync
            </Button>
            <Button
                size="slim"
                tone="critical"
                onClick={() => handleDelete(product.id)}
            >
                Remove
            </Button>
        </InlineStack>
    ]);

    return (
        <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
                Imported Products
            </Text>

            <Text as="p" variant="bodyMd" tone="subdued">
                Manage products imported from Printful. You can sync pricing, open the designer, or remove the mapping.
            </Text>

            <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                headings={['Printful ID', 'Shopify ID', 'Status', 'Imported', 'Actions']}
                rows={rows}
            />
        </BlockStack>
    );
}
