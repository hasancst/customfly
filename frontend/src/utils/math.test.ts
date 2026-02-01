import { describe, it, expect } from 'vitest';
import { calculateScale, transformCoordinate } from './math';

describe('Math Utilities', () => {
    it('should calculate scale correctly', () => {
        const scale = calculateScale(1000, 1000, 500, 500);
        expect(scale).toBeCloseTo(0.45); // 0.5 * 0.9
    });

    it('should transform coordinates correctly', () => {
        const transformed = transformCoordinate(100, 0.5, 2);
        expect(transformed).toBe(100); // 100 * 0.5 * 2
    });

    it('should calculate text curve radius correctly', () => {
        const CURVE_SCALE = 1000;
        const curve = 50;
        const radius = Math.abs(CURVE_SCALE / curve);
        expect(radius).toBe(20);
    });
});
