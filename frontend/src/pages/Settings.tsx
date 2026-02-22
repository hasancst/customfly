import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, Text, FormLayout, TextField, Select, InlineStack, Box, Checkbox, Badge, Button, Toast, Banner, Link } from '@shopify/polaris';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

export default function Settings() {
    const fetch = useAuthenticatedFetch();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toastActive, setToastActive] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // Form Stats
    const [buttonText, setButtonText] = useState('Design It');
    const [designerLayout, setDesignerLayout] = useState('modal');
    const [unit, setUnit] = useState('cm');
    const [showRulers, setShowRulers] = useState(false);
    const [showSafeArea, setShowSafeArea] = useState(true);

    // Printful Connection
    const [printfulConnected, setPrintfulConnected] = useState<boolean | null>(null); // null = loading, true/false = loaded
    const [printfulStoreId, setPrintfulStoreId] = useState('');
    const [printfulApiKey, setPrintfulApiKey] = useState('');
    const [printfulLoading, setPrintfulLoading] = useState(false);
    const [printfulError, setPrintfulError] = useState('');
    const [printfulSuccess, setPrintfulSuccess] = useState('');

    const fetchConfig = useCallback(async () => {
        setIsLoading(true);
        try {
            const [configResponse, printfulResponse] = await Promise.all([
                fetch('/imcst_api/shop_config'),
                fetch('/imcst_api/printful/status')
            ]);
            
            if (configResponse.ok) {
                try {
                    const data = await configResponse.json();
                    if (data.buttonText) setButtonText(data.buttonText);
                    if (data.designerLayout) setDesignerLayout(data.designerLayout);
                    if (data.unit) setUnit(data.unit);
                    if (data.showRulers !== undefined) setShowRulers(data.showRulers);
                    if (data.showSafeArea !== undefined) setShowSafeArea(data.showSafeArea);
                } catch (jsonError) {
                    console.error('[Settings] shop_config JSON parse error:', jsonError);
                }
            }
            
            if (printfulResponse.ok) {
                try {
                    const data = await printfulResponse.json();
                    console.log('[Settings] Printful status response:', data);
                    setPrintfulConnected(data.connected === true);
                    setPrintfulStoreId(data.storeId || '');
                    console.log('[Settings] Set printfulConnected to:', data.connected === true);
                } catch (jsonError) {
                    console.error('[Settings] Printful status JSON parse error:', jsonError);
                    setPrintfulConnected(false);
                }
            } else if (printfulResponse.status === 429) {
                // Rate limit hit - assume connected if we have cached data
                console.warn('[Settings] Printful API rate limit (429), using cached state');
                // Don't change state - keep previous value
            } else {
                console.error('[Settings] Printful status request failed:', printfulResponse.status);
                setPrintfulConnected(false);
            }
        } catch (error) {
            console.error('Failed to fetch config:', error);
        } finally {
            setIsLoading(false);
        }
    }, [fetch]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch('/imcst_api/shop_config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    buttonText,
                    designerLayout,
                    unit,
                    showRulers,
                    showSafeArea
                })
            });
            if (response.ok) {
                setToastMessage('Global settings saved successfully!');
                setToastActive(true);
            }
        } catch (error) {
            console.error('Failed to save shop config:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrintfulConnect = async () => {
        if (!printfulApiKey.trim()) {
            setPrintfulError('Please enter your Printful API key');
            return;
        }

        try {
            setPrintfulLoading(true);
            setPrintfulError('');
            setPrintfulSuccess('');

            const response = await fetch('/imcst_api/printful/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: printfulApiKey })
            });

            const data = await response.json();

            if (response.ok) {
                setPrintfulSuccess('Printful connected successfully!');
                setPrintfulApiKey(''); // Clear input after successful connection
                setPrintfulConnected(true);
                setPrintfulStoreId(data.storeId || '');
            } else {
                setPrintfulError(data.error || 'Failed to connect Printful');
            }
        } catch (err: any) {
            setPrintfulError(err.message || 'Failed to connect Printful');
        } finally {
            setPrintfulLoading(false);
        }
    };

    const handlePrintfulDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect Printful?')) {
            return;
        }

        try {
            setPrintfulLoading(true);
            setPrintfulError('');
            setPrintfulSuccess('');

            const response = await fetch('/imcst_api/printful/disconnect', {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok) {
                setPrintfulSuccess('Printful disconnected successfully');
                setPrintfulConnected(false);
                setPrintfulStoreId('');
            } else {
                setPrintfulError(data.error || 'Failed to disconnect Printful');
            }
        } catch (err: any) {
            setPrintfulError(err.message || 'Failed to disconnect Printful');
        } finally {
            setPrintfulLoading(false);
        }
    };

    if (isLoading) {
        return (
            <Page title="Settings">
                <Layout>
                    <Layout.Section>
                        <Card>
                            <Box padding="400">
                                <Text variant="bodyMd" as="p">Loading settings...</Text>
                            </Box>
                        </Card>
                    </Layout.Section>
                </Layout>
            </Page>
        );
    }

    return (
        <Page
            title="Settings"
            subtitle="Configure global defaults for your product designer"
            primaryAction={{
                content: 'Save Global Settings',
                onAction: handleSave,
                loading: isSaving
            }}
        >
            <Layout>
                {toastActive && (
                    <Toast content={toastMessage} onDismiss={() => setToastActive(false)} />
                )}

                <Layout.Section>
                    <Card>
                        <Box padding="400">
                            <Text as="p" variant="bodyMd">
                                Configure your application settings and preferences here.
                            </Text>
                            <Box paddingBlockStart="400">
                                <Button url="/settings/designer" variant="primary">
                                    Open Global Product Designer
                                </Button>
                            </Box>
                        </Box>
                    </Card>

                    <Box paddingBlockStart="400">
                        <Card>
                            <Box padding="400">
                                <FormLayout>
                                    <Text variant="headingMd" as="h2">General Display</Text>
                                    <TextField
                                        label="Default Call-to-Action Text"
                                        value={buttonText}
                                        onChange={setButtonText}
                                        autoComplete="off"
                                        helpText="This is the text shown on the 'Design It' buttons on your storefront."
                                    />
                                    <Select
                                        label="Default Designer Layout"
                                        options={[
                                            { label: 'Direct Customize (On Page)', value: 'inline' },
                                            { label: 'Popup Modal', value: 'modal' },
                                            { label: 'Wizard (Step by Step)', value: 'wizard' }
                                        ]}
                                        value={designerLayout}
                                        onChange={setDesignerLayout}
                                    />
                                </FormLayout>
                            </Box>
                        </Card>
                    </Box>

                    <Box paddingBlockStart="400">
                        <Card>
                            <Box padding="400">
                                <FormLayout>
                                    <Text variant="headingMd" as="h2">Canvas Defaults</Text>
                                    <Select
                                        label="Measurement Unit"
                                        options={[
                                            { label: 'Centimeters (cm)', value: 'cm' },
                                            { label: 'Millimeters (mm)', value: 'mm' },
                                            { label: 'Inches (in)', value: 'inch' }
                                        ]}
                                        value={unit}
                                        onChange={setUnit}
                                    />
                                    <Checkbox
                                        label="Show Rulers by Default"
                                        checked={showRulers}
                                        onChange={setShowRulers}
                                    />
                                    <Checkbox
                                        label="Show Safe Print Area by Default"
                                        checked={showSafeArea}
                                        onChange={setShowSafeArea}
                                    />
                                </FormLayout>
                            </Box>
                        </Card>
                    </Box>

                    <Box paddingBlockStart="400">
                        <Card>
                            <Box padding="400">
                                <FormLayout>
                                    <Text variant="headingMd" as="h2">Printful Integration</Text>
                                    
                                    {printfulError && (
                                        <Banner title="Error" status="critical" onDismiss={() => setPrintfulError('')}>
                                            {printfulError}
                                        </Banner>
                                    )}

                                    {printfulSuccess && (
                                        <Banner title="Success" status="success" onDismiss={() => setPrintfulSuccess('')}>
                                            {printfulSuccess}
                                        </Banner>
                                    )}

                                    <Box>
                                        <InlineStack gap="200" align="start">
                                            <Text as="p" variant="bodyMd">
                                                Status:
                                            </Text>
                                            {printfulConnected === null ? (
                                                <Badge tone="info">Checking...</Badge>
                                            ) : printfulConnected ? (
                                                <Badge tone="success">Connected</Badge>
                                            ) : (
                                                <Badge>Not Connected</Badge>
                                            )}
                                        </InlineStack>

                                        {printfulConnected && printfulStoreId && (
                                            <Box paddingBlockStart="200">
                                                <Text as="p" variant="bodyMd" tone="subdued">
                                                    Store ID: {printfulStoreId}
                                                </Text>
                                            </Box>
                                        )}
                                    </Box>

                                    {printfulConnected === null ? (
                                        <Box>
                                            <Text as="p" variant="bodyMd" tone="subdued">
                                                Loading connection status...
                                            </Text>
                                        </Box>
                                    ) : !printfulConnected ? (
                                        <>
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

                                            <TextField
                                                label="Printful API Key"
                                                value={printfulApiKey}
                                                onChange={setPrintfulApiKey}
                                                placeholder="Enter your Printful API key"
                                                autoComplete="off"
                                                type="password"
                                                helpText="Your API key will be stored securely and used to sync products from Printful"
                                            />

                                            <Button
                                                variant="primary"
                                                onClick={handlePrintfulConnect}
                                                loading={printfulLoading}
                                                disabled={!printfulApiKey.trim()}
                                            >
                                                Connect Printful
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Banner tone="success">
                                                <p>
                                                    Your Printful account is connected and your API key is securely stored.
                                                </p>
                                                <p>
                                                    You can now import products from the Printful catalog.
                                                </p>
                                            </Banner>

                                            <InlineStack gap="200">
                                                <Button url="/printful" variant="primary">
                                                    Browse Printful Catalog
                                                </Button>
                                                <Button
                                                    variant="plain"
                                                    tone="critical"
                                                    onClick={handlePrintfulDisconnect}
                                                    loading={printfulLoading}
                                                >
                                                    Disconnect
                                                </Button>
                                            </InlineStack>
                                        </>
                                    )}

                                    <Box paddingBlockStart="200">
                                        <Text as="p" variant="bodyMd" tone="subdued">
                                            Printful integration allows you to browse products, import to your store, and automatically fulfill orders.
                                        </Text>
                                    </Box>
                                </FormLayout>
                            </Box>
                        </Card>
                    </Box>
                </Layout.Section>

                <Layout.Section variant="oneThird">
                    <Card>
                        <Box padding="400">
                            <Text variant="headingMd" as="h2">About Global Settings</Text>
                            <Box paddingBlockStart="200">
                                <Text variant="bodyMd" as="p" tone="subdued">
                                    Settings configured here will be used as the default for all new products.
                                    Existing products with specific configurations will keep their individual settings.
                                </Text>
                            </Box>
                        </Box>
                    </Card>

                    <Box paddingBlockStart="400">
                        <Card>
                            <Box padding="400">
                                <Text variant="headingMd" as="h2">Integration Status</Text>
                                <Box paddingBlockStart="200">
                                    <InlineStack align="space-between">
                                        <Text variant="bodyMd" as="span">Storefront SDK</Text>
                                        <Badge tone="success">Active</Badge>
                                    </InlineStack>
                                    <Box paddingBlockStart="200">
                                        <InlineStack align="space-between">
                                            <Text variant="bodyMd" as="span">Order Webhooks</Text>
                                            <Badge tone="success">Connected</Badge>
                                        </InlineStack>
                                    </Box>
                                </Box>
                            </Box>
                        </Card>
                    </Box>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
