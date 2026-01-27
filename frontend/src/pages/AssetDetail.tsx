import { useState, useEffect, useCallback, useMemo } from 'react';
import { Page, Layout, Card, ResourceList, ResourceItem, Text, Button, Modal, Box, BlockStack, Filters, Pagination, Select, FormLayout, TextField, Combobox, Listbox, Icon, Tag, InlineStack, Checkbox, ProgressBar, Toast } from '@shopify/polaris';
import { DeleteIcon, PlusIcon, SearchIcon, EditIcon, DragHandleIcon } from '@shopify/polaris-icons';
import { Reorder } from 'motion/react';
import { useParams } from 'react-router-dom';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { POPULAR_GOOGLE_FONTS } from '../constants/fonts';

const PATTERN_LIBRARY = [
    { name: 'Carbon Fiber', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=300&auto=format&fit=crop' },
    { name: 'White Marble', url: 'https://images.unsplash.com/photo-1533154683836-84ea5a6bc3b0?q=80&w=300&auto=format&fit=crop' },
    { name: 'Wood Grain', url: 'https://images.unsplash.com/photo-1542435503-956c469947f6?q=80&w=300&auto=format&fit=crop' },
    { name: 'Camouflage', url: 'https://images.unsplash.com/photo-1532635241-17e820acc59f?q=80&w=300&auto=format&fit=crop' },
    { name: 'Floral Vintage', url: 'https://images.unsplash.com/photo-1505330373305-64d88e0c3b88?q=80&w=300&auto=format&fit=crop' },
    { name: 'Geometric Gold', url: 'https://images.unsplash.com/photo-1614850715649-1d0106293bd1?q=80&w=300&auto=format&fit=crop' },
    { name: 'Denim Texture', url: 'https://images.unsplash.com/photo-1541270590-07ea008e6459?q=80&w=300&auto=format&fit=crop' },
    { name: 'Leather Black', url: 'https://images.unsplash.com/photo-1517146702568-1c448d0bc261?q=80&w=300&auto=format&fit=crop' },
    { name: 'Polka Dots', url: 'https://images.unsplash.com/photo-1614852206758-0caebaba337a?q=80&w=300&auto=format&fit=crop' },
    { name: 'Honey Comb', url: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?q=80&w=300&auto=format&fit=crop' },
];

const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);

interface Asset {
    id: string;
    type: 'font' | 'color' | 'gallery' | 'option';
    name: string;
    value: string;
    config?: any;
    createdAt: string;
}

interface ListItem {
    id: string;
    name: string;
    hex?: string;
    isPattern?: boolean;
    patternUrl?: string;
    url?: string; // For gallery images
    originalIndex?: number;
}

export default function AssetDetail() {
    const { id } = useParams();
    const fetch = useAuthenticatedFetch();

    const [asset, setAsset] = useState<Asset | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newFontType, setNewFontType] = useState<'google' | 'custom' | 'upload'>('google');
    const [colorItemType, setColorItemType] = useState<'color' | 'pattern'>('color');
    const [patternSource, setPatternSource] = useState<'library' | 'upload'>('library');
    const [selectedLibraryPattern, setSelectedLibraryPattern] = useState<string | null>(null);
    const [newColorName, setNewColorName] = useState('');
    const [newColorHex, setNewColorHex] = useState('#000000');
    const [patternFile, setPatternFile] = useState<File | null>(null);
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [newName, setNewName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [itemToRename, setItemToRename] = useState<ListItem | null>(null);
    const [newItemName, setNewItemName] = useState('');
    const [toastActive, setToastActive] = useState(false);
    const [toastContent, setToastContent] = useState('');
    const [optionItemType, setOptionItemType] = useState<'text' | 'image' | 'color'>('text');
    const [optionImageFile, setOptionImageFile] = useState<File | null>(null);
    const [queuedOptions, setQueuedOptions] = useState<{ name: string, value: string, type: string }[]>([]);
    const [localItems, setLocalItems] = useState<ListItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    // Autocomplete states
    const [googleFontOptions, setGoogleFontOptions] = useState(POPULAR_GOOGLE_FONTS);

    const showToast = useCallback((content: string) => {
        setToastContent(content);
        setToastActive(true);
    }, []);
    const [inputValue, setInputValue] = useState('');
    const [selectedGoogleFonts, setSelectedGoogleFonts] = useState<string[]>([]);

    // Search & Pagination states
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('custom');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchDetail = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/imcst_api/assets`);
            if (response.ok) {
                const data = await response.json();
                const found = data.find((a: Asset) => a.id === id);
                setAsset(found || null);
            }
        } catch (error) {
            console.error("Failed to fetch asset detail:", error);
        } finally {
            setIsLoading(false);
        }
    }, [fetch, id]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    const safeSplit = (val: string) => {
        if (!val) return [];
        const lines = val.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 1 && !lines[0].includes('base64,')) {
            return lines[0].split(',').map(s => s.trim()).filter(Boolean);
        }
        return lines;
    };

    // Process items list
    const items = useMemo((): ListItem[] => {
        if (!asset) return [];

        if (asset.type === 'font') {
            if (asset.config?.fontType === 'google' && asset.config?.googleConfig === 'all') {
                return POPULAR_GOOGLE_FONTS.map(n => ({ name: n, id: n }));
            }
            return safeSplit(asset.value).map(n => ({ name: n, id: n }));
        }

        if (asset.type === 'color') {
            return safeSplit(asset.value).map(pair => {
                const [name, val] = pair.split('|');
                const isPattern = val?.startsWith('pattern:');
                return {
                    name: name?.trim() || '',
                    hex: isPattern ? undefined : (val?.trim() || ''),
                    isPattern,
                    patternUrl: isPattern ? val.replace('pattern:', '').trim() : undefined,
                    id: pair
                };
            }).filter(i => i.name);
        }

        if (asset.type === 'gallery') {
            return safeSplit(asset.value).map(pair => {
                const parts = pair.split('|');
                // Auto-handle migrated or simple formats
                if (parts.length >= 2) {
                    const url = parts[parts.length - 1];
                    const name = parts[parts.length - 2];
                    return { name: name?.trim() || '', url: url?.trim() || '', id: pair };
                }
                return { name: pair, url: '', id: pair };
            }).filter(i => i.name);
        }

        if (asset.type === 'option') {
            return safeSplit(asset.value).map(pair => {
                const [name, val] = pair.split('|');
                const v = val?.trim() || '';
                const isImage = v.startsWith('http') || v.startsWith('data:image');
                const isColor = v.startsWith('#');
                return {
                    name: name?.trim() || '',
                    hex: isColor ? v : undefined,
                    isPattern: isImage,
                    patternUrl: isImage ? v : undefined,
                    id: pair
                };
            }).filter(i => i.name);
        }

        return [];
    }, [asset]);

    const filteredItems = items
        .map((f, i) => ({ ...f, originalIndex: i }))
        .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            if (sortOrder === 'az') return a.name.localeCompare(b.name);
            if (sortOrder === 'za') return b.name.localeCompare(a.name);
            if (sortOrder === 'newest') return (b.originalIndex || 0) - (a.originalIndex || 0);
            return (a.originalIndex || 0) - (b.originalIndex || 0); // oldest/original
        });

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // For Drag and Drop, we need to sync localItems when items change or sort order changes
    useEffect(() => {
        if (sortOrder === 'custom') {
            setLocalItems(filteredItems);
        }
    }, [filteredItems, sortOrder]);

    const handleReorder = async (newOrder: ListItem[]) => {
        setLocalItems(newOrder);
        if (!asset) return;

        // Construct the new value string based on the new order
        const newValueStr = newOrder.map(item => item.id).join('\n');

        try {
            const response = await fetch(`/imcst_api/assets/${asset.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: asset.name,
                    value: newValueStr,
                    config: { ...asset.config, specificFonts: asset.type === 'font' ? newValueStr : asset.config.specificFonts }
                })
            });

            if (response.ok) {
                // We update the local asset state to avoid jumpiness
                setAsset({ ...asset, value: newValueStr });
                showToast('Order saved');
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Load fonts for preview
    useEffect(() => {
        if (asset?.type === 'font' && items.length > 0) {
            const googleFamilies = items
                .filter(() => asset?.config?.fontType === 'google')
                .map(f => f.name.replace(/ /g, '+'))
                .join('|');

            if (googleFamilies) {
                const linkId = 'detail-google-fonts';
                let link = document.getElementById(linkId) as HTMLLinkElement;
                if (!link) {
                    link = document.createElement('link');
                    link.id = linkId;
                    link.rel = 'stylesheet';
                    document.head.appendChild(link);
                }
                link.href = `https://fonts.googleapis.com/css?family=${googleFamilies}&display=swap`;
            }

            if (asset?.config?.fontType === 'custom' && asset.value) {
                const styleId = 'detail-custom-font';
                let style = document.getElementById(styleId) as HTMLStyleElement;
                if (!style) {
                    style = document.createElement('style');
                    style.id = styleId;
                    document.head.appendChild(style);
                }
                style.textContent = `@font-face { font-family: "${asset.name}"; src: url("${asset.value}"); font-display: swap; }`;
            }
        }
    }, [items, asset]);

    const handleDeleteItem = async (itemName: string) => {
        if (!asset || !confirm(`Delete item "${itemName}" from this group?`)) return;

        let newListStr = '';
        const currentList = safeSplit(asset.value);
        if (asset.type === 'font') {
            newListStr = currentList.filter(n => n !== itemName).join('\n');
        } else if (asset.type === 'color' || asset.type === 'option') {
            newListStr = currentList.filter(pair => pair.split('|')[0] !== itemName).join('\n');
        } else if (asset.type === 'gallery') {
            newListStr = currentList.filter(pair => {
                const parts = pair.split('|');
                return parts[parts.length - 2] !== itemName;
            }).join('\n');
        }

        try {
            const response = await fetch(`/imcst_api/assets/${asset.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: asset.name,
                    value: newListStr,
                    config: { ...asset.config, specificFonts: asset.type === 'font' ? newListStr : asset.config.specificFonts }
                })
            });

            if (response.ok) {
                showToast(`Deleted "${itemName}"`);
                setSelectedItems([]);
                fetchDetail();
            } else {
                alert("Failed to delete item");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleRenameItem = async () => {
        if (!asset || !itemToRename || !newItemName) return;

        const currentList = safeSplit(asset.value);
        const nameChangedList = currentList.map(pair => {
            const parts = pair.split('|');
            // Index logic for simple vs nested
            const nameIndex = parts.length - 2;
            if (parts[nameIndex === -1 ? 0 : nameIndex] === itemToRename.name) {
                if (parts.length >= 2) {
                    const newParts = [...parts];
                    newParts[newParts.length - 2] = newItemName;
                    return newParts.join('|');
                }
                return newItemName;
            }
            return pair;
        });

        const newListStr = nameChangedList.join('\n');

        setIsSubmitting(true);
        try {
            const response = await fetch(`/imcst_api/assets/${asset.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: asset.name,
                    value: newListStr,
                    config: asset.config
                })
            });

            if (response.ok) {
                showToast(`Renamed to "${newItemName}"`);
                fetchDetail();
                setIsRenameModalOpen(false);
                setItemToRename(null);
                setNewItemName('');
            } else {
                alert("Failed to rename item");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateConfig = async (key: string, value: any) => {
        if (!asset) return;
        const newConfig = { ...asset.config, [key]: value };

        try {
            const response = await fetch(`/imcst_api/assets/${asset.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: asset.name,
                    value: asset.value,
                    config: newConfig
                })
            });

            if (response.ok) {
                showToast('Settings saved');
                setAsset({ ...asset, config: newConfig });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateFontPrice = async (fontName: string, price: string) => {
        if (!asset) return;
        const fontPrices = asset.config.fontPrices || {};
        const updatedPrices = { ...fontPrices, [fontName]: price };
        handleUpdateConfig('fontPrices', updatedPrices);
    };

    const handleBulkDelete = async () => {
        if (!asset || selectedItems.length === 0) return;
        if (!confirm(`Delete ${selectedItems.length} selected items?`)) return;

        const currentList = safeSplit(asset.value);
        let newListStr = '';

        if (asset.type === 'font') {
            newListStr = currentList.filter(n => !selectedItems.includes(n)).join('\n');
        } else {
            // Bulk delete based on IDs (which are the full pair strings)
            newListStr = currentList.filter(pair => !selectedItems.includes(pair)).join('\n');
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`/imcst_api/assets/${asset.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: asset.name,
                    value: newListStr,
                    config: { ...asset.config, specificFonts: asset.type === 'font' ? newListStr : asset.config.specificFonts }
                })
            });

            if (response.ok) {
                showToast(`Deleted ${selectedItems.length} items`);
                setSelectedItems([]);
                fetchDetail();
            } else {
                alert("Failed to delete items");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };


    const updateText = useCallback(
        async (value: string) => {
            setInputValue(value);
            setNewName(value);

            try {
                const response = await fetch(`/imcst_api/font-library?query=${encodeURIComponent(value)}`);
                if (response.ok) {
                    const data = await response.json();
                    setGoogleFontOptions(data);
                }
            } catch (e) {
                console.error("Font search error:", e);
            }
        },
        [fetch],
    );

    useEffect(() => {
        if (isAddModalOpen && asset?.type === 'font' && newFontType === 'google') {
            updateText('');
        }
    }, [isAddModalOpen, asset?.type, newFontType, updateText]);

    const removeTag = (tag: string) => {
        setSelectedGoogleFonts((prev) => prev.filter((p) => p !== tag));
    };

    const compressImage = (file: File, maxWidth: number = 1200): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (maxWidth / width) * height;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    const handleAddToQueue = async () => {
        if (!newColorName || !asset) return;

        if (queuedOptions.some(o => o.name.toLowerCase() === newColorName.toLowerCase())) {
            alert("This name is already in the list.");
            return;
        }

        let val = '';
        if (optionItemType === 'text') {
            val = 'enabled';
        } else if (optionItemType === 'color') {
            val = newColorHex;
        } else if (optionItemType === 'image') {
            if (!optionImageFile) {
                alert("Please select an image first.");
                return;
            }
            try {
                val = await compressImage(optionImageFile);
            } catch (err) {
                alert("Failed to process image.");
                return;
            }
        }

        setQueuedOptions([...queuedOptions, { name: newColorName, value: val, type: optionItemType }]);
        setNewColorName('');
        setOptionImageFile(null);
        setNewColorHex('#000000');
    };

    const handleAddItem = async () => {
        if (!asset) return;
        setIsSubmitting(true);
        setUploadProgress(0);

        try {
            let newListStr = '';
            const currentList = safeSplit(asset.value);

            if (asset.type === 'font') {
                let fontsToAdd: string[] = [];
                if (newFontType === 'google') {
                    fontsToAdd = selectedGoogleFonts.length > 0 ? selectedGoogleFonts : [newName];
                } else {
                    fontsToAdd = [newName];
                }
                const uniqueToAdd = fontsToAdd.filter(f => !currentList.some(c => c.toLowerCase() === f.toLowerCase()));
                newListStr = [...currentList, ...uniqueToAdd].join('\n');
            } else if (asset.type === 'color') {
                if (!newColorName) return;

                let valToStore = '';
                if (colorItemType === 'color') {
                    if (!newColorHex) return;
                    valToStore = `${newColorName}|${newColorHex}`;
                } else {
                    if (patternSource === 'upload') {
                        if (!patternFile) return;
                        const compressedBase64 = await compressImage(patternFile);
                        valToStore = `${newColorName}|pattern:${compressedBase64}`;
                    } else {
                        if (!selectedLibraryPattern) return;
                        valToStore = `${newColorName}|pattern:${selectedLibraryPattern}`;
                    }
                }

                if (currentList.some(p => p.split('|')[0].toLowerCase() === newColorName.toLowerCase())) {
                    alert("Name already exists in this group");
                    setIsSubmitting(false);
                    return;
                }
                newListStr = [...currentList, valToStore].join('\n');
            } else if (asset.type === 'gallery') {
                const newItems: string[] = [];
                if (galleryFiles.length === 0) return;

                for (let i = 0; i < galleryFiles.length; i++) {
                    const file = galleryFiles[i];
                    try {
                        const name = file.name.split('.')[0];
                        const compressedBase64 = await compressImage(file);
                        newItems.push(`${name}|${compressedBase64}`);
                        setUploadProgress(Math.round(((i + 1) / galleryFiles.length) * 100));
                    } catch (err) {
                        console.error(`Failed to process ${file.name}:`, err);
                    }
                }
                newListStr = [...currentList, ...newItems].join('\n');
            } else if (asset.type === 'option') {
                // Determine items to add: either the queue or the single input
                let itemsToSave = [...queuedOptions];

                // Check if current input field has content, add it to list if so
                if (newColorName) {
                    let val = '';
                    let shouldAdd = true;

                    if (optionItemType === 'text') {
                        val = 'enabled';
                    } else if (optionItemType === 'color') {
                        val = newColorHex;
                    } else if (optionItemType === 'image') {
                        if (!optionImageFile) {
                            alert("Please select an image for the current item");
                            setIsSubmitting(false);
                            shouldAdd = false;
                        } else {
                            try {
                                val = await compressImage(optionImageFile);
                            } catch (e) {
                                alert("Failed to process image");
                                setIsSubmitting(false);
                                shouldAdd = false;
                            }
                        }
                    }

                    if (shouldAdd) {
                        itemsToSave.push({ name: newColorName, value: val, type: optionItemType });
                    } else {
                        return; // Stop if image invalid
                    }
                }

                if (itemsToSave.length === 0) {
                    alert("Please add at least one option.");
                    setIsSubmitting(false);
                    return;
                }

                const newItemsStrArr = itemsToSave.map(o => `${o.name}|${o.value}`);

                // Avoid empty strings in current list
                const cleanCurrent = currentList.filter(Boolean);
                newListStr = [...cleanCurrent, ...newItemsStrArr].join('\n');
            }

            const response = await fetch(`/imcst_api/assets/${asset.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: asset.name,
                    value: newListStr,
                    config: { ...asset.config, specificFonts: asset.type === 'font' ? newListStr : asset.config.specificFonts }
                })
            });

            if (response.ok) {
                showToast('Items added successfully');
                fetchDetail();
                setIsAddModalOpen(false);
                setNewName('');
                setNewColorName('');
                setNewColorHex('#000000');
                setPatternFile(null);
                setSelectedGoogleFonts([]);
                setGalleryFiles([]);
                setOptionImageFile(null);
                setQueuedOptions([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };


    if (isLoading) return <Page><Layout><Layout.Section><Card>Loading...</Card></Layout.Section></Layout></Page>;
    if (!asset) return <Page><Layout><Layout.Section><Card>Asset not found</Card></Layout.Section></Layout></Page>;

    return (
        <Page
            fullWidth
            backAction={{ content: 'Assets', url: '/assets' }}
            title={asset.name}
            primaryAction={{
                content: asset.type === 'font' ? 'Add Font' :
                    asset.type === 'gallery' ? 'Add Image' :
                        asset.type === 'option' ? 'Add Option' : 'Add Color',
                onAction: () => setIsAddModalOpen(true),
                icon: PlusIcon
            }}
        >
            <Layout>
                <Layout.Section variant="oneThird">
                    <Card>
                        <BlockStack gap="400">
                            <Text variant="headingMd" as="h2">Pricing Settings</Text>
                            <Checkbox
                                label={`Enable ${asset.type} pricing`}
                                checked={!!asset.config?.enablePricing}
                                onChange={(val) => handleUpdateConfig('enablePricing', val)}
                            />

                            {asset.config?.enablePricing && (
                                <BlockStack gap="300">
                                    <Select
                                        label="Pricing Type"
                                        options={[
                                            { label: 'Global', value: 'group' },
                                            { label: 'Individual', value: 'single' },
                                        ]}
                                        value={asset.config?.pricingType || 'group'}
                                        onChange={(val) => handleUpdateConfig('pricingType', val)}
                                    />

                                    {(asset.config?.pricingType === 'group' || !asset.config?.pricingType) && (
                                        <TextField
                                            label="Price"
                                            type="number"
                                            value={asset.config?.groupPrice || '0'}
                                            onChange={(val) => handleUpdateConfig('groupPrice', val)}
                                            autoComplete="off"
                                            prefix="$"
                                        />
                                    )}
                                </BlockStack>
                            )}
                        </BlockStack>
                    </Card>
                </Layout.Section>
                <Layout.Section>
                    <Card padding="0">
                        <Box padding="400">
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">{
                                    asset.type === 'font' ? 'Fonts' :
                                        asset.type === 'gallery' ? 'Images' :
                                            asset.type === 'option' ? 'Options' : 'Colors'
                                } in this Group ({items.length})</Text>

                                {selectedItems.length > 0 && sortOrder === 'custom' && (
                                    <div className="flex items-center gap-4 bg-indigo-50 p-2 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                                        <Text variant="bodySm" fontWeight="bold" tone="subdued" as="span">{selectedItems.length} items selected</Text>
                                        <Button
                                            tone="critical"
                                            variant="primary"
                                            size="slim"
                                            icon={DeleteIcon}
                                            onClick={handleBulkDelete}
                                        >
                                            Delete Selected
                                        </Button>
                                        <Button
                                            variant="tertiary"
                                            size="slim"
                                            onClick={() => setSelectedItems([])}
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <Filters
                                            queryValue={searchQuery}
                                            filters={[]}
                                            onQueryChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
                                            onQueryClear={() => setSearchQuery('')}
                                            onClearAll={() => setSearchQuery('')}
                                            hideQueryField={false}
                                        />
                                    </div>
                                    <div className="w-48">
                                        <Select
                                            labelInline
                                            label="Sort"
                                            options={[
                                                { label: 'Manual (Drag & Drop)', value: 'custom' },
                                                { label: 'Oldest Added', value: 'original' },
                                                { label: 'Newest Added', value: 'newest' },
                                                { label: 'Name (A-Z)', value: 'az' },
                                                { label: 'Name (Z-A)', value: 'za' },
                                            ]}
                                            value={sortOrder}
                                            onChange={(val) => {
                                                setSortOrder(val);
                                                if (val === 'custom') setCurrentPage(1); // Usually custom order is single page or we might need to handle pagination
                                            }}
                                        />
                                    </div>
                                </div>
                            </BlockStack>
                        </Box>

                        {sortOrder === 'custom' ? (
                            <div className="p-2">
                                <Reorder.Group axis="y" values={localItems} onReorder={handleReorder} className="flex flex-col gap-2">
                                    {localItems.map((item) => (
                                        <Reorder.Item
                                            key={item.id}
                                            value={item}
                                            className="bg-white border border-gray-100 rounded-lg shadow-sm hover:border-indigo-300 transition-colors"
                                        >
                                            <div className="flex items-center p-3 justify-between w-full">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="flex items-center shrink-0">
                                                        <Checkbox
                                                            label=""
                                                            labelHidden
                                                            checked={selectedItems.includes(item.id)}
                                                            onChange={(val) => {
                                                                if (val) setSelectedItems([...selectedItems, item.id]);
                                                                else setSelectedItems(selectedItems.filter(i => i !== item.id));
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-indigo-600">
                                                        <Icon source={DragHandleIcon} />
                                                    </div>
                                                    {(asset.type === 'color' || asset.type === 'option') && (item.hex || item.isPattern) && (
                                                        <div
                                                            className="w-12 h-12 rounded border border-gray-200 shadow-sm"
                                                            style={{
                                                                backgroundColor: item.hex || 'transparent',
                                                                backgroundImage: item.isPattern ? `url(${item.patternUrl})` : 'none',
                                                                backgroundSize: 'cover'
                                                            }}
                                                        />
                                                    )}
                                                    <div className="flex flex-col gap-1">
                                                        <Text variant="bodyMd" fontWeight="bold" as="span">
                                                            {item.name}
                                                        </Text>
                                                        {(asset.type === 'color' || asset.type === 'option') && (item.hex || item.isPattern) && (
                                                            <Text variant="bodySm" tone="subdued" as="span">
                                                                {item.isPattern ? 'Image/Pattern' : item.hex}
                                                            </Text>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {asset.type === 'gallery' && (
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-20 h-20 rounded border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
                                                                <img src={item.url} alt={item.name} className="max-w-full max-h-full object-contain" />
                                                            </div>
                                                            <Text variant="bodyMd" fontWeight="bold" as="span">{item.name}</Text>
                                                        </div>
                                                    )}
                                                    {asset.type === 'font' && (
                                                        <div className="mr-8">
                                                            <span style={{ fontFamily: item.name, fontSize: '14px' }}>Customfly</span>
                                                        </div>
                                                    )}
                                                    <div className="border border-gray-200 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors">
                                                        <Button
                                                            icon={EditIcon}
                                                            variant="plain"
                                                            onClick={() => {
                                                                setItemToRename(item);
                                                                setNewItemName(item.name);
                                                                setIsRenameModalOpen(true);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="border border-gray-200 rounded-md flex items-center justify-center hover:bg-red-50 transition-colors">
                                                        <Button
                                                            icon={DeleteIcon}
                                                            variant="plain"
                                                            tone="critical"
                                                            onClick={() => handleDeleteItem(item.name)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </Reorder.Item>
                                    ))}
                                    {localItems.length === 0 && (
                                        <div className="p-8 text-center text-gray-500">No items to reorder</div>
                                    )}
                                </Reorder.Group>
                            </div>
                        ) : (
                            <ResourceList
                                resourceName={{
                                    singular: asset.type === 'gallery' ? 'image' : asset.type,
                                    plural: asset.type === 'gallery' ? 'images' : `${asset.type}s`
                                }}
                                items={paginatedItems}
                                selectedItems={selectedItems}
                                onSelectionChange={(selected) => setSelectedItems(selected as string[])}
                                bulkActions={[
                                    {
                                        content: 'Delete',
                                        onAction: handleBulkDelete,
                                    }
                                ]}
                                emptyState={
                                    <div className="p-12 text-center text-gray-400 italic">
                                        No matching items found in this group.
                                    </div>
                                }
                                renderItem={(item) => (
                                    <ResourceItem
                                        id={item.id}
                                        onClick={() => { }}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-3 flex-1">
                                                {(asset.type === 'color' || asset.type === 'option') && (item.hex || item.isPattern) && (
                                                    <div
                                                        className="w-12 h-12 rounded border border-gray-200 shadow-sm"
                                                        style={{
                                                            backgroundColor: item.hex || 'transparent',
                                                            backgroundImage: item.isPattern ? `url(${item.patternUrl})` : 'none',
                                                            backgroundSize: 'cover'
                                                        }}
                                                    />
                                                )}
                                                <div className="flex flex-col gap-1">
                                                    <Text variant="bodyMd" fontWeight="bold" as="span">
                                                        {item.name}
                                                    </Text>
                                                    {(asset.type === 'color' || asset.type === 'option') && (item.hex || item.isPattern) && (
                                                        <Text variant="bodySm" tone="subdued" as="span">
                                                            {item.isPattern ? 'Image/Pattern' : item.hex}
                                                        </Text>
                                                    )}
                                                </div>
                                            </div>

                                            {asset.type === 'gallery' && (
                                                <div className="flex-1 px-8">
                                                    <div className="flex items-center gap-4 justify-end">
                                                        <Text variant="bodyMd" fontWeight="bold" as="span">{item.name}</Text>
                                                        <div className="w-24 h-24 rounded border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
                                                            <img src={item.url} alt={item.name} className="max-w-full max-h-full object-contain" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {asset.type === 'font' && (
                                                <div className="flex-1 px-8 text-right">
                                                    <span style={{ fontFamily: item.name, fontSize: '16px' }}>
                                                        Customfly 123
                                                    </span>
                                                </div>
                                            )}

                                            {asset.type === 'option' && (
                                                <div className="flex-1 px-8 text-right">
                                                    <Text variant="bodySm" tone="subdued" as="span">
                                                        {item.hex || (item.isPattern ? 'Image' : 'Text Option')}
                                                    </Text>
                                                </div>
                                            )}

                                            {asset.config?.enablePricing && asset.config?.pricingType === 'single' && (
                                                <div className="w-24 mr-4">
                                                    <TextField
                                                        label="Price"
                                                        labelHidden
                                                        type="number"
                                                        value={asset.config?.fontPrices?.[item.name] || '0'}
                                                        onChange={(val) => handleUpdateFontPrice(item.name, val)}
                                                        autoComplete="off"
                                                        prefix="$"
                                                        size="slim"
                                                    />
                                                </div>
                                            )}

                                            <div className="shrink-0 ml-4 flex gap-1">
                                                <div className="border border-gray-200 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors">
                                                    <Button
                                                        icon={EditIcon}
                                                        variant="plain"
                                                        onClick={(e?: any) => {
                                                            e?.stopPropagation();
                                                            setItemToRename(item);
                                                            setNewItemName(item.name);
                                                            setIsRenameModalOpen(true);
                                                        }}
                                                    />
                                                </div>
                                                <div className="border border-gray-200 rounded-md flex items-center justify-center hover:bg-red-50 transition-colors">
                                                    <Button
                                                        icon={DeleteIcon}
                                                        variant="plain"
                                                        tone="critical"
                                                        onClick={(e?: any) => {
                                                            e?.stopPropagation();
                                                            handleDeleteItem(item.name);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </ResourceItem>
                                )}
                            />
                        )}

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
                    </Card>
                </Layout.Section>
            </Layout>

            <Modal
                open={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setQueuedOptions([]);
                }}
                title={asset.type === 'font' ? 'Add Fonts to Group' :
                    asset.type === 'gallery' ? 'Add Images to Gallery' :
                        asset.type === 'option' ? 'Add Options' : 'Add New Color'}
                primaryAction={{
                    content: asset.type === 'option' ? (queuedOptions.length > 0 ? `Save ${queuedOptions.length} Items` : 'Save Item') : 'Add Items',
                    onAction: handleAddItem,
                    loading: isSubmitting
                }}
                secondaryActions={[{
                    content: 'Cancel', onAction: () => {
                        setIsAddModalOpen(false);
                        setQueuedOptions([]);
                    }
                }]}
            >
                <Modal.Section>
                    <BlockStack gap="400">
                        {asset.type === 'font' && (
                            <BlockStack gap="400">
                                <Select
                                    label="Source"
                                    options={[
                                        { label: 'Google Fonts Library', value: 'google' },
                                        { label: 'System / Custom Font Name', value: 'custom' },
                                    ]}
                                    value={newFontType}
                                    onChange={(val: any) => setNewFontType(val)}
                                />

                                {newFontType === 'google' ? (
                                    <BlockStack gap="200">
                                        <Combobox
                                            allowMultiple
                                            activator={
                                                <Combobox.TextField
                                                    prefix={<Icon source={SearchIcon} />}
                                                    onChange={updateText}
                                                    label="Search Google Fonts"
                                                    labelHidden
                                                    value={inputValue}
                                                    placeholder="Search fonts..."
                                                    autoComplete="off"
                                                />
                                            }
                                        >
                                            {googleFontOptions.length > 0 ? (
                                                <Listbox onSelect={(val) => {
                                                    if (!selectedGoogleFonts.includes(val)) {
                                                        setSelectedGoogleFonts([...selectedGoogleFonts, val]);
                                                    }
                                                    setInputValue('');
                                                }}>
                                                    {googleFontOptions.map((font) => (
                                                        <Listbox.Option key={font} value={font} selected={selectedGoogleFonts.includes(font)}>
                                                            {font}
                                                        </Listbox.Option>
                                                    ))}
                                                </Listbox>
                                            ) : null}
                                        </Combobox>
                                        <InlineStack gap="200">
                                            {selectedGoogleFonts.map((font) => (
                                                <Tag key={font} onRemove={() => removeTag(font)}>{font}</Tag>
                                            ))}
                                        </InlineStack>
                                    </BlockStack>
                                ) : (
                                    <TextField
                                        label="Font Family Name"
                                        value={newName}
                                        onChange={setNewName}
                                        autoComplete="off"
                                        placeholder="e.g. Arial, MyCustomFont"
                                        helpText="Enter the exact CSS font-family name."
                                    />
                                )}
                            </BlockStack>
                        )}

                        {asset.type === 'color' && (
                            <BlockStack gap="400">
                                <div className="grid grid-cols-2 gap-4">
                                    <TextField
                                        label="Color/Pattern Name"
                                        value={newColorName}
                                        onChange={setNewColorName}
                                        autoComplete="off"
                                        placeholder="e.g. Arctic White"
                                    />
                                    <Select
                                        label="Type"
                                        options={[
                                            { label: 'Solid Color', value: 'color' },
                                            { label: 'Pattern/Texture', value: 'pattern' },
                                        ]}
                                        value={colorItemType}
                                        onChange={(val: any) => setColorItemType(val)}
                                    />
                                </div>

                                {colorItemType === 'color' ? (
                                    <div className="flex items-center gap-4 p-3 border rounded-lg bg-gray-50">
                                        <div className="flex-1">
                                            <TextField
                                                label="Hex Color"
                                                labelHidden
                                                value={newColorHex}
                                                onChange={setNewColorHex}
                                                autoComplete="off"
                                                placeholder="#000000"
                                                prefix={<div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: newColorHex }} />}
                                            />
                                        </div>
                                        <input
                                            type="color"
                                            value={isValidHex(newColorHex) ? newColorHex : '#000000'}
                                            onChange={(e) => setNewColorHex(e.target.value)}
                                            className="w-10 h-10 p-0 border-0 rounded cursor-pointer overflow-hidden"
                                        />
                                    </div>
                                ) : (
                                    <BlockStack gap="400">
                                        <Select
                                            label="Pattern Source"
                                            options={[
                                                { label: 'From Library', value: 'library' },
                                                { label: 'Upload New', value: 'upload' },
                                            ]}
                                            value={patternSource}
                                            onChange={(val: any) => setPatternSource(val)}
                                        />

                                        {patternSource === 'library' ? (
                                            <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1">
                                                {PATTERN_LIBRARY.map((p) => (
                                                    <div
                                                        key={p.url}
                                                        onClick={() => setSelectedLibraryPattern(p.url)}
                                                        className={`aspect-square rounded-md border-2 cursor-pointer overflow-hidden transition-all ${selectedLibraryPattern === p.url ? 'border-indigo-600 scale-95 shadow-inner' : 'border-transparent hover:border-gray-300'}`}
                                                        title={p.name}
                                                    >
                                                        <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <BlockStack gap="200">
                                                <label className="block text-sm font-medium text-gray-700">Pattern File</label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            setPatternFile(e.target.files[0]);
                                                            if (!newColorName) {
                                                                const fname = e.target.files[0].name.split('.')[0];
                                                                setNewColorName(fname.charAt(0).toUpperCase() + fname.slice(1));
                                                            }
                                                        }
                                                    }}
                                                    className="block w-full text-sm text-gray-500
                                                      file:mr-4 file:py-2 file:px-4
                                                      file:rounded-full file:border-0
                                                      file:text-sm file:font-semibold
                                                      file:bg-indigo-50 file:text-indigo-700
                                                      hover:file:bg-indigo-100
                                                    "
                                                />
                                                {patternFile && (
                                                    <div className="mt-2 text-center rounded border border-dashed border-gray-300 p-2">
                                                        <img
                                                            src={URL.createObjectURL(patternFile)}
                                                            alt="Preview"
                                                            className="max-h-24 mx-auto rounded"
                                                        />
                                                    </div>
                                                )}
                                            </BlockStack>
                                        )}
                                    </BlockStack>
                                )}
                            </BlockStack>
                        )}

                        {asset.type === 'gallery' && (
                            <BlockStack gap="400">
                                <label className="block text-sm font-medium text-gray-700">Gallery Images (Bulk Upload Supported)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            setGalleryFiles(Array.from(e.target.files));
                                        }
                                    }}
                                    className="block w-full text-sm text-gray-500
                                      file:mr-4 file:py-2 file:px-4
                                      file:rounded-full file:border-0
                                      file:text-sm file:font-semibold
                                      file:bg-indigo-50 file:text-indigo-700
                                      hover:file:bg-indigo-100
                                    "
                                />
                                {galleryFiles.length > 0 && (
                                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded bg-gray-50">
                                        {galleryFiles.map((file, i) => (
                                            <div key={i} className="aspect-square relative rounded overflow-hidden border border-gray-200">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt="upload-preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {isSubmitting && uploadProgress > 0 && (
                                    <BlockStack gap="200">
                                        <div className="flex justify-between items-center text-xs text-gray-500">
                                            <span>Processing images...</span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <ProgressBar progress={uploadProgress} size="small" tone="primary" />
                                    </BlockStack>
                                )}
                            </BlockStack>
                        )}

                        {asset.type === 'option' && (
                            <BlockStack gap="400">
                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <TextField
                                            label="Option Name"
                                            value={newColorName}
                                            onChange={setNewColorName}
                                            autoComplete="off"
                                            placeholder="e.g. Mirror Effect"
                                        />
                                    </div>
                                    <div className="w-48">
                                        <Select
                                            label="Type"
                                            options={[
                                                { label: 'Name Only (Text)', value: 'text' },
                                                { label: 'Color Palette', value: 'color' },
                                                { label: 'With Image (Swatch)', value: 'image' },
                                            ]}
                                            value={optionItemType}
                                            onChange={(val: any) => setOptionItemType(val)}
                                        />
                                    </div>
                                    <div className="mb-0.5">
                                        <Button icon={PlusIcon} onClick={handleAddToQueue} variant="secondary">Add to List</Button>
                                    </div>
                                </div>

                                {optionItemType === 'color' && (
                                    <div className="flex items-center gap-4 p-3 border rounded-lg bg-gray-50">
                                        <div className="flex-1">
                                            <TextField
                                                label="Hex Color"
                                                labelHidden
                                                value={newColorHex}
                                                onChange={setNewColorHex}
                                                autoComplete="off"
                                                placeholder="#000000"
                                                prefix={<div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: newColorHex }} />}
                                            />
                                        </div>
                                        <input
                                            type="color"
                                            value={isValidHex(newColorHex) ? newColorHex : '#000000'}
                                            onChange={(e) => setNewColorHex(e.target.value)}
                                            className="w-10 h-10 p-0 border-0 rounded cursor-pointer overflow-hidden"
                                        />
                                    </div>
                                )}

                                {optionItemType === 'image' && (
                                    <BlockStack gap="200">
                                        <label className="block text-sm font-medium text-gray-700">Swatch Image</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setOptionImageFile(e.target.files[0]);
                                                    if (!newColorName) {
                                                        const fname = e.target.files[0].name.split('.')[0];
                                                        setNewColorName(fname.charAt(0).toUpperCase() + fname.slice(1));
                                                    }
                                                }
                                            }}
                                            className="block w-full text-sm text-gray-500
                                              file:mr-4 file:py-2 file:px-4
                                              file:rounded-full file:border-0
                                              file:text-sm file:font-semibold
                                              file:bg-indigo-50 file:text-indigo-700
                                              hover:file:bg-indigo-100
                                            "
                                        />
                                        {optionImageFile && (
                                            <div className="mt-2 text-center rounded border border-dashed border-gray-300 p-2 bg-white">
                                                <img
                                                    src={URL.createObjectURL(optionImageFile)}
                                                    alt="Preview"
                                                    className="max-h-32 mx-auto rounded"
                                                />
                                            </div>
                                        )}
                                    </BlockStack>
                                )}

                                {optionItemType === 'text' && (
                                    <p className="text-xs text-gray-400 italic">
                                        Fill in the name and click the plus button to add it to your list.
                                    </p>
                                )}

                                {queuedOptions.length > 0 && (
                                    <div className="mt-4 border-t pt-4">
                                        <Text variant="headingSm" as="h3">Items in List ({queuedOptions.length})</Text>
                                        <div className="mt-3 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                            {queuedOptions.map((opt, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100 group">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-8 h-8 rounded border border-gray-200"
                                                            style={{
                                                                backgroundColor: opt.type === 'color' ? opt.value : 'transparent',
                                                                backgroundImage: opt.type === 'image' ? `url(${opt.value})` : 'none',
                                                                backgroundSize: 'cover'
                                                            }}
                                                        />
                                                        <Text variant="bodyMd" fontWeight="bold" as="span">{opt.name}</Text>
                                                    </div>
                                                    <Button
                                                        icon={DeleteIcon}
                                                        tone="critical"
                                                        variant="plain"
                                                        onClick={() => setQueuedOptions(queuedOptions.filter((_, i) => i !== idx))}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </BlockStack>
                        )}
                    </BlockStack>
                </Modal.Section>
            </Modal>

            <Modal
                open={isRenameModalOpen}
                onClose={() => setIsRenameModalOpen(false)}
                title="Rename Item"
                primaryAction={{
                    content: 'Save',
                    onAction: handleRenameItem,
                    loading: isSubmitting
                }}
                secondaryActions={[{ content: 'Cancel', onAction: () => setIsRenameModalOpen(false) }]}
            >
                <Modal.Section>
                    <FormLayout>
                        <TextField
                            label="Name"
                            value={newItemName}
                            onChange={setNewItemName}
                            autoComplete="off"
                        />
                    </FormLayout>
                </Modal.Section>
            </Modal>
            {toastActive && (
                <Toast content={toastContent} onDismiss={() => setToastActive(false)} duration={3000} />
            )}
        </Page>
    );
}
