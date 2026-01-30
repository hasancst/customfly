import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { Canvas } from '../components/Canvas';
import { Spinner, Text, Box, Button, InlineStack, Card, Page, Layout } from '@shopify/polaris';
import { ExportIcon } from '@shopify/polaris-icons';

export default function ProductionExport() {
    const { designId } = useParams();
    const [design, setDesign] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const fetch = useAuthenticatedFetch();

    useEffect(() => {
        const fetchDesign = async () => {
            if (!designId) return;
            try {
                const response = await fetch(`/imcst_api/designs/${designId}`);
                if (response.ok) {
                    const data = await response.json();
                    setDesign(data);
                }
            } catch (err) {
                console.error('Failed to fetch design:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDesign();
    }, [designId, fetch]);

    const handleExport = async (scale = 4) => {
        setIsExporting(true);
        const canvasElement = document.getElementById('canvas-paper');
        if (!canvasElement) {
            setIsExporting(false);
            return;
        }

        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(canvasElement, {
                useCORS: true,
                scale: scale, // 4x for production quality (approx 300-400 DPI depending on base size)
                backgroundColor: null,
                ignoreElements: (element: Element) => {
                    return element.classList.contains('imcst-preview-hide');
                }
            });

            const link = document.createElement('a');
            link.download = `${design.name || 'design'}_production.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) {
        return (
            <Box padding="2000">
                <InlineStack align="center">
                    <Spinner size="large" />
                    <Text variant="bodyMd" as="p">Loading production data...</Text>
                </InlineStack>
            </Box>
        );
    }

    if (!design) {
        return (
            <Box padding="2000">
                <Text variant="headingLg" as="h1" tone="critical">Design not found</Text>
            </Box>
        );
    }

    let designJson: any = {};
    try {
        designJson = typeof design.designJson === 'string' ? JSON.parse(design.designJson) : (design.designJson || {});
    } catch (e) {
        console.error('Invalid designJson:', e);
        designJson = {};
    }

    // Normalize pages accurately
    const pages = Array.isArray(designJson)
        ? designJson
        : (Array.isArray(designJson.pages) ? designJson.pages : [{ id: 'default', elements: Array.isArray(designJson.elements) ? designJson.elements : [] }]);

    const firstPage = pages[0] || { elements: [] };

    return (
        <Page
            title={`Export: ${design.name}`}
            backAction={{ content: 'Orders', url: '/orders' }}
            primaryAction={{
                content: 'Download PNG (High-Res)',
                onAction: () => handleExport(4),
                loading: isExporting,
                icon: ExportIcon
            }}
        >
            <Layout>
                <Layout.Section>
                    <Card>
                        <Box padding="400">
                            <Text variant="bodyMd" as="p" tone="subdued">
                                Rendering design for high-resolution export.
                                The view below is a preview at 100% scale.
                            </Text>
                        </Box>

                        <div className="flex items-center justify-center bg-gray-100 p-8 overflow-auto min-h-[600px]">
                            <div id="production-render-target">
                                <Canvas
                                    elements={firstPage.elements}
                                    selectedElement={null}
                                    onSelectElement={() => { }}
                                    onUpdateElement={() => { }}
                                    onDeleteElement={() => { }}
                                    onDuplicateElement={() => { }}
                                    zoom={100}
                                    showSafeArea={false}
                                    productVariant={{ color: firstPage.baseImageColor || 'white' } as any}
                                    showRulers={false}
                                    unit="mm"
                                    enableBounce={false}
                                    paperSize={designJson.paperSize || 'A4'}
                                    customPaperDimensions={designJson.customPaperDimensions || { width: 210, height: 297 }}
                                    safeAreaPadding={0}
                                    safeAreaRadius={0}
                                    safeAreaWidth={210}
                                    safeAreaHeight={297}
                                    safeAreaShape="rectangle"
                                    safeAreaOffset={{ x: 0, y: 0 }}
                                    onUpdateSafeAreaOffset={() => { }}
                                    onUpdateSafeAreaWidth={() => { }}
                                    onUpdateSafeAreaHeight={() => { }}
                                    baseImage={firstPage.baseImage}
                                    baseImageColor={firstPage.baseImageColor}
                                    baseImageColorEnabled={firstPage.baseImageColorEnabled}
                                    baseImageProperties={firstPage.baseImageProperties || { x: 0, y: 0, scale: 1 }}
                                    onUpdateBaseImage={() => { }}
                                />
                            </div>
                        </div>
                    </Card>
                </Layout.Section>

                <Layout.Section variant="oneThird">
                    <Card>
                        <Box padding="400">
                            <Text variant="headingMd" as="h2">Export Settings</Text>
                            <Box paddingBlockStart="400">
                                <InlineStack gap="400" blockAlign="center">
                                    <Button onClick={() => handleExport(2)}>Small (72 DPI)</Button>
                                    <Button onClick={() => handleExport(4)}>Production (300 DPI)</Button>
                                    <Button onClick={() => handleExport(8)}>Ultra (600 DPI)</Button>
                                </InlineStack>
                            </Box>
                        </Box>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
