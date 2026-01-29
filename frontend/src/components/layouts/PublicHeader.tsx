import { ShoppingCart, Sparkles } from 'lucide-react';

export default function PublicHeader() {
    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-indigo-600" />
                        <h1 className="text-lg font-bold text-gray-900">
                            Product Designer
                        </h1>
                    </div>

                    <button
                        onClick={() => window.location.href = '/cart'}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
                    >
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-sm font-medium">Cart</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
