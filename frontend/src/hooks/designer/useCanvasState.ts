import { useState, useCallback } from 'react';
import { PageData, CanvasElement } from '@/types';

export const useCanvasState = (initialPages: PageData[]) => {
    const [pages, setPages] = useState<PageData[]>(initialPages);
    const [activePageId, setActivePageId] = useState<string>(initialPages[0]?.id || 'default');
    const [selectedElement, setSelectedElement] = useState<string | null>(null);

    const [history, setHistory] = useState<PageData[][]>([JSON.parse(JSON.stringify(initialPages))]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const activePage = pages.find(p => p.id === activePageId) || pages[0];

    const addToHistory = useCallback((currentPages: PageData[]) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(JSON.parse(JSON.stringify(currentPages)));
            if (newHistory.length > 50) newHistory.shift();
            return newHistory;
        });
        setHistoryIndex(prev => prev + 1);
    }, [historyIndex]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            if (prevState) {
                setHistoryIndex(prev => prev - 1);
                setPages(JSON.parse(JSON.stringify(prevState)));
            }
        }
    }, [history, historyIndex]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            if (nextState) {
                setHistoryIndex(prev => prev + 1);
                setPages(JSON.parse(JSON.stringify(nextState)));
            }
        }
    }, [history, historyIndex]);

    const updateElement = useCallback((id: string, updates: Partial<CanvasElement>, skipHistory = false) => {
        setPages(prev => {
            const updated = prev.map(p => {
                if (p.id === activePageId) {
                    const newEls = p.elements.map(el => el.id === id ? { ...el, ...updates } : el);
                    return { ...p, elements: newEls };
                }
                return p;
            });
            if (!skipHistory) addToHistory(updated);
            return updated;
        });
    }, [activePageId, addToHistory]);

    const addElement = useCallback((element: CanvasElement) => {
        setPages(prev => {
            const updated = prev.map(p => {
                if (p.id === activePageId) {
                    return { ...p, elements: [...p.elements, element] };
                }
                return p;
            });
            addToHistory(updated);
            return updated;
        });
        setSelectedElement(element.id);
    }, [activePageId, addToHistory]);

    const deleteElement = useCallback((id: string) => {
        setPages(prev => {
            const updated = prev.map(p => {
                if (p.id === activePageId) {
                    return { ...p, elements: p.elements.filter(el => el.id !== id) };
                }
                return p;
            });
            addToHistory(updated);
            return updated;
        });
        if (selectedElement === id) setSelectedElement(null);
    }, [activePageId, addToHistory, selectedElement]);

    const duplicateElement = useCallback((id: string) => {
        const el = activePage.elements.find(e => e.id === id);
        if (el) {
            const newEl = {
                ...el,
                id: Math.random().toString(36).substr(2, 9),
                x: (el.x || 0) + 20,
                y: (el.y || 0) + 20,
            };
            addElement(newEl);
        }
    }, [activePage, addElement]);

    const addPage = useCallback(() => {
        const newPage: PageData = {
            id: Math.random().toString(36).substr(2, 9),
            name: `Side ${pages.length + 1}`,
            elements: [],
            baseImage: activePage?.baseImage,
            baseImageProperties: activePage?.baseImageProperties ? { ...activePage.baseImageProperties } : { x: 0, y: 0, scale: 1 }
        };
        const updated = [...pages, newPage];
        setPages(updated);
        setActivePageId(newPage.id);
        addToHistory(updated);
        return newPage;
    }, [pages, activePage, addToHistory]);

    const deletePage = useCallback((id: string) => {
        if (pages.length <= 1) return;
        const updated = pages.filter(p => p.id !== id);
        setPages(updated);
        if (activePageId === id) setActivePageId(updated[0].id);
        addToHistory(updated);
    }, [pages, activePageId, addToHistory]);

    const renamePage = useCallback((id: string, name: string) => {
        const updated = pages.map(p => p.id === id ? { ...p, name } : p);
        setPages(updated);
        addToHistory(updated);
    }, [pages, addToHistory]);

    return {
        pages,
        setPages,
        activePageId,
        setActivePageId,
        activePage,
        selectedElement,
        setSelectedElement,
        updateElement,
        addElement,
        deleteElement,
        duplicateElement,
        addPage,
        deletePage,
        renamePage,
        undo,
        redo,
        addToHistory,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
    };
};
