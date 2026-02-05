import React from 'react';
import { CanvasElement } from '@/types';
import { Input } from '@/components/ui/input';
import {
    Phone,
    Calendar,
    MapPin,
    UploadCloud,
    CheckCircle2,
    Info,
    Database
} from 'lucide-react';
import { cleanAssetName } from '@/utils/fonts';

interface InputRendererProps {
    element: CanvasElement;
    zoom: number;
    localState: {
        fontSize: number;
    };
    isPublicMode: boolean;
    getGradientStyle: () => React.CSSProperties;
    getStrokeStyle: () => React.CSSProperties;
}

export const InputRenderer: React.FC<InputRendererProps> = ({
    element,
    zoom,
    localState,
    isPublicMode,
    getGradientStyle,
    getStrokeStyle,
}) => {
    const zoomScale = zoom / 100;

    switch (element.type) {
        case 'field':
            return (
                <div style={{ width: '100%', userSelect: 'none' }}>
                    <Input
                        placeholder={element.placeholder || 'Enter text...'}
                        className="rounded-lg pointer-events-none"
                        style={{
                            height: 40 * zoomScale,
                            fontSize: (element.fontSize || 14) * zoomScale,
                            fontFamily: cleanAssetName(element.fontFamily || '') || 'Inter',
                        }}
                    />
                </div>
            );

        case 'swatch':
        case 'product_color':
            const getSwatchRadius = () => {
                const shape = element.swatchShape || 'circle';
                if (shape === 'square') return '0px';
                if (shape === 'rounded') return '8px';
                return '50%';
            };

            return (
                <div className="flex flex-col gap-2" style={{ width: '100%', userSelect: 'none' }}>
                    <div className="flex flex-wrap gap-2">
                        {element.swatchColors?.map((color: string, index: number) => {
                            const parts = color.split('|');
                            const name = parts.length > 1 ? parts[0] : '';
                            const value = parts.length > 1 ? parts[1] : parts[0];
                            const isImage = value.startsWith('http') || value.startsWith('data:image');

                            return (
                                <button
                                    key={index}
                                    title={name || value}
                                    className={`border-2 transition-all pointer-events-none overflow-hidden ${element.selectedColor === color
                                        ? 'border-indigo-600 scale-110 shadow-md ring-2 ring-indigo-100'
                                        : 'border-white shadow-sm hover:border-gray-200'
                                        }`}
                                    style={{
                                        width: 36 * zoomScale,
                                        height: 36 * zoomScale,
                                        borderRadius: getSwatchRadius(),
                                        backgroundColor: isImage ? 'transparent' : value,
                                        padding: 0,
                                    }}
                                >
                                    {isImage && (
                                        <img src={value} alt={name} className="w-full h-full object-cover" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );

        case 'phone':
            return (
                <div style={{ width: '100%', userSelect: 'none' }}>
                    <div className="flex gap-2">
                        <div
                            className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 border border-gray-300"
                            style={{
                                height: 40 * zoomScale,
                                fontSize: (element.fontSize || 14) * zoomScale,
                            }}
                        >
                            <Phone className="w-3 h-3" />
                            <span className="font-medium">{element.countryCode}</span>
                        </div>
                        <Input
                            placeholder="(555) 123-4567"
                            className="rounded-lg flex-1 pointer-events-none"
                            style={{
                                height: 40 * zoomScale,
                                fontSize: (element.fontSize || 14) * zoomScale,
                            }}
                        />
                    </div>
                </div>
            );

        case 'date':
            return (
                <div style={{ width: '100%', userSelect: 'none' }}>
                    <div className="relative">
                        <Input
                            placeholder="MM/DD/YYYY"
                            className="rounded-lg pr-10 pointer-events-none"
                            style={{
                                height: 40 * zoomScale,
                                fontSize: (element.fontSize || 14) * zoomScale,
                            }}
                        />
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                </div>
            );

        case 'map':
            return (
                <div style={{ width: '100%', userSelect: 'none' }}>
                    <div
                        className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl border-2 border-blue-300 flex items-center justify-center relative overflow-hidden"
                        style={{ width: '100%', height: '100%' }}
                    >
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
                                {Array.from({ length: 16 }).map((_, i) => (
                                    <div key={i} className="border border-blue-300" />
                                ))}
                            </div>
                        </div>
                        <div className="relative z-10 text-center">
                            <MapPin className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-xs font-medium text-blue-900">{element.mapLocation}</p>
                        </div>
                    </div>
                </div>
            );

        case 'file_upload':
            return (
                <div className="flex flex-col gap-1.5" style={{ width: '100%' }}>
                    {element.isRequired && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-red-500 font-bold -mt-0.5">*</span>
                        </div>
                    )}
                    <div className="bg-emerald-50 border-2 border-emerald-100 border-dashed rounded-xl p-3 flex flex-col items-center justify-center gap-1 group transition-all hover:bg-emerald-100/50 hover:border-emerald-200">
                        <UploadCloud className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <p className="text-[10px] font-bold text-emerald-600">Select File</p>
                    </div>
                    {element.helpText && (
                        <p className="text-[9px] text-gray-400 italic px-1 truncate">{element.helpText}</p>
                    )}
                    {element.maxFileSize && (
                        <div className="flex items-center gap-1 px-1 mt-0.5">
                            <Info className="w-2.5 h-2.5 text-gray-300" />
                            <span className="text-[8px] text-gray-400 font-medium">Max {element.maxFileSize}MB</span>
                        </div>
                    )}
                </div>
            );

        case 'button':
            const displayOptions = element.enabledOptions && element.enabledOptions.length > 0
                ? element.enabledOptions
                : (element.buttonOptions || []);

            const getButtonStyle = () => {
                const style = element.buttonStyle || 'solid';
                const shape = element.buttonShape || 'rounded';
                let baseClasses = "text-[10px] font-bold px-3 py-1.5 shadow-sm truncate max-w-full transition-all ";
                if (shape === 'square') baseClasses += "rounded-none ";
                else if (shape === 'pill') baseClasses += "rounded-full ";
                else baseClasses += "rounded-lg ";
                if (style === 'outline') return baseClasses + "bg-white border border-gray-300 text-gray-700 hover:border-indigo-400";
                if (style === 'soft') return baseClasses + "bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100";
                return baseClasses + "bg-indigo-600 border border-indigo-700 text-white shadow-indigo-100";
            };

            return (
                <div className="flex flex-col gap-1.5" style={{ width: '100%' }}>
                    {element.isRequired && (
                        <span className="text-[10px] font-bold text-gray-400 uppercase truncate flex items-center gap-1">
                            <span className="text-red-500 font-bold">*</span>
                        </span>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                        {displayOptions.length > 0 ? (
                            displayOptions.slice(0, 4).map((opt, idx) => (
                                <div key={idx} className={getButtonStyle()}>
                                    {opt.includes('|') ? opt.split('|')[0] : opt}
                                </div>
                            ))
                        ) : (
                            <div className={getButtonStyle() + " w-full text-center py-3"}>
                                <span className="text-xs uppercase tracking-widest">{element.label || 'Click Here'}</span>
                            </div>
                        )}
                        {displayOptions.length > 4 && (
                            <div className="text-[9px] text-gray-400 font-bold self-end pb-1">
                                +{displayOptions.length - 4} more
                            </div>
                        )}
                    </div>
                </div>
            );

        case 'checkbox':
            const checkboxList = element.enabledCheckboxOptions && element.enabledCheckboxOptions.length > 0
                ? element.enabledCheckboxOptions
                : (element.checkboxOptions || []);

            return (
                <div className="flex flex-col gap-2" style={{ width: '100%' }}>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                            {element.isRequired && <span className="text-red-500 font-bold -mt-1">*</span>}
                        </div>
                        {element.isMultiple && (element.minSelection || element.maxSelection) && (
                            <div className="text-[8px] text-gray-400 font-medium">
                                {element.minSelection ? `Min: ${element.minSelection}` : ''}
                                {element.minSelection && element.maxSelection ? ' • ' : ''}
                                {element.maxSelection ? `Max: ${element.maxSelection}` : ''}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {checkboxList.length > 0 ? (
                            <>
                                {checkboxList.slice(0, 4).map((opt, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-1">
                                        {element.isMultiple ? (
                                            <div className="w-3.5 h-3.5 rounded border border-gray-300 bg-white" />
                                        ) : (
                                            <div className="w-3.5 h-3.5 rounded-full border border-gray-300 bg-white" />
                                        )}
                                        <span className="text-[11px] text-gray-600 truncate">
                                            {opt.includes('|') ? opt.split('|')[0] : opt}
                                        </span>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="flex items-center gap-3 bg-white border-2 border-amber-100 rounded-xl p-3 shadow-sm">
                                <div className="w-6 h-6 rounded-md border-2 border-amber-200 bg-amber-50 flex items-center justify-center">
                                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                                </div>
                                <span className="text-xs font-bold text-gray-700">{element.label || 'Agree to terms'}</span>
                            </div>
                        )}
                        {checkboxList.length > 4 && (
                            <span className="text-[9px] text-gray-400 font-bold px-1">+{checkboxList.length - 4} more items</span>
                        )}
                    </div>
                </div>
            );

        case 'number':
            const displayValue = element.text || String(element.defaultValue ?? '0');
            const fullDisplayNum = `${element.numberPrefix || ''}${displayValue}${element.numberSuffix || ''}`;

            return (
                <div className="flex flex-col gap-1.5" style={{ width: '100%' }}>
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: element.textAlign === 'left' ? 'flex-start' : element.textAlign === 'right' ? 'flex-end' : 'center',
                            fontSize: localState.fontSize * zoomScale,
                            fontFamily: cleanAssetName(element.fontFamily || '') || 'Inter',
                            fontWeight: element.fontWeight || 400,
                            fontStyle: element.italic ? 'italic' : 'normal',
                            color: element.color || '#000000',
                            lineHeight: 1,
                            overflow: 'visible'
                        }}
                    >
                        <div style={{
                            ...getGradientStyle(),
                            ...getStrokeStyle(),
                            color: element.fillType === 'gradient' ? 'transparent' : (element.color || '#000000'),
                            whiteSpace: 'nowrap'
                        }}>
                            {fullDisplayNum}
                        </div>
                    </div>
                    {element.helpText && (
                        <p className="text-[9px] text-gray-400 italic px-1 truncate">{element.helpText}</p>
                    )}
                </div>
            );

        case 'time':
            return (
                <div className="flex flex-col gap-1.5" style={{ width: '100%' }}>
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: element.textAlign === 'left' ? 'flex-start' : element.textAlign === 'right' ? 'flex-end' : 'center',
                            fontSize: localState.fontSize * zoomScale,
                            fontFamily: cleanAssetName(element.fontFamily || '') || 'Inter',
                            fontWeight: element.fontWeight || 400,
                            fontStyle: element.italic ? 'italic' : 'normal',
                            color: element.color || '#000000',
                            lineHeight: 1,
                            overflow: 'visible'
                        }}
                    >
                        <div style={{ color: element.color || '#000000', whiteSpace: 'nowrap' }}>
                            {element.text || '12:00'}
                        </div>
                    </div>
                    {element.helpText && (
                        <p className="text-[9px] text-gray-400 italic px-1 truncate">{element.helpText}</p>
                    )}
                </div>
            );

        case 'dropdown':
            const getDropdownContainerStyle = () => {
                const style = element.dropdownStyle || 'classic';
                if (style === 'outline') return "bg-white border-2 border-cyan-400 shadow-sm shadow-cyan-50";
                if (style === 'soft') return "bg-cyan-50/50 border border-cyan-100 text-cyan-900";
                return "bg-white border border-gray-200 shadow-sm";
            };

            return (
                <div className="flex flex-col gap-1" style={{ width: '100%' }}>
                    {element.isRequired && (
                        <span className="text-[10px] font-bold text-gray-400 uppercase truncate flex items-center gap-1">
                            <span className="text-red-500 font-bold">*</span>
                        </span>
                    )}
                    <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg pointer-events-none ${getDropdownContainerStyle()}`}>
                        <div className="flex items-center gap-2 truncate">
                            <span className="text-[11px] text-gray-600 truncate">{element.label || 'Select Option'}</span>
                        </div>
                        <Database className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                </div>
            );

        default:
            return null;
    }
};
