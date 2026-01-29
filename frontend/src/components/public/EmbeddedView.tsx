import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PriceDisplay } from './PriceDisplay';

interface EmbeddedViewProps {
    productId: string;
    shop: string;
}

export default function EmbeddedView({ productId, shop }: EmbeddedViewProps) {
    const [loading, setLoading] = useState(true);
    const [_config, setConfig] = useState<any>(null);
    const [_design, setDesign] = useState<any>(null);
    const [elements, setElements] = useState<any[]>([]); // This would come from the Designer component
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        const fetchData = async () => {
            if (!shop || !productId) return;
            try {
                const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
                const res = await fetch(`${baseUrl}/imcst_public_api/product/${shop}/${productId}`);
                if (res.ok) {
                    const data = await res.json();
                    setConfig(data.config);
                    setDesign(data.design);
                    if (data.design && data.design.elements) {
                        setElements(data.design.elements);
                    }
                }
            } catch (e) {
                console.error("Failed to load public design data", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [productId, shop]);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    const basePrice = 25.00; // Mock base price, should come from Shopify context in production

    return (
        <div className="w-full border rounded-3xl overflow-hidden bg-gray-50 flex flex-col md:flex-row h-[700px]">
            <div className="flex-1 relative bg-gray-200">
                <div className="absolute inset-0 flex items-center justify-center p-12">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm text-center">
                        <p className="text-gray-400 font-medium">Visual Designer Canvas Placeholder</p>
                        <p className="text-[10px] text-gray-300 mt-2">Product ID: {productId}</p>
                    </div>
                </div>
            </div>

            <div className="w-full md:w-96 bg-white border-l p-6 flex flex-col gap-6">
                <div>
                    <h2 className="font-black text-2xl text-gray-900 leading-tight">Customize Item</h2>
                    <p className="text-xs text-gray-400">Personalize with text and logos</p>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Element List / Tools would go here */}
                    <div className="p-4 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-center py-12">
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Options Loading...</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-xs font-bold text-gray-400">Quantity</span>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-full border flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">-</button>
                            <span className="font-bold w-4 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 rounded-full border flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">+</button>
                        </div>
                    </div>

                    <PriceDisplay
                        shop={shop}
                        productId={productId}
                        elements={elements}
                        quantity={quantity}
                        basePrice={basePrice}
                    />

                    <button className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 uppercase tracking-wide">
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
}
