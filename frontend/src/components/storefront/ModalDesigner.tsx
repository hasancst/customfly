import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DesignerPublic from '../../pages/DesignerPublic';

interface ModalDesignerProps {
    productId: string;
    shop: string;
    config: any;
}

export function ModalDesigner({ productId, shop, config }: ModalDesignerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const buttonText = config?.buttonText || 'Design It';
    const buttonStyle = config?.buttonStyle || {};

    const openModal = () => {
        setIsOpen(true);
        document.body.style.overflow = 'hidden';
        setTimeout(() => setIsAnimating(true), 10);
    };

    const closeModal = () => {
        setIsAnimating(false);
        setTimeout(() => {
            setIsOpen(false);
            document.body.style.overflow = 'auto';
        }, 300);
    };

    useEffect(() => {
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    return (
        <div className="imcst-modal-container my-4">
            <button
                onClick={openModal}
                style={{
                    backgroundColor: buttonStyle.bgColor || '#4f46e5',
                    color: buttonStyle.color || '#ffffff',
                    padding: '14px 28px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    width: '100%',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                }}
                className="hover:scale-[1.02] hover:shadow-lg active:scale-95"
            >
                {buttonText}
            </button>

            {isOpen && createPortal(
                <div
                    className={`fixed inset-0 z-[2147483647] flex items-center justify-center transition-all duration-300 ease-out ${isAnimating ? 'opacity-100' : 'opacity-0'
                        }`}
                >
                    {/* Backdrop with Backdrop Blur - Extra dark for focus */}
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-lg"
                        onClick={closeModal}
                    />

                    {/* Modal Content - Absolute full screen */}
                    <div
                        className={`bg-white w-full h-full flex flex-col shadow-2xl relative transition-all duration-300 ease-out transform ${isAnimating ? 'scale-100 translate-y-0' : 'scale-105 translate-y-10'
                            }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header - Sleeker, thinner for more designer space */}
                        <div className="px-4 sm:px-8 py-3 border-b flex justify-between items-center bg-white/95 backdrop-blur-sm z-10 sticky top-0 shadow-sm">
                            <div className="flex items-baseline gap-3">
                                <h1 className="font-black text-xl sm:text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                                    Product Customizer
                                </h1>
                                <span className="hidden sm:inline-block h-4 w-[1px] bg-gray-200"></span>
                                <p className="hidden sm:inline-block text-xs text-gray-400 font-bold uppercase tracking-widest leading-none">
                                    Premium Experience
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="group flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 rounded-xl transition-all duration-200 border border-transparent hover:border-red-100"
                                aria-label="Close Designer"
                            >
                                <span className="hidden sm:inline-block text-sm font-bold text-gray-500 group-hover:text-red-500 transition-colors uppercase tracking-wider">Close</span>
                                <svg
                                    className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Designer Body - Full stretch */}
                        <div className="flex-1 overflow-hidden bg-gray-50 relative">
                            <DesignerPublic
                                productId={productId}
                                shopDomain={shop}
                                isPublicMode={true}
                                layout="modal"
                                onBack={closeModal}
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
