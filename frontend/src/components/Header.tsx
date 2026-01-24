import { Undo2, Redo2, Sparkles, Maximize2, Minimize2, Loader2, CloudUpload, List, Trash2, PlusCircle, PanelRight } from 'lucide-react';
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
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  title?: string;
  onSave?: () => void;
  designName?: string;
  onDesignNameChange?: (name: string) => void;
  isSaving?: boolean;
  savedDesigns?: any[];
  onLoadDesign?: (design: any) => void;
  onDeleteDesign?: (id: string, name: string) => void;
  onNewDesign?: () => void;
  showSummary?: boolean;
  onToggleSummary?: () => void;
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
  onLoadDesign,
  onDeleteDesign,
  onNewDesign,
  showSummary,
  onToggleSummary,
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

  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              {title || "Product Builder"}
              <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">v16</span>
            </h1>
            <p className="text-xs text-gray-500">Create your custom design</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-12">
        <div className="flex items-center gap-3 max-w-lg w-full">
          <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Design Name:</span>
          <div className="relative flex-1">
            <Input
              value={designName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onDesignNameChange?.(e.target.value)}
              className="h-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors text-center font-medium pr-10 rounded-lg w-full"
              placeholder="Name your design..."
            />
            {isSaving && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <TooltipProvider>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="rounded-lg"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Undo (Ctrl+Z)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="rounded-lg"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Redo (Ctrl+Y)</p>
              </TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-gray-200" />

            {/* New Design Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNewDesign}
                  className="rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 px-3"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">New</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create New Design</p>
              </TooltipContent>
            </Tooltip>

            {/* Saved Designs Dropdown (Moved here for better visibility) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 px-3"
                >
                  <List className="w-4 h-4" />
                  <span className="text-xs font-medium">Load Design</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 rounded-xl shadow-2xl border-gray-100 p-2">
                <DropdownMenuLabel className="flex items-center gap-2 text-gray-500 font-normal px-3 py-2">
                  <List className="w-3.5 h-3.5" />
                  <span>Manage Stored Designs</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-100 mx-[-8px] my-2" />
                {savedDesigns.length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <p className="text-sm">No saved designs yet.</p>
                    <p className="text-[10px] mt-1">Your designs will appear here.</p>
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto pr-1 space-y-1">
                    {savedDesigns.map((design) => (
                      <div key={design.id} className="group/item relative">
                        <DropdownMenuItem
                          onClick={() => onLoadDesign?.(design)}
                          className="flex flex-col items-start gap-1 p-3 rounded-lg hover:bg-indigo-50/50 cursor-pointer focus:bg-indigo-50/50 transition-colors pr-12 border border-transparent hover:border-indigo-100"
                        >
                          <span className="text-sm font-semibold text-gray-900 leading-tight">
                            {design.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 rounded">
                              {new Date(design.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </DropdownMenuItem>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete "${design.name}"?`)) {
                              onDeleteDesign?.(design.id, design.name);
                            }
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleSummary}
                  className={`rounded-lg ${!showSummary ? 'text-gray-400' : 'text-indigo-600 bg-indigo-50'}`}
                >
                  <PanelRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showSummary ? 'Hide' : 'Show'} Canvas Controls</p>
              </TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-gray-200 mx-2" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <Button
          onClick={onSave}
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 font-medium shadow-lg transition-all active:scale-95 h-10 flex items-center gap-2 border-b-2 border-indigo-800"
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
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
