import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DesignerOpenCore } from './DesignerOpenCore';

// Use vi.hoisted to get data available for vi.mock
const { mockProduct } = vi.hoisted(() => ({
    mockProduct: {
        id: '123',
        title: 'Test Product',
        variants: [
            { id: 'v1', product_id: '123', title: 'Black / Small', option1: 'Black', option2: 'Small', price: '10.00', image: 'https://example.com/black.png' },
            { id: 'v2', product_id: '123', title: 'Blue / Small', option1: 'Blue', option2: 'Small', price: '12.00', image: 'https://example.com/blue.png' },
            { id: 'v3', product_id: '123', title: 'Pink / Medium', option1: 'Pink', option2: 'Medium', price: '15.00', image: 'https://example.com/pink.png' }
        ],
        options: [
            { id: 'opt1', product_id: '123', name: 'Color', position: 1, values: ['Black', 'Blue', 'Pink'] },
            { id: 'opt2', product_id: '123', name: 'Size', position: 2, values: ['Small', 'Medium'] }
        ]
    }
}));

// Mock UI components
vi.mock('@/components/ui/select', () => ({
    Select: ({ children, value, onValueChange, name }: any) => (
        <div data-testid={`mock-select-${name || 'default'}`} data-value={value}>
            {children}
            <div data-testid="on-value-change-wrapper" onClick={(e: any) => {
                const target = e.target as HTMLElement;
                if (target.dataset.value) {
                    onValueChange(target.dataset.value);
                }
            }}>
                <button data-testid="change-to-blue" data-value="Blue">Blue</button>
                <button data-testid="change-to-pink" data-value="Pink">Pink</button>
                <button data-testid="change-to-medium" data-value="Medium">Medium</button>
            </div>
        </div>
    ),
    SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
    SelectItem: ({ children, value }: any) => <div data-testid="select-item" data-value={value}>{children}</div>,
    SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
    SelectValue: () => <div data-testid="select-value" />,
}));

vi.mock('./Header', () => ({
    Header: ({ title }: any) => <div data-testid="mock-header">{title}</div>
}));

vi.mock('./Toolbar', () => ({
    Toolbar: () => <div data-testid="mock-toolbar">Toolbar</div>
}));

vi.mock('./Canvas', () => ({
    Canvas: ({ baseImage }: any) => <div data-testid="mock-canvas" data-baseimage={baseImage}>Canvas</div>
}));

vi.mock('./Summary', () => ({
    Summary: () => <div data-testid="mock-summary">Summary</div>
}));

vi.mock('./ContextualToolbar', () => ({
    ContextualToolbar: () => <div data-testid="mock-contextual-toolbar">ContextualToolbar</div>
}));

vi.mock('./ImageCropModal', () => ({
    ImageCropModal: () => <div>ImageCropModal</div>
}));

vi.mock('./BaseImageModal', () => ({
    BaseImageModal: () => <div>BaseImageModal</div>
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Minus: () => <div>Minus</div>,
    Plus: () => <div>Plus</div>,
    X: () => <div>X</div>,
    Eye: () => <div>Eye</div>,
    Pencil: () => <div>Pencil</div>,
    UploadCloud: () => <div>UploadCloud</div>,
}));

// Mock Sonner
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

describe('DesignerOpenCore Variant Selection (Hoisted)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('auto-selects the first variant on load', async () => {
        render(<DesignerOpenCore isPublicMode={true} productId="123" productData={mockProduct as any} />);

        await waitFor(() => {
            const selects = screen.getAllByTestId('mock-select-default');
            expect(selects[0].getAttribute('data-value')).toBe('Black');
            expect(selects[1].getAttribute('data-value')).toBe('Small');
        });
    });

    it('updates variant when an exact match is found', async () => {
        render(<DesignerOpenCore isPublicMode={true} productId="123" productData={mockProduct as any} />);

        await waitFor(() => {
            expect(screen.getAllByTestId('mock-select-default')[0].getAttribute('data-value')).toBe('Black');
        });

        // Change Color to Blue
        const blueButton = screen.getAllByTestId('change-to-blue')[0];
        fireEvent.click(blueButton);

        await waitFor(() => {
            const selects = screen.getAllByTestId('mock-select-default');
            expect(selects[0].getAttribute('data-value')).toBe('Blue');
            expect(selects[1].getAttribute('data-value')).toBe('Small');
        });
    });

    it('applies smart fallback when no exact match is found', async () => {
        render(<DesignerOpenCore isPublicMode={true} productId="123" productData={mockProduct as any} />);

        await waitFor(() => {
            expect(screen.getAllByTestId('mock-select-default')[0].getAttribute('data-value')).toBe('Black');
        });

        // Change Color to Pink
        const pinkButton = screen.getAllByTestId('change-to-pink')[0];
        fireEvent.click(pinkButton);

        await waitFor(() => {
            const selects = screen.getAllByTestId('mock-select-default');
            expect(selects[0].getAttribute('data-value')).toBe('Pink');
            expect(selects[1].getAttribute('data-value')).toBe('Medium');
        });
    });

    it('updates canvas base image when variant changes', async () => {
        render(<DesignerOpenCore isPublicMode={true} productId="123" productData={mockProduct as any} />);

        await waitFor(() => {
            expect(screen.getAllByTestId('mock-select-default')[0].getAttribute('data-value')).toBe('Black');
        });

        const canvas = screen.getByTestId('mock-canvas');
        expect(canvas.getAttribute('data-baseimage')).toBe('https://example.com/black.png');

        // Change to Blue
        const blueButton = screen.getAllByTestId('change-to-blue')[0];
        fireEvent.click(blueButton);

        await waitFor(() => {
            expect(canvas.getAttribute('data-baseimage')).toBe('https://example.com/blue.png');
        });
    });

    it('prioritizes admin variantBaseImages over shopify variant image', async () => {
        const initialConfig = {
            variantBaseImages: {
                'v1': {
                    'default': { url: 'https://example.com/admin-custom-black.png' }
                }
            }
        };

        render(
            <DesignerOpenCore
                isPublicMode={true}
                productId="123"
                productData={mockProduct as any}
                initialConfig={initialConfig}
            />
        );

        await waitFor(() => {
            expect(screen.getAllByTestId('mock-select-default')[0].getAttribute('data-value')).toBe('Black');
        });

        const canvas = screen.getByTestId('mock-canvas');

        await waitFor(() => {
            expect(canvas.getAttribute('data-baseimage')).toBe('https://example.com/admin-custom-black.png');
        });
    });
});
