import DesignerPublic from '../../pages/DesignerPublic';

interface WizardViewProps {
    productId: string;
    shop: string;
}

export default function WizardView({ productId, shop }: WizardViewProps) {
    return (
        <DesignerPublic
            productId={productId}
            shopDomain={shop}
            isPublicMode={true}
            layout="wizard"
        />
    );
}
