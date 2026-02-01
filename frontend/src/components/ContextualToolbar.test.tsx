import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ContextualToolbar } from './ContextualToolbar';

// Use vi.hoisted to get data available for vi.mock
const { mockUserFonts } = vi.hoisted(() => ({
    mockUserFonts: [
        {
            id: 'group-1',
            name: 'Serif Group',
            config: {
                fontType: 'google',
                googleConfig: 'specific',
                specificFonts: 'Roboto, Open Sans'
            }
        },
        {
            id: 'group-2',
            name: 'Custom Group',
            config: {
                fontType: 'custom'
            }
        }
    ]
}));

// Mock UI components
vi.mock('@/components/ui/select', () => ({
    Select: ({ children, value, onValueChange }: any) => (
        <div data-testid="mock-select" data-value={value} onClick={() => onValueChange('new-val')}>
            {children}
        </div>
    ),
    SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
    SelectItem: ({ children, value }: any) => <div data-testid="select-item" data-value={value}>{children}</div>,
    SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
    SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
}));

vi.mock('@/components/ui/toggle-group', () => ({
    ToggleGroup: ({ children }: any) => <div>{children}</div>,
    ToggleGroupItem: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/slider', () => ({
    Slider: ({ value, onValueChange }: any) => (
        <div data-testid="mock-slider" data-value={value?.[0]} onClick={() => onValueChange([value[0] + 1])}>
            Slider
        </div>
    ),
}));

vi.mock('@/components/ui/popover', () => ({
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
    Tabs: ({ children }: any) => <div>{children}</div>,
    TabsContent: ({ children }: any) => <div>{children}</div>,
    TabsList: ({ children }: any) => <div>{children}</div>,
    TabsTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tooltip', () => ({
    Tooltip: ({ children, content }: any) => <div data-testid="mock-tooltip" title={content as string}>{children}</div>,
    TooltipContent: ({ children }: any) => <div>{children}</div>,
    TooltipTrigger: ({ children, 'data-testid': testId }: any) => <div data-testid={testId}>{children}</div>,
    TooltipProvider: ({ children }: any) => <>{children}</>,
}));

// Mock lucide icons
vi.mock('lucide-react', () => ({
    Bold: () => <div>Bold</div>,
    Italic: () => <div>Italic</div>,
    AlignLeft: () => <div>AlignLeft</div>,
    AlignCenter: () => <div>AlignCenter</div>,
    AlignRight: () => <div>AlignRight</div>,
    RotateCw: () => <div>RotateCw</div>,
    ChevronDown: () => <div>ChevronDown</div>,
    Trash2: () => <div>Trash2</div>,
    Copy: () => <div>Copy</div>,
    Minus: () => <div>Minus</div>,
    Plus: () => <div>Plus</div>,
    Shrink: () => <div>Shrink</div>,
    WrapText: () => <div>WrapText</div>,
    ArrowRightLeft: () => <div>ArrowRightLeft</div>,
    CaseSensitive: () => <div>CaseSensitive</div>,
    CaseUpper: () => <div>CaseUpper</div>,
    CaseLower: () => <div>CaseLower</div>,
    Type: () => <div>Type</div>,
    Underline: () => <div>Underline</div>,
    Crop: () => <div>Crop</div>,
    Lock: () => <div>Lock</div>,
    Unlock: () => <div>Unlock</div>,
    Filter: () => <div>Filter</div>,
    X: () => <div>X</div>,
    Settings: () => <div>Settings</div>,
}));

// Mock constants
vi.mock('../constants/fonts', () => ({
    POPULAR_GOOGLE_FONTS: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins']
}));

