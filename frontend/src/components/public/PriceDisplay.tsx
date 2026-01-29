import { useState, useEffect } from 'react';
import { Loader2, Info, Plus, Sparkles, Tag, Ticket } from 'lucide-react';
import { Card } from '../ui/card';
import { Separator } from '../ui/separator';

interface PriceDisplayProps {
    shop: string;
    productId: string;
    elements: any[];
    quantity?: number;
    basePrice?: number;
}

export function PriceDisplay({
    shop,
    productId,
    elements,
    quantity = 1,
    basePrice = 0,
}: PriceDisplayProps) {
    const [currency, setCurrency] = useState('USD');
    const [currencySymbol, setCurrencySymbol] = useState('$');
    const [loading, setLoading] = useState(false);
    const [pricing, setPricing] = useState<any>(null);
    const [promoCode, setPromoCode] = useState('');
    const [promoStatus, setPromoStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        const fetchCurrency = async () => {
            try {
                const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
                const response = await fetch(`${baseUrl}/imcst_public_api/shop/currency/${shop}`);
                const data = await response.json();
                if (data.currency) {
                    setCurrency(data.currency);
                    const symbols: { [key: string]: string } = {
                        'IDR': 'Rp',
                        'USD': '$',
                        'EUR': '€',
                        'GBP': '£'
                    };
                    setCurrencySymbol(symbols[data.currency] || data.currency);
                }
            } catch (error) {
                console.error("Failed to fetch shop currency:", error);
            }
        };

        const calculatePrice = async () => {
            if (!shop || !productId) return;
            setLoading(true);
            try {
                const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
                const response = await fetch(`${baseUrl}/imcst_public_api/pricing/calculate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ shop, productId, elements, quantity, promoCode }),
                });

                if (response.ok) {
                    const data = await response.json();
                    setPricing(data);

                    if (promoCode) {
                        if (data.breakdown.appliedPromo) {
                            setPromoStatus({ type: 'success', message: `Code ${data.breakdown.appliedPromo.code} applied!` });
                        } else {
                            setPromoStatus({ type: 'error', message: 'Invalid or ineligible code' });
                        }
                    }
                }
            } catch (error) {
                console.error("Calculation error:", error);
            } finally {
                setLoading(false);
            }
        };

        if (shop) fetchCurrency();

        // Debounce calculation
        const timer = setTimeout(calculatePrice, 500);
        return () => clearTimeout(timer);
    }, [shop, productId, elements, quantity, promoCode]);

    const formatPrice = (amount: number) => {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
            }).format(amount);
        } catch (e) {
            return `${currencySymbol}${amount.toFixed(2)}`;
        }
    };

    if (!pricing && !loading) return null;

    const totalBase = basePrice * quantity;
    const grandTotal = totalBase + (pricing?.total || 0);

    return (
        <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm p-5 border border-white/20">
            <div className="space-y-3">
                {/* Base Price */}
                <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                    <span>Base Product ({quantity}x)</span>
                    <span>{formatPrice(totalBase)}</span>
                </div>

                {/* Customization Fee */}
                <div className="flex justify-between items-center text-sm font-bold text-indigo-600">
                    <div className="flex items-center gap-1.5">
                        <Plus className="w-3 h-3" />
                        <span>Customization</span>
                        {loading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                    </div>
                    <span>{formatPrice((pricing?.breakdown?.totalElementCharges || 0) + (pricing?.breakdown?.globalFee || 0))}</span>
                </div>

                {/* Printing Fee */}
                {pricing?.breakdown?.printingCost > 0 && (
                    <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                        <div className="flex items-center gap-1.5 text-gray-400">
                            <Plus className="w-3 h-3" />
                            <span>Printing ({pricing.breakdown.printingMethodDetails?.method || 'DTG'})</span>
                        </div>
                        <span>{formatPrice(pricing.breakdown.printingCost * quantity)}</span>
                    </div>
                )}

                {/* Applied Dynamic Rules */}
                {pricing?.breakdown?.appliedRules?.length > 0 && pricing.breakdown.appliedRules.map((rule: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm font-medium text-gray-500">
                        <div className="flex items-center gap-1.5 text-indigo-400">
                            <Plus className="w-3 h-3" />
                            <span>{rule.action === 'multiply_subtotal' ? 'Complexity Surcharge' : 'Extra Customization Fee'}</span>
                        </div>
                        <span>{formatPrice(rule.impact)}</span>
                    </div>
                ))}

                {/* Promo Code Discount */}
                {pricing?.breakdown?.promoDiscount > 0 && (
                    <div className="flex justify-between items-center text-sm font-bold text-emerald-600">
                        <div className="flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" />
                            <span>Promo ({pricing.breakdown.appliedPromo?.code})</span>
                        </div>
                        <span>-{formatPrice(pricing.breakdown.promoDiscount)}</span>
                    </div>
                )}

                {/* Bulk Savings */}
                {pricing?.breakdown?.bulkDiscount > 0 && (
                    <div className="flex justify-between items-center text-xs font-bold text-emerald-600 bg-emerald-50/50 p-2.5 rounded-2xl border border-emerald-100/50 mt-1">
                        <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" />
                            <span>Bulk Savings ({pricing.breakdown.appliedTier?.label || `Tier ${pricing.breakdown.appliedTier?.minQuantity}+`})</span>
                        </div>
                        <span>-{formatPrice(pricing.breakdown.bulkDiscount)}</span>
                    </div>
                )}

                <Separator className="bg-gray-100 mt-2" />

                {/* Grand Total */}
                <div className="flex justify-between items-end pt-1">
                    <div className="space-y-0.5">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Amount</p>
                        <div className="flex items-center gap-2">
                            <span className="text-3xl font-black text-gray-900 leading-none">
                                {formatPrice(grandTotal)}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-medium">Incl. all taxes</p>
                        <p className="text-[9px] text-indigo-500 font-bold uppercase">{formatPrice(grandTotal / quantity)} / Unit</p>
                    </div>
                </div>

                {/* Promo Code Input */}
                <div className="pt-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Got a discount code?"
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all uppercase"
                            value={promoCode}
                            onChange={(e) => {
                                setPromoCode(e.target.value);
                                setPromoStatus(null);
                            }}
                        />
                        <Ticket className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    {promoStatus && (
                        <p className={`mt-2 text-[10px] font-bold px-2 ${promoStatus.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {promoStatus.message}
                        </p>
                    )}
                </div>

                {/* Breakdown Tooltip/Info */}
                {pricing?.breakdown?.totalElementCharges > 0 && (
                    <div className="pt-2">
                        <div className="p-2 rounded-xl bg-gray-50 text-[10px] text-gray-500 font-medium flex gap-2">
                            <Info className="w-3 h-3 text-indigo-400 shrink-0" />
                            <div>
                                Includes {pricing.breakdown.totalElementCharges > 0 ? `${formatPrice(pricing.breakdown.totalElementCharges)} for elements` : ''}
                                {pricing.breakdown.globalFee > 0 ? ` and ${formatPrice(pricing.breakdown.globalFee)} base setup fee` : ''}.
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
