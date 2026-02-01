import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TextTool } from './TextTool';
import { ContextualToolbar } from './ContextualToolbar';
import React from 'react';

// Mock UI components
vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, className }: any) => <button onClick={onClick} className={className}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
    Input: ({ value, onChange, placeholder, maxLength }: any) => (
        <input
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            maxLength={maxLength}
            data-testid="mock-input"
        />
    ),
}));

vi.mock('@/components/ui/label', () => ({
    Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/slider', () => ({
    Slider: ({ value, onValueChange, 'data-testid': testId }: any) => (
        <div data-testid={testId || "mock-slider"} data-value={value[0]} onClick={() => onValueChange([value[0] + 1])}>
            Slider
        </div>
    ),
}));

vi.mock('@/components/ui/toggle-group', () => ({
    ToggleGroup: ({ children, value, onValueChange }: any) => (
        <div data-testid="toggle-group" data-value={value}>
            {React.Children.map(children, (child: any) =>
                React.cloneElement(child, {
                    'data-active': child.props.value === value,
                    onClick: () => onValueChange(child.props.value)
                })
            )}
        </div>
    ),
    ToggleGroupItem: ({ children, value, onClick, 'data-active': active }: any) => (
        <button data-testid={`toggle-item-${value}`} data-active={active} onClick={onClick}>
            {children}
        </button>
    ),
}));

vi.mock('@/components/ui/collapsible', () => ({
    Collapsible: ({ children }: any) => <div>{children}</div>,
    CollapsibleContent: ({ children }: any) => <div>{children}</div>,
    CollapsibleTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/switch', () => ({
    Switch: () => <input type="checkbox" />,
}));

vi.mock('@/components/ui/select', () => ({
    Select: ({ children, value, onValueChange }: any) => (
        <div data-testid="mock-select" data-value={value} onClick={() => onValueChange('new-val')}>
            {children}
        </div>
    ),
    SelectContent: ({ children }: any) => <div>{children}</div>,
    SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
    SelectTrigger: ({ children }: any) => <div>{children}</div>,
    SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
}));

vi.mock('@/components/ui/popover', () => ({
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/separator', () => ({
    Separator: () => <hr />,
}));