describe('ContextualToolbar Font Filtering (Hoisted)', () => {
    const defaultProps = {
        selectedElement: { id: 'el1', type: 'text', text: 'Hello', fontFamily: 'Inter' } as any,
        onUpdateElement: vi.fn(),
        onDeleteElement: vi.fn(),
        onDuplicateElement: vi.fn(),
        userFonts: mockUserFonts,
        userColors: [],
    };

    it('should show all configured fonts when no fontAssetId is specified', () => {
        render(<ContextualToolbar {...defaultProps} />);

        const items = screen.getAllByTestId('select-item');
        const values = items.map(item => item.getAttribute('data-value'));

        expect(values).toContain('Roboto');
        expect(values).toContain('Open Sans');
        expect(values).toContain('Custom Group');
    });

    it('should filter fonts when fontAssetId is specified', () => {
        const propsWithFilter = {
            ...defaultProps,
            selectedElement: { ...defaultProps.selectedElement, fontAssetId: 'group-1' } as any
        };

        render(<ContextualToolbar {...propsWithFilter} />);

        const items = screen.getAllByTestId('select-item');
        const values = items.map(item => item.getAttribute('data-value'));

        expect(values).toContain('Roboto');
        expect(values).toContain('Open Sans');
        expect(values).not.toContain('Custom Group');
    });

    it('should fallback to defaults ONLY if userFonts is empty and no group is selected', () => {
        const propsWithEmptyFilter = {
            ...defaultProps,
            selectedElement: { ...defaultProps.selectedElement, fontAssetId: 'non-existent' } as any,
            userFonts: []
        };

        render(<ContextualToolbar {...propsWithEmptyFilter} />);

        const items = screen.getAllByTestId('select-item');
        const values = items.map(item => item.getAttribute('data-value'));
        expect(values).toContain('Inter');
        expect(values).toContain('Roboto');
    });

    it('should show Filter icon when fontAssetId is specified', () => {
        const propsWithFilter = {
            ...defaultProps,
            selectedElement: { ...defaultProps.selectedElement, fontAssetId: 'group-1' } as any
        };

        render(<ContextualToolbar {...propsWithFilter} />);

        const trigger = screen.getByTestId('font-filter-tooltip-trigger');
        expect(trigger).toBeDefined();
        // Look for Filter icon text
        expect(screen.getByText('Filter')).toBeDefined();
    });

    it('should update font list when switching between elements with different font groups', () => {
        const { rerender } = render(<ContextualToolbar {...defaultProps} />);

        let items = screen.getAllByTestId('select-item');
        let values = items.map(item => item.getAttribute('data-value'));
        expect(values).toContain('Custom Group');

        const propsWithFilter = {
            ...defaultProps,
            selectedElement: { ...defaultProps.selectedElement, fontAssetId: 'group-1' } as any
        };
        rerender(<ContextualToolbar {...propsWithFilter} />);

        items = screen.getAllByTestId('select-item');
        values = items.map(item => item.getAttribute('data-value'));
        expect(values).toContain('Roboto');
        expect(values).not.toContain('Custom Group');

        rerender(<ContextualToolbar {...defaultProps} />);
        items = screen.getAllByTestId('select-item');
        values = items.map(item => item.getAttribute('data-value'));
        expect(values).toContain('Custom Group');
    });
});

describe('ContextualToolbar Color Filtering (Hoisted)', () => {
    const mockUserColors = [
        {
            id: 'palette-1',
            name: 'Brand Colors',
            value: '#FF0000\n#00FF00\n#0000FF'
        },
        {
            id: 'palette-2',
            name: 'Secondary Colors',
            value: '#FFFF00\n#00FFFF'
        }
    ];

    const defaultProps = {
        selectedElement: { id: 'el1', type: 'text', text: 'Hello', color: '#000000' } as any,
        onUpdateElement: vi.fn(),
        onDeleteElement: vi.fn(),
        onDuplicateElement: vi.fn(),
        userFonts: [],
        userColors: mockUserColors,
    };

    it('should show all colors from all palettes when no colorAssetId is specified', () => {
        const { container } = render(<ContextualToolbar {...defaultProps} />);

        const buttons = container.querySelectorAll('button[style*="background-color"]');
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('should filter colors when colorAssetId is specified', () => {
        const propsWithFilter = {
            ...defaultProps,
            selectedElement: { ...defaultProps.selectedElement, colorAssetId: 'palette-1' } as any
        };

        const { container } = render(<ContextualToolbar {...propsWithFilter} />);

        const buttons = container.querySelectorAll('button[style*="background-color"]');
        expect(buttons.length).toBe(3); // brand colors
    });

    it('should show Filter icon when colorAssetId is specified', () => {
        const propsWithFilter = {
            ...defaultProps,
            selectedElement: { ...defaultProps.selectedElement, colorAssetId: 'palette-1' } as any
        };

        render(<ContextualToolbar {...propsWithFilter} />);

        const filterIcons = screen.getAllByText('Filter');
        expect(filterIcons.length).toBeGreaterThan(0);
    });

    it('should update color list when switching between elements with different palettes', () => {
        const { container, rerender } = render(<ContextualToolbar {...defaultProps} />);

        let buttons = container.querySelectorAll('button[style*="background-color"]');
        expect(buttons.length).toBe(5); // 3 from P1 + 2 from P2

        const propsWithFilter = {
            ...defaultProps,
            selectedElement: { ...defaultProps.selectedElement, colorAssetId: 'palette-1' } as any
        };
        rerender(<ContextualToolbar {...propsWithFilter} />);

        buttons = container.querySelectorAll('button[style*="background-color"]');
        expect(buttons.length).toBe(3); // Only P1
    });
});
