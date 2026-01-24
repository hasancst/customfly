export interface ImageShape {
    id: string;
    name: string;
    path: string; // The SVG path data or the standard polygon values
    type: 'path' | 'polygon' | 'circle' | 'ellipse' | 'rect';
    viewBox?: string;
}

export const IMAGE_SHAPES: ImageShape[] = [
    {
        id: 'none',
        name: 'None',
        type: 'rect',
        path: '',
    },
    {
        id: 'circle',
        name: 'Circle',
        type: 'path',
        viewBox: '0 0 100 100',
        path: 'M 50, 50 m -50, 0 a 50,50 0 1,0 100,0 a 50,50 0 1,0 -100,0',
    },
    {
        id: 'heart',
        name: 'Heart',
        type: 'path',
        viewBox: '0 0 100 100',
        path: 'M 50 90 C 50 90 10 70 10 35 A 20 20 0 0 1 50 35 A 20 20 0 0 1 90 35 C 90 70 50 90 50 90 Z',
    },
    {
        id: 'star',
        name: 'Star',
        type: 'path',
        viewBox: '0 0 100 100',
        path: 'M 50 0 L 61 35 L 98 35 L 68 57 L 79 91 L 50 70 L 21 91 L 32 57 L 2 35 L 39 35 Z',
    },
    {
        id: 'diamond',
        name: 'Diamond',
        type: 'path',
        viewBox: '0 0 100 100',
        path: 'M 50 0 L 100 50 L 50 100 L 0 50 Z',
    },
    {
        id: 'hexagon',
        name: 'Hexagon',
        type: 'path',
        viewBox: '0 0 100 100',
        path: 'M 50 0 L 93.3 25 L 93.3 75 L 50 100 L 6.7 75 L 6.7 25 Z',
    },
    {
        id: 'triangle',
        name: 'Triangle',
        type: 'path',
        viewBox: '0 0 100 100',
        path: 'M 50 0 L 100 100 L 0 100 Z',
    },
    {
        id: 'octagon',
        name: 'Octagon',
        type: 'path',
        viewBox: '0 0 100 100',
        path: 'M 30 0 L 70 0 L 100 30 L 100 70 L 70 100 L 30 100 L 0 70 L 0 30 Z',
    },
    {
        id: 'trapezoid',
        name: 'Trapezoid',
        type: 'path',
        viewBox: '0 0 100 100',
        path: 'M 20 0 L 80 0 L 100 100 L 0 100 Z',
    },
    {
        id: 'parallelogram',
        name: 'Parallelogram',
        type: 'path',
        viewBox: '0 0 100 100',
        path: 'M 25 0 L 100 0 L 75 100 L 0 100 Z',
    }
];
