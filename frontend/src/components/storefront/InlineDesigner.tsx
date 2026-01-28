import { useState } from 'react';

interface InlineDesignerProps {
    productId: string;
    shop: string;
    config: any;
}

export function InlineDesigner({ productId, shop, config }: InlineDesignerProps) {
    const [text, setText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleAddToCart = async () => {
        if (isSaving) return;
        setIsSaving(true);

        try {
            // 1. Prepare design JSON
            const designJson = [
                {
                    id: 'default',
                    name: 'Side 1',
                    elements: [
                        {
                            id: 'text-1',
                            type: 'text',
                            text: text,
                            x: 100,
                            y: 100,
                            fontSize: 24,
                            fontFamily: 'Arial',
                            color: '#000000',
                            rotation: 0,
                            opacity: 1,
                            zIndex: 1
                        }
                    ]
                }
            ];

            // 2. Save design to our database
            const response = await fetch('/imcst_api/public/design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shop,
                    shopifyProductId: productId,
                    name: `Custom ${config?.title || 'Product'}`,
                    designJson,
                    previewUrl: config?.baseImage // In real scenario, generate a preview
                })
            });

            if (response.ok) {
                const design = await response.json();

                // 3. Send message to parent SDK to add to cart
                window.parent.postMessage({
                    type: 'IMCST_ADD_TO_CART',
                    variantId: config?.variants?.[0]?.id || '', // Use first variant for now
                    properties: {
                        '_custom_design_id': design.id,
                        '_custom_design_text': text,
                        '_custom_design_preview': config?.baseImage
                    }
                }, '*');
            } else {
                console.error('Failed to save design');
                alert('Failed to save design. Please try again.');
            }
        } catch (error) {
            console.error('Error in handleAddToCart:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="imcst-inline-container border rounded-xl p-4 bg-white shadow-sm my-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Preview Side */}
                <div className="bg-gray-50 rounded-lg aspect-square flex items-center justify-center relative overflow-hidden">
                    {config?.baseImage && (
                        <img src={config.baseImage} alt="Product Preview" className="absolute inset-0 w-full h-full object-contain" />
                    )}
                    <div className="relative z-10 pointer-events-none">
                        <span className="text-xl font-bold bg-white/50 px-2 rounded shadow-sm">{text}</span>
                    </div>
                </div>

                {/* Controls Side */}
                <div className="space-y-4">
                    <h3 className="font-bold text-lg">Personalize Product</h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Custom Text</label>
                            <input
                                type="text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Type something..."
                                className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>

                        <button
                            disabled={isSaving}
                            onClick={handleAddToCart}
                            className={`w-full bg-indigo-600 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-700 active:scale-95'}`}
                        >
                            {isSaving ? (
                                <>
                                    <span className="animate-spin text-lg">⏳</span>
                                    Saving Design...
                                </>
                            ) : (
                                <>
                                    <span>Add to Cart</span>
                                    <span className="text-xl">→</span>
                                </>
                            )}
                        </button>
                        <p className="text-center text-xs text-gray-400">Your design will be saved automatically</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
