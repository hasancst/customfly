import { useState, useEffect, useCallback } from 'react';
import {
    Card,
    Text,
    Badge,
    Button,
    InlineStack,
    Box,
    BlockStack,
    Icon,
    Modal,
    ResourceList,
    ResourceItem,
    Filters,
    ChoiceList,
    Spinner,
    EmptyState
} from '@shopify/polaris';
import {
    CheckCircleIcon,
    DeleteIcon,
    AlertBubbleIcon,
    StarFilledIcon,
    ClockIcon
} from '@shopify/polaris-icons';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';

interface Recommendation {
    id: string;
    category: string;
    priority: string;
    title: string;
    description: string;
    reasoning?: string;
    actionable: boolean;
    status: string;
    createdAt: string;
    actions?: any;
}

export default function RecommendationDashboard() {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    // Filters
    const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

    const fetch = useAuthenticatedFetch();

    const loadRecommendations = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/imcst_api/recommendations');
            if (response.ok) {
                const data = await response.json();
                setRecommendations(data);
            }
        } catch (error) {
            console.error("Failed to load recommendations", error);
        } finally {
            setIsLoading(false);
        }
    }, [fetch]);

    useEffect(() => {
        loadRecommendations();
    }, [loadRecommendations]);

    const handleUpdateStatus = async (id: string, status: string) => {
        setIsProcessing(id);
        try {
            const response = await fetch(`/imcst_api/recommendations/${id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (response.ok) {
                setRecommendations(prev => prev.filter(r => r.id !== id));
                if (selectedRecommendation?.id === id) setIsModalOpen(false);
            }
        } catch (error) {
            console.error("Failed to update status", error);
        } finally {
            setIsProcessing(null);
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'critical': return <Badge tone="critical">Critical</Badge>;
            case 'high': return <Badge tone="warning">High</Badge>;
            case 'medium': return <Badge tone="info">Medium</Badge>;
            default: return <Badge tone="subdued">Low</Badge>;
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category.toLowerCase()) {
            case 'performance': return ClockIcon;
            case 'design': return StarFilledIcon;
            case 'ux': return AlertBubbleIcon;
            default: return CheckCircleIcon;
        }
    };

    const filteredRecommendations = recommendations.filter(r => {
        const matchesPriority = priorityFilter.length === 0 || priorityFilter.includes(r.priority);
        const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(r.category);
        return matchesPriority && matchesCategory;
    });

    if (isLoading) {
        return (
            <Box padding="800" pb="2000">
                <BlockStack align="center" gap="400">
                    <Spinner size="large" />
                    <Text variant="bodyMd" as="p">Menganalisis toko Anda...</Text>
                </BlockStack>
            </Box>
        );
    }

    return (
        <Box padding="400">
            <BlockStack gap="400">
                <Filters
                    queryValue=""
                    onQueryChange={() => { }}
                    onQueryClear={() => { }}
                    filters={[
                        {
                            key: 'priority',
                            label: 'Prioritas',
                            filter: (
                                <ChoiceList
                                    title="Prioritas"
                                    titleHidden
                                    choices={[
                                        { label: 'Critical', value: 'critical' },
                                        { label: 'High', value: 'high' },
                                        { label: 'Medium', value: 'medium' },
                                        { label: 'Low', value: 'low' },
                                    ]}
                                    selected={priorityFilter}
                                    onChange={setPriorityFilter}
                                    allowMultiple
                                />
                            ),
                        },
                        {
                            key: 'category',
                            label: 'Kategori',
                            filter: (
                                <ChoiceList
                                    title="Kategori"
                                    titleHidden
                                    choices={[
                                        { label: 'Performance', value: 'performance' },
                                        { label: 'UX', value: 'ux' },
                                        { label: 'Design', value: 'design' },
                                        { label: 'Pricing', value: 'pricing' },
                                    ]}
                                    selected={categoryFilter}
                                    onChange={setCategoryFilter}
                                    allowMultiple
                                />
                            ),
                        }
                    ]}
                    onClearAll={() => {
                        setPriorityFilter([]);
                        setCategoryFilter([]);
                    }}
                />

                {filteredRecommendations.length === 0 ? (
                    <EmptyState
                        heading="Semua Terlihat Bagus!"
                        action={{ content: 'Segarkan', onAction: loadRecommendations }}
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                        <p>AI tidak menemukan masalah mendesak saat ini. Periksa kembali nanti untuk saran optimasi baru.</p>
                    </EmptyState>
                ) : (
                    <ResourceList
                        resourceName={{ singular: 'rekomendasi', plural: 'rekomendasi' }}
                        items={filteredRecommendations}
                        renderItem={(item) => {
                            const { id, title, description, category, priority } = item;
                            return (
                                <ResourceItem
                                    id={id}
                                    onClick={() => {
                                        setSelectedRecommendation(item);
                                        setIsModalOpen(true);
                                    }}
                                    accessibilityLabel={`Lihat detail untuk ${title}`}
                                >
                                    <InlineStack gap="400" align="space-between" wrap={false}>
                                        <Box width="100%">
                                            <InlineStack gap="200" align="start">
                                                <Icon source={getCategoryIcon(category)} tone="base" />
                                                <BlockStack gap="100">
                                                    <Text variant="bodyMd" fontWeight="bold" as="h3">{title}</Text>
                                                    <Text variant="bodySm" tone="subdued" as="p">{description}</Text>
                                                </BlockStack>
                                            </InlineStack>
                                        </Box>
                                        <Box minWidth="100px">
                                            <InlineStack gap="200" align="end">
                                                {getPriorityBadge(priority)}
                                            </InlineStack>
                                        </Box>
                                    </InlineStack>
                                </ResourceItem>
                            );
                        }}
                    />
                )}
            </BlockStack>

            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedRecommendation?.title}
                primaryAction={{
                    content: 'Terapkan Sekarang',
                    onAction: () => handleUpdateStatus(selectedRecommendation?.id!, 'applied'),
                    loading: isProcessing === selectedRecommendation?.id,
                    disabled: !selectedRecommendation?.actionable
                }}
                secondaryActions={[
                    {
                        content: 'Abaikan',
                        onAction: () => handleUpdateStatus(selectedRecommendation?.id!, 'dismissed'),
                    },
                    {
                        content: 'Nanti Saja',
                        onAction: () => setIsModalOpen(false),
                    }
                ]}
            >
                <Modal.Section>
                    <BlockStack gap="400">
                        <InlineStack gap="200">
                            <Badge>{selectedRecommendation?.category}</Badge>
                            {selectedRecommendation && getPriorityBadge(selectedRecommendation.priority)}
                        </InlineStack>

                        <BlockStack gap="200">
                            <Text variant="headingMd" as="h4">Mengapa ini penting?</Text>
                            <Text variant="bodyMd" as="p">
                                {selectedRecommendation?.reasoning || selectedRecommendation?.description}
                            </Text>
                        </BlockStack>

                        {!selectedRecommendation?.actionable && (
                            <Box padding="300" bg="surface-attention" borderRadius="200">
                                <Text variant="bodySm" tone="attention">
                                    Rekomendasi ini bersifat informatif dan memerlukan tindakan manual di bagian pengaturan produk.
                                </Text>
                            </Box>
                        )}
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </Box>
    );
}
