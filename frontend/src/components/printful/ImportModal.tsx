import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Modal,
    FormLayout,
    TextField,
    RangeSlider,
    Text,
    BlockStack,
    Banner,
    Spinner,
    InlineStack
} from '@shopify/polaris';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';

interface ImportModalProps {
    product: any;
    onClose: () => void;
    onSuccess: () => void;
    onError?: (message: string) => void;
    isTemplateMode?: boolean;
}

export default function ImportModal({ product, onClose, onSuccess, onError, isTemplateMode = false }: ImportModalProps) {
    const fetch = useAuthenticatedFetch();
    const navigate = useNavigate();
    const [productTitle, setProductTitle] = useState(product.name);
    const [margin, setMargin] = useState(50);
    const [loading, setLoading] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(true);
    const [error, setError] = useState('');
    const [variants, setVariants] = useState<any[]>([]);
    const [basePrice, setBasePrice] = useState(0);

    useEffect(() => {
        loadProductDetails();
    }, []);

    const loadProductDetails = async () => {
        try {
            setLoadingDetails(true);
            const response = await fetch(`/imcst_api/printful/catalog/${product.id}`);
            const data = await response.json();

            if (response.ok) {
                setVariants(data.variants || []);
                
                // Calculate average base price
                if (data.variants && data.variants.length > 0) {
                    const prices = data.variants.map((v: any) => 
                        parseFloat(v.retail_price || v.price || 0)
                    );
                    const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
                    setBasePrice(avgPrice);
                }
            }
        } catch (err) {
            console.error('Failed to load product details:', err);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleImport = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch('/imcst_api/printful/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    printfulProductId: product.id,
                    productTitle,
                    margin,
                    isTemplateMode
                })
            });

            const data = await response.json();

            if (response.ok) {
                onSuccess();
                
                // In template mode, don't redirect to designer
                if (!isTemplateMode && data.shopifyProductId) {
                    navigate(`/designer/${data.shopifyProductId}`);
                }
            } else {
                const errorMsg = data.error || 'Failed to import product';
                setError(errorMsg);
                if (onError) {
                    onError(errorMsg);
                }
            }
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to import product';
            setError(errorMsg);
            if (onError) {
                onError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const calculateSellingPrice = () => {
        return (basePrice * (1 + margin / 100)).toFixed(2);
    };

    return (
        <Modal
            open={true}
            onClose={onClose}
            title={`Import ${product.name}`}
            primaryAction={{
                content: 'Import Product',
                onAction: handleImport,
                loading: loading,
                disabled: loadingDetails
            }}
            secondaryActions={[
                {
                    content: 'Cancel',
                    onAction: onClose
                }
            ]}
        >
            <Modal.Section>
                {error && (
                    <Banner title="Error" status="critical" onDismiss={() => setError('')}>
                        {error}
                    </Banner>
                )}

                {loadingDetails ? (
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                        <Spinner size="small" />
                        <Text as="p" variant="bodyMd" tone="subdued">
                            Loading product details...
                        </Text>
                    </div>
                ) : (
                    <FormLayout>
                        {isTemplateMode && (
                            <Banner status="info">
                                <p>
                                    This product will be imported with your global design settings as the default template.
                                </p>
                            </Banner>
                        )}

                        <TextField
                            label="Product Title"
                            value={productTitle}
                            onChange={setProductTitle}
                            autoComplete="off"
                            helpText="This will be the product name in your Shopify store"
                        />

                        <BlockStack gap="200">
                            <Text as="p" variant="bodyMd" fontWeight="semibold">
                                Pricing
                            </Text>
                            
                            <RangeSlider
                                label="Profit Margin"
                                value={margin}
                                onChange={setMargin}
                                min={0}
                                max={200}
                                step={5}
                                output
                                suffix={
                                    <Text as="span" variant="bodyMd">
                                        {margin}%
                                    </Text>
                                }
                            />

                            <InlineStack gap="400" blockAlign="center">
                                <BlockStack gap="100">
                                    <Text as="p" variant="bodySm" tone="subdued">
                                        Base Price (avg)
                                    </Text>
                                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                                        ${basePrice.toFixed(2)}
                                    </Text>
                                </BlockStack>

                                <Text as="span" variant="bodyLg">
                                    →
                                </Text>

                                <BlockStack gap="100">
                                    <Text as="p" variant="bodySm" tone="subdued">
                                        Selling Price (avg)
                                    </Text>
                                    <Text as="p" variant="bodyMd" fontWeight="semibold" tone="success">
                                        ${calculateSellingPrice()}
                                    </Text>
                                </BlockStack>
                            </InlineStack>
                        </BlockStack>

                        <Banner>
                            <p>
                                This product will be imported with {variants.length} variant(s) and automatically configured for customization.
                            </p>
                        </Banner>
                    </FormLayout>
                )}
            </Modal.Section>
        </Modal>
    );
}
