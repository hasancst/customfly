import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, Text, FormLayout, TextField, Select, InlineStack, Banner, Box, Checkbox, Badge, Button } from '@shopify/polaris';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

export default function Settings() {
    const fetch = useAuthenticatedFetch();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Form Stats
    const [buttonText, setButtonText] = useState('Design It');
    const [designerLayout, setDesignerLayout] = useState('redirect');
    const [unit, setUnit] = useState('cm');
    const [showRulers, setShowRulers] = useState(false);
    const [showSafeArea, setShowSafeArea] = useState(true);

    const fetchConfig = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/imcst_api/shop_config');
            if (response.ok) {
                const data = await response.json();
                if (data.buttonText) setButtonText(data.buttonText);
                if (data.designerLayout) setDesignerLayout(data.designerLayout);
                if (data.unit) setUnit(data.unit);
                if (data.showRulers !== undefined) setShowRulers(data.showRulers);
                if (data.showSafeArea !== undefined) setShowSafeArea(data.showSafeArea);
            }
        } catch (error) {
            console.error('Failed to fetch shop config:', error);
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
                setTimeout(() => setToastMessage(null), 3000);
            }
        } catch (error) {
            console.error('Failed to save shop config:', error);
        } finally {
            setIsSaving(false);
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
                {toastMessage && (
                    <Layout.Section>
                        <Banner tone="success" onDismiss={() => setToastMessage(null)}>
                            <p>{toastMessage}</p>
                        </Banner>
                    </Layout.Section>
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
                                            { label: 'Redirect (New Page)', value: 'redirect' },
                                            { label: 'Inline (Below Add to Cart)', value: 'inline' },
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
