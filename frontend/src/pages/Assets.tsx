import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, Tabs, ResourceList, ResourceItem, Text, Button, Modal, FormLayout, TextField, Icon, EmptyState, Badge, Filters, Pagination, Box, BlockStack, Toast } from '@shopify/polaris';
import { DeleteIcon, PlusIcon, SettingsIcon, ViewIcon, EditIcon, StarFilledIcon } from '@shopify/polaris-icons';
import { useNavigate } from 'react-router-dom';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { POPULAR_GOOGLE_FONTS } from '../constants/fonts';

interface Asset {
    id: string;
    type: 'font' | 'color' | 'gallery' | 'option' | 'shape';
    name: string;
    value: string;
    config?: any;
    isDefault?: boolean;  // NEW: Mark if this is the default asset for its type
    createdAt: string;
}

export default function Assets() {
    const [selectedTab, setSelectedTab] = useState(0);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editAssetId, setEditAssetId] = useState<string | null>(null);
    const [editAssetName, setEditAssetName] = useState('');
    const [editAssetType, setEditAssetType] = useState<string>('');
    const [editAssetValue, setEditAssetValue] = useState('');
    const [editColors, setEditColors] = useState<Array<{name: string, hex: string}>>([]);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isSettingDefault, setIsSettingDefault] = useState<string | null>(null);  // NEW
    const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
    const [deleteConfirmAsset, setDeleteConfirmAsset] = useState<Asset | null>(null); // For delete confirmation

    // Search & Pagination states
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Form states
    const [assetName, setAssetName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const fetch = useAuthenticatedFetch();
    const [toastActive, setToastActive] = useState(false);
    const [toastContent, setToastContent] = useState('');

    const showToast = useCallback((content: string) => {
        setToastContent(content);
        setToastActive(true);
    }, []);

    const tabs = [
        { id: 'fonts', content: 'Fonts' },
        { id: 'colors', content: 'Colors' },
        { id: 'gallery', content: 'Gallery' },
        { id: 'options', content: 'Options' },
        { id: 'shapes', content: 'Shapes' },
    ];

    const currentType = ['font', 'color', 'gallery', 'option', 'shape'][selectedTab] as 'font' | 'color' | 'gallery' | 'option' | 'shape';

    const fetchAssets = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/imcst_api/assets');
            if (response.ok) {
                const data = await response.json();
                console.log("Assets fetched successfully:", data.length, "items");
                setAssets(data);
            } else {
                console.error("Assets fetch failed with status:", response.status);
                const errorText = await response.text();
                console.error("Response body:", errorText);
            }
        } catch (error) {
            console.error("Failed to fetch assets:", error);
        } finally {
            setIsLoading(false);
        }
    }, [fetch]);

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    // Auto-refresh when AI creates/updates/deletes assets
    useEffect(() => {
        const handleAssetChange = () => {
            console.log('[Assets] Detected asset change, refreshing...');
            fetchAssets();
        };

        // Listen for custom events from AI Chat
        window.addEventListener('ai-asset-created', handleAssetChange);
        window.addEventListener('ai-asset-updated', handleAssetChange);
        window.addEventListener('ai-asset-deleted', handleAssetChange);

        // Also refresh when tab becomes visible (in case user was on another tab)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchAssets();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('ai-asset-created', handleAssetChange);
            window.removeEventListener('ai-asset-updated', handleAssetChange);
            window.removeEventListener('ai-asset-deleted', handleAssetChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchAssets]);



    const handleTabChange = (index: number) => {
        setSelectedTab(index);
        setSearchQuery('');
        setCurrentPage(1);
    };

    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value);
        setCurrentPage(1);
    }, []);

    const handleSearchClear = useCallback(() => {
        setSearchQuery('');
        setCurrentPage(1);
    }, []);

    const handleAddAsset = async () => {
        if (!assetName) return;

        setIsSubmitting(true);
        try {
            let finalValue = '';
            let finalConfig: any = {
                group: assetName,
                enablePricing: false
            };

            if (currentType === 'font') {
                finalConfig.fontType = 'google';
                finalConfig.googleConfig = 'specific';
            } else if (currentType === 'option') {
                finalValue = '';
            }

            const response = await fetch('/imcst_api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: currentType,
                    name: assetName,
                    value: finalValue,
                    config: finalConfig
                })
            });

            if (response.ok) {
                showToast("Asset created successfully");
                setIsModalOpen(false);
                setAssetName('');
                fetchAssets();
            } else {
                const errorData = await response.json().catch(() => ({}));
                alert("Failed to create asset: " + (errorData.message || response.statusText));
            }
        } catch (error) {
            console.error("Failed to add asset:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAsset = async (id: string) => {
        setIsDeleting(id);
        try {
            const response = await fetch(`/imcst_api/assets/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast("Asset deleted successfully");
                setAssets(prev => prev.filter(a => a.id !== id));
                setDeleteConfirmAsset(null); // Close confirmation modal
            }
        } catch (error) {
            console.error("Failed to delete asset:", error);
        } finally {
            setIsDeleting(null);
        }
    };

    const handleSetDefault = async (id: string) => {
        setIsSettingDefault(id);
        try {
            const response = await fetch(`/imcst_api/assets/${id}/set-default`, {
                method: 'PUT'
            });

            if (response.ok) {
                const data = await response.json();
                showToast(`${data.asset.name} is now the default for ${data.asset.type}`);

                // Update local state: unmark others of same type, mark this one
                setAssets(prev => prev.map(a => {
                    if (a.type === data.asset.type) {
                        return { ...a, isDefault: a.id === id };
                    }
                    return a;
                }));
            }
        } catch (error) {
            console.error("Failed to set default asset:", error);
        } finally {
            setIsSettingDefault(null);
        }
    };

    const handleEditAsset = (asset: Asset) => {
        setEditAssetId(asset.id);
        setEditAssetName(asset.name);
        setEditAssetType(asset.type);
        setEditAssetValue(asset.value);
        
        // Parse colors if it's a color palette
        if (asset.type === 'color') {
            try {
                // Format: "Name|#HEX, Name|#HEX, ..."
                const colorPairs = asset.value.split(',').map(pair => pair.trim());
                const parsedColors = colorPairs.map(pair => {
                    const [name, hex] = pair.split('|').map(s => s.trim());
                    return { name: name || '', hex: hex || '#000000' };
                });
                setEditColors(parsedColors);
            } catch (e) {
                setEditColors([]);
            }
        } else {
            setEditColors([]);
        }
        
        setIsEditModalOpen(true);
    };

    const handleRenameAsset = async () => {
        if (!editAssetId || !editAssetName) return;
        setIsSubmitting(true);
        try {
            let updateData: any = { name: editAssetName };
            
            // If editing color palette, update value with colors
            if (editAssetType === 'color' && editColors.length > 0) {
                const colorValue = editColors
                    .filter(c => c.name && c.hex)
                    .map(c => `${c.name}|${c.hex}`)
                    .join(', ');
                updateData.value = colorValue;
            }

            const response = await fetch(`/imcst_api/assets/${editAssetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                const result = await response.json();
                showToast("Asset updated successfully");
                setAssets(prev => prev.map(a => a.id === editAssetId ? result.asset : a));
                setIsEditModalOpen(false);
            } else {
                console.error("Update failed");
                alert("Failed to update asset");
            }

        } catch (error) {
            console.error("Failed to update asset:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredAssets = assets
        .filter(a => a.type === currentType)
        .filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
    const paginatedItems = filteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Dynamic Font Loading for Preview
    useEffect(() => {
        const fontsToLoad = assets.filter(a => a.type === 'font');
        if (fontsToLoad.length > 0) {
            // Google Fonts
            const googleFamilies = new Set<string>();
            fontsToLoad.forEach(f => {
                if (f.config?.fontType === 'google') {
                    if (f.config?.googleConfig === 'specific' && f.config?.specificFonts) {
                        f.config.specificFonts.split(/[,\n]/).forEach((n: string) => {
                            const trimmed = n.trim();
                            if (trimmed && !trimmed.includes('|') && !trimmed.includes('data:') && !trimmed.includes('://')) {
                                googleFamilies.add(trimmed);
                            }
                        });
                    } else {
                        POPULAR_GOOGLE_FONTS.forEach(n => googleFamilies.add(n));
                    }
                }
            });

            if (googleFamilies.size > 0) {
                const linkId = 'assets-google-fonts';
                let link = document.getElementById(linkId) as HTMLLinkElement;
                if (!link) {
                    link = document.createElement('link');
                    link.id = linkId;
                    link.rel = 'stylesheet';
                    document.head.appendChild(link);
                }
                link.href = `https://fonts.googleapis.com/css?family=${Array.from(googleFamilies).map(f => f.replace(/ /g, '+')).join('|')}&display=swap`;
            }

            // Custom @font-face
            const styleId = 'assets-custom-fonts';
            let style = document.getElementById(styleId) as HTMLStyleElement;
            if (!style) {
                style = document.createElement('style');
                style.id = styleId;
                document.head.appendChild(style);
            }
            let css = '';
            fontsToLoad.forEach(f => {
                // 1. Single custom font asset
                if (f.config?.fontType === 'custom' && f.value && !f.value.includes('|')) {
                    css += `@font-face { font-family: "${f.name}"; src: url("${f.value}"); font-display: swap; }\n`;
                }

                // 2. Font group with multiple custom fonts (Name|Data or Name|URL)
                if (f.value) {
                    const lines = f.value.split('\n');
                    lines.forEach(line => {
                        if (line.includes('|')) {
                            const [name, data] = line.split('|');
                            if (name && data && (data.trim().startsWith('data:') || data.trim().startsWith('http'))) {
                                css += `@font-face { font-family: "${name.trim()}"; src: url("${data.trim()}"); font-display: swap; }\n`;
                            }
                        }
                    });
                }
            });
            style.textContent = css;
        }
    }, [assets]);

    const renderAssetItem = (asset: Asset) => {
        const { id, name, value } = asset;

        let media;
        if (asset.type === 'color') {
            const firstLetter = name ? name.charAt(0).toUpperCase() : 'C';
            media = <div className="w-14 h-14 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 font-bold border border-rose-100 shadow-sm text-lg">
                {firstLetter}
            </div>;
        } else if (asset.type === 'gallery') {
            const firstLetter = name ? name.charAt(0).toUpperCase() : 'G';
            media = <div className="w-14 h-14 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold border border-emerald-100 shadow-sm text-lg">
                {firstLetter}
            </div>;
        } else if (asset.type === 'option') {
            media = <div className="w-14 h-14 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                <Icon source={SettingsIcon} tone="success" />
            </div>;
        } else if (asset.type === 'shape') {
            const firstLetter = name ? name.charAt(0).toUpperCase() : 'S';
            media = <div className="w-14 h-14 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100 shadow-sm text-lg">
                {firstLetter}
            </div>;
        } else {
            const firstLetter = name ? name.charAt(0).toUpperCase() : 'F';
            media = <div className="w-14 h-14 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 text-lg">
                {firstLetter}
            </div>;
        }

        return (
            <ResourceItem
                id={id}
                media={media}
                onClick={() => (asset.type === 'font' || asset.type === 'color' || asset.type === 'gallery' || asset.type === 'option' || asset.type === 'shape') ? navigate(`/assets/${id}`) : {}}
                persistActions
            >
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <Text variant="bodyMd" fontWeight="bold" as="h3">
                                {name}
                            </Text>
                            {asset.isDefault && (
                                <Badge tone="success" progress="complete">Default</Badge>
                            )}
                        </div>
                        {(asset.type === 'font' || asset.type === 'color' || asset.type === 'gallery' || asset.type === 'option' || asset.type === 'shape') ? (
                            <div className="flex flex-col gap-0.5">
                                {/* Details removed or managed in detail page */}
                            </div>
                        ) : (
                            <Text variant="bodySm" tone="subdued" as="p">
                                {value}
                            </Text>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {(asset.type === 'font' || asset.type === 'color' || asset.type === 'gallery' || asset.type === 'option' || asset.type === 'shape') && (
                            <Button
                                icon={ViewIcon}
                                variant="tertiary"
                                onClick={() => navigate(`/assets/${id}`)}
                            >
                                View {asset.type === 'font' ? 'Fonts' : asset.type === 'color' ? 'Colors' : asset.type === 'gallery' ? 'Gallery' : asset.type === 'shape' ? 'Shapes' : 'Options'}
                            </Button>
                        )}
                        <div className="flex gap-1.5">
                            <div className={`border rounded-md flex items-center justify-center transition-colors ${asset.isDefault ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:bg-yellow-50'}`}>
                                <Button
                                    icon={StarFilledIcon}
                                    variant="plain"
                                    tone={asset.isDefault ? 'success' : undefined}
                                    loading={isSettingDefault === id}
                                    disabled={asset.isDefault}
                                    onClick={() => handleSetDefault(id)}
                                    accessibilityLabel="Set as Default"
                                />
                            </div>
                            <div className="border border-gray-200 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors">
                                <Button
                                    icon={EditIcon}
                                    variant="plain"
                                    onClick={(e?: any) => {
                                        e?.stopPropagation();
                                        handleEditAsset(asset);
                                    }}
                                />
                            </div>
                            <div className="border border-gray-200 rounded-md flex items-center justify-center hover:bg-red-50 transition-colors">
                                <Button
                                    icon={DeleteIcon}
                                    tone="critical"
                                    variant="plain"
                                    loading={isDeleting === id}
                                    onClick={(e) => {
                                        e?.stopPropagation();
                                        setDeleteConfirmAsset(asset);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </ResourceItem>
        );
    };

    return (
        <Page
            title="Asset Management"
            fullWidth
            primaryAction={{
                content: `Create ${tabs[selectedTab].content}`,
                onAction: () => setIsModalOpen(true),
                icon: PlusIcon
            }}
        >
            <Layout>
                <Layout.Section>
                    <Card padding="0">
                        <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
                            <ResourceList
                                resourceName={{ singular: currentType, plural: `${currentType}s` }}
                                items={paginatedItems}
                                renderItem={renderAssetItem}
                                loading={isLoading}
                                filterControl={
                                    <Filters
                                        queryValue={searchQuery}
                                        filters={[]}
                                        onQueryChange={handleSearchChange}
                                        onQueryClear={handleSearchClear}
                                        onClearAll={handleSearchClear}
                                    />
                                }
                                emptyState={
                                    <EmptyState
                                        heading={`No matching ${tabs[selectedTab].content} found`}
                                        action={{ content: `Create ${currentType}`, onAction: () => setIsModalOpen(true) }}
                                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                    >
                                        <p>Try changing your search terms or create a new {currentType}.</p>
                                    </EmptyState>
                                }
                            />

                            {totalPages > 1 && (
                                <Box padding="400" borderBlockStartWidth="025" borderColor="border">
                                    <div className="flex justify-center">
                                        <Pagination
                                            hasPrevious={currentPage > 1}
                                            hasNext={currentPage < totalPages}
                                            onPrevious={() => setCurrentPage(p => p - 1)}
                                            onNext={() => setCurrentPage(p => p + 1)}
                                            label={`Page ${currentPage} of ${totalPages}`}
                                        />
                                    </div>
                                </Box>
                            )}
                        </Tabs>
                    </Card>
                </Layout.Section>
            </Layout>

            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`Create ${tabs[selectedTab].content}`}
                primaryAction={{
                    content: 'Create',
                    onAction: handleAddAsset,
                    loading: isSubmitting
                }}
                secondaryActions={[
                    {
                        content: 'Cancel',
                        onAction: () => setIsModalOpen(false),
                    },
                ]}
            >
                <Modal.Section>
                    <FormLayout>
                        <TextField
                            label="Group Name"
                            value={assetName}
                            onChange={setAssetName}
                            autoComplete="off"
                            placeholder={
                                currentType === 'font' ? 'e.g. My Typography Set' :
                                    currentType === 'color' ? 'e.g. Brand Primary' :
                                        currentType === 'gallery' ? 'e.g. Logo Gallery' :
                                            currentType === 'shape' ? 'e.g. SVG Decorations' :
                                                'e.g. General Settings'
                            }
                        />
                        {/* Option subtype selection removed per user request (moved to item level) */}
                    </FormLayout>
                </Modal.Section>
            </Modal>

            <Modal
                open={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={editAssetType === 'color' ? 'Edit Color Palette' : 'Edit Asset Name'}
                primaryAction={{
                    content: 'Save',
                    onAction: handleRenameAsset,
                    loading: isSubmitting
                }}
                secondaryActions={[{ content: 'Cancel', onAction: () => setIsEditModalOpen(false) }]}
            >
                <Modal.Section>
                    <FormLayout>
                        <TextField
                            label="Name"
                            value={editAssetName}
                            onChange={setEditAssetName}
                            autoComplete="off"
                        />
                        
                        {editAssetType === 'color' && (
                            <BlockStack gap="400">
                                <Text as="h3" variant="headingMd">Colors</Text>
                                {editColors.map((color, index) => (
                                    <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                        <div style={{ flex: 1 }}>
                                            <TextField
                                                label="Color Name"
                                                value={color.name}
                                                onChange={(value) => {
                                                    const newColors = [...editColors];
                                                    newColors[index].name = value;
                                                    setEditColors(newColors);
                                                }}
                                                autoComplete="off"
                                            />
                                        </div>
                                        <div style={{ width: '120px' }}>
                                            <TextField
                                                label="Hex Code"
                                                value={color.hex}
                                                onChange={(value) => {
                                                    const newColors = [...editColors];
                                                    newColors[index].hex = value;
                                                    setEditColors(newColors);
                                                }}
                                                autoComplete="off"
                                                prefix="#"
                                            />
                                        </div>
                                        <div style={{ 
                                            width: '40px', 
                                            height: '40px', 
                                            backgroundColor: color.hex, 
                                            border: '1px solid #ddd',
                                            borderRadius: '4px'
                                        }} />
                                        <Button
                                            tone="critical"
                                            onClick={() => {
                                                setEditColors(editColors.filter((_, i) => i !== index));
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    onClick={() => {
                                        setEditColors([...editColors, { name: '', hex: '#000000' }]);
                                    }}
                                >
                                    Add Color
                                </Button>
                            </BlockStack>
                        )}
                    </FormLayout>
                </Modal.Section>
            </Modal>

            {/* Font Detail Preview Modal */}
            <Modal
                open={!!previewAsset}
                onClose={() => setPreviewAsset(null)}
                title={`Font Preview: ${previewAsset?.name}`}
                secondaryActions={[{ content: 'Close', onAction: () => setPreviewAsset(null) }]}
            >
                <Modal.Section>
                    {previewAsset && (
                        <BlockStack gap="400">
                            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                                <Text variant="headingXl" as="h1" alignment="center">
                                    <span style={{
                                        fontFamily: previewAsset.config?.fontType === 'system'
                                            ? previewAsset.value
                                            : (previewAsset.config?.fontType === 'custom'
                                                ? previewAsset.name
                                                : (previewAsset.config?.googleConfig === 'specific' ? previewAsset.value.split(',')[0] : 'Inter'))
                                    }}>
                                        Abc 123
                                    </span>
                                </Text>
                            </Box>

                            <FormLayout>
                                <div className="space-y-6">
                                    <BlockStack gap="200">
                                        <Text variant="headingSm" as="h4">Large Preview (48px)</Text>
                                        <div style={{
                                            fontSize: '48px',
                                            lineHeight: 1.2,
                                            fontFamily: previewAsset.config?.fontType === 'system'
                                                ? previewAsset.value
                                                : (previewAsset.config?.fontType === 'custom'
                                                    ? previewAsset.name
                                                    : (previewAsset.config?.googleConfig === 'specific' ? previewAsset.value.split(',')[0] : 'Inter'))
                                        }}>
                                            The quick brown fox jumps over the lazy dog
                                        </div>
                                    </BlockStack>

                                    <BlockStack gap="200">
                                        <Text variant="headingSm" as="h4">Medium Preview (24px)</Text>
                                        <div style={{
                                            fontSize: '24px',
                                            lineHeight: 1.4,
                                            fontFamily: previewAsset.config?.fontType === 'system'
                                                ? previewAsset.value
                                                : (previewAsset.config?.fontType === 'custom'
                                                    ? previewAsset.name
                                                    : (previewAsset.config?.googleConfig === 'specific' ? previewAsset.value.split(',')[0] : 'Inter'))
                                        }}>
                                            Pack my box with five dozen liquor jugs. ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 1234567890
                                        </div>
                                    </BlockStack>

                                    <BlockStack gap="200">
                                        <Text variant="headingSm" as="h4">Small Text (14px)</Text>
                                        <div style={{
                                            fontSize: '14px',
                                            lineHeight: 1.6,
                                            fontFamily: previewAsset.config?.fontType === 'system'
                                                ? previewAsset.value
                                                : (previewAsset.config?.fontType === 'custom'
                                                    ? previewAsset.name
                                                    : (previewAsset.config?.googleConfig === 'specific' ? previewAsset.value.split(',')[0] : 'Inter'))
                                        }}>
                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                                        </div>
                                    </BlockStack>

                                    <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-2">
                                        <div>
                                            <Text variant="bodySm" tone="subdued" as="p">Group</Text>
                                            <Text variant="bodyMd" fontWeight="bold" as="p">{previewAsset.config?.group}</Text>
                                        </div>
                                        <div>
                                            <Text variant="bodySm" tone="subdued" as="p">Type</Text>
                                            <Badge>{previewAsset.config?.fontType}</Badge>
                                        </div>
                                        {previewAsset.config?.fontType === 'google' && (
                                            <div>
                                                <Text variant="bodySm" tone="subdued" as="p">Library Mode</Text>
                                                <Badge tone="info">{previewAsset.config?.googleConfig}</Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </FormLayout>
                        </BlockStack>
                    )}
                </Modal.Section>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                open={!!deleteConfirmAsset}
                onClose={() => setDeleteConfirmAsset(null)}
                title="Delete Asset Group?"
                primaryAction={{
                    content: 'Delete',
                    onAction: () => deleteConfirmAsset && handleDeleteAsset(deleteConfirmAsset.id),
                    destructive: true,
                    loading: isDeleting === deleteConfirmAsset?.id
                }}
                secondaryActions={[{ 
                    content: 'Cancel', 
                    onAction: () => setDeleteConfirmAsset(null) 
                }]}
            >
                <Modal.Section>
                    {deleteConfirmAsset && (
                        <BlockStack gap="400">
                            <Text as="p">
                                Are you sure you want to delete <Text as="span" fontWeight="bold">"{deleteConfirmAsset.name}"</Text>?
                            </Text>
                            <Text as="p" tone="critical">
                                This action cannot be undone. All items in this group will be permanently deleted.
                            </Text>
                            {deleteConfirmAsset.isDefault && (
                                <Box padding="400" background="bg-fill-warning-secondary" borderRadius="200">
                                    <Text as="p" tone="warning" fontWeight="semibold">
                                        ⚠️ This is the default {deleteConfirmAsset.type} group. Deleting it may affect your configurations.
                                    </Text>
                                </Box>
                            )}
                        </BlockStack>
                    )}
                </Modal.Section>
            </Modal>

            {toastActive && (
                <Toast content={toastContent} onDismiss={() => setToastActive(false)} duration={3000} />
            )}
        </Page>
    );
}
