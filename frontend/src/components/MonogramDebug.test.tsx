import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ContextualToolbar } from './ContextualToolbar';
import { CanvasElement } from '@/types';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Filter: () => <div>Filter</div>,
    Settings: () => <div>Settings</div>,
    ChevronDown: () => <div>ChevronDown</div>,
    RotateCw: () => <div>RotateCw</div>,
    Minus: () => <div>Minus</div>,
    Plus: () => <div>Plus</div>,
    ArrowRightLeft: () => <div>ArrowRightLeft</div>,
    Trash2: () => <div>Trash2</div>,
    Copy: () => <div>Copy</div>,
    Bold: () => <div>Bold</div>,
    Italic: () => <div>Italic</div>,
    Underline: () => <div>Underline</div>,
    AlignLeft: () => <div>AlignLeft</div>,
    AlignCenter: () => <div>AlignCenter</div>,
    AlignRight: () => <div>AlignRight</div>,
    Shrink: () => <div>Shrink</div>,
    WrapText: () => <div>WrapText</div>,
    Crop: () => <div>Crop</div>,
    CaseSensitive: () => <div>CaseSensitive</div>,
    CaseUpper: () => <div>CaseUpper</div>,
    CaseLower: () => <div>CaseLower</div>,
}));

// Mock UI components
vi.mock('@/components/ui/slider', () => ({
    Slider: () => <div data-testid="slider">Slider</div>
}));
vi.mock('@/components/ui/switch', () => ({
    Switch: () => <div data-testid="switch">Switch</div>
}));
vi.mock('@/components/ui/select', () => ({
    Select: ({ children }: any) => <div data-testid="select">{children}</div>,
    SelectTrigger: ({ children }: any) => <div>{children}</div>,
    SelectValue: () => <div>SelectValue</div>,
    SelectContent: ({ children }: any) => <div>{children}</div>,
    SelectItem: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/ui/popover', () => ({
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <div>{children}</div>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/ui/tooltip', () => ({
    Tooltip: ({ children }: any) => <div>{children}</div>,
    TooltipTrigger: ({ children }: any) => <div>{children}</div>,
    TooltipContent: ({ children }: any) => <div>{children}</div>,
    TooltipProvider: ({ children }: any) => <div>{children}</div>,
}));

describe('ContextualToolbar Monogram Debug', () => {
    it('should render font size controls for monogram', () => {
        const monogramElement: CanvasElement = {
            id: 'mono1',
            type: 'monogram',
            text: 'ABC',
            fontSize: 100,
            x: 0,
            y: 0
        };

        render(
            <ContextualToolbar
                selectedElement={monogramElement}
                onUpdateElement={vi.fn()}
                onDeleteElement={vi.fn()}
                onDuplicateElement={vi.fn()}
                userFonts={[]}
                userColors={[]}
            />
        );

        // Check for Decrease Font Size tooltip/button
        // Since we mock tooltip, the text "Decrease Font Size" inside TooltipContent should be rendered if the Tooltip is rendered
        expect(screen.getByText('Decrease Font Size')).toBeDefined();

        // Also check for the input
        const input = screen.getByDisplayValue('100');
        expect(input).toBeDefined();
    });
});
