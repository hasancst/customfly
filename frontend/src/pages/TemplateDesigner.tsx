import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Fullscreen } from '@shopify/app-bridge/actions';
import { DesignerCore } from '../components/DesignerCore';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { Toaster } from 'sonner';

export default function TemplateDesigner() {
    const { templateId } = useParams<{ templateId?: string }>();
    const fetch = useAuthenticatedFetch();
    const shopifyApp = useAppBridge();

    const [template, setTemplate] = useState<any>(null);
    const [loading, setLoading] = useState(!!templateId);
    const [assets, setAssets] = useState<{ fonts: any[], colors: any[], options: any[], galleries: any[] }>({ 
        fonts: [], colors: [], options: [], galleries: [] 
    });

    // Admin Fullscreen
    useEffect(() => {
        if (shopifyApp) {
            const fullscreen = Fullscreen.create(shopifyApp);
            fullscreen.dispatch(Fullscreen.Action.ENTER);
            return () => { fullscreen.dispatch(Fullscreen.Action.EXIT); };
        }
    }, [shopifyApp]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);

            // Load assets
            const assetsRes = await fetch('/imcst_api/assets');
            if (assetsRes && assetsRes.ok) {
                const allAssets = await assetsRes.json();
                setAssets({
                    fonts: allAssets.filter((a: any) => a.type === 'font'),
                    colors: allAssets.filter((a: any) => a.type === 'color'),
                    options: allAssets.filter((a: any) => a.type === 'option'),
                    galleries: allAssets.filter((a: any) => a.type === 'gallery')
                });
            }

            // Load template if editing
            if (templateId) {
                const templateRes = await fetch(`/imcst_api/templates/${templateId}`);
                if (templateRes && templateRes.ok) {
                    const templateData = await templateRes.json();
                    setTemplate(templateData);
                }
            }
        } catch (err) {
            console.error('Failed to load template data:', err);
        } finally {
            setLoading(false);
        }
    }, [templateId, fetch]);

    useEffect(() => { 
        loadData(); 
    }, [loadData]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-indigo-50 border-t-indigo-600 animate-spin"></div>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">Template Designer</h2>
                    <p className="text-sm font-medium text-gray-500 animate-pulse">Loading template...</p>
                </div>
            </div>
        );
    }

    // Default config for new templates
    const defaultConfig = {
        unit: 'px',
        paperSize: 'Custom',
        customPaperDimensions: { width: 1000, height: 1000 },
        showSafeArea: true,
        showRulers: false,
        safeAreaPadding: 10,
        safeAreaRadius: 0,
        baseImageScale: 80
    };

    // Use template data if editing, otherwise use defaults
    const initialConfig = template ? {
        unit: template.unit || 'px',
        paperSize: template.paperSize || 'Custom',
        customPaperDimensions: template.customPaperDimensions || { width: 1000, height: 1000 },
        showSafeArea: true,
        showRulers: false,
        safeAreaPadding: 10,
        safeAreaRadius: 0,
        baseImageScale: 80
    } : defaultConfig;

    const initialPages = template?.pages || [{
        id: 'default',
        name: 'Side 1',
        elements: [],
        baseImage: '',
        baseImageProperties: { x: 0, y: 0, scale: 1, width: 1000, height: 1000 }
    }];

    return (
        <>
            <Toaster />
            <DesignerCore
                isPublicMode={false}
                initialPages={initialPages}
                initialConfig={initialConfig}
                initialDesignId={template?.id}
                productId="template"
                productData={{
                    id: 'template',
                    title: template?.name || 'New Template',
                    shop: '',
                    variants: [],
                    options: []
                }}
                userFonts={assets.fonts}
                userColors={assets.colors}
                userOptions={assets.options}
                userGalleries={assets.galleries}
                savedDesigns={[]}
                onDeleteDesign={() => {}}
                onClearAllDesigns={() => {}}
                customFetch={fetch}
                onSave={async (data) => {
                    try {
                        const templateData = {
                            name: data.name || 'Untitled Template',
                            description: '',
                            paperSize: data.config.paperSize || 'Custom',
                            unit: data.config.unit || 'px',
                            customPaperDimensions: data.config.customPaperDimensions || { width: 1000, height: 1000 },
                            pages: data.designJson,
                            thumbnail: data.previewUrl,
                            tags: []
                        };

                        const url = template?.id 
                            ? `/imcst_api/templates/${template.id}`
                            : '/imcst_api/templates';
                        
                        const method = template?.id ? 'PUT' : 'POST';

                        const response = await fetch(url, {
                            method,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(templateData)
                        });

                        if (response.ok) {
                            const savedTemplate = await response.json();
                            console.log('Template saved:', savedTemplate);
                            
                            // Update local template state with saved data
                            setTemplate(savedTemplate);
                            
                            return {
                                id: savedTemplate.id,
                                name: savedTemplate.name,
                                designJson: savedTemplate.pages
                            };
                        }
                        return null;
                    } catch (error) {
                        console.error('Failed to save template:', error);
                        return null;
                    }
                }}
                onBack={() => window.history.back()}
                width={1000}
                height={1000}
            />
        </>
    );
}
