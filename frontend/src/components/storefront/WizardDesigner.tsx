import DesignerPublic from '../../pages/DesignerPublic';

interface WizardDesignerProps {
    productId: string;
    shop: string;
    config: any;
}

export function WizardDesigner({ productId, shop }: WizardDesignerProps) {
    return (
        <div className="imcst-wizard-container border rounded-xl overflow-hidden bg-white shadow-lg my-4 h-[600px] flex flex-col">
            <div className="bg-gray-50 px-6 py-3 border-b flex justify-between items-center">
                <h3 className="font-bold text-gray-700">Guide: Step-by-Step Personalization</h3>
                <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded">Interactive Mode</span>
            </div>

            <div className="flex-1 overflow-hidden">
                <DesignerPublic
                    productId={productId}
                    shopDomain={shop}
                    isPublicMode={true}
                    layout="wizard"
                />
            </div>
        </div>
    );
}
