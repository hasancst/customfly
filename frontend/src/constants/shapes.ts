export interface ImageShape {
    id: string;
    name: string;
    path: string; // The SVG path data or the standard polygon values
    type: 'path' | 'polygon' | 'circle' | 'ellipse' | 'rect';
    viewBox?: string;
}

export const IMAGE_SHAPES: ImageShape[] = [
    { id: 'none', name: 'None', type: 'rect', path: '' },
    { id: 'circle', name: 'Circle', type: 'path', viewBox: '0 0 100 100', path: 'M 50, 50 m -48, 0 a 48,48 0 1,0 96,0 a 48,48 0 1,0 -96,0' },
    { id: 'triangle', name: 'Triangle', type: 'polygon', path: '50 5, 95 95, 5 95', viewBox: '0 0 100 100' },
    { id: 'heart', name: 'Heart', type: 'path', path: 'M50 85 C50 85 15 65 15 35 A 15 15 0 0 1 50 35 A 15 15 0 0 1 85 35 C 85 65 50 85 50 85 Z', viewBox: '0 0 100 100' },
    { id: 'star', name: 'Star', type: 'polygon', path: '50 5, 63 38, 98 38, 69 59, 80 91, 50 71, 20 91, 31 59, 2 38, 37 38', viewBox: '0 0 100 100' },
    { id: 'diamond', name: 'Diamond', type: 'polygon', path: '50 5, 95 50, 50 95, 5 50', viewBox: '0 0 100 100' },
    { id: 'hexagon', name: 'Hexagon', type: 'polygon', path: '50 5, 90 25, 90 75, 50 95, 10 75, 10 25', viewBox: '0 0 100 100' },
    { id: 'octagon', name: 'Octagon', type: 'polygon', path: '30 5, 70 5, 95 30, 95 70, 70 95, 30 95, 5 70, 5 30', viewBox: '0 0 100 100' },
    { id: 'cloud', name: 'Cloud', type: 'path', path: 'M19 77c0 0 0 0 0 0h1c0 0 0 0 1 0c0 0 0 0 0 0h45v0c0 0 1 0 1 0c14-0 24-10 24-23c0-13-10-23-23-23c-0 0-1 0-1 0C64 21 54 13 43 13c-13 0-23 10-23 23c0 0 0 1 0 1c-0 0-0-0-0-0C9 37 0 46 0 57c0 11 8 20 19 20z', viewBox: '0 0 90 90' },
    { id: 'bolt', name: 'Bolt', type: 'path', path: 'M14,3C6,3,0,7,0,12c0,4,5,7,10,8c0,0,1,2-1,4c2-1,5-3,6-4c0-0,0-0,1-0c6-0,11-4,11-8C27,8,21,3,14,3z', viewBox: '0 0 27 27' },
    { id: 'talk', name: 'Speech', type: 'polygon', path: '0 0, 100 0, 100 75, 75 75, 75 100, 50 75, 0 75', viewBox: '0 0 100 100' },
    { id: 'arrow-r', name: 'Arrow R', type: 'polygon', path: '0 20, 60 20, 60 0, 100 50, 60 100, 60 80, 0 80', viewBox: '0 0 100 100' },
    { id: 'arrow-l', name: 'Arrow L', type: 'polygon', path: '40 0, 40 20, 100 20, 100 80, 40 80, 40 100, 0 50', viewBox: '0 0 100 100' },
    { id: 'lumise-shape-88', name: 'Spike Bolt', type: 'path', path: 'M14.387,2.779C5.831,2.457-0.274,6.649,0.009,12.004c0,3.579,4.887,6.826,9.739,7.939c0,0,1.127,1.724-1.189,4.091  c1.701-0.586,4.659-2.813,5.678-3.518c0.336-0.232,0.429-0.031,0.743-0.104c0.271-0.039,0.497-0.05,0.608-0.054  c6.289-0.399,11.207-3.896,11.207-8.153C26.795,7.684,21.237,2.779,14.387,2.779z', viewBox: '-5 -5 36.795 36.795' },
];
