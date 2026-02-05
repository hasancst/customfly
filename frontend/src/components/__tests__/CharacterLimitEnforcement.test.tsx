import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonogramTool } from '../MonogramTool';
import { TextTool } from '../TextTool';

describe('Character Limit Enforcement', () => {
    describe('MonogramTool', () => {
        const mockOnAddElement = vi.fn();
        const mockOnUpdateElement = vi.fn();
        const mockCanvasDimensions = { width: 1000, height: 1000 };

        beforeEach(() => {
            mockOnAddElement.mockClear();
            mockOnUpdateElement.mockClear();
        });

        it('should enforce default 3 character limit', async () => {
            const user = userEvent.setup();
            render(
                <MonogramTool
                    onAddElement={mockOnAddElement}
                    onUpdateElement={mockOnUpdateElement}
                    canvasDimensions={mockCanvasDimensions}
                />
            );

            const input = screen.getByPlaceholderText('ABC');
            await user.type(input, 'ABCDEFGH');

            // Should only accept first 3 characters
            expect(input).toHaveValue('ABC');
        });

        it('should respect custom maxChars limit', async () => {
            const user = userEvent.setup();
            const mockElement = {
                id: 'test-1',
                type: 'monogram' as const,
                text: 'AB',
                maxChars: 5,
                x: 100,
                y: 100,
                width: 100,
                height: 100,
                rotation: 0,
                opacity: 100,
                zIndex: 1,
            };

            render(
                <MonogramTool
                    selectedElement={mockElement}
                    onAddElement={mockOnAddElement}
                    onUpdateElement={mockOnUpdateElement}
                    canvasDimensions={mockCanvasDimensions}
                />
            );

            const input = screen.getByDisplayValue('AB');
            await user.clear(input);
            await user.type(input, 'ABCDEFGH');

            // Should only accept 5 characters
            expect(input).toHaveValue('ABCDE');
        });

        it('should enforce uppercase for monogram text', async () => {
            const user = userEvent.setup();
            render(
                <MonogramTool
                    onAddElement={mockOnAddElement}
                    onUpdateElement={mockOnUpdateElement}
                    canvasDimensions={mockCanvasDimensions}
                />
            );

            const input = screen.getByPlaceholderText('ABC');
            await user.type(input, 'abc');

            // Should convert to uppercase
            expect(input).toHaveValue('ABC');
        });

        it('should block paste beyond character limit', async () => {
            const user = userEvent.setup();
            render(
                <MonogramTool
                    onAddElement={mockOnAddElement}
                    onUpdateElement={mockOnUpdateElement}
                    canvasDimensions={mockCanvasDimensions}
                />
            );

            const input = screen.getByPlaceholderText('ABC');

            // Simulate paste event
            await user.click(input);
            await user.paste('ABCDEFGH');

            // Should only accept first 3 characters
            expect(input).toHaveValue('ABC');
        });

        it('should update limit when maxChars changes', async () => {
            const user = userEvent.setup();
            const { rerender } = render(
                <MonogramTool
                    selectedElement={{
                        id: 'test-1',
                        type: 'monogram' as const,
                        text: 'ABC',
                        maxChars: 3,
                        x: 100,
                        y: 100,
                        width: 100,
                        height: 100,
                        rotation: 0,
                        opacity: 100,
                        zIndex: 1,
                    }}
                    onAddElement={mockOnAddElement}
                    onUpdateElement={mockOnUpdateElement}
                    canvasDimensions={mockCanvasDimensions}
                />
            );

            // Change maxChars to 2
            rerender(
                <MonogramTool
                    selectedElement={{
                        id: 'test-1',
                        type: 'monogram' as const,
                        text: 'ABC',
                        maxChars: 2,
                        x: 100,
                        y: 100,
                        width: 100,
                        height: 100,
                        rotation: 0,
                        opacity: 100,
                        zIndex: 1,
                    }}
                    onAddElement={mockOnAddElement}
                    onUpdateElement={mockOnUpdateElement}
                    canvasDimensions={mockCanvasDimensions}
                />
            );

            const input = screen.getByDisplayValue('ABC');

            // Input should now have maxLength of 2
            expect(input).toHaveAttribute('maxLength', '2');
        });
    });

    describe('TextTool', () => {
        const mockOnAddElement = vi.fn();
        const mockOnUpdateElement = vi.fn();
        const mockCanvasDimensions = { width: 1000, height: 1000 };

        beforeEach(() => {
            mockOnAddElement.mockClear();
            mockOnUpdateElement.mockClear();
        });

        it('should enforce custom character limit', async () => {
            const user = userEvent.setup();
            const mockElement = {
                id: 'test-1',
                type: 'text' as const,
                text: '',
                maxChars: 10,
                x: 100,
                y: 100,
                width: 300,
                height: 100,
                rotation: 0,
                opacity: 100,
                zIndex: 1,
            };

            render(
                <TextTool
                    selectedElement={mockElement}
                    onAddElement={mockOnAddElement}
                    onUpdateElement={mockOnUpdateElement}
                    canvasDimensions={mockCanvasDimensions}
                />
            );

            const input = screen.getByPlaceholderText('Enter text here...');
            await user.type(input, 'This is a very long text that exceeds limit');

            // Should only accept 10 characters
            expect(input.value.length).toBeLessThanOrEqual(10);
        });

        it('should allow unlimited typing when maxChars is 0', async () => {
            const user = userEvent.setup();
            const mockElement = {
                id: 'test-1',
                type: 'text' as const,
                text: '',
                maxChars: 0,
                x: 100,
                y: 100,
                width: 300,
                height: 100,
                rotation: 0,
                opacity: 100,
                zIndex: 1,
            };

            render(
                <TextTool
                    selectedElement={mockElement}
                    onAddElement={mockOnAddElement}
                    onUpdateElement={mockOnUpdateElement}
                    canvasDimensions={mockCanvasDimensions}
                />
            );

            const input = screen.getByPlaceholderText('Enter text here...');

            // Should have default browser limit (100)
            expect(input).toHaveAttribute('maxLength', '100');
        });

        it('should enforce limit on textarea elements', async () => {
            const user = userEvent.setup();
            const mockElement = {
                id: 'test-1',
                type: 'textarea' as const,
                text: '',
                maxChars: 50,
                x: 100,
                y: 100,
                width: 300,
                height: 200,
                rotation: 0,
                opacity: 100,
                zIndex: 1,
            };

            render(
                <TextTool
                    selectedElement={mockElement}
                    onAddElement={mockOnAddElement}
                    onUpdateElement={mockOnUpdateElement}
                    canvasDimensions={mockCanvasDimensions}
                />
            );

            const textarea = screen.getByPlaceholderText('Type your notes here...');
            await user.type(textarea, 'A'.repeat(100));

            // Should only accept 50 characters
            expect(textarea.value.length).toBe(50);
        });

        it('should sync maxChars when selectedElement changes', async () => {
            const { rerender } = render(
                <TextTool
                    selectedElement={{
                        id: 'test-1',
                        type: 'text' as const,
                        text: 'Hello',
                        maxChars: 20,
                        x: 100,
                        y: 100,
                        width: 300,
                        height: 100,
                        rotation: 0,
                        opacity: 100,
                        zIndex: 1,
                    }}
                    onAddElement={mockOnAddElement}
                    onUpdateElement={mockOnUpdateElement}
                    canvasDimensions={mockCanvasDimensions}
                />
            );

            // Change maxChars to 10
            rerender(
                <TextTool
                    selectedElement={{
                        id: 'test-1',
                        type: 'text' as const,
                        text: 'Hello',
                        maxChars: 10,
                        x: 100,
                        y: 100,
                        width: 300,
                        height: 100,
                        rotation: 0,
                        opacity: 100,
                        zIndex: 1,
                    }}
                    onAddElement={mockOnAddElement}
                    onUpdateElement={mockOnUpdateElement}
                    canvasDimensions={mockCanvasDimensions}
                />
            );

            const input = screen.getByDisplayValue('Hello');

            // Input should now have maxLength of 10
            expect(input).toHaveAttribute('maxLength', '10');
        });
    });
});
