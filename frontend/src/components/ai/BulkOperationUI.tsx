import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, Package, Layers, Settings2 } from 'lucide-react';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { toast } from 'sonner';

interface Product {
    id: string;
    title: string;
    image?: { src: string };
}

interface BulkOperationUIProps {
    open: boolean;
    onClose: () => void;
    action: {
        dbId: string;
        description: string;
        payload: {
            productId?: string;
            productIds?: string[];
            changes: any;
            element?: any;
        };
        type: string;
    };
}

const BulkOperationUI: React.FC<BulkOperationUIProps> = ({ open, onClose, action }) => {
    const [step, setStep] = useState<'select' | 'preview' | 'progress'>('select');
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
    const fetch = useAuthenticatedFetch();

    useEffect(() => {
        if (open) {
            loadProducts();
            if (action.payload.productIds) {
                setSelectedIds(action.payload.productIds);
            }
        } else {
            // Reset state on close
            setStep('select');
            setResults({ success: 0, failed: 0 });
            setProgress(0);
        }
    }, [open, action]);

    const loadProducts = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/imcst_api/configured-products');
            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            }
        } catch (error) {
            toast.error("Gagal memuat daftar produk.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleProduct = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(products.map(p => p.id));
        } else {
            setSelectedIds([]);
        }
    };

    const executeBulk = async () => {
        setStep('progress');
        const total = selectedIds.length;
        let successCount = 0;
        let failedCount = 0;

        // Note: Backend bulkExecutor handles this in a loop, but we can simulate progress or 
        // call it product by product if we want high granularity UI.
        // For now, let's use the efficient backend bulk endpoint and simulate a smooth UI transition.

        try {
            // We'll update the action in DB with the NEW set of selected product IDs
            const response = await fetch(`/imcst_api/actions/${action.dbId}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productIds: selectedIds // Explicit override of target products
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Simulating progress bar for UX
                for (let i = 0; i <= 100; i += 5) {
                    setProgress(i);
                    await new Promise(r => setTimeout(r, 50));
                }
                setResults({
                    success: data.result.success.length,
                    failed: data.result.failed.length
                });
                toast.success(`Bulk operation selesai: ${data.result.success.length} sukses.`);
            } else {
                throw new Error("Bulk execution failed");
            }
        } catch (error) {
            toast.error("Gagal menjalankan bulk operation.");
            setStep('preview');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
                <DialogHeader className="p-6 bg-slate-50 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        {step === 'select' && <Package className="w-5 h-5 text-indigo-600" />}
                        {step === 'preview' && <Settings2 className="w-5 h-5 text-indigo-600" />}
                        {step === 'progress' && <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />}
                        Bulk Operation: {step.charAt(0).toUpperCase() + step.slice(1)}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'select' && "Pilih produk yang akan diterapkan perubahan ini."}
                        {step === 'preview' && "Tinjau perubahan sebelum dijalankan secara massal."}
                        {step === 'progress' && "Mohon tunggu, perubahan sedang diterapkan..."}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-0">
                    {step === 'select' && (
                        <div className="flex flex-col h-[400px]">
                            <div className="p-4 border-b flex justify-between items-center bg-white">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="select-all"
                                        checked={selectedIds.length === products.length && products.length > 0}
                                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                                    />
                                    <label htmlFor="select-all" className="text-xs font-semibold cursor-pointer">Pilih Semua ({products.length})</label>
                                </div>
                                <Badge variant="secondary" className="text-[10px]">{selectedIds.length} dipilih</Badge>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-2">
                                    {isLoading ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-2">
                                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                                            <span className="text-xs text-slate-500">Memuat produk...</span>
                                        </div>
                                    ) : (
                                        products.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => handleToggleProduct(p.id)}
                                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedIds.includes(p.id) ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-slate-50'
                                                    }`}
                                            >
                                                <Checkbox checked={selectedIds.includes(p.id)} />
                                                <div className="w-10 h-10 rounded border bg-white overflow-hidden shrink-0">
                                                    <img src={p.image?.src || ''} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium truncate">{p.title}</div>
                                                    <div className="text-[10px] text-slate-500">ID: {p.id}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="p-6 h-[400px]">
                            <div className="bg-slate-50 rounded-xl border p-4 mb-4">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Yang Akan Diubah:</div>
                                <div className="text-sm font-medium text-slate-800 bg-white p-3 rounded-lg border border-slate-200">
                                    {action.description}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-4">
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                <span className="text-xs text-slate-600">Perubahan ini akan diterapkan ke <strong>{selectedIds.length} produk</strong>.</span>
                            </div>

                            <div className="space-y-3">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Detail Teknis:</div>
                                <ScrollArea className="h-40 bg-slate-900 rounded-lg p-3">
                                    <pre className="text-[10px] text-indigo-300 font-mono">
                                        {JSON.stringify(action.payload.changes || action.payload.element, null, 2)}
                                    </pre>
                                </ScrollArea>
                            </div>
                        </div>
                    )}

                    {step === 'progress' && (
                        <div className="p-10 flex flex-col items-center justify-center h-[400px] text-center">
                            {progress < 100 ? (
                                <>
                                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                        <Layers className="w-10 h-10 text-indigo-600" />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">Menerapkan Perubahan...</h3>
                                    <p className="text-sm text-slate-500 mb-8 px-10">AI sedang memperbaharui konfigurasi {selectedIds.length} produk Anda.</p>
                                    <div className="w-full px-10">
                                        <Progress value={progress} className="h-2" />
                                        <div className="text-[10px] font-bold text-slate-400 mt-2">{progress}% SELESAI</div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
                                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">Bulk Operation Selesai!</h3>
                                    <div className="grid grid-cols-2 gap-4 w-full px-10 mt-4">
                                        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                            <div className="text-xl font-bold text-green-700">{results.success}</div>
                                            <div className="text-[10px] text-green-600 uppercase font-bold">Berhasil</div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="text-xl font-bold text-slate-700">{results.failed}</div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold">Gagal</div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t bg-slate-50">
                    {step === 'select' && (
                        <>
                            <Button variant="ghost" onClick={onClose} size="sm">Batal</Button>
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700"
                                disabled={selectedIds.length === 0}
                                onClick={() => setStep('preview')}
                                size="sm"
                            >
                                Lanjut ke Pratinjau
                            </Button>
                        </>
                    )}
                    {step === 'preview' && (
                        <>
                            <Button variant="ghost" onClick={() => setStep('select')} size="sm">Kembali</Button>
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700"
                                onClick={executeBulk}
                                size="sm"
                            >
                                Jalankan Sekarang
                            </Button>
                        </>
                    )}
                    {step === 'progress' && progress === 100 && (
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={onClose} size="sm">
                            Selesai & Tutup
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BulkOperationUI;
