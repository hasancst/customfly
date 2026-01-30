import DesignerPublic from '../../pages/DesignerPublic';

interface EmbeddedViewProps {
    productId: string;
    shop: string;
}

export default function EmbeddedView({ productId, shop }: EmbeddedViewProps) {
    return (
        <DesignerPublic
            productId={productId}
            shopDomain={shop}
            isPublicMode={true}
            layout="embedded"
        />
    );
}
