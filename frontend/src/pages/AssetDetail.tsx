import { useState, useEffect, useCallback, useMemo } from 'react';
import { Page, Layout, Card, ResourceList, ResourceItem, Text, Button, Modal, Box, BlockStack, Filters, Pagination, Select, FormLayout, TextField, Combobox, Listbox, Icon, Tag, InlineStack, Checkbox, ProgressBar, Toast } from '@shopify/polaris';
import { DeleteIcon, PlusIcon, SearchIcon, EditIcon, DragHandleIcon } from '@shopify/polaris-icons';
import { Reorder } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
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
    type: 'font' | 'color' | 'gallery' | 'option' | 'shape';
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
    const navigate = useNavigate();
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
    const [patternFiles, setPatternFiles] = useState<File[]>([]);
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [fontFiles, setFontFiles] = useState<File[]>([]);
    const [newName, setNewName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [itemToRename, setItemToRename] = useState<ListItem | null>(null);
    const [newItemName, setNewItemName] = useState('');
    const [newItemHex, setNewItemHex] = useState('');
    const [toastActive, setToastActive] = useState(false);
    const [toastContent, setToastContent] = useState('');
    const [optionItemType, setOptionItemType] = useState<'text' | 'image' | 'color'>('text');
    const [optionImageFiles, setOptionImageFiles] = useState<File[]>([]);
    const [queuedOptions, setQueuedOptions] = useState<{ name: string, value: string, type: string }[]>([]);
    const [localItems, setLocalItems] = useState<ListItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [svgCode, setSvgCode] = useState('');

    // Autocomplete states
    const [googleFontOptions, setGoogleFontOptions] = useState(POPULAR_GOOGLE_FONTS);

    const showToast = useCallback((content: string) => {
        setToastContent(content);
        setToastActive(true);
    }, []);
    const [inputValue, setInputValue] = useState('');
    const [selectedGoogleFonts, setSelectedGoogleFonts] = useState<string[]>([]);
    const [isClearing, setIsClearing] = useState(false);

    // Search & Pagination states
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('custom');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchDetail = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/imcst_api/assets?t=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                console.log("Fetching asset detail for ID:", id, "Total assets:", data.length);
                const found = data.find((a: Asset) => String(a.id) === String(id));
                if (!found) {
                    console.error("Asset not found in list. ID seeking:", id);
                }
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

    // Auto-refresh when AI updates this asset
    useEffect(() => {
        const handleAssetUpdate = () => {
            console.log('[AssetDetail] Detected asset update, refreshing...');
            fetchDetail();
        };

        // Listen for custom event from AI Chat
        window.addEventListener('ai-asset-updated', handleAssetUpdate);

        return () => {
            window.removeEventListener('ai-asset-updated', handleAssetUpdate);
        };
    }, [fetchDetail]);


    const uploadToS3Internal = async (file: File | string, folder: string, filename?: string): Promise<string> => {
        // Extract shop from URL params
        const shop = new URLSearchParams(window.location.search).get('shop') || '';

        if (typeof file === 'string' && file.startsWith('data:')) {
            const resp = await fetch('/imcst_api/public/upload/base64', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64: file, folder, filename, shop })
            });
            if (!resp.ok) throw new Error("Upload failed");
            const data = await resp.json();
            return data.url;
        } else if (file instanceof File) {
            const formData = new FormData();
            formData.append('image', file);
            const resp = await fetch(`/imcst_api/public/upload/image?folder=${folder}&shop=${encodeURIComponent(shop)}&webp=true`, {
                method: 'POST',
                body: formData
            });
            if (!resp.ok) throw new Error("Upload failed");
            const data = await resp.json();
            return data.url;
        }
        return file as string;
    };

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
            const parsed = safeSplit(asset.value);
            return parsed.map(pair => {
                if (pair.includes('|')) {
                    const [name, val] = pair.split('|');
                    return { name: name.trim(), id: pair, url: val.trim() };
                }
                return { name: pair, id: pair };
            });
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
            const result = safeSplit(asset.value).map(pair => {
                const parts = pair.split('|');
                // Auto-handle migrated or simple formats
                if (parts.length >= 2) {
                    const url = parts[parts.length - 1];
                    const name = parts[parts.length - 2];
                    return { name: name?.trim() || '', url: url?.trim() || '', id: pair };
                }
                return { name: pair, url: '', id: pair };
            }).filter(i => i.name);
            
            // Debug: Log first item
            if (result.length > 0) {
                console.log('[Gallery] First item:', result[0]);
            }
            
            return result;
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

        if (asset.type === 'shape') {
            return safeSplit(asset.value).map(pair => {
                const parts = pair.split('|');
                const name = parts[0];
                const code = parts.slice(1).join('|');
                return {
                    name: name?.trim() || '',
                    url: code?.trim() || '', // Store SVG code in URL for preview
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
            // Google Fonts
            const googleFamilies = items
                .filter(f => asset?.config?.fontType === 'google' && !f.url)
                .map(f => f.name.trim())
                .filter(name => name && !name.includes('|') && !name.includes('data:') && !name.includes('://'))
                .map(name => name.replace(/ /g, '+'))
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

            // Custom Fonts from either the main asset value or items list
            const customStyleId = 'detail-custom-fonts';
            let style = document.getElementById(customStyleId) as HTMLStyleElement;
            if (!style) {
                style = document.createElement('style');
                style.id = customStyleId;
                document.head.appendChild(style);
            }

            let css = '';
            // 1. Check if the asset itself is a single custom font
            if (asset?.config?.fontType === 'custom' && asset.value && !asset.value.includes('|')) {
                css += `@font-face { font-family: "${asset.name}"; src: url("${asset.value}"); font-display: swap; }\n`;
            }

            // 2. Check items in the list (format Name|Data or Name|URL)
            items.forEach(it => {
                if (it.url && (it.url.startsWith('data:') || it.url.startsWith('http'))) {
                    css += `@font-face { font-family: "${it.name}"; src: url("${it.url}"); font-display: swap; }\n`;
                }
            });
            style.textContent = css;
        }
    }, [items, asset]);

    const handleDeleteItem = async (itemName: string) => {
        if (!asset || !confirm(`Delete item "${itemName}" from this group?`)) return;

        let newListStr = '';
        const currentList = safeSplit(asset.value);
        if (asset.type === 'font') {
            newListStr = currentList.filter(n => n !== itemName).join('\n');
        } else if (asset.type === 'color' || asset.type === 'option' || asset.type === 'shape') {
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
                    
                    // For color type, also update hex code if provided
                    if (asset.type === 'color' && newItemHex) {
                        newParts[newParts.length - 1] = newItemHex.startsWith('#') ? newItemHex : `#${newItemHex}`;
                    }
                    
                    return newParts.join('|');
                }
                return newItemName;
            }
            return pair;
        });

        const newListStr = nameChangedList.join(asset.type === 'color' ? ', ' : '\n');

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
                showToast(`Updated "${newItemName}"`);
                fetchDetail();
                setIsRenameModalOpen(false);
                setItemToRename(null);
                setNewItemName('');
                setNewItemHex('');
            } else {
                alert("Failed to update item");
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
    const handleClearAll = async () => {
        if (!asset) return;
        if (!confirm("Are you sure you want to delete ALL items in this group? This cannot be undone.")) return;

        setIsClearing(true);
        try {
            const response = await fetch(`/imcst_api/assets/${asset.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: asset.name,
                    value: '',
                    config: asset.config
                })
            });

            if (response.ok) {
                showToast("All items cleared");
                fetchDetail();
            } else {
                alert("Failed to clear items");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsClearing(false);
        }
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
            if (optionImageFiles.length === 0) {
                alert("Please select at least one image first.");
                return;
            }
            try {
                const newItemsToAdd: { name: string, value: string, type: string }[] = [];
                for (let i = 0; i < optionImageFiles.length; i++) {
                    const file = optionImageFiles[i];
                    const fname = file.name.split('.')[0];
                    const oName = optionImageFiles.length === 1 && newColorName ? newColorName : (fname.charAt(0).toUpperCase() + fname.slice(1));
                    const s3Url = await uploadToS3Internal(file, 'options-queued');
                    newItemsToAdd.push({ name: oName, value: s3Url, type: 'image' });
                }
                setQueuedOptions([...queuedOptions, ...newItemsToAdd]);
                setNewColorName('');
                setOptionImageFiles([]);
                setNewColorHex('#000000');
                return;
            } catch (err) {
                alert("Failed to upload image to S3.");
                return;
            }
        }

        setQueuedOptions([...queuedOptions, { name: newColorName, value: val, type: optionItemType }]);
        setNewColorName('');
        setOptionImageFiles([]);
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
                    fontsToAdd = selectedGoogleFonts.length > 0 ? selectedGoogleFonts : [];
                } else {
                    // Add manual font name if provided
                    if (newName.trim()) {
                        fontsToAdd.push(newName.trim());
                    }
                    // Add font names and data from uploaded files
                    if (fontFiles.length > 0) {
                        for (let i = 0; i < fontFiles.length; i++) {
                            const file = fontFiles[i];
                            const fontName = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
                            // Custom fonts are uploaded to S3
                            const s3Url = await uploadToS3Internal(file, 'fonts');
                            fontsToAdd.push(`${fontName}|${s3Url}`);
                            setUploadProgress(Math.round(((i + 1) / fontFiles.length) * 100));
                        }
                    }
                }

                const uniqueToAdd = fontsToAdd.filter(f => {
                    const nameToAdd = f.includes('|') ? f.split('|')[0].toLowerCase() : f.toLowerCase();
                    return !currentList.some(c => {
                        const currentName = c.includes('|') ? c.split('|')[0].toLowerCase() : c.toLowerCase();
                        return currentName === nameToAdd;
                    });
                });
                newListStr = [...currentList, ...uniqueToAdd].join('\n');
                console.log('New list string:', newListStr);
            } else if (asset.type === 'color') {
                if (colorItemType === 'color') {
                    if (!newColorName || !newColorHex) return;
                    if (currentList.some(p => p.split('|')[0].toLowerCase() === newColorName.toLowerCase())) {
                        alert("Name already exists in this group");
                        setIsSubmitting(false);
                        return;
                    }
                    newListStr = [...currentList, `${newColorName}|${newColorHex}`].join('\n');
                } else {
                    // Pattern upload
                    if (patternSource === 'upload') {
                        if (patternFiles.length === 0) return;
                        const newPatterns: string[] = [];
                        for (let i = 0; i < patternFiles.length; i++) {
                            const file = patternFiles[i];
                            const fname = file.name.split('.')[0];
                            const pName = patternFiles.length === 1 && newColorName ? newColorName : (fname.charAt(0).toUpperCase() + fname.slice(1));

                            // Check for duplicates in current list and what we just added
                            const isDup = currentList.some(p => p.split('|')[0].toLowerCase() === pName.toLowerCase()) ||
                                newPatterns.some(p => p.split('|')[0].toLowerCase() === pName.toLowerCase());

                            if (isDup && patternFiles.length === 1) {
                                alert("Name already exists");
                                setIsSubmitting(false);
                                return;
                            }

                            const finalPName = isDup ? `${pName} (${Date.now() % 1000})` : pName;
                            const s3Url = await uploadToS3Internal(file, 'patterns');
                            newPatterns.push(`${finalPName}|pattern:${s3Url}`);
                            setUploadProgress(Math.round(((i + 1) / patternFiles.length) * 100));
                        }
                        newListStr = [...currentList, ...newPatterns].join('\n');
                    } else {
                        if (!newColorName || !selectedLibraryPattern) return;
                        if (currentList.some(p => p.split('|')[0].toLowerCase() === newColorName.toLowerCase())) {
                            alert("Name already exists");
                            setIsSubmitting(false);
                            return;
                        }
                        newListStr = [...currentList, `${newColorName}|pattern:${selectedLibraryPattern}`].join('\n');
                    }
                }
            } else if (asset.type === 'gallery') {
                const newItems: string[] = [];
                if (galleryFiles.length === 0) return;

                for (let i = 0; i < galleryFiles.length; i++) {
                    const file = galleryFiles[i];
                    try {
                        const name = file.name.split('.')[0];
                        const s3Url = await uploadToS3Internal(file, 'gallery');
                        newItems.push(`${name}|${s3Url}`);
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
                        if (optionImageFiles.length === 0) {
                            alert("Please select at least one image");
                            setIsSubmitting(false);
                            shouldAdd = false;
                        } else {
                            try {
                                const newOpts: any[] = [];
                                for (let i = 0; i < optionImageFiles.length; i++) {
                                    const file = optionImageFiles[i];
                                    const fname = file.name.split('.')[0];
                                    const oName = optionImageFiles.length === 1 && newColorName ? newColorName : (fname.charAt(0).toUpperCase() + fname.slice(1));
                                    const s3Url = await uploadToS3Internal(file, 'options');
                                    newOpts.push({ name: oName, value: s3Url, type: 'image' });
                                    setUploadProgress(Math.round(((i + 1) / optionImageFiles.length) * 100));
                                }
                                itemsToSave = [...itemsToSave, ...newOpts];
                                shouldAdd = false; // already added in newOpts
                            } catch (e) {
                                alert("Failed to process images");
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
            } else if (asset.type === 'shape') {
                if (!newColorName || !svgCode) return;
                const valToStore = `${newColorName}|${svgCode}`;
                if (currentList.some(p => p.split('|')[0].toLowerCase() === newColorName.toLowerCase())) {
                    alert("Name already exists in this group");
                    setIsSubmitting(false);
                    return;
                }
                newListStr = [...currentList, valToStore].join('\n');
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
                setSvgCode('');
                setPatternFiles([]);
                setSelectedGoogleFonts([]);
                setGalleryFiles([]);
                setFontFiles([]);
                setOptionImageFiles([]);
                setQueuedOptions([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };


    if (isLoading) return <Page><Layout><Layout.Section><Card>Loading...</Card></Layout.Section></Layout></Page>;
    if (!asset) return <Page><Layout><Layout.Section><Card><BlockStack gap="200"><Text variant="headingMd" as="h2">Asset not found</Text><Text tone="subdued" as="p">Could not find asset with ID: {id}</Text><Button onClick={() => navigate('/assets')}>Back to Assets</Button></BlockStack></Card></Layout.Section></Layout></Page>;

    return (
        <Page
            fullWidth
            backAction={{ content: 'Assets', onAction: () => navigate('/assets') }}
            title={asset.name}
            primaryAction={{
                content: asset.type === 'font' ? 'Add Font' :
                    asset.type === 'gallery' ? 'Add Image' :
                        asset.type === 'option' ? 'Add Option' :
                            asset.type === 'shape' ? 'Add Shape' : 'Add Color',
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
                                <InlineStack align="space-between">
                                    <Text variant="headingMd" as="h2">
                                        {asset.type === 'font' ? 'Fonts' :
                                            asset.type === 'gallery' ? 'Images' :
                                                asset.type === 'option' ? 'Options' : 'Colors'} in this Group ({items.length})
                                    </Text>
                                    <div className="flex gap-2">
                                        {items.length > 0 && (
                                            <Button
                                                tone="critical"
                                                variant="secondary"
                                                size="slim"
                                                onClick={handleClearAll}
                                                loading={isClearing}
                                            >
                                                Clear All
                                            </Button>
                                        )}
                                    </div>
                                </InlineStack>

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
                                {localItems.length > 0 && (
                                    <Box padding="300" background="bg-surface-secondary-active" borderBlockEndWidth="025" borderColor="border-subdued">
                                        <InlineStack gap="300" align="start">
                                            <Checkbox
                                                label={`Select all ${localItems.length} items`}
                                                checked={selectedItems.length === localItems.length && localItems.length > 0}
                                                onChange={(val) => {
                                                    if (val) setSelectedItems(localItems.map(i => i.id));
                                                    else setSelectedItems([]);
                                                }}
                                            />
                                        </InlineStack>
                                    </Box>
                                )}
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
                                                    {/* Gallery thumbnail */}
                                                    {asset.type === 'gallery' && item.url && (
                                                        <div className="w-12 h-12 rounded border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 shadow-sm">
                                                            <img 
                                                                src={item.url.replace(/ /g, '%20')} 
                                                                alt={item.name} 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => console.error('[Gallery Drag] Image failed to load:', item.url)}
                                                            />
                                                        </div>
                                                    )}
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
                                                    {asset.type === 'shape' && item.url && (
                                                        <div
                                                            className="w-12 h-12 rounded border border-gray-100 bg-gray-50 p-1 flex items-center justify-center shrink-0 overflow-hidden"
                                                            dangerouslySetInnerHTML={{ __html: item.url }}
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

                                                <div className="shrink-0 ml-4 flex items-center gap-2">
                                                    {asset.config?.enablePricing && (asset.config?.pricingType === 'single' || asset.config?.pricingType === 'individual') && (
                                                        <div className="w-24 shrink-0">
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
                                                    <div className="border border-gray-200 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors">
                                                        <Button
                                                            icon={EditIcon}
                                                            variant="plain"
                                                            onClick={() => {
                                                                setItemToRename(item);
                                                                setNewItemName(item.name);
                                                                // For color items, also set hex code
                                                                if (asset.type === 'color' && item.value) {
                                                                    setNewItemHex(item.value);
                                                                }
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
                            <div className="p-2">
                                {filteredItems.length > 0 && (
                                    <Box padding="300" background="bg-surface-secondary-active" borderBlockEndWidth="025" borderColor="border-subdued">
                                        <InlineStack gap="300" align="start">
                                            <Checkbox
                                                label={`Select all ${filteredItems.length} items`}
                                                checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                                                onChange={(val) => {
                                                    if (val) setSelectedItems(filteredItems.map(i => i.id));
                                                    else setSelectedItems([]);
                                                }}
                                            />
                                        </InlineStack>
                                    </Box>
                                )}
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
                                                    {/* Gallery thumbnail */}
                                                    {asset.type === 'gallery' && item.url && (
                                                        <div className="w-12 h-12 rounded border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 shadow-sm">
                                                            <img 
                                                                src={item.url.replace(/ /g, '%20')} 
                                                                alt={item.name} 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => console.error('[Gallery] Image failed to load:', item.url)}
                                                            />
                                                        </div>
                                                    )}
                                                    {/* Color/Option preview */}
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
                                                    {/* Shape preview */}
                                                    {asset.type === 'shape' && item.url && (
                                                        <div
                                                            className="w-12 h-12 rounded border border-gray-100 bg-gray-50 p-1 flex items-center justify-center shrink-0 overflow-hidden"
                                                            dangerouslySetInnerHTML={{ __html: item.url }}
                                                        />
                                                    )}
                                                    {/* Item name and details */}
                                                    <div className="flex flex-col gap-1">
                                                        {asset.type === 'font' ? (
                                                            <span style={{ fontFamily: item.name, fontSize: '18px', fontWeight: 'bold' }}>
                                                                {item.name}
                                                            </span>
                                                        ) : (
                                                            <Text variant="bodyMd" fontWeight="bold" as="span">
                                                                {item.name}
                                                            </Text>
                                                        )}
                                                        {(asset.type === 'color' || asset.type === 'option') && (item.hex || item.isPattern) && (
                                                            <Text variant="bodySm" tone="subdued" as="span">
                                                                {item.isPattern ? 'Image/Pattern' : item.hex}
                                                            </Text>
                                                        )}
                                                    </div>
                                                </div>

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

                                                <div className="shrink-0 ml-4 flex items-center gap-2">
                                                    {asset.config?.enablePricing && (asset.config?.pricingType === 'single' || asset.config?.pricingType === 'individual') && (
                                                        <div className="w-24 shrink-0">
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
                                                    <div className="border border-gray-200 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors">
                                                        <Button
                                                            icon={EditIcon}
                                                            variant="plain"
                                                            onClick={(e?: any) => {
                                                                e?.stopPropagation();
                                                                setItemToRename(item);
                                                                setNewItemName(item.name);
                                                                // For color items, also set hex code
                                                                if (asset.type === 'color' && item.value) {
                                                                    setNewItemHex(item.value);
                                                                }
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
                            </div>
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
                                        { label: 'Your Font', value: 'custom' },
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
                                    <BlockStack gap="400">
                                        <TextField
                                            label="Font Family Name"
                                            value={newName}
                                            onChange={setNewName}
                                            autoComplete="off"
                                            placeholder="e.g. Arial, MyCustomFont"
                                            helpText="Enter the exact CSS font-family name."
                                        />
                                        <BlockStack gap="200">
                                            <label className="block text-sm font-medium text-gray-700">Upload Font Files (Bulk Upload Supported)</label>
                                            <input
                                                type="file"
                                                accept=".ttf,.otf,.woff,.woff2"
                                                multiple
                                                onChange={(e) => {
                                                    if (e.target.files) {
                                                        setFontFiles(Array.from(e.target.files));
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
                                            {fontFiles.length > 0 && (
                                                <div className="p-2 bg-gray-50 rounded border border-gray-100">
                                                    <Text variant="bodySm" fontWeight="bold" as="p">Selected files ({fontFiles.length}):</Text>
                                                    <ul className="list-disc list-inside text-xs text-gray-600 mt-1">
                                                        {fontFiles.map((file, i) => (
                                                            <li key={i}>{file.name}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            <Text variant="bodySm" tone="subdued" as="p">
                                                Upload multiple .ttf, .otf, .woff, or .woff2 font files at once. If using a system font, you can skip this.
                                            </Text>
                                        </BlockStack>
                                    </BlockStack>
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
                                                <label className="block text-sm font-medium text-gray-700">Pattern Image (.jpg, .png) - (Bulk Upload Supported)</label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={(e) => {
                                                        if (e.target.files) {
                                                            setPatternFiles(Array.from(e.target.files));
                                                            if (e.target.files.length === 1 && !newColorName) {
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
                                                {patternFiles.length > 0 && (
                                                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded bg-gray-50">
                                                        {patternFiles.map((file, i) => (
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
                                                {isSubmitting && uploadProgress > 0 && asset.type === 'color' && colorItemType === 'pattern' && patternSource === 'upload' && (
                                                    <BlockStack gap="200">
                                                        <ProgressBar progress={uploadProgress} size="small" tone="primary" />
                                                    </BlockStack>
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
                                            multiple
                                            onChange={(e) => {
                                                if (e.target.files) {
                                                    setOptionImageFiles(Array.from(e.target.files));
                                                    if (e.target.files.length === 1 && !newColorName) {
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
                                        {optionImageFiles.length > 0 && (
                                            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded bg-gray-50">
                                                {optionImageFiles.map((file, i) => (
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
                                        {isSubmitting && uploadProgress > 0 && asset.type === 'option' && optionItemType === 'image' && (
                                            <BlockStack gap="200">
                                                <ProgressBar progress={uploadProgress} size="small" tone="primary" />
                                            </BlockStack>
                                        )}
                                    </BlockStack>
                                )}

                            </BlockStack>
                        )}

                        {asset.type === 'shape' && (
                            <BlockStack gap="400">
                                <TextField
                                    label="Shape Name"
                                    value={newColorName}
                                    onChange={setNewColorName}
                                    autoComplete="off"
                                    placeholder="e.g. Triangle, Sparkle"
                                />
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-medium text-gray-700">SVG Code</label>
                                        {svgCode && (
                                            <div className="w-8 h-8 rounded border border-gray-100 bg-gray-50 p-1 overflow-hidden flex items-center justify-center" dangerouslySetInnerHTML={{ __html: svgCode }} />
                                        )}
                                    </div>
                                    <TextField
                                        label="SVG Input"
                                        labelHidden
                                        value={svgCode}
                                        onChange={setSvgCode}
                                        multiline={6}
                                        autoComplete="off"
                                        placeholder='<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0,0,100,100"><polygon points="50 0, 0 100, 100 100"></polygon></svg>'
                                        helpText="Only accept SVG under plain text"
                                    />
                                </div>
                            </BlockStack>
                        )}

                        {/* Display Queued Options in Modal */}
                        {asset.type === 'option' && queuedOptions.length > 0 && (
                            <div className="border-t pt-4 mt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <Text variant="headingSm" as="h3">Queued Items ({queuedOptions.length})</Text>
                                    <Button size="slim" tone="critical" variant="plain" onClick={() => setQueuedOptions([])}>Clear All</Button>
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {queuedOptions.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex items-center gap-3">
                                                {item.type === 'color' && (
                                                    <div className="w-8 h-8 rounded border border-gray-300" style={{ backgroundColor: item.value }} />
                                                )}
                                                {item.type === 'image' && (
                                                    <div className="w-8 h-8 rounded border border-gray-300 overflow-hidden">
                                                        <img src={item.value} alt={item.name} className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                <div>
                                                    <Text variant="bodyMd" fontWeight="semibold" as="span">{item.name}</Text>
                                                    <Text variant="bodySm" tone="subdued" as="p">
                                                        {item.type === 'text' ? 'Text Only' : item.type === 'color' ? item.value : 'Image'}
                                                    </Text>
                                                </div>
                                            </div>
                                            <Button
                                                icon={DeleteIcon}
                                                variant="plain"
                                                tone="critical"
                                                onClick={() => setQueuedOptions(queuedOptions.filter((_, i) => i !== idx))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </BlockStack>
                </Modal.Section>
            </Modal>

            <Modal
                open={isRenameModalOpen}
                onClose={() => setIsRenameModalOpen(false)}
                title={asset?.type === 'color' ? 'Edit Color' : 'Rename Item'}
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
                        {asset?.type === 'color' && (
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <TextField
                                        label="Hex Code"
                                        value={newItemHex}
                                        onChange={setNewItemHex}
                                        autoComplete="off"
                                        prefix="#"
                                        placeholder="000000"
                                    />
                                </div>
                                <div style={{ 
                                    width: '50px', 
                                    height: '50px', 
                                    backgroundColor: newItemHex.startsWith('#') ? newItemHex : `#${newItemHex}`, 
                                    border: '2px solid #ddd',
                                    borderRadius: '8px',
                                    marginBottom: '4px'
                                }} />
                            </div>
                        )}
                    </FormLayout>
                </Modal.Section>
            </Modal>
            {toastActive && (
                <Toast content={toastContent} onDismiss={() => setToastActive(false)} duration={3000} />
            )}
        </Page>
    );
}
