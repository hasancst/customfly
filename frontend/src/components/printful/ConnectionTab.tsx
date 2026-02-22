import { useState } from 'react';
import {
    FormLayout,
    TextField,
    Button,
    Text,
    BlockStack,
    InlineStack,
    Badge,
    Banner,
    Link
} from '@shopify/polaris';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';

interface ConnectionTabProps {
    connectionStatus: any;
    onConnectionChange: () => void;
}

export default function ConnectionTab({ connectionStatus, onConnectionChange }: ConnectionTabProps) {
    const fetch = useAuthenticatedFetch();
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleConnect = async () => {
        if (!apiKey.trim()) {
            setError('Please enter your Printful API key');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setSuccess('');

            const response = await fetch('/imcst_api/printful/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: apiKey })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Printful connected successfully!');
                setApiKey('');
                onConnectionChange();
            } else {
                setError(data.error || 'Failed to connect Printful');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to connect Printful');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect Printful?')) {
            return;
        }

        try {
            setLoading(true);
            setError('');
            setSuccess('');

            const response = await fetch('/imcst_api/printful/disconnect', {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Printful disconnected successfully');
                onConnectionChange();
            } else {
                setError(data.error || 'Failed to disconnect Printful');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to disconnect Printful');
        } finally {
            setLoading(false);
        }
    };

    return (
        <BlockStack gap="400">
            {error && (
                <Banner title="Error" status="critical" onDismiss={() => setError('')}>
                    {error}
                </Banner>
            )}

            {success && (
                <Banner title="Success" status="success" onDismiss={() => setSuccess('')}>
                    {success}
                </Banner>
            )}

            <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                    Connection Status
                </Text>
                <InlineStack gap="200" align="start">
                    <Text as="p" variant="bodyMd">
                        Status:
                    </Text>
                    {connectionStatus?.connected ? (
                        <Badge tone="success">Connected</Badge>
                    ) : (
                        <Badge>Not Connected</Badge>
                    )}
                </InlineStack>

                {connectionStatus?.connected && connectionStatus.storeId && (
                    <Text as="p" variant="bodyMd" tone="subdued">
                        Store ID: {connectionStatus.storeId}
                    </Text>
                )}
            </BlockStack>

            {!connectionStatus?.connected ? (
                <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                        Connect Printful
                    </Text>

                    <Banner>
                        <p>
                            To connect Printful, you need an API key from your Printful dashboard.
                        </p>
                        <p>
                            <Link url="https://www.printful.com/dashboard/store" external>
                                Get your API key from Printful →
                            </Link>
                        </p>
                    </Banner>

                    <FormLayout>
                        <TextField
                            label="Printful API Key"
                            value={apiKey}
                            onChange={setApiKey}
                            placeholder="Enter your Printful API key"
                            autoComplete="off"
                            type="password"
                            helpText="Your API key will be stored securely and used to sync products from Printful"
                        />

                        <Button
                            variant="primary"
                            onClick={handleConnect}
                            loading={loading}
                            disabled={!apiKey.trim()}
                        >
                            Connect Printful
                        </Button>
                    </FormLayout>
                </BlockStack>
            ) : (
                <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                        Manage Connection
                    </Text>

                    <Text as="p" variant="bodyMd" tone="subdued">
                        Your Printful account is connected. You can now import products from the Catalog tab.
                    </Text>

                    <Button
                        variant="plain"
                        tone="critical"
                        onClick={handleDisconnect}
                        loading={loading}
                    >
                        Disconnect Printful
                    </Button>
                </BlockStack>
            )}

            <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                    About Printful Integration
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                    Printful integration allows you to:
                </Text>
                <ul style={{ marginLeft: '20px', color: 'var(--p-color-text-subdued)' }}>
                    <li>Browse Printful's product catalog</li>
                    <li>Import products directly to your Shopify store</li>
                    <li>Automatically set up customization for each product</li>
                    <li>Sync pricing and inventory</li>
                    <li>Fulfill orders through Printful</li>
                </ul>
            </BlockStack>
        </BlockStack>
    );
}