vi.mock('@/components/ui/tooltip', () => ({
    Tooltip: ({ children }: any) => <div>{children}</div>,
    TooltipContent: ({ children }: any) => <div>{children}</div>,
    TooltipTrigger: ({ children }: any) => <div>{children}</div>,
    TooltipProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/ui/tabs', () => ({
    Tabs: ({ children }: any) => <div>{children}</div>,
    TabsContent: ({ children }: any) => <div>{children}</div>,
    TabsList: ({ children }: any) => <div>{children}</div>,
    TabsTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => ({
    Plus: () => <div>Plus</div>,
    Type: () => <div>Type</div>,
    ChevronDown: () => <div>ChevronDown</div>,
    Layers: () => <div>Layers</div>,
    Settings2: () => <div>Settings2</div>,
    Shrink: () => <div>Shrink</div>,
    WrapText: () => <div>WrapText</div>,
    Move: () => <div>Move</div>,
    ScanLine: () => <div>ScanLine</div>,
    Copy: () => <div>Copy</div>,
    Trash2: () => <div>Trash2</div>,
    RotateCw: () => <div>RotateCw</div>,
    ArrowRightLeft: () => <div>ArrowRightLeft</div>,
    CaseSensitive: () => <div>CaseSensitive</div>,
    CaseUpper: () => <div>CaseUpper</div>,
    CaseLower: () => <div>CaseLower</div>,
    Bold: () => <div>Bold</div>,
    Italic: () => <div>Italic</div>,
    Underline: () => <div>Underline</div>,
    AlignLeft: () => <div>AlignLeft</div>,
    AlignCenter: () => <div>AlignCenter</div>,
    AlignRight: () => <div>AlignRight</div>,
    Minus: () => <div>Minus</div>,
    Crop: () => <div>Crop</div>,
    Lock: () => <div>Lock</div>,
    Unlock: () => <div>Unlock</div>,
    Filter: () => <div>Filter</div>,
    Settings: () => <div>Settings</div>,
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('Text Feature Regression Tests', () => {
    const mockOnAdd = vi.fn();
    const mockOnUpdate = vi.fn();

    describe('Letter Spacing', () => {
        it('updates letter spacing via TextTool slider', () => {
            const selectedElement = { id: '1', type: 'text', text: 'test', letterSpacing: 5 } as any;
            render(<TextTool onAddElement={mockOnAdd} onUpdateElement={mockOnUpdate} selectedElement={selectedElement} />);

            const slider = screen.getByTestId('letter-spacing-slider');
            fireEvent.click(slider); // Mock implementation increments by 1

            expect(mockOnUpdate).toHaveBeenCalledWith('1', expect.objectContaining({ letterSpacing: 6 }));
        });

        it('updates letter spacing via ContextualToolbar', () => {
            const selectedElement = { id: '1', type: 'text', text: 'test', letterSpacing: 5 } as any;
            render(<ContextualToolbar selectedElement={selectedElement} onUpdateElement={mockOnUpdate} onDeleteElement={vi.fn()} onDuplicateElement={vi.fn()} userFonts={[]} userColors={[]} />);

            // Open Popover first (trigger contains ArrowRightLeft)
            // Since we mocked Lucide icons, ArrowRightLeft renders as text "ArrowRightLeft"
            // The button containing it is the trigger for the popover
            const trigger = screen.getByText('ArrowRightLeft').closest('button');
            fireEvent.click(trigger!);

            // Now the slider should be visible (mocked PopoverContent renders children)
            // Note: ContextualToolbar uses Slider, which we mocked. 
            // We need to verify if we added data-testid to the Slider in ContextualToolbar or if we need to find it by other means.
            // Looking at ContextualToolbar code: <Slider ... /> without explicit testid.
            // The Slider mock in TextRegression.test.tsx assigns "mock-slider" as default testid.
            // There are multiple sliders (Opacity, Rotation, LetterSpacing).
            // We can identify the correct one by its value (5) which we set in selectedElement.
            const sliders = screen.getAllByTestId('mock-slider');
            const letterSpacingSlider = sliders.find(s => s.getAttribute('data-value') === '5');

            if (!letterSpacingSlider) throw new Error('Letter spacing slider not found');

            fireEvent.click(letterSpacingSlider);

            expect(mockOnUpdate).toHaveBeenCalledWith('1', expect.objectContaining({ letterSpacing: 6 }));
        });
    });

    describe('Text Case', () => {
        it('successfully applies uppercase transformation in TextTool', () => {
            const selectedElement = { id: '1', type: 'text', text: 'hello', textCase: 'none' } as any;
            render(<TextTool onAddElement={mockOnAdd} onUpdateElement={mockOnUpdate} selectedElement={selectedElement} />);

            const uppercaseToggle = screen.getByTestId('toggle-item-uppercase');
            fireEvent.click(uppercaseToggle);

            expect(mockOnUpdate).toHaveBeenCalledWith('1', expect.objectContaining({
                textCase: 'uppercase',
                text: 'HELLO'
            }));
        });

        it('successfully applies lowercase transformation in TextTool', () => {
            const selectedElement = { id: '1', type: 'text', text: 'HELLO', textCase: 'uppercase' } as any;
            render(<TextTool onAddElement={mockOnAdd} onUpdateElement={mockOnUpdate} selectedElement={selectedElement} />);

            const lowercaseToggle = screen.getByTestId('toggle-item-lowercase');
            fireEvent.click(lowercaseToggle);

            expect(mockOnUpdate).toHaveBeenCalledWith('1', expect.objectContaining({
                textCase: 'lowercase',
                text: 'hello'
            }));
        });

        it('successfully applies case transformation via ContextualToolbar', () => {
            const selectedElement = { id: '1', type: 'text', text: 'hello', textCase: 'none' } as any;
            render(<ContextualToolbar selectedElement={selectedElement} onUpdateElement={mockOnUpdate} onDeleteElement={vi.fn()} onDuplicateElement={vi.fn()} userFonts={[]} userColors={[]} />);

            const uppercaseToggle = screen.getByTestId('toggle-item-uppercase');
            fireEvent.click(uppercaseToggle);

            expect(mockOnUpdate).toHaveBeenCalledWith('1', expect.objectContaining({
                textCase: 'uppercase',
                text: 'HELLO'
            }));
        });
    });

    describe('Curved Text Refinements', () => {
        it('uses a default curve of 20 when adding Curved Up text', () => {
            render(<TextTool onAddElement={mockOnAdd} onUpdateElement={mockOnUpdate} />);

            const curvedUpBtn = screen.getByText('Curved Up').closest('button');
            fireEvent.click(curvedUpBtn!);

            expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
                curve: 20,
                isCurved: true,
                letterSpacing: 2 // Improved default spacing for curved text
            }));
        });

        it('uses a default curve of -20 when adding Curved Down text', () => {
            render(<TextTool onAddElement={mockOnAdd} onUpdateElement={mockOnUpdate} />);

            const curvedDownBtn = screen.getByText('Curved Down').closest('button');
            fireEvent.click(curvedDownBtn!);

            expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({
                curve: -20,
                isCurved: true,
                letterSpacing: 2
            }));
        });
    });
});
