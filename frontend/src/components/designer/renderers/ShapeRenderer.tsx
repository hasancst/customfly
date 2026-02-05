import React from 'react';
import { CanvasElement } from '@/types';

interface ShapeRendererProps {
    element: CanvasElement;
}

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({ element }) => {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                color: element.color || '#000000',
            }}
            className="[&_svg]:w-full [&_svg]:h-full [&_svg]:fill-current"
            dangerouslySetInnerHTML={{ __html: element.svgCode || '' }}
        />
    );
};
