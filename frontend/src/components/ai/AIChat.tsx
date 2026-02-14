import React, { useState, useRef, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, X, Bot, User, History, BarChart3, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { toast } from 'sonner';
import BulkOperationUI from './BulkOperationUI';

interface Action {
    dbId: string;
    type: string;
    description: string;
    status: string;
}

interface Message {
    role: 'bot' | 'user';
    content: string;
    actions?: Action[];
}

const AIChat: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'bot', content: 'Halo! Saya asisten AI Anda. Ada yang bisa saya bantu untuk konfigurasi produk hari ini?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [executingActions, setExecutingActions] = useState<Record<string, boolean>>({});
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'chat' | 'history' | 'analytics'>('chat');
    const [sessions, setSessions] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [bulkModal, setBulkModal] = useState<{ open: boolean; action: any }>({ open: false, action: null });
    const scrollRef = useRef<HTMLDivElement>(null);
    const fetch = useAuthenticatedFetch();
    const location = useLocation();

    // Get productId from route params OR from URL pathname
    const params = useParams<{ productId: string }>();
    const productId = React.useMemo(() => {
        // First try route params (when AIChat is inside route)
        if (params.productId) {
            console.log('[AIChat] ProductId from params:', params.productId);
            return params.productId;
        }
        
        // Then try to extract from pathname (when AIChat is global)
        // Match /designer/:productId pattern
        const match = location.pathname.match(/\/designer\/(\d+)/);
        if (match) {
            console.log('[AIChat] ProductId from pathname:', match[1]);
            return match[1];
        }
        
        console.log('[AIChat] No productId found. Pathname:', location.pathname);
        return null;
    }, [params.productId, location.pathname]);

    console.log('[AIChat] Final productId:', productId);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, view]);

    const loadHistory = async () => {
        try {
            const response = await fetch('/imcst_api/sessions');
            if (response.ok) {
                const data = await response.json();
                setSessions(data);
            }
        } catch (error) {
            console.error("Failed to load history", error);
        }
    };

    const loadAnalytics = async () => {
        try {
            const response = await fetch('/imcst_api/analytics');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Failed to load analytics", error);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/imcst_api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: userMessage,
                    context: {
                        productId: productId // Send current productId to AI
                    }
                })
            });

            if (!response.ok) throw new Error('Failed to fetch AI response');

            const data = await response.json();
            setMessages(prev => [...prev, {
                role: 'bot',
                content: data.message,
                actions: data.suggestedActions?.map((a: any) => ({ ...a, payload: a.output?.payload }))
            }]);

            if (data.suggestedActions?.length > 0) {
                toast.info("AI menyarankan beberapa tindakan.");
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'bot', content: 'Maaf, terjadi kesalahan saat menghubungi asisten AI.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExecuteAction = async (action: any) => {
        const actionId = action.dbId;

        // If it's a bulk action, open the bulk UI instead of direct execution
        if (action.type === 'BULK_UPDATE_CONFIG') {
            setBulkModal({ open: true, action });
            return;
        }

        setExecutingActions(prev => ({ ...prev, [actionId]: true }));
        try {
            const response = await fetch(`/imcst_api/actions/${actionId}/execute`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to execute action');

            // Update message state to show action is executed
            setMessages(prev => prev.map(msg => ({
                ...msg,
                actions: msg.actions?.map(act =>
                    act.dbId === actionId ? { ...act, status: 'executed' } : act
                )
            })));
            
            toast.success("Tindakan berhasil dijalankan!");

            // Reload page after 1 second to show changes
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error("Execution error:", error);
            toast.error("Gagal menjalankan tindakan.");
        } finally {
            setExecutingActions(prev => ({ ...prev, [actionId]: false }));
        }
    };

    const handleRollbackAction = async (actionId: string) => {
        setExecutingActions(prev => ({ ...prev, [actionId]: true }));
        try {
            const response = await fetch(`/imcst_api/actions/${actionId}/rollback`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to rollback action');

            // Update message state to show action is rolled back
            setMessages(prev => prev.map(msg => ({
                ...msg,
                actions: msg.actions?.map(act =>
                    act.dbId === actionId ? { ...act, status: 'rolled_back' } : act
                )
            })));

        } catch (error) {
            console.error("Rollback error:", error);
        } finally {
            setExecutingActions(prev => ({ ...prev, [actionId]: false }));
        }
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg bg-indigo-600 hover:bg-indigo-700"
            >
                <Sparkles className="w-6 h-6 text-white" />
            </Button>
        );
    }

    return (
        <Card className="fixed bottom-6 right-6 w-[400px] h-[600px] flex flex-col shadow-2xl border-none overflow-hidden z-[9999]">
            <CardHeader className="bg-indigo-600 text-white flex flex-col gap-2 py-3">
                <div className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bot className="w-5 h-5 text-indigo-100" />
                        <CardTitle className="text-sm font-semibold tracking-tight">AI Assistant</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                if (view !== 'analytics') {
                                    loadAnalytics();
                                    setView('analytics');
                                } else {
                                    setView('chat');
                                }
                            }}
                            className={`text-white hover:bg-white/20 w-8 h-8 ${view === 'analytics' ? 'bg-white/20' : ''}`}
                        >
                            <BarChart3 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                if (view !== 'history') {
                                    loadHistory();
                                    setView('history');
                                } else {
                                    setView('chat');
                                }
                            }}
                            className={`text-white hover:bg-white/20 w-8 h-8 ${view === 'history' ? 'bg-white/20' : ''}`}
                        >
                            <History className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 w-8 h-8">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
                {productId && (
                    <div className="flex items-center gap-2 text-xs text-indigo-100 bg-white/10 rounded-md px-2 py-1">
                        <span className="font-medium">Product ID:</span>
                        <span className="font-mono">{productId}</span>
                    </div>
                )}
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0 bg-slate-50/50">
                <ScrollArea className="h-full">
                    {view === 'chat' ? (
                        <div className="flex flex-col gap-4 p-4">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex flex-col gap-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex gap-2 max-w-[90%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <Avatar className="w-8 h-8 border shadow-sm">
                                            <AvatarFallback className={m.role === 'user' ? 'bg-indigo-100' : 'bg-white'}>
                                                {m.role === 'user' ? <User className="w-4 h-4 text-indigo-600" /> : <Bot className="w-4 h-4 text-slate-600" />}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className={`p-3 rounded-2xl text-sm shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                                            }`}>
                                            {m.content}
                                        </div>
                                    </div>

                                    {/* AI suggested actions */}
                                    {m.actions && m.actions.length > 0 && (
                                        <div className="ml-10 flex flex-col gap-2 w-[85%]">
                                            {m.actions.map((act: any) => (
                                                <Card key={act.dbId} className="border border-indigo-100 p-3 bg-white shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Sparkles className="w-3 h-3 text-indigo-500" />
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                                                            Saran Perubahan
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-slate-700 mb-2 font-medium leading-relaxed">
                                                        {act.description}
                                                    </div>

                                                    {/* Preview for Bulk Actions or specific payload */}
                                                    {act.type === 'BULK_UPDATE_CONFIG' && act.payload?.productIds && (
                                                        <div className="mb-3 p-2 bg-slate-50 rounded border border-slate-100">
                                                            <div className="text-[10px] text-slate-500 mb-1 flex justify-between">
                                                                <span>Target: {act.payload.productIds.length} Produk</span>
                                                                <span className="text-indigo-600">Bulk Mode</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {act.payload.productIds.slice(0, 5).map((id: string) => (
                                                                    <div key={id} className="w-6 h-6 rounded bg-slate-200 animate-pulse" />
                                                                ))}
                                                                {act.payload.productIds.length > 5 && (
                                                                    <div className="text-[10px] p-1 text-slate-400">+{act.payload.productIds.length - 5} lainnya</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {act.status === 'executed' ? (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={true}
                                                                className="flex-1 text-xs h-8 border-green-200 text-green-700 bg-green-50 hover:bg-green-50"
                                                            >
                                                                Berhasil
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                disabled={executingActions[act.dbId]}
                                                                onClick={() => handleRollbackAction(act.dbId)}
                                                                className="text-xs h-8 text-slate-500 hover:text-indigo-600 px-2"
                                                            >
                                                                Urungkan
                                                            </Button>
                                                        </div>
                                                    ) : act.status === 'rolled_back' ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={true}
                                                            className="w-full text-xs h-8 bg-slate-50 text-slate-500 border-slate-200"
                                                        >
                                                            Sudah Dikembalikan
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            disabled={executingActions[act.dbId]}
                                                            onClick={() => handleExecuteAction(act)}
                                                            className="w-full text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white border-none"
                                                        >
                                                            {act.type === 'BULK_UPDATE_CONFIG' ? 'Buka Bulk Editor' : 'Setujui & Jalankan'}
                                                        </Button>
                                                    )}
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="flex gap-2 items-center bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={scrollRef} />
                        </div>
                    ) : view === 'history' ? (
                        <div className="flex flex-col gap-3 p-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Riwayat Percakapan</h3>
                            {sessions.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 text-sm">Belum ada riwayat percakapan.</div>
                            ) : (
                                sessions.map((s) => (
                                    <Card key={s.id} className="p-3 cursor-pointer hover:bg-indigo-50/50 border-slate-100 transition-colors shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="text-xs font-semibold text-slate-800 truncate max-w-[150px]">
                                                Sesi {s.id.slice(0, 8)}
                                            </div>
                                            <Badge variant="outline" className="text-[10px] py-0 px-1 border-slate-200">
                                                {new Date(s.startedAt).toLocaleDateString()}
                                            </Badge>
                                        </div>
                                        <div className="text-[10px] text-slate-500 flex gap-2">
                                            <span>{s.status}</span>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 p-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Performance Insights</h3>

                            {stats ? (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Card className="p-3 bg-white border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Clock className="w-3 h-3 text-indigo-500" />
                                                <span className="text-[10px] text-slate-500 font-medium uppercase">Time Saved</span>
                                            </div>
                                            <div className="text-xl font-bold text-slate-800">
                                                {stats.impact.timeSavedMinutes}m
                                            </div>
                                        </Card>
                                        <Card className="p-3 bg-white border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                <span className="text-[10px] text-slate-500 font-medium uppercase">Success Rate</span>
                                            </div>
                                            <div className="text-xl font-bold text-slate-800">
                                                {Math.round(stats.usage.successRate)}%
                                            </div>
                                        </Card>
                                    </div>

                                    <Card className="p-4 bg-indigo-600 text-white border-none shadow-md overflow-hidden relative">
                                        <div className="relative z-10">
                                            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">Total Actions Performed</div>
                                            <div className="text-3xl font-bold">{stats.usage.executedActions}</div>
                                            <div className="text-[10px] mt-2 bg-white/20 inline-block px-2 py-0.5 rounded-full">
                                                Out of {stats.usage.totalActions} suggestions
                                            </div>
                                        </div>
                                        <Sparkles className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 rotate-12" />
                                    </Card>

                                    <div className="mt-2">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Usage Metrics</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                                <span className="text-xs text-slate-600">Total Chat Sessions</span>
                                                <span className="text-sm font-bold text-slate-800">{stats.usage.totalSessions}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                                <span className="text-xs text-slate-600">Proactive Recs Applied</span>
                                                <span className="text-sm font-bold text-slate-800">{stats.impact.recommendationsApplied}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>

            <CardFooter className="p-4 border-t">
                <form
                    className="flex w-full gap-2"
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                >
                    <Input
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        className="flex-1 focus-visible:ring-indigo-600"
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </CardFooter>

            {bulkModal.action && (
                <BulkOperationUI
                    open={bulkModal.open}
                    onClose={() => {
                        setBulkModal({ ...bulkModal, open: false });
                        // Load history to refresh action states if needed
                        loadHistory();
                    }}
                    action={bulkModal.action}
                />
            )}
        </Card>
    );
};

export default AIChat;
