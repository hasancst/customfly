import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';

interface ModalViewProps {
    productId: string;
    shop: string;
}

export default function ModalView({ productId, shop }: ModalViewProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Logic to fetch config/design would go here similar to EmbeddedView
    // But we might only fetch when modal opens

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
                    <div className="flex-1 overflow-hidden relative bg-gray-100 flex items-center justify-center">
                        <p className="text-gray-500">Full Screen Modal Designer for Product {productId}</p>
                        {/* Full Designer Component would be rendered here */}
                    </div>
                    <div className="h-16 border-t bg-white flex items-center justify-end px-4 gap-2">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button>Add to Cart</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
