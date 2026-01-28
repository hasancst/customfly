interface RedirectDesignerProps {
    productId: string;
    shop: string;
    config: any;
}

export function RedirectDesigner({ productId, shop, config }: RedirectDesignerProps) {
    const buttonText = config?.buttonText || 'Design It';
    const buttonStyle = config?.buttonStyle || {};

    const handleRedirect = () => {
        const host = btoa(`${shop}/admin`);
        window.location.href = `/designer/${productId}?shop=${shop}&host=${host}`;
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
