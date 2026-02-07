import { render, act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DesignerCore } from './DesignerCore';

// Mock child components and capture props to trigger callbacks
const MockToolbar = vi.fn((_props: any) => <div data-testid="toolbar">Toolbar</div>);
const MockHeader = vi.fn((_props: any) => <div data-testid="header">Header</div>);

vi.mock('./Toolbar', () => ({
    Toolbar: (props: any) => {
        MockToolbar(props);
        return <div data-testid="toolbar">Toolbar</div>;
    }
}));

vi.mock('./Header', () => ({
    Header: (props: any) => {
        MockHeader(props);
        return <div data-testid="header">Header</div>;
    }
}));

// Mock Summary with interaction support
const MockSummary = vi.fn((props: any) => (
    <div data-testid="summary">
        <button data-testid="change-font-asset" onClick={() => props.onSelectedFontAssetIdChange?.('font-123')}>Change Font</button>
        <button data-testid="change-color-asset" onClick={() => props.onSelectedElementColorAssetIdChange?.('color-123')}>Change Color</button>
        <span data-testid="selected-font">{props.selectedFontAssetId}</span>
        <span data-testid="selected-color">{props.selectedElementColorAssetId}</span>
        <div data-testid="font-options">
            {props.userFonts?.map(f => <span key={f.id}>{f.name}</span>)}
        </div>
    </div>
));

vi.mock('./Summary', () => ({
    Summary: (props: any) => {
        MockSummary(props);
        return <MockSummary {...props} />;
    }
}));

// Mock other components to silence warnings
vi.mock('./Canvas', () => ({ Canvas: (props: any) => <div data-testid="canvas">Canvas {props.zoom}%</div> }));
vi.mock('./ContextualToolbar', () => ({ ContextualToolbar: () => <div data-testid="context-toolbar">ContextToolbar</div> }));
vi.mock('./BaseImageModal', () => ({ BaseImageModal: () => <div>BaseImageModal</div> }));
vi.mock('./ImageCropModal', () => ({ ImageCropModal: () => <div>ImageCropModal</div> }));

describe('DesignerCore Autosave', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        MockToolbar.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    const defaultProps = {
        isPublicMode: false,
        productId: '12345',
        productData: {
            id: 12345,
            title: 'Test Product',
            variants: [{ id: '1', title: 'Default', image_id: null }]
        } as any,
        initialPages: [{ id: 'default', name: 'Side 1', elements: [] }],
        initialConfig: {},
    };

    it('should NOT autosave if no changes are made', () => {
        const onSave = vi.fn();
        render(<DesignerCore {...defaultProps} onSave={onSave} />);

        // Fast forward 30 seconds
        act(() => {
            vi.advanceTimersByTime(30000);
        });

        expect(onSave).not.toHaveBeenCalled();
    });

    it('should autosave after 30 seconds if changes are made', async () => {
        const onSave = vi.fn().mockResolvedValue({ id: 'new-server-id' });
        render(<DesignerCore {...defaultProps} onSave={onSave} />);

        // 1. Trigger a change via the mocked Toolbar prop
        const toolbarCalls = MockToolbar.mock.calls as any[];
        expect(toolbarCalls.length).toBeGreaterThan(0);
        const latestProps = toolbarCalls[toolbarCalls.length - 1][0];

        if (!latestProps) throw new Error("Toolbar props not found");

        // Add an element to trigger state change
        act(() => {
            latestProps.onAddElement({ id: 'el1', type: 'text', text: 'Hello' });
        });

        // 2. Fast forward 30 seconds
        await act(async () => {
            vi.advanceTimersByTime(30100);
        });

        // 3. Verify onSave was called
        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
            designJson: expect.arrayContaining([
                expect.objectContaining({
                    elements: expect.arrayContaining([
                        expect.objectContaining({ id: 'el1' })
                    ])
                })
            ])
        }));
    });

    it('should update designId on subsequent saves (Scalability Fix)', async () => {
        const onSave = vi.fn().mockImplementation(() => Promise.resolve({ id: '1001', name: 'Saved Design' }));

        render(<DesignerCore {...defaultProps} onSave={onSave} />);

        // --- First Change & Save ---
        let toolbarCalls = MockToolbar.mock.calls as any[];
        let latestProps = toolbarCalls[toolbarCalls.length - 1][0];

        if (!latestProps) throw new Error("Toolbar props not found");

        act(() => {
            latestProps.onAddElement({ id: 'el1', type: 'text' });
        });

        await act(async () => { vi.advanceTimersByTime(30100); });

        expect(onSave).toHaveBeenCalledTimes(1);
        // First call should NOT have an ID yet (undefined)
        expect(onSave.mock.calls[0][0].id).toBeUndefined();

        // --- Second Change & Save ---
        toolbarCalls = MockToolbar.mock.calls as any[];
        latestProps = toolbarCalls[toolbarCalls.length - 1][0];

        if (!latestProps) throw new Error("Toolbar props not found");

        act(() => {
            latestProps.onAddElement({ id: 'el2', type: 'text' });
        });

        await act(async () => { vi.advanceTimersByTime(30100); });

        expect(onSave).toHaveBeenCalledTimes(2);
        // Second call MUST have the ID returned by the first save
        expect(onSave.mock.calls[1][0].id).toBe('1001');
    });
});

