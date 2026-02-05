import { toast } from 'sonner';
import { changeDpiDataUrl } from 'dpi-tools';

interface ExportOptions {
    designName: string;
    outputSettings: any;
    setIsSaving: (loading: boolean) => void;
    setSelectedElement: (id: string | null) => void;
}

export const useDesignerExport = () => {
    const handleTestExport = async ({
        designName,
        outputSettings,
        setIsSaving,
        setSelectedElement
    }: ExportOptions) => {
        setIsSaving(true);
        setSelectedElement(null); // Clear selection handles

        // Wait for UI to settle
        await new Promise(resolve => setTimeout(resolve, 300));

        const canvasElement = document.getElementById('canvas-paper');
        if (!canvasElement) {
            toast.error("Canvas element not found");
            setIsSaving(false);
            return;
        }

        try {
            const { toPng, toJpeg, toSvg } = await import('html-to-image');
            const dpi = outputSettings?.dpi || 300;
            const pixelRatio = Math.max(2, dpi / 96);
            const fileType = (outputSettings?.fileType || 'png').toLowerCase();
            const separateFiles = outputSettings?.separateFilesByType;

            const baseImg = canvasElement.querySelector('.imcst-base-image') as HTMLElement;
            const originalBaseOpacity = baseImg ? baseImg.style.opacity : '';

            const settings = {
                includeBaseMockup: false,
                fileType: 'png',
                dpi: 300,
                forceWhiteBackground: false,
                ...outputSettings
            };

            const getOptions = () => ({
                quality: 1.0,
                pixelRatio: pixelRatio,
                backgroundColor: (settings.forceWhiteBackground || fileType === 'pdf') ? '#ffffff' : null,
                filter: (node: HTMLElement) => {
                    // Skip mockup layer and ALL its children if design-only is requested
                    if (settings.includeBaseMockup === false) {
                        try {
                            if (node.classList && node.classList.contains('imcst-base-image')) return false;
                            if (node.closest && node.closest('.imcst-base-image')) return false;
                        } catch (e) {
                            // Fallback for nodes that might not support closest
                        }
                    }

                    if (node.classList) {
                        if (node.classList.contains('imcst-preview-hide')) return false;
                        if (node.classList.contains('file-upload-placeholder')) return false;
                    }
                    if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
                        if (!(node as HTMLInputElement).value) return false;
                    }
                    if (node.classList && node.classList.contains('draggable-element')) {
                        if (node.style.opacity === '0') return false;
                    }
                    return true;
                },
                style: {
                    backgroundColor: (settings.forceWhiteBackground || fileType === 'pdf') ? '#ffffff' : 'transparent',
                },
                cacheBust: true,
            });

            const getCaptureData = async () => {
                const mockupElements = Array.from(canvasElement.querySelectorAll('.imcst-base-image')) as HTMLElement[];
                const parentPositions = new Map<HTMLElement, { parent: Node, nextSibling: Node | null }>();

                const originalCanvasBg = canvasElement.style.backgroundColor;
                const originalCanvasBgProp = canvasElement.style.getPropertyValue('background-color');

                // CRITICAL: For Design Only, we temporarily REMOVE the elements from DOM 
                // to be 100% sure they don't appear in SVG/PNG/PDF
                if (settings.includeBaseMockup === false) {
                    mockupElements.forEach(el => {
                        if (el.parentNode) {
                            parentPositions.set(el, { parent: el.parentNode, nextSibling: el.nextSibling });
                            el.remove();
                        }
                    });

                    // Also force transparency on the paper itself unless white bg is requested
                    if (!settings.forceWhiteBackground && fileType !== 'pdf' && fileType !== 'jpg' && fileType !== 'jpeg') {
                        canvasElement.style.setProperty('background-color', 'transparent', 'important');
                    } else {
                        canvasElement.style.setProperty('background-color', '#ffffff', 'important');
                    }
                }

                try {
                    // Small delay to ensure browser acknowledges structural changes
                    await new Promise(resolve => setTimeout(resolve, 50));

                    const opts = {
                        ...getOptions(),
                        // For SVG, pixelRatio should usually be 1 to avoid scaling artifacts
                        pixelRatio: fileType === 'svg' ? 1 : pixelRatio
                    };

                    if (fileType === 'jpg' || fileType === 'jpeg') {
                        return await toJpeg(canvasElement, { ...opts, backgroundColor: '#ffffff' } as any);
                    } else if (fileType === 'svg' || fileType === 'ai' || fileType === 'eps') {
                        return await toSvg(canvasElement, opts as any);
                    } else {
                        return await toPng(canvasElement, opts as any);
                    }
                } finally {
                    // RESTORE: Put elements back in reverse order to maintain correct sibling order
                    if (settings.includeBaseMockup === false) {
                        mockupElements.forEach(el => {
                            const pos = parentPositions.get(el);
                            if (pos) {
                                pos.parent.insertBefore(el, pos.nextSibling);
                            }
                        });

                        canvasElement.style.backgroundColor = originalCanvasBg;
                        if (originalCanvasBgProp) {
                            canvasElement.style.setProperty('background-color', originalCanvasBgProp);
                        } else {
                            canvasElement.style.removeProperty('background-color');
                        }
                    }
                }
            };

            const getFileContent = async (dataUrl: string) => {
                if (fileType === 'pdf') {
                    const { jsPDF } = await import('jspdf');
                    const img = new Image();
                    img.src = dataUrl;
                    await new Promise(resolve => img.onload = resolve);
                    const pdf = new jsPDF({
                        orientation: img.width > img.height ? 'landscape' : 'portrait',
                        unit: 'px',
                        format: [img.width, img.height]
                    });
                    pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
                    return pdf.output('arraybuffer');
                }
                if (fileType === 'svg' || fileType === 'ai' || fileType === 'eps') {
                    // For vector formats, extract and decode the XML part
                    const svgPart = dataUrl.split(',')[1];
                    try {
                        return decodeURIComponent(svgPart);
                    } catch (e) {
                        return svgPart;
                    }
                }
                return dataUrl.split(',')[1];
            };

            const getDpiData = async () => {
                const dataUrl = await getCaptureData();
                if (fileType === 'svg' || fileType === 'ai' || fileType === 'eps') return dataUrl;
                return changeDpiDataUrl(dataUrl, dpi);
            };

            if (separateFiles) {
                const JSZip = (await import('jszip')).default;
                const { saveAs } = await import('file-saver');
                const zip = new JSZip();

                const elements = Array.from(canvasElement.querySelectorAll('.draggable-element')) as HTMLElement[];
                const originalOpacities = elements.map(el => el.style.opacity);

                elements.forEach(el => el.style.opacity = '0');
                if (baseImg) baseImg.style.visibility = 'hidden';

                const isBinary = !['svg', 'ai', 'eps', 'pdf'].includes(fileType);
                const zipOptions = isBinary ? { base64: true } : {};

                if (baseImg && outputSettings?.includeBaseMockup !== false) {
                    baseImg.style.opacity = originalBaseOpacity || '1';
                    const dataUrl = await getDpiData();
                    const content = await getFileContent(dataUrl);
                    zip.file(`${designName || 'design'}_base.${fileType}`, content, zipOptions);
                    baseImg.style.opacity = '0';
                }

                let exportedCount = 0;
                for (let i = 0; i < elements.length; i++) {
                    const el = elements[i];
                    el.style.opacity = originalOpacities[i] || '1';
                    const dataUrl = await getDpiData();
                    const content = await getFileContent(dataUrl);
                    zip.file(`${designName || 'design'}_layer_${i + 1}.${fileType}`, content, zipOptions);
                    exportedCount++;
                    el.style.opacity = '0';
                }

                elements.forEach((el, i) => el.style.opacity = originalOpacities[i]);
                if (baseImg) baseImg.style.opacity = originalBaseOpacity;

                const content = await zip.generateAsync({ type: "blob" });
                saveAs(content, `${designName || 'design'}_layers.zip`);
                toast.success(`Exported ${exportedCount} layers to ZIP`);
            } else {
                const dataUrl = await getDpiData();

                if (fileType === 'pdf') {
                    const { jsPDF } = await import('jspdf');
                    const img = new Image();
                    img.src = dataUrl;
                    await new Promise(resolve => img.onload = resolve);

                    const pdf = new jsPDF({
                        orientation: img.width > img.height ? 'landscape' : 'portrait',
                        unit: 'px',
                        format: [img.width, img.height]
                    });

                    pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
                    pdf.save(`${designName || 'design'}_test.pdf`);
                } else if (fileType === 'svg' || fileType === 'ai' || fileType === 'eps') {
                    const content = await getFileContent(dataUrl);
                    // Use suitable MIME for downloads, browsers handle svg+xml best for preview
                    const mimeType = fileType === 'svg' ? 'image/svg+xml' : 'application/postscript';
                    const blob = new Blob([content], { type: mimeType });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = `${designName || 'design'}_test.${fileType}`;
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);
                } else {
                    const link = document.createElement('a');
                    link.download = `${designName || 'design'}_test.${fileType}`;
                    link.href = dataUrl;
                    link.click();
                }

                if (baseImg) baseImg.style.opacity = originalBaseOpacity;
                toast.success("Test output downloaded");
            }
        } catch (err) {
            console.error('Test export failed:', err);
            toast.error("Failed to generate test output");
        } finally {
            setIsSaving(false);
        }
    };

    return { handleTestExport };
};
