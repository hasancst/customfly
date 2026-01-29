import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface WizardViewProps {
    productId: string;
    shop: string;
}

const STEPS = [
    { id: 'variant', label: 'Select Variant' },
    { id: 'design', label: 'Customize Design' },
    { id: 'review', label: 'Review & Buy' }
];

export default function WizardView({ productId, shop }: WizardViewProps) {
    const [currentStep, setCurrentStep] = useState(0);

    const nextStep = () => setCurrentStep(Math.min(currentStep + 1, STEPS.length - 1));
    const prevStep = () => setCurrentStep(Math.max(currentStep - 1, 0));

    return (
        <div className="w-full border rounded-lg bg-white overflow-hidden flex flex-col h-[600px]">
            {/* Progress Bar */}
            <div className="h-16 border-b flex items-center justify-between px-8 bg-gray-50">
                {STEPS.map((step, idx) => (
                    <div key={step.id} className={`flex items-center gap-2 ${idx <= currentStep ? 'text-primary' : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${idx <= currentStep ? 'bg-primary text-white border-primary' : 'border-gray-300'}`}>
                            {idx < currentStep ? <Check className="w-4 h-4" /> : idx + 1}
                        </div>
                        <span className="font-medium text-sm hidden sm:inline">{step.label}</span>
                        {idx < STEPS.length - 1 && <div className="w-10 h-[1px] bg-gray-300 mx-2 hidden sm:block" />}
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center">
                <h2 className="text-xl font-bold mb-4">{STEPS[currentStep].label}</h2>
                <div className="p-10 border-2 border-dashed border-gray-200 rounded-lg w-full max-w-2xl h-full flex items-center justify-center bg-gray-50">
                    <p className="text-gray-500">Step Content: {STEPS[currentStep].label}</p>
                    {/* Actual Step Components will go here */}
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="h-20 border-t flex items-center justify-between px-8 bg-white">
                <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
                    <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                {currentStep < STEPS.length - 1 ? (
                    <Button onClick={nextStep}>
                        Next <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                ) : (
                    <Button>
                        Add directly to Cart
                    </Button>
                )}
            </div>
        </div>
    );
}
