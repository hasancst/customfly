export const getProxiedUrl = (url: string) => {
    if (!url) return '';
    const rawUrl = url.includes('|') ? url.split('|')[1].trim() : url;

    // Skip proxying for data/blob URLs or local assets
    if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:') || rawUrl.startsWith('/')) {
        return rawUrl;
    }

    // Proxy external storage URLs to avoid CORS issues (blocked on some origins)
    if (rawUrl.includes('linodeobjects.com') || rawUrl.includes('amazonaws.com')) {
        const baseUrl = (window as any).IMCST_BASE_URL || '';
        if (baseUrl) {
            return `${baseUrl}/imcst_public_api/proxy-image?url=${encodeURIComponent(rawUrl)}`;
        }
    }

    return rawUrl;
};