describe('DesignerCore Zoom Interaction', () => {
    const defaultProps = {
        isPublicMode: false,
        productId: '12345',
        productData: {
            id: 12345,
            title: 'Test Product',
            variants: [{ id: '1', title: 'Default', image_id: null }]
        } as any,
        initialPages: [{ id: 'default', name: 'Side 1', elements: [] }],
        initialConfig: {},
    };

    it.skip('should update zoom on Ctrl + Wheel event', async () => {
        render(<DesignerCore {...defaultProps} />);

        // Find the zoom container
        const zoomContainer = screen.getByTestId('zoom-container');

        // Simulate Ctrl + Wheel Up (deltaY < 0) -> Zoom In (+5)
        await act(async () => {
            fireEvent.wheel(zoomContainer, {
                deltaY: -100,
                ctrlKey: true,
                cancelable: true
            });
        });

        // Wait for the text to appear to be more resilient
        await waitFor(() => {
            expect(screen.getByText('55%')).toBeDefined();
        });

        // Simulate Ctrl + Wheel Down (deltaY > 0) -> Zoom Out (-5)
        await act(async () => {
            fireEvent.wheel(zoomContainer, {
                deltaY: 100,
                ctrlKey: true,
                cancelable: true
            });
        });

        await waitFor(() => {
            expect(screen.getByText('50%')).toBeDefined();
        });
    });
});

describe('DesignerCore Regression Tests', () => {
    const defaultProps = {
        isPublicMode: false,
        productId: '12345',
        productData: {
            id: 12345,
            title: 'Test Product',
            variants: [{ id: '1', title: 'Default', image_id: null }]
        } as any,
        initialPages: [{ id: 'default', name: 'Side 1', elements: [] }],
        initialConfig: {},
    };

    it('should maintain history and allow undo/redo without disrupting state', async () => {
        const onSave = vi.fn();
        render(<DesignerCore {...defaultProps} onSave={onSave} />);

        // 1. Add an element via Toolbar
        let toolbarCalls = MockToolbar.mock.calls as any[];
        let latestToolbarProps = toolbarCalls[toolbarCalls.length - 1][0];
        act(() => {
            latestToolbarProps.onAddElement({ id: 'el1', type: 'text', text: 'Hello' });
        });

        // 2. Undo via Header
        let headerCalls = MockHeader.mock.calls as any[];
        let latestHeaderProps = headerCalls[headerCalls.length - 1][0];
        act(() => {
            latestHeaderProps.onUndo();
        });

        // 3. Verify elements are empty
        await waitFor(() => {
            const finalToolbarProps = (MockToolbar.mock.calls as any[]).slice(-1)[0][0];
            expect(finalToolbarProps.elements).toHaveLength(0);
        });

        // 4. Redo via Header
        headerCalls = MockHeader.mock.calls as any[];
        latestHeaderProps = headerCalls[headerCalls.length - 1][0];
        act(() => {
            latestHeaderProps.onRedo();
        });

        await waitFor(() => {
            const finalToolbarProps = (MockToolbar.mock.calls as any[]).slice(-1)[0][0];
            expect(finalToolbarProps.elements[0].id).toBe('el1');
        });
    });

    it('should NOT reset user changes when initialPages prop updates (Background Refresh Resilience)', async () => {
        const { rerender } = render(<DesignerCore {...defaultProps} />);

        const getLatestToolbarProps = () => {
            const calls = MockToolbar.mock.calls;
            return calls.length > 0 ? calls[calls.length - 1][0] : null;
        };

        // 1. User adds an element
        act(() => {
            const props = getLatestToolbarProps();
            if (props) props.onAddElement({ id: 'user-el', type: 'text' });
        });

        // 2. Parent rerenders with "new" initialPages (simulating background save refresh)
        const updatedInitialPages = [{ id: 'default', name: 'Side 1', elements: [{ id: 'server-el', type: 'text', x: 0, y: 0, rotation: 0, opacity: 100, zIndex: 1 } as any] }];

        rerender(<DesignerCore {...defaultProps} initialPages={updatedInitialPages as any} />);

        // 3. Verify user's element is STILL there (not overwritten by the refresh)
        await waitFor(() => {
            const currentProps = getLatestToolbarProps();
            expect(currentProps).not.toBeNull();
            expect(currentProps.elements.some((el: any) => el.id === 'user-el')).toBe(true);
            expect(currentProps.elements.some((el: any) => el.id === 'server-el')).toBe(false);
        });
    });
});

describe('DesignerCore Asset Logic (Public & Admin Overrides)', () => {
    const assetProps = {
        isPublicMode: false,
        productId: '12345',
        productData: {
            id: 12345,
            variants: [{ id: '1' }]
        } as any,
        initialPages: [{ id: 'default', elements: [] }],
        initialConfig: {
            assets: {
                fontAssetId: 'server-font-id',
                colorAssetId: 'server-color-id'
            }
        },
        userFonts: [{ id: 'server-font-id', name: 'Server Font' }, { id: 'font-123', name: 'Other Font' }],
        userColors: [{ id: 'server-color-id', name: 'Server Color' }]
    };

    it('should initialize selected asset IDs from config and allow changes via Summary', async () => {
        render(<DesignerCore {...assetProps} />);

        expect(screen.getByTestId('selected-font').textContent).toBe('server-font-id');

        const changeFontBtn = screen.getByTestId('change-font-asset');
        await act(async () => {
            fireEvent.click(changeFontBtn);
        });

        expect(screen.getByTestId('selected-font').textContent).toBe('font-123');
    });

    it('should support legacy configuration format (top-level asset IDs)', () => {
        const legacyProps = {
            ...assetProps,
            initialConfig: { fontAssetId: 'legacy-id' }
        };
        render(<DesignerCore {...legacyProps} />);
        expect(screen.getByTestId('selected-font').textContent).toBe('legacy-id');
    });
});
