import { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, ResourceList, ResourceItem, Text, Button, Toast, Modal, TextField, EmptyState, Spinner, InlineStack, Icon, Badge, Tabs } from '@shopify/polaris';
import { PlusIcon, DeleteIcon, DuplicateIcon, EditIcon } from '@shopify/polaris-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import CatalogTab from '../components/printful/CatalogTab';

interface DesignTemplate {
    id: string;
    name: string;
    description?: string;
    paperSize: string;
    unit: string;
    customPaperDimensions?: { width: number; height: number };
    thumbnail?: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

const NO_IMAGE_URL = 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png';

export default function StoreTemplates() {
    const [templates, setTemplates] = useState<DesignTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toastActive, setToastActive] = useState(false);
    const [toastContent, setToastContent] = useState('');
    const [deleteModalActive, setDeleteModalActive] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState(0);
    const [printfulConnected, setPrintfulConnected] = useState(false);
    const [checkingPrintful, setCheckingPrintful] = useState(true);

    const navigate = useNavigate();
    const location = useLocation();
    const fetch = useAuthenticatedFetch();

    const showToast = useCallback((content: string) => {
        setToastContent(content);
        setToastActive(true);
    }, []);

    useEffect(() => {
        fetchTemplates();
        checkPrintfulConnection();
    }, []);

    const checkPrintfulConnection = async () => {
        try {
            setCheckingPrintful(true);
            const response = await fetch('/imcst_api/printful/status');
            if (response.ok) {
                const data = await response.json();
                setPrintfulConnected(data.connected === true);
            }
        } catch (error) {
            console.error('Failed to check Printful connection:', error);
        } finally {
            setCheckingPrintful(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/imcst_api/templates');
            if (response.ok) {
                const data = await response.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error('Failed to fetch templates:', error);
            showToast('Failed to load templates');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTemplate = () => {
        navigate(`/template-designer${location.search}`);
    };

    const handleEditTemplate = (templateId: string) => {
        navigate(`/template-designer/${templateId}${location.search}`);
    };

    const handleDuplicateTemplate = async (templateId: string) => {
        try {
            const response = await fetch(`/imcst_api/templates/${templateId}/duplicate`, {
                method: 'POST'
            });
            if (response.ok) {
                showToast('Template duplicated successfully');
                fetchTemplates();
            }
        } catch (error) {
            console.error('Failed to duplicate template:', error);
            showToast('Failed to duplicate template');
        }
    };

    const handleDeleteTemplate = async () => {
        if (!templateToDelete) return;

        try {
            const response = await fetch(`/imcst_api/templates/${templateToDelete}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                showToast('Template deleted successfully');
                fetchTemplates();
            }
        } catch (error) {
            console.error('Failed to delete template:', error);
            showToast('Failed to delete template');
        } finally {
            setDeleteModalActive(false);
            setTemplateToDelete(null);
        }
    };

    const openDeleteModal = (templateId: string) => {
        setTemplateToDelete(templateId);
        setDeleteModalActive(true);
    };

    const getCanvasSize = (template: DesignTemplate) => {
        if (template.customPaperDimensions) {
            const { width, height } = template.customPaperDimensions;
            return `${width} × ${height} ${template.unit}`;
        }
        return template.paperSize;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Build tabs dynamically based on Printful connection
    const tabs = [
        {
            id: 'my-templates',
            content: 'My Templates',
            panelID: 'my-templates-panel',
        }
    ];

    // Add Printful tab only if connected
    if (printfulConnected) {
        tabs.push({
            id: 'printful',
            content: 'Printful',
            panelID: 'printful-panel',
        });
    }

    const renderItem = (template: DesignTemplate) => {
        const { id, name, description, thumbnail, tags, updatedAt } = template;

        return (
            <ResourceItem
                id={id}
                media={
                    <div className="w-20 h-20 rounded border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                        <img
                            src={thumbnail || NO_IMAGE_URL}
                            alt={name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = NO_IMAGE_URL;
                            }}
                        />
                    </div>
                }
                onClick={() => handleEditTemplate(id)}
            >
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <Text variant="bodyMd" fontWeight="bold" as="h3">
                            {name}
                        </Text>
                        {description && (
                            <Text variant="bodySm" as="p" tone="subdued">
                                {description}
                            </Text>
                        )}
                        <div className="mt-2 flex gap-2 items-center">
                            <Badge tone="info">{getCanvasSize(template)}</Badge>
                            <Text variant="bodySm" as="span" tone="subdued">
                                Updated {formatDate(updatedAt)}
                            </Text>
                        </div>
                        {tags.length > 0 && (
                            <div className="mt-2 flex gap-1 flex-wrap">
                                {tags.map((tag, index) => (
                                    <Badge key={index}>{tag}</Badge>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            icon={EditIcon}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEditTemplate(id);
                            }}
                        >
                            Edit
                        </Button>
                        <Button
                            icon={DuplicateIcon}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateTemplate(id);
                            }}
                        >
                            Duplicate
                        </Button>
                        <Button
                            icon={DeleteIcon}
                            tone="critical"
                            onClick={(e) => {
                                e.stopPropagation();
                                openDeleteModal(id);
                            }}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </ResourceItem>
        );
    };

    return (
        <Page
            title="Templates"
            primaryAction={selectedTab === 0 ? {
                content: 'Create Template',
                icon: PlusIcon,
                onAction: handleCreateTemplate
            } : undefined}
        >
            <Layout>
                <Layout.Section>
                    <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                        <Card padding="0">
                            {selectedTab === 0 && (
                                <>
                                    {isLoading ? (
                                        <div className="flex justify-center items-center p-8">
                                            <Spinner size="large" />
                                        </div>
                                    ) : templates.length === 0 ? (
                                        <EmptyState
                                            heading="Create your first template"
                                            action={{
                                                content: 'Create Template',
                                                onAction: handleCreateTemplate
                                            }}
                                            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                        >
                                            <p>
                                                Templates allow you to create reusable designs that can be applied to multiple products.
                                                Start by creating your first template.
                                            </p>
                                        </EmptyState>
                                    ) : (
                                        <ResourceList
                                            resourceName={{ singular: 'template', plural: 'templates' }}
                                            items={templates}
                                            renderItem={renderItem}
                                        />
                                    )}
                                </>
                            )}
                            
                            {selectedTab === 1 && printfulConnected && (
                                <div className="p-4">
                                    <CatalogTab 
                                        connected={true}
                                        isTemplateMode={true}
                                    />
                                </div>
                            )}
                        </Card>
                    </Tabs>
                </Layout.Section>
            </Layout>

            <Modal
                open={deleteModalActive}
                onClose={() => setDeleteModalActive(false)}
                title="Delete Template"
                primaryAction={{
                    content: 'Delete',
                    destructive: true,
                    onAction: handleDeleteTemplate
                }}
                secondaryActions={[
                    {
                        content: 'Cancel',
                        onAction: () => setDeleteModalActive(false)
                    }
                ]}
            >
                <Modal.Section>
                    <Text as="p">
                        Are you sure you want to delete this template? This action cannot be undone.
                    </Text>
                </Modal.Section>
            </Modal>

            {toastActive && (
                <Toast
                    content={toastContent}
                    onDismiss={() => setToastActive(false)}
                />
            )}
        </Page>
    );
}
