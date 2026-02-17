import { Undo2, Redo2, Sparkles, Maximize2, Minimize2, Loader2, CloudUpload, List, Trash2, PanelRight, X, Library, Box, Layers, Image as ImageIcon, ChevronDown, DollarSign, AlertCircle, Eye } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

interface HeaderProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  showPreview?: boolean;
  onPreview?: () => void;
  productId?: string;
  title?: string;
  onSave?: (isTemplate?: boolean, isSilent?: boolean, saveType?: 'product' | 'global') => void;
  designName?: string;
  onDesignNameChange?: (name: string) => void;
  isSaving?: boolean;
  savedDesigns?: any[];
  allDesigns?: any[];
  onLoadDesign?: (design: any, mode: 'full' | 'base_only' | 'options_only') => void;
  onDeleteDesign?: (id: string, name: string) => void;
  onClearAllDesigns?: () => void;
  showSummary?: boolean;
  onToggleSummary?: () => void;
  onClose?: () => void;
  isPublicMode?: boolean;
  isTemplateMode?: boolean;
  buttonText?: string;
  lastSavedTime?: Date | null;
  pricingConfigComponent?: React.ReactNode;
  handle?: string;
  shop?: string;
  headerTitle?: string;
}

export function Header({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  showPreview,
  onPreview,
  productId,
  title,
  onSave,
  designName,
  onDesignNameChange,
  isSaving,
  savedDesigns = [],
  allDesigns = [],
  onLoadDesign,
  onDeleteDesign,
  onClearAllDesigns,
  showSummary,
  onToggleSummary,
  onClose,
  isPublicMode = false,
  isTemplateMode = false,
  buttonText = 'Design It',
  lastSavedTime,
  pricingConfigComponent,
  handle,
  shop,
  headerTitle,
}: HeaderProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const renderDesignItem = (design: any) => (
    <div key={design.id} className="group/item relative">
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="flex flex-col items-start gap-1 p-3 rounded-lg hover:bg-indigo-50/50 cursor-pointer focus:bg-indigo-50/50 transition-colors pr-12 border border-transparent hover:border-indigo-100 data-[state=open]:bg-indigo-50">
          <span className="text-sm font-bold text-gray-900 leading-tight truncate w-full pr-4 text-left">
            {design.name}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 rounded font-bold overflow-hidden">
              {new Date(design.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="w-56 p-2 rounded-xl shadow-2xl border-gray-100 z-[1000003]">
            <DropdownMenuLabel className="text-[10px] font-bold text-gray-400 tracking-widest px-2 py-1.5">Load Method</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem
              onClick={() => onLoadDesign?.(design, 'full')}
              className="rounded-lg p-2.5 cursor-pointer focus:bg-indigo-50 flex items-center gap-3"
            >
              <Box className="w-4 h-4 text-indigo-500" />
              <div className="flex flex-col">
                <span className="text-sm font-bold">Full Restore</span>
                <span className="text-[9px] text-gray-400">Replace everything</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onLoadDesign?.(design, 'base_only')}
              className="rounded-lg p-2.5 cursor-pointer focus:bg-indigo-50 flex items-center gap-3"
            >
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              <div className="flex flex-col">
                <span className="text-sm font-bold">Base Mockup</span>
                <span className="text-[9px] text-gray-400">Only product image</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onLoadDesign?.(design, 'options_only')}
              className="rounded-lg p-2.5 cursor-pointer focus:bg-indigo-50 flex items-center gap-3"
            >
              <Layers className="w-4 h-4 text-indigo-500" />
              <div className="flex flex-col">
                <span className="text-sm font-bold">Design Options</span>
                <span className="text-[9px] text-gray-400">Elements into current side</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
      <Button
        size="sm"
        variant="ghost"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          if (window.confirm(`Are you sure you want to delete "${design.name}"?`)) {
            onDeleteDesign?.(design.id, design.name);
          }
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all z-10"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );

  const effectiveShop = shop || new URLSearchParams(window.location.search).get('shop');

  return (
    <TooltipProvider delayDuration={150}>
      <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between gap-4 z-[100000] overflow-hidden">
        <div className="flex items-center gap-4">
          {onClose && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-12 w-12 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close Designer</TooltipContent>
            </Tooltip>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900 leading-none">
                    {isPublicMode ? (headerTitle || "Product Customizer") : (title || "Product Builder")}
                  </h3>
                  {handle && effectiveShop && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={`https://${effectiveShop}/products/${handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-indigo-500 hover:text-indigo-700 transition-colors hover:bg-indigo-50 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">View Product in Store</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>

            {(onUndo || onRedo) && (
              <div className="flex items-center gap-1 border-l pl-4 ml-2 hidden md:flex">
                {onUndo && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onUndo}
                        disabled={!canUndo}
                        className="h-9 w-9 text-gray-400 hover:text-indigo-600 disabled:opacity-20 transition-all active:scale-90"
                      >
                        <Undo2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Undo</TooltipContent>
                  </Tooltip>
                )}
                {onRedo && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRedo}
                        disabled={!canRedo}
                        className="h-9 w-9 text-gray-400 hover:text-indigo-600 disabled:opacity-20 transition-all active:scale-90"
                      >
                        <Redo2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Redo</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-2 min-w-0">
          <div className="flex items-center gap-3 w-full max-w-sm">
            <div className="relative flex-1 min-w-0">
              <input
                value={designName}
                onChange={(e) => onDesignNameChange?.(e.target.value)}
                className="h-10 bg-gray-50/50 border border-gray-100 focus:bg-white transition-all text-center font-bold text-indigo-600 pr-10 rounded-xl w-full text-xs outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder:text-gray-300"
                placeholder="Name your design..."
              />
              {isSaving && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                </div>
              )}
              {!isSaving && lastSavedTime && (
                <div className="absolute -bottom-4 left-0 w-full text-[8px] text-gray-400 font-bold uppercase tracking-tighter whitespace-nowrap overflow-hidden text-center opacity-70">
                  Last saved: {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">

          {
            !isPublicMode && (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 px-3 h-11"
                      >
                        <List className="w-5 h-5" />
                        <span className="sr-only">Load</span>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Load Previous Designs</TooltipContent>
                </Tooltip >
                <DropdownMenuContent align="end" className="w-[320px] rounded-xl shadow-2xl border-gray-100 p-2 z-[100001]">
                  < Tabs defaultValue="product" className="w-full">
                    < div className="flex items-center justify-between px-3 py-2 border-b border-gray-50 mb-2">
                      < span className="text-[10px] font-bold text-gray-400 tracking-widest">Load Template</span>
                      < div className="flex items-center gap-2">

                        < TabsList className="bg-gray-100 p-0.5 h-7">
                          < TabsTrigger value="product" className="text-[9px] h-6 px-2 font-bold data-[state=active]:bg-white">Product</TabsTrigger>
                          < TabsTrigger value="library" className="text-[9px] h-6 px-2 font-bold data-[state=active]:bg-white">Library</TabsTrigger>
                        </TabsList >
                      </div >
                    </div >
                    <TabsContent value="product" className="mt-0">
                      {
                        savedDesigns.length === 0 ? (
                          <div className="py-12 text-center text-gray-400">
                            < Box className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            < p className="text-xs font-medium">No designs for this product.</p>
                          </div >
                        ) : (
                          <div className="max-h-[400px] overflow-y-auto pr-1 space-y-1">
                            {savedDesigns.map((design) => renderDesignItem(design))}
                            {
                              onClearAllDesigns && (
                                <div className="pt-2 mt-2 border-t border-gray-50">
                                  < button
                                    onClick={() => {
                                      if (window.confirm("Are you sure you want to delete ALL saved designs for this product? This prevents future loading.")) {
                                        onClearAllDesigns();
                                      }
                                    }
                                    }
                                    className="w-full py-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 font-bold tracking-wide rounded-lg transition-colors flex items-center justify-center gap-2"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Clear All Designs
                                  </button >
                                </div >
                              )
                            }
                          </div >
                        )}
                    </TabsContent >
                    <TabsContent value="library" className="mt-0">
                      {
                        allDesigns.length === 0 ? (
                          <div className="py-12 text-center text-gray-400">
                            < Library className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            < p className="text-xs font-medium">Your library is empty.</p>
                          </div >
                        ) : (
                          <div className="max-h-[400px] overflow-y-auto pr-1 space-y-1">
                            {allDesigns.map((design) => renderDesignItem(design))}
                          </div >
                        )
                      }
                    </TabsContent >
                  </Tabs >
                </DropdownMenuContent >
              </DropdownMenu >
            )}

          {
            !isPublicMode && (
              <div className="flex items-center">
                < Dialog >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl h-11 w-11 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <DollarSign className="w-5 h-5" />
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Pricing Settings</TooltipContent>
                  </Tooltip >
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl">
                    < DialogHeader className="p-6 pb-0">
                      < DialogTitle className="text-2xl font-black text-gray-900 flex items-center gap-3">
                        < div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                          < DollarSign className="w-6 h-6 text-emerald-600" />
                        </div >
                        Pricing Configuration
                      </DialogTitle >
                    </DialogHeader >
                    <div className="p-6">
                      {
                        pricingConfigComponent ? (
                          pricingConfigComponent
                        ) : (
                          <div className="p-12 text-center text-gray-400">
                            < AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            < p className="font-bold">Not Available</p>
                            < p className="text-xs">Pricing configuration is only available in Admin mode.</p>
                          </div >
                        )
                      }
                    </div >
                  </DialogContent >
                </Dialog >
              </div >
            )
          }

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSummary}
                className={`rounded-xl h-11 w-11 ${!showSummary ? 'text-gray-400' : 'text-indigo-600 bg-indigo-50'}`}
              >
                <PanelRight className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{showSummary ? 'Hide' : 'Show'} Controls</TooltipContent>
          </Tooltip >

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="rounded-xl text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-11 w-11"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</TooltipContent>
          </Tooltip >

          <div className="flex items-center">
            {
              !isPublicMode && !isTemplateMode ? (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          disabled={isSaving}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 lg:px-6 font-medium shadow-lg shadow-indigo-200 transition-all active:scale-95 h-12 flex items-center gap-3 border-b-4 border-indigo-800 tracking-wide text-sm group"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span className="hidden xl:inline">Saving...</span>
                            </>
                          ) : (
                            <>
                              <CloudUpload className="w-5 h-5" />
                              <span className="hidden xl:inline">Save Design</span>
                              <ChevronDown className="w-4 h-4 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Save Design Changes</TooltipContent>
                  </Tooltip >
                  <DropdownMenuContent align="end" className="w-60 p-2 rounded-xl shadow-2xl border-gray-100 z-[1000002]">
                    < DropdownMenuLabel className="text-[10px] font-bold text-gray-400 tracking-widest px-2 py-1.5">Save Options</DropdownMenuLabel>
                    < DropdownMenuSeparator className="bg-gray-100" />
                    < DropdownMenuItem onClick={() => onSave?.(true, false, 'product')
                    } className="rounded-lg p-2.5 cursor-pointer focus:bg-indigo-50 group">
                      < div className="flex items-center gap-3">
                        < Box className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                        < div className="flex flex-col gap-0.5">
                          < span className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">This Product Only</span>
                          < span className="text-[10px] text-gray-400">Save as template for this product (visible to customers)</span>
                        </div >
                      </div >
                    </DropdownMenuItem >
                    <DropdownMenuItem onClick={() => onSave?.(true, false, 'global')} className="rounded-lg p-2.5 cursor-pointer focus:bg-indigo-50 group">
                      < div className="flex items-center gap-3">
                        < Library className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                        < div className="flex flex-col gap-0.5">
                          < span className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Store Template</span>
                          < span className="text-[10px] text-gray-400">Add to global templates library (reusable)</span>
                        </div >
                      </div >
                    </DropdownMenuItem >
                  </DropdownMenuContent >
                </DropdownMenu >
              ) : (
                <div className="flex items-center gap-2">
                  < Tooltip >
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => onSave?.(false)}
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-10 font-medium shadow-lg shadow-indigo-200 transition-all active:scale-95 h-12 flex items-center gap-3 border-b-4 border-indigo-800 tracking-wide text-sm"
                      >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
                        <span>{isSaving ? 'Processing...' : buttonText}</span>
                      </Button>
                    </TooltipTrigger >
                    <TooltipContent side="bottom">Save Design Changes</TooltipContent>
                  </Tooltip >

                  {showPreview && onPreview && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={onPreview}
                          variant="ghost"
                          className="h-11 px-4 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl flex items-center gap-2 border border-indigo-100 ml-2 font-bold text-xs uppercase tracking-wider shadow-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Preview
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Preview Final Output</TooltipContent>
                    </Tooltip >
                  )}
                </div >
              )}
          </div >
        </div >
      </header >
    </TooltipProvider >
  );
}
