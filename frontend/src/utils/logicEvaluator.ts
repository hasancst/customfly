import { CanvasElement, VisibilityRule } from '../types';

export const compareValues = (currentValue: any, operator: string, targetValue: any): boolean => {
    const normCurrent = String(currentValue).toLowerCase();
    const normTarget = String(targetValue).toLowerCase();

    switch (operator) {
        case 'equals':
            return normCurrent === normTarget;
        case 'not_equals':
            return normCurrent !== normTarget;
        case 'contains':
            return normCurrent.includes(normTarget);
        case 'greater_than':
            return Number(currentValue) > Number(targetValue);
        case 'less_than':
            return Number(currentValue) < Number(targetValue);
        default:
            return true;
    }
};

export const evaluateVisibility = (
    element: CanvasElement,
    context: {
        variantId: string;
        options: Record<string, string>;
        elementValues: Record<string, any>;
    }
): boolean => {
    if (!element.logic || !element.logic.rules || element.logic.rules.length === 0) {
        return true;
    }

    const results = element.logic.rules.map((rule: VisibilityRule) => {
        let currentValue: any;

        if (rule.sourceType === 'shopify_variant') {
            currentValue = context.variantId;
        } else if (rule.sourceType === 'shopify_option') {
            currentValue = context.options[rule.sourceKey];
        } else if (rule.sourceType === 'element_value') {
            currentValue = context.elementValues[rule.sourceKey];
        }

        return compareValues(currentValue, rule.operator, rule.value);
    });

    const isMatch = element.logic.matchType === 'all'
        ? results.every(r => r === true)
        : results.some(r => r === true);

    return element.logic.action === 'show' ? isMatch : !isMatch;
};
