import { useState, useEffect } from 'react';
import {
    DollarSign,
    Type,
    Image as ImageIcon,
    Save,
    Info,
    AlertCircle,
    Plus,
    Trash2,
    Tags,
    Zap
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';

interface PricingTabProps {
    productId: string;
    customFetch?: any;
}

export function PricingTab({ productId, customFetch }: PricingTabProps) {
    const fetch = customFetch || window.fetch;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [config, setConfig] = useState({
        globalPricing: {
            enabled: false,
            basePrice: 0,
        },
        textPricing: {
            mode: 'free',
            pricePerCharacter: 0,
            pricePerField: 0,
            minCharge: 0,
            maxCharge: 0,
            freeCharacters: 0,
        },
        imagePricing: {
            uploadFee: 0,
        },
        bulkPricing: {
            enabled: false,
            tiers: [] as any[]
        },
        printingMethods: {
            dtg: {
                enabled: false,
                basePrice: 0,
                sizeMultipliers: {
                    small: 1.0,
                    medium: 1.2,
                    large: 1.5,
                    xlarge: 2.0
                }
            },
            gangSheet: {
                enabled: false,
                setupFee: 0,
                pricePerSheet: 0,
                designsPerSheet: 1
            },
            screenPrint: {
                enabled: false,
                setupFeePerColor: 0,
                printFeePerItem: 0
            }
        },
        pricingRules: [] as any[]
    });
    const [currency, setCurrency] = useState('USD');

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const response = await fetch(`/imcst_api/pricing/config/${productId}`);
                if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
                    console.error("Failed to load pricing config: Invalid response", response.status);
                    return;
                }
                const data = await response.json();
                if (data && !data.error) {
                    setConfig(prev => ({
                        ...prev,
                        ...data,
                        globalPricing: data.globalPricing || prev.globalPricing,
                        textPricing: data.textPricing || prev.textPricing,
                        imagePricing: data.imagePricing || prev.imagePricing,
                        bulkPricing: data.bulkPricing || { enabled: false, tiers: [] },
                        printingMethods: data.printingMethods || prev.printingMethods
                    }));
                }
            } catch (error) {
                console.error("Failed to load pricing config:", error);
            }
        };

        const loadCurrency = async () => {
            try {
                const response = await fetch('/imcst_api/shop/currency');
                if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
                    console.error("Failed to load shop currency: Invalid response", response.status);
                    return;
                }
                const data = await response.json();
                if (data.currency) {
                    setCurrency(data.currency);
                }
            } catch (error) {
                console.error("Failed to load shop currency:", error);
            }
        };

        const loadAll = async () => {
            setLoading(true);
            await Promise.all([loadConfig(), loadCurrency()]);
            setLoading(false);
        };

        loadAll();
    }, [productId, fetch]);

    const addTier = () => {
        setConfig(prev => ({
            ...prev,
            bulkPricing: {
                ...prev.bulkPricing,
                tiers: [
                    ...prev.bulkPricing.tiers,
                    { minQuantity: 1, maxQuantity: 10, discountType: 'percentage', discountValue: 0 }
                ]
            }
        }));
    };

    const removeTier = (index: number) => {
        setConfig(prev => ({
            ...prev,
            bulkPricing: {
                ...prev.bulkPricing,
                tiers: prev.bulkPricing.tiers.filter((_, i) => i !== index)
            }
        }));
    };

    const updateTier = (index: number, field: string, value: any) => {
        const newTiers = [...config.bulkPricing.tiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setConfig({ ...config, bulkPricing: { ...config.bulkPricing, tiers: newTiers } });
    };

    const addRule = () => {
        const newRule = {
            id: crypto.randomUUID(),
            trigger: 'total_elements',
            operator: 'greater_than',
            threshold: 0,
            action: 'add_fee',
            value: 0
        };
        setConfig({ ...config, pricingRules: [...(config.pricingRules || []), newRule] });
    };

    const removeRule = (id: string) => {
        setConfig({
            ...config,
            pricingRules: config.pricingRules.filter((r: any) => r.id !== id)
        });
    };

    const updateRule = (id: string, field: string, value: any) => {
        setConfig({
            ...config,
            pricingRules: config.pricingRules.map((r: any) =>
                r.id === id ? { ...r, [field]: value } : r
            )
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save with the current shop currency
            const payload = { ...config, currency };
            const response = await fetch(`/imcst_api/pricing/config/${productId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                toast.success("Pricing configuration saved successfully");
            } else {
                toast.error("Failed to save pricing configuration");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("An error occurred while saving");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Header Info */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-sm text-indigo-900">
                    <p className="font-semibold mb-1">Pricing Configuration</p>
                    <p className="text-indigo-700/80 leading-relaxed">
                        Configure extra charges for customization. These fees will be calculated in real-time on the storefront and added to the base product price.
                    </p>
                </div>
            </div>

            {/* Global Base Fee */}
            <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <Label className="text-base font-bold text-gray-900">Base Customization Fee</Label>
                                <p className="text-xs text-gray-400">Fixed charge for any personalized item</p>
                            </div>
                        </div>
                        <Switch
                            checked={config.globalPricing.enabled}
                            onCheckedChange={(val) => setConfig({
                                ...config,
                                globalPricing: { ...config.globalPricing, enabled: val }
                            })}
                        />
                    </div>

                    {config.globalPricing.enabled && (
                        <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase font-bold text-gray-400">Base Fee Amount</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                            {currency === 'IDR' ? 'Rp' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'}
                                        </span>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            className="pl-7 h-10 rounded-xl bg-gray-50 border-gray-100"
                                            value={config.globalPricing.basePrice}
                                            onChange={(e) => setConfig({
                                                ...config,
                                                globalPricing: { ...config.globalPricing, basePrice: parseFloat(e.target.value) || 0 }
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Text Pricing */}
            <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <Type className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <Label className="text-base font-bold text-gray-900">Text Customization</Label>
                            <p className="text-xs text-gray-400">Charge per character or per text field</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-gray-400">Pricing Mode</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {['free', 'per_field', 'per_character'].map((mode) => (
                                    <Button
                                        key={mode}
                                        type="button"
                                        variant={config.textPricing.mode === mode ? 'default' : 'outline'}
                                        className={`h-11 rounded-xl text-xs font-bold capitalize ${config.textPricing.mode === mode
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                                            : 'border-gray-100 text-gray-500 hover:bg-gray-50'
                                            }`}
                                        onClick={() => setConfig({
                                            ...config,
                                            textPricing: { ...config.textPricing, mode: mode as any }
                                        })}
                                    >
                                        {mode.replace('_', ' ')}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {config.textPricing.mode !== 'free' && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                {config.textPricing.mode === 'per_character' ? (
                                    <>
                                        <div className="space-y-1.5 text-sm">
                                            <Label className="text-[10px] uppercase font-bold text-gray-400">Price Per Character</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={config.textPricing.pricePerCharacter}
                                                onChange={(e) => setConfig({
                                                    ...config,
                                                    textPricing: { ...config.textPricing, pricePerCharacter: parseFloat(e.target.value) || 0 }
                                                })}
                                                className="h-10 rounded-xl bg-gray-50 border-gray-100"
                                            />
                                        </div>
                                        <div className="space-y-1.5 font-bold">
                                            <Label className="text-[10px] uppercase font-bold text-gray-400">Free Characters</Label>
                                            <Input
                                                type="number"
                                                value={config.textPricing.freeCharacters}
                                                onChange={(e) => setConfig({
                                                    ...config,
                                                    textPricing: { ...config.textPricing, freeCharacters: parseInt(e.target.value) || 0 }
                                                })}
                                                className="h-10 rounded-xl bg-gray-50 border-gray-100 font-bold"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="col-span-2 space-y-1.5 text-blue-600">
                                        <Label className="text-[10px] uppercase font-bold text-gray-400">Price Per Text Field</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={config.textPricing.pricePerField}
                                            onChange={(e) => setConfig({
                                                ...config,
                                                textPricing: { ...config.textPricing, pricePerField: parseFloat(e.target.value) || 0 }
                                            })}
                                            className="h-10 rounded-xl bg-gray-50 border-gray-100"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1.5 italic">
                                    <Label className="text-[10px] uppercase font-bold text-gray-400">Min Charge</Label>
                                    <Input
                                        type="number"
                                        value={config.textPricing.minCharge}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            textPricing: { ...config.textPricing, minCharge: parseFloat(e.target.value) || 0 }
                                        })}
                                        className="h-10 rounded-xl bg-gray-50 border-gray-100 italic"
                                    />
                                </div>
                                <div className="space-y-1.5 underline">
                                    <Label className="text-[10px] uppercase font-bold text-gray-400">Max Charge (Cap)</Label>
                                    <Input
                                        type="number"
                                        value={config.textPricing.maxCharge}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            textPricing: { ...config.textPricing, maxCharge: parseFloat(e.target.value) || 0 }
                                        })}
                                        className="h-10 rounded-xl bg-gray-50 border-gray-100 underline"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Image Pricing */}
            <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <Label className="text-base font-bold text-gray-900">Upload Pricing</Label>
                            <p className="text-xs text-gray-400">Charge for logo or image uploads</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-gray-400">Fee Per Image Upload</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={config.imagePricing.uploadFee}
                                onChange={(e) => setConfig({
                                    ...config,
                                    imagePricing: { ...config.imagePricing, uploadFee: parseFloat(e.target.value) || 0 }
                                })}
                                className="h-10 rounded-xl bg-gray-50 border-gray-100"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Bulk Discounts */}
            <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                <Tags className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <Label className="text-base font-bold text-gray-900">Bulk Discounts</Label>
                                <p className="text-xs text-gray-400">Reward customers for larger orders</p>
                            </div>
                        </div>
                        <Switch
                            checked={config.bulkPricing.enabled}
                            onCheckedChange={(checked) => setConfig({
                                ...config,
                                bulkPricing: { ...config.bulkPricing, enabled: checked }
                            })}
                        />
                    </div>

                    {config.bulkPricing.enabled && (
                        <div className="space-y-4 pt-4 border-t border-gray-50">
                            <div className="space-y-4">
                                {config.bulkPricing.tiers.map((tier, index) => (
                                    <div key={index} className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] uppercase font-bold text-gray-400">Tier #{index + 1}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                                                onClick={() => removeTier(index)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">Min Quantity</Label>
                                                <Input
                                                    type="number"
                                                    value={tier.minQuantity}
                                                    onChange={(e) => updateTier(index, 'minQuantity', parseInt(e.target.value) || 0)}
                                                    className="h-10 rounded-xl bg-white"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">Max Quantity</Label>
                                                <Input
                                                    type="number"
                                                    value={tier.maxQuantity}
                                                    onChange={(e) => updateTier(index, 'maxQuantity', parseInt(e.target.value) || 0)}
                                                    className="h-10 rounded-xl bg-white"
                                                    placeholder="∞"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">Discount Type</Label>
                                                <Select
                                                    value={tier.discountType}
                                                    onValueChange={(val) => updateTier(index, 'discountType', val)}
                                                >
                                                    <SelectTrigger className="h-10 rounded-xl bg-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                                        <SelectItem value="fixed">Fixed Amount ({currency})</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">Discount Value</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={tier.discountValue}
                                                    onChange={(e) => updateTier(index, 'discountValue', parseFloat(e.target.value) || 0)}
                                                    className="h-10 rounded-xl bg-white"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    variant="outline"
                                    onClick={addTier}
                                    className="w-full h-10 rounded-xl border-dashed border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add New Tier
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Printing Methods - DTG */}
            <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <Label className="text-base font-bold text-gray-900">DTG Printing</Label>
                                <p className="text-xs text-gray-400">Direct-to-Garment printing costs</p>
                            </div>
                        </div>
                        <Switch
                            checked={config.printingMethods?.dtg?.enabled}
                            onCheckedChange={(checked) => setConfig({
                                ...config,
                                printingMethods: {
                                    ...config.printingMethods,
                                    dtg: { ...config.printingMethods.dtg, enabled: checked }
                                }
                            })}
                        />
                    </div>

                    {config.printingMethods?.dtg?.enabled && (
                        <div className="space-y-6 pt-4 border-t border-gray-50">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-gray-400">Base Print Fee</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                        {currency === 'IDR' ? 'Rp' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'}
                                    </span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={config.printingMethods.dtg.basePrice}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            printingMethods: {
                                                ...config.printingMethods,
                                                dtg: { ...config.printingMethods.dtg, basePrice: parseFloat(e.target.value) || 0 }
                                            }
                                        })}
                                        className="pl-7 h-10 rounded-xl bg-gray-50 border-gray-100"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] uppercase font-bold text-gray-400">Size Multipliers</Label>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {Object.entries(config.printingMethods.dtg.sizeMultipliers).map(([size, value]) => (
                                        <div key={size} className="p-3 rounded-2xl bg-gray-50/50 border border-gray-100 flex flex-col gap-1.5">
                                            <Label className="text-[9px] uppercase font-bold text-gray-500">{size}</Label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={value as number}
                                                onChange={(e) => {
                                                    const newValue = parseFloat(e.target.value) || 1;
                                                    setConfig({
                                                        ...config,
                                                        printingMethods: {
                                                            ...config.printingMethods,
                                                            dtg: {
                                                                ...config.printingMethods.dtg,
                                                                sizeMultipliers: {
                                                                    ...config.printingMethods.dtg.sizeMultipliers,
                                                                    [size]: newValue
                                                                }
                                                            }
                                                        }
                                                    });
                                                }}
                                                className="h-8 rounded-lg bg-white text-xs px-2"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[9px] text-gray-400">Multiplies the base print fee based on the chosen print area size.</p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Printing Methods - Gang Sheet */}
            <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <Label className="text-base font-bold text-gray-900">Gang Sheet / DTF</Label>
                                <p className="text-xs text-gray-400">Sheet-based printing (multiple designs per sheet)</p>
                            </div>
                        </div>
                        <Switch
                            checked={config.printingMethods?.gangSheet?.enabled}
                            onCheckedChange={(checked) => setConfig({
                                ...config,
                                printingMethods: {
                                    ...config.printingMethods,
                                    gangSheet: { ...config.printingMethods.gangSheet, enabled: checked }
                                }
                            })}
                        />
                    </div>

                    {config.printingMethods?.gangSheet?.enabled && (
                        <div className="space-y-6 pt-4 border-t border-gray-50">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase font-bold text-gray-400">Setup Fee</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                            {currency === 'IDR' ? 'Rp' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'}
                                        </span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={config.printingMethods.gangSheet.setupFee}
                                            onChange={(e) => setConfig({
                                                ...config,
                                                printingMethods: {
                                                    ...config.printingMethods,
                                                    gangSheet: { ...config.printingMethods.gangSheet, setupFee: parseFloat(e.target.value) || 0 }
                                                }
                                            })}
                                            className="pl-7 h-10 rounded-xl bg-gray-50 border-gray-100"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase font-bold text-gray-400">Price Per Sheet</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                            {currency === 'IDR' ? 'Rp' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'}
                                        </span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={config.printingMethods.gangSheet.pricePerSheet}
                                            onChange={(e) => setConfig({
                                                ...config,
                                                printingMethods: {
                                                    ...config.printingMethods,
                                                    gangSheet: { ...config.printingMethods.gangSheet, pricePerSheet: parseFloat(e.target.value) || 0 }
                                                }
                                            })}
                                            className="pl-7 h-10 rounded-xl bg-gray-50 border-gray-100"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-gray-400">Designs Per Sheet</Label>
                                <Input
                                    type="number"
                                    value={config.printingMethods.gangSheet.designsPerSheet}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        printingMethods: {
                                            ...config.printingMethods,
                                            gangSheet: { ...config.printingMethods.gangSheet, designsPerSheet: parseInt(e.target.value) || 1 }
                                        }
                                    })}
                                    className="h-10 rounded-xl bg-gray-50 border-gray-100"
                                    placeholder="1"
                                />
                                <p className="text-[9px] text-gray-400">How many individual designs can fit on one physical sheet?</p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Printing Methods - Screen Print */}
            <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
                                <Type className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <Label className="text-base font-bold text-gray-900">Screen Printing</Label>
                                <p className="text-xs text-gray-400">High volume traditional printing (per screen fees)</p>
                            </div>
                        </div>
                        <Switch
                            checked={config.printingMethods?.screenPrint?.enabled}
                            onCheckedChange={(checked) => setConfig({
                                ...config,
                                printingMethods: {
                                    ...config.printingMethods,
                                    screenPrint: { ...config.printingMethods.screenPrint, enabled: checked }
                                }
                            })}
                        />
                    </div>

                    {config.printingMethods?.screenPrint?.enabled && (
                        <div className="space-y-6 pt-4 border-t border-gray-50">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase font-bold text-gray-400">Setup Fee / Screen</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                            {currency === 'IDR' ? 'Rp' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'}
                                        </span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={config.printingMethods.screenPrint.setupFeePerColor}
                                            onChange={(e) => setConfig({
                                                ...config,
                                                printingMethods: {
                                                    ...config.printingMethods,
                                                    screenPrint: { ...config.printingMethods.screenPrint, setupFeePerColor: parseFloat(e.target.value) || 0 }
                                                }
                                            })}
                                            className="pl-7 h-10 rounded-xl bg-gray-50 border-gray-100"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase font-bold text-gray-400">Print Fee / Item</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                            {currency === 'IDR' ? 'Rp' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'}
                                        </span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={config.printingMethods.screenPrint.printFeePerItem}
                                            onChange={(e) => setConfig({
                                                ...config,
                                                printingMethods: {
                                                    ...config.printingMethods,
                                                    screenPrint: { ...config.printingMethods.screenPrint, printFeePerItem: parseFloat(e.target.value) || 0 }
                                                }
                                            })}
                                            className="pl-7 h-10 rounded-xl bg-gray-50 border-gray-100"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>
                            <p className="text-[9px] text-gray-400">Screen printing is best for large orders. Costs are calculated as: (Setup Fee * Colors) + (Print Fee * Quantity).</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Dynamic Pricing Rules */}
            <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <Label className="text-base font-bold text-gray-900">Dynamic Pricing Rules</Label>
                                <p className="text-xs text-gray-400">Apply conditional fees based on design complexity</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addRule}
                            className="rounded-xl border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Rule
                        </Button>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-50">
                        {(!config.pricingRules || config.pricingRules.length === 0) ? (
                            <div className="text-center py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                <p className="text-sm text-gray-400">No rules defined yet.</p>
                                <p className="text-[10px] text-gray-300 mt-1 italic">Rules are applied in order of creation.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {config.pricingRules.map((rule: any) => (
                                    <div key={rule.id} className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Label className="text-[10px] uppercase font-bold text-gray-400">Rule Logic</Label>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeRule(rule.id)}
                                                className="h-7 w-7 p-0 text-gray-300 hover:text-red-500 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-bold text-gray-400 ml-1">If</Label>
                                                <select
                                                    value={rule.trigger}
                                                    onChange={(e) => updateRule(rule.id, 'trigger', e.target.value)}
                                                    className="w-full h-10 rounded-xl bg-white border border-gray-200 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                >
                                                    <option value="total_elements">Total Elements</option>
                                                    <option value="text_elements">Text Elements</option>
                                                    <option value="image_elements">Image Elements</option>
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-bold text-gray-400 ml-1">Condition</Label>
                                                <select
                                                    value={rule.operator}
                                                    onChange={(e) => updateRule(rule.id, 'operator', e.target.value)}
                                                    className="w-full h-10 rounded-xl bg-white border border-gray-200 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                >
                                                    <option value="greater_than">Is More Than (&gt;)</option>
                                                    <option value="less_than">Is Less Than (&lt;)</option>
                                                    <option value="equals">Is Exactly (=)</option>
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-bold text-gray-400 ml-1">Threshold</Label>
                                                <Input
                                                    type="number"
                                                    value={rule.threshold}
                                                    onChange={(e) => updateRule(rule.id, 'threshold', parseInt(e.target.value) || 0)}
                                                    className="h-10 rounded-xl bg-white border-gray-200"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-100/50">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-bold text-gray-400 ml-1">Then</Label>
                                                <select
                                                    value={rule.action}
                                                    onChange={(e) => updateRule(rule.id, 'action', e.target.value)}
                                                    className="w-full h-10 rounded-xl bg-white border border-gray-200 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-indigo-600"
                                                >
                                                    <option value="add_fee">Add Extra Fee (+)</option>
                                                    <option value="multiply_subtotal">Multiply Total (x)</option>
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-bold text-gray-400 ml-1">Value</Label>
                                                <div className="relative">
                                                    {rule.action === 'add_fee' && (
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                                            {currency === 'IDR' ? 'Rp' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'}
                                                        </span>
                                                    )}
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={rule.value}
                                                        onChange={(e) => updateRule(rule.id, 'value', parseFloat(e.target.value) || 0)}
                                                        className={`${rule.action === 'add_fee' ? 'pl-7' : 'pr-7'} h-10 rounded-xl bg-white border-gray-200 font-bold`}
                                                        placeholder="0.00"
                                                    />
                                                    {rule.action === 'multiply_subtotal' && (
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">x</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Save Button */}
            <div className="pt-4 flex gap-3">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-100"
                >
                    {saving ? (
                        <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Saving...
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Save className="w-5 h-5" />
                            Save Pricing Config
                        </div>
                    )}
                </Button>
            </div>

            {/* Preview Info */}
            <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex gap-3">
                <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                <p className="text-[10px] text-gray-500 leading-normal">
                    Pricing changes are applied instantly to the storefront calculator. Make sure to test your configuration by visiting the product page.
                </p>
            </div>
        </div>
    );
}
