import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, X } from 'lucide-react';
import DesignerPublic from '../../pages/DesignerPublic';

interface ModalViewProps {
    productId: string;
    shop: string;
}

export default function ModalView({ productId, shop }: ModalViewProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div>
            <Button onClick={() => setIsOpen(true)} className="w-full flex items-center justify-center gap-2">
                <Maximize2 className="w-4 h-4" />
                Customize Product
            </Button>

            {isOpen && (
                <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
                    <div className="h-14 border-b flex items-center justify-between px-4 bg-white shadow-sm">
                        <h2 className="font-bold">Product Customizer</h2>
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    <div className="flex-1 overflow-hidden relative bg-gray-100">
                        <DesignerPublic
                            productId={productId}
                            shopDomain={shop}
                            isPublicMode={true}
                            layout="modal"
                            onBack={() => setIsOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
