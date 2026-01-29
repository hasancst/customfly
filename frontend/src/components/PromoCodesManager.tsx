import React, { useState, useEffect, useCallback } from 'react';
import {
    Card,
    ResourceList,
    ResourceItem,
    Text,
    Badge,
    Button,
    Modal,
    FormLayout,
    TextField,
    Select,
    Checkbox,
    Box,
    InlineStack,
    EmptyState,
    Banner
} from '@shopify/polaris';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

export function PromoCodesManager() {
    const fetch = useAuthenticatedFetch();
    const [codes, setCodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalActive, setModalActive] = useState(false);
    const [editingCode, setEditingCode] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formCode, setFormCode] = useState('');
    const [discountType, setDiscountType] = useState('percentage');
    const [discountValue, setDiscountValue] = useState('0');
    const [minAmount, setMinAmount] = useState('0');
    const [limit, setLimit] = useState('');
    const [isActive, setIsActive] = useState(true);

    const loadCodes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/imcst_api/promo_codes');
            if (res.ok) {
                const data = await res.json();
                setCodes(data);
            }
        } catch (error) {
            console.error("Failed to load promo codes:", error);
        } finally {
            setLoading(false);
        }
    }, [fetch]);

    useEffect(() => {
        loadCodes();
    }, [loadCodes]);

    const handleOpenModal = (code: any = null) => {
        if (code) {
            setEditingCode(code);
            setFormCode(code.code);
            setDiscountType(code.discountType);
            setDiscountValue(code.discountValue.toString());
            setMinAmount(code.minOrderAmount?.toString() || '0');
            setLimit(code.usageLimit?.toString() || '');
            setIsActive(code.active);
        } else {
            setEditingCode(null);
            setFormCode('');
            setDiscountType('percentage');
            setDiscountValue('10');
            setMinAmount('0');
            setLimit('');
            setIsActive(true);
        }
        setModalActive(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/imcst_api/promo_codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingCode?.id,
                    code: formCode,
                    discountType,
                    discountValue: parseFloat(discountValue),
                    minOrderAmount: parseFloat(minAmount),
                    usageLimit: limit ? parseInt(limit) : null,
                    active: isActive
                })
            });

            if (res.ok) {
                setModalActive(false);
                loadCodes();
            }
        } catch (error) {
            console.error("Failed to save promo code:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this promo code?")) return;
        try {
            const res = await fetch(`/imcst_api/promo_codes/${id}`, { method: 'DELETE' });
            if (res.ok) loadCodes();
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    return (
        <Box>
            <Box paddingBlockEnd="400">
                <InlineStack align="end">
                    <Button variant="primary" onClick={() => handleOpenModal()}>Create Promo Code</Button>
                </InlineStack>
            </Box>

            <ResourceList
                resourceName={{ singular: 'promo code', plural: 'promo codes' }}
                items={codes}
                loading={loading}
                renderItem={(item) => {
                    const { id, code, discountType, discountValue, active, usageCount, usageLimit } = item;
                    return (
                        <ResourceItem
                            id={id}
                            onClick={() => handleOpenModal(item)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <InlineStack gap="200" align="center">
                                        <Text variant="bodyMd" fontWeight="bold" as="span">{code}</Text>
                                        <Badge tone={active ? 'success' : 'critical'}>{active ? 'Active' : 'Inactive'}</Badge>
                                    </InlineStack>
                                    <Text variant="bodySm" tone="subdued" as="p">
                                        {discountType === 'percentage' ? `${discountValue}% off` : `$${discountValue} off`}
                                        {item.minOrderAmount > 0 ? ` • Min order: $${item.minOrderAmount}` : ''}
                                    </Text>
                                    <Text variant="bodySm" tone="subdued" as="p">
                                        Used {usageCount} times {usageLimit ? `• Limit ${usageLimit}` : ''}
                                    </Text>
                                </div>
                                <Button variant="tertiary" tone="critical" onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(id);
                                }}>Delete</Button>
                            </div>
                        </ResourceItem>
                    );
                }}
                emptyState={
                    !loading && (
                        <EmptyState
                            heading="No promo codes yet"
                            action={{ content: 'Create first code', onAction: () => handleOpenModal() }}
                            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        >
                            <p>Encourage customers to design more with discount codes.</p>
                        </EmptyState>
                    )
                }
            />

            <Modal
                open={modalActive}
                onClose={() => setModalActive(false)}
                title={editingCode ? "Edit Promo Code" : "Create Promo Code"}
                primaryAction={{
                    content: 'Save',
                    onAction: handleSave,
                    loading: saving
                }}
                secondaryActions={[
                    {
                        content: 'Cancel',
                        onAction: () => setModalActive(false),
                    },
                ]}
            >
                <Modal.Section>
                    <FormLayout>
                        <TextField
                            label="Code"
                            value={formCode}
                            onChange={setFormCode}
                            autoComplete="off"
                            placeholder="e.g. SUMMER10"
                            helpText="Codes are automatically converted to uppercase."
                        />
                        <FormLayout.Group>
                            <Select
                                label="Discount Type"
                                options={[
                                    { label: 'Percentage (%)', value: 'percentage' },
                                    { label: 'Fixed Amount ($)', value: 'fixed_amount' },
                                ]}
                                value={discountType}
                                onChange={setDiscountType}
                            />
                            <TextField
                                label="Value"
                                type="number"
                                value={discountValue}
                                onChange={setDiscountValue}
                                autoComplete="off"
                            />
                        </FormLayout.Group>
                        <FormLayout.Group>
                            <TextField
                                label="Minimum Order Amount"
                                type="number"
                                value={minAmount}
                                onChange={setMinAmount}
                                autoComplete="off"
                            />
                            <TextField
                                label="Usage Limit (Total)"
                                type="number"
                                value={limit}
                                onChange={setLimit}
                                autoComplete="off"
                                helpText="Leave empty for unlimited usage."
                            />
                        </FormLayout.Group>
                        <Checkbox
                            label="Active"
                            checked={isActive}
                            onChange={setIsActive}
                        />
                    </FormLayout>
                </Modal.Section>
            </Modal>
        </Box>
    );
}
