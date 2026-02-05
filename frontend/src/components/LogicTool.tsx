import { Plus, Trash2, ShieldAlert, Cpu } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CanvasElement, VisibilityRule, ShopifyProduct } from '../types';

interface LogicToolProps {
    selectedElement: CanvasElement;
    onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
    productData: ShopifyProduct | null;
    isPublicMode?: boolean;
}

export function LogicTool({ selectedElement, onUpdateElement, productData, isPublicMode }: LogicToolProps) {
    const logic = selectedElement.logic || { rules: [], matchType: 'all', action: 'show' };

    const addRule = () => {
        const newRule: VisibilityRule = {
            id: `rule-${Date.now()}`,
            sourceType: 'shopify_option',
            sourceKey: productData?.options[0]?.name || '',
            operator: 'equals',
            value: ''
        };

        onUpdateElement(selectedElement.id, {
            logic: {
                ...logic,
                rules: [...logic.rules, newRule]
            }
        });
    };

    const removeRule = (ruleId: string) => {
        onUpdateElement(selectedElement.id, {
            logic: {
                ...logic,
                rules: logic.rules.filter(r => r.id !== ruleId)
            }
        });
    };

    const updateRule = (ruleId: string, updates: Partial<VisibilityRule>) => {
        onUpdateElement(selectedElement.id, {
            logic: {
                ...logic,
                rules: logic.rules.map(r => r.id === ruleId ? { ...r, ...updates } : r)
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Cpu className="w-5 h-5 text-indigo-600" />
                <h3 className={`font-bold ${isPublicMode ? 'text-[16px]' : 'text-sm'} text-gray-900`}>Conditional Logic</h3>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                    <div>
                        <Label className="text-[12px] font-bold text-indigo-400">Master Action</Label>
                        <div className="flex items-center gap-2 mt-1">
                            <Select
                                value={logic.action}
                                onValueChange={(val: any) => onUpdateElement(selectedElement.id, { logic: { ...logic, action: val } })}
                            >
                                <SelectTrigger className="h-10 bg-white border-0 shadow-sm text-[14px] font-bold w-24">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="show" className="text-[14px]">SHOW</SelectItem>
                                    <SelectItem value="hide" className="text-[14px]">HIDE</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="text-[14px] font-medium text-indigo-700">this element if</span>
                            <Select
                                value={logic.matchType}
                                onValueChange={(val: any) => onUpdateElement(selectedElement.id, { logic: { ...logic, matchType: val } })}
                            >
                                <SelectTrigger className="h-10 bg-white border-0 shadow-sm text-[14px] font-bold w-24">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-[14px]">ALL</SelectItem>
                                    <SelectItem value="any" className="text-[14px]">ANY</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="text-[14px] font-medium text-indigo-700">rules match</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    {logic.rules.map((rule) => (
                        <div key={rule.id} className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm space-y-3 relative group">
                            <button
                                onClick={() => removeRule(rule.id)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-50 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-red-100 shadow-sm"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[12px] font-bold text-gray-400">Source</Label>
                                    <Select
                                        value={rule.sourceType}
                                        onValueChange={(val: any) => updateRule(rule.id, { sourceType: val })}
                                    >
                                        <SelectTrigger className="h-10 text-[14px] font-medium bg-gray-50 border-gray-100">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="shopify_option" className="text-[14px]">Shopify Option</SelectItem>
                                            <SelectItem value="shopify_variant" className="text-[14px]">Shopify Variant</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[12px] font-bold text-gray-400">Condition</Label>
                                    <Select
                                        value={rule.operator}
                                        onValueChange={(val: any) => updateRule(rule.id, { operator: val })}
                                    >
                                        <SelectTrigger className="h-10 text-[14px] font-medium bg-gray-50 border-gray-100">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="equals" className="text-[14px]">Equals</SelectItem>
                                            <SelectItem value="not_equals" className="text-[14px]">Does not equal</SelectItem>
                                            <SelectItem value="contains" className="text-[14px]">Contains</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {rule.sourceType === 'shopify_option' && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[12px] font-bold text-gray-400">Option Name</Label>
                                            <Select
                                                value={rule.sourceKey}
                                                onValueChange={(val) => updateRule(rule.id, { sourceKey: val, value: '' })}
                                            >
                                                <SelectTrigger className="h-10 text-[14px] font-medium bg-white border-gray-200">
                                                    <SelectValue placeholder="Option..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {productData?.options.map(opt => (
                                                        <SelectItem key={opt.name} value={opt.name} className="text-[14px]">{opt.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[12px] font-bold text-gray-400">Option Value</Label>
                                            <Select
                                                value={rule.value}
                                                onValueChange={(val) => updateRule(rule.id, { value: val })}
                                            >
                                                <SelectTrigger className="h-10 text-[14px] font-medium bg-white border-gray-200">
                                                    <SelectValue placeholder="Value..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {productData?.options.find(o => o.name === rule.sourceKey)?.values.map(v => (
                                                        <SelectItem key={v} value={v} className="text-[14px]">{v}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}

                                {rule.sourceType === 'shopify_variant' && (
                                    <div className="space-y-1">
                                        <Label className="text-[12px] font-bold text-gray-400">Target Variant</Label>
                                        <Select
                                            value={rule.value}
                                            onValueChange={(val) => updateRule(rule.id, { value: val })}
                                        >
                                            <SelectTrigger className="h-10 text-[14px] font-medium bg-white border-gray-200">
                                                <SelectValue placeholder="Select variant..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {productData?.variants.map(v => (
                                                    <SelectItem key={v.id} value={v.id} className="text-[14px]">{v.title}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {logic.rules.length === 0 && (
                        <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <ShieldAlert className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-[14px] text-gray-400">No logic rules added yet.</p>
                        </div>
                    )}

                    <Button
                        onClick={addRule}
                        variant="outline"
                        className="w-full h-12 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 rounded-xl text-[12px] font-bold"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add New Rule
                    </Button>
                </div>
            </div>
        </div>
    );
}
