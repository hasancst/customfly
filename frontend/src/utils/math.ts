export const calculateScale = (paperWidth: number, paperHeight: number, containerWidth: number, containerHeight: number) => {
    const scaleX = containerWidth / paperWidth;
    const scaleY = containerHeight / paperHeight;
    return Math.min(scaleX, scaleY) * 0.9; // 90% of container
};

export const transformCoordinate = (val: number, currentScale: number, zoom: number) => {
    return val * currentScale * zoom;
};
