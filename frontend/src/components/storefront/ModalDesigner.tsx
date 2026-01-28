import { useState } from 'react';
import { DesignerPublic } from '../../pages/Designer';

interface ModalDesignerProps {
    productId: string;
    shop: string;
    config: any;
}

export function ModalDesigner({ productId, shop, config }: ModalDesignerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const buttonText = config?.buttonText || 'Design It';

    return (
        <div className="imcst-modal-container my-4">
            <button
                onClick={() => setIsOpen(true)}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
                {buttonText}
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
                        <div className="p-4 border-b flex justify-between items-center bg-white z-10">
                            <h2 className="font-bold text-xl">Personalize Your Product</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <DesignerPublic
                                productId={productId}
                                shopDomain={shop}
                                isPublicMode={true}
                                layout="modal"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
