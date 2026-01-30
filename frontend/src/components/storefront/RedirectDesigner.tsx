interface RedirectDesignerProps {
    productId: string;
    shop: string;
    config: any;
}

export function RedirectDesigner({ productId, shop, config }: RedirectDesignerProps) {
    const buttonText = config?.buttonText || 'Design It';
    const buttonStyle = config?.buttonStyle || {};

    const handleRedirect = () => {
        // Use Shopify App Proxy URL for a better domain experience
        // Template: https://{shop}/apps/customfly/public/designer/open/{productId}?shop={shop}
        if (shop) {
            window.location.href = `https://${shop}/apps/customfly/public/designer/open/${productId}?shop=${shop}`;
        } else {
            // Fallback to direct app URL if shop is missing (shouldn't happen here)
            const baseUrl = (window as any).IMCST_BASE_URL || 'https://custom.duniasantri.com';
            window.location.href = `${baseUrl}/public/designer/open/${productId}?shop=${shop}`;
        }
    };

    return (
        <div className="imcst-redirect-container my-4">
            <button
                onClick={handleRedirect}
                style={{
                    backgroundColor: buttonStyle.bgColor || '#4f46e5',
                    color: buttonStyle.color || '#ffffff',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    width: '100%',
                    transition: 'all 0.2s',
                    border: 'none',
                    cursor: 'pointer'
                }}
                className="hover:opacity-90 active:scale-95"
            >
                {buttonText}
            </button>
        </div>
    );
}
