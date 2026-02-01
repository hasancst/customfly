import { Undo2, Redo2, Sparkles, Maximize2, Minimize2, Loader2, CloudUpload, List, Trash2, PanelRight, X, Library, Box, Layers, Image as ImageIcon, ChevronDown, DollarSign, AlertCircle, Eye, Pencil } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  title?: string;
  onSave?: (isTemplate?: boolean, isSilent?: boolean) => void;
  designName?: string;
  onDesignNameChange?: (name: string) => void;
  isSaving?: boolean;
  savedDesigns?: any[];
  allDesigns?: any[];
  onLoadDesign?: (design: any, mode: 'full' | 'base_only' | 'options_only') => void;
  onDeleteDesign?: (id: string, name: string) => void;
  showSummary?: boolean;
  onToggleSummary?: () => void;
  onClose?: () => void;
  isPublicMode?: boolean;
  buttonText?: string;
  lastSavedTime?: Date | null;
  productId?: string;
  pricingConfigComponent?: React.ReactNode;
  handle?: string;
  shop?: string;
}

export function Header({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  title,
  onSave,
  designName,
  onDesignNameChange,
  isSaving,
  savedDesigns = [],
  allDesigns = [],
  onLoadDesign,
  onDeleteDesign,
  showSummary,
  onToggleSummary,
  onClose,
  isPublicMode = false,
  buttonText = 'Design It',
  lastSavedTime,
  productId,
  pricingConfigComponent,
  handle,
  shop,
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
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 rounded font-bold uppercase overflow-hidden">
              {new Date(design.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="w-56 p-2 rounded-xl shadow-2xl border-gray-100 z-[1000003]">
            <DropdownMenuLabel className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-1.5">Load Method</DropdownMenuLabel>
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
      <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between shadow-sm z-[100000] overflow-visible">
        <div className="flex items-center gap-4">
          {onClose && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-10 w-10 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close Designer</TooltipContent>
            </Tooltip>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 leading-none uppercase tracking-wider">
                    {title || "Product Builder"}
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
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-12">
          <div className="flex items-center gap-3 max-w-lg w-full">
            <span className="text-xs font-bold text-gray-400 whitespace-nowrap uppercase tracking-tight">Design Name:</span>
            <div className="relative flex-1">
              <Input
                value={designName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onDesignNameChange?.(e.target.value)}
                className="h-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors text-center font-bold text-indigo-600 pr-10 rounded-lg w-full"
                placeholder="Name your design..."
              />
              {isSaving && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                </div>
              )}
              {!isSaving && lastSavedTime && (
                <div className="absolute -bottom-5 left-0 w-full text-[9px] text-gray-400 font-medium whitespace-nowrap overflow-hidden text-center">
                  Last saved: {lastSavedTime.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="rounded-lg h-9 w-9"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="rounded-lg h-9 w-9"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Redo (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </div>

          {!isPublicMode && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 px-3 h-9"
                    >
                      <List className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-tight">Load</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Load Previous Designs</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-[320px] rounded-xl shadow-2xl border-gray-100 p-2 z-[100001]">
                <Tabs defaultValue="product" className="w-full">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50 mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Load Template</span>
                    <TabsList className="bg-gray-100 p-0.5 h-7">
                      <TabsTrigger value="product" className="text-[9px] h-6 px-2 font-bold data-[state=active]:bg-white">Product</TabsTrigger>
                      <TabsTrigger value="library" className="text-[9px] h-6 px-2 font-bold data-[state=active]:bg-white">Library</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="product" className="mt-0">
                    {savedDesigns.length === 0 ? (
                      <div className="py-12 text-center text-gray-400">
                        <Box className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-medium">No designs for this product.</p>
                      </div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto pr-1 space-y-1">
                        {savedDesigns.map((design) => renderDesignItem(design))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="library" className="mt-0">
                    {allDesigns.length === 0 ? (
                      <div className="py-12 text-center text-gray-400">
                        <Library className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-medium">Your library is empty.</p>
                      </div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto pr-1 space-y-1">
                        {allDesigns.map((design) => renderDesignItem(design))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!isPublicMode && (
            <div className="flex items-center">
              <Dialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-lg h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <DollarSign className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Pricing Settings</TooltipContent>
                </Tooltip>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl">
                  <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-2xl font-black text-gray-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-emerald-600" />
                      </div>
                      Pricing Configuration
                    </DialogTitle>
                  </DialogHeader>
                  <div className="p-6">
                    {pricingConfigComponent ? (
                      pricingConfigComponent
                    ) : (
                      <div className="p-12 text-center text-gray-400">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="font-bold">Not Available</p>
                        <p className="text-xs">Pricing configuration is only available in Admin mode.</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSummary}
                className={`rounded-lg h-9 w-9 ${!showSummary ? 'text-gray-400' : 'text-indigo-600 bg-indigo-50'}`}
              >
                <PanelRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{showSummary ? 'Hide' : 'Show'} Controls</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-9 w-9"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</TooltipContent>
          </Tooltip>

          <div className="flex items-center">
            {!isPublicMode ? (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 h-10 flex items-center gap-2 border-b-2 border-indigo-800 uppercase tracking-wide text-xs group"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <CloudUpload className="w-4 h-4" />
                            <span>Save Design</span>
                            <ChevronDown className="w-3 h-3 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Save Design Changes</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-60 p-2 rounded-xl shadow-2xl border-gray-100 z-[1000002]">
                  <DropdownMenuLabel className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-1.5">Save Options</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onClick={() => onSave?.(false)} className="rounded-lg p-2.5 cursor-pointer focus:bg-indigo-50 group">
                    <div className="flex items-center gap-3">
                      <Box className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">This Product Only</span>
                        <span className="text-[10px] text-gray-400">Regular design for current product</span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSave?.(true)} className="rounded-lg p-2.5 cursor-pointer focus:bg-indigo-50 group">
                    <div className="flex items-center gap-3">
                      <Library className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">Store Template</span>
                        <span className="text-[10px] text-gray-400">Add to global templates library</span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => onSave?.(false)}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-8 font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 h-10 flex items-center gap-2 border-b-2 border-indigo-800 uppercase tracking-wide text-xs"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                    <span>{isSaving ? 'Processing...' : buttonText}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Save Design Changes</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
