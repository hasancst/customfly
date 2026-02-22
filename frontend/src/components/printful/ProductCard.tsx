import { Card, BlockStack, Text, Button, InlineStack, Thumbnail } from '@shopify/polaris';
import { ImageIcon } from '@shopify/polaris-icons';

interface ProductCardProps {
    product: any;
    onImport: (product: any) => void;
}

export default function ProductCard({ product, onImport }: ProductCardProps) {
    const imageUrl = product.image || product.thumbnail_url;

    return (
        <Card>
            <BlockStack gap="300">
                <div style={{ 
                    width: '100%', 
                    height: '200px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: '#f6f6f7',
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}>
                    {imageUrl ? (
                        <img 
                            src={imageUrl} 
                            alt={product.name}
                            style={{ 
                                maxWidth: '100%', 
                                maxHeight: '100%',
                                objectFit: 'contain'
                            }}
                        />
                    ) : (
                        <Thumbnail
                            source={ImageIcon}
                            alt="No image"
                            size="large"
                        />
                    )}
                </div>

                <BlockStack gap="200">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">
                        {product.name}
                    </Text>

                    {product.type && (
                        <Text as="p" variant="bodySm" tone="subdued">
                            {product.type}
                        </Text>
                    )}

                    {product.brand && (
                        <Text as="p" variant="bodySm" tone="subdued">
                            Brand: {product.brand}
                        </Text>
                    )}
                </BlockStack>

                <Button
                    variant="primary"
                    onClick={() => onImport(product)}
                    fullWidth
                >
                    Import to Shopify
                </Button>
            </BlockStack>
        </Card>
    );
}
