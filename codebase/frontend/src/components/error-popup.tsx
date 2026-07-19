'use client';

import React from 'react';
import { useErrorStore } from '@/store/error.store';
import { AlertCircle, X } from 'lucide-react';

export default function ErrorPopup() {
  const { errorMsg, isOpen, title, closeError } = useErrorStore();

  if (!isOpen || !errorMsg) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={closeError} 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-xl border border-red-500/20 bg-[#0b0f19]/95 backdrop-blur-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 text-red-500">
            <AlertCircle className="h-6 w-6 shrink-0 text-red-400" />
            <h3 className="text-lg font-bold text-white font-sans tracking-tight">{title}</h3>
          </div>
          <button 
            onClick={closeError} 
            className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-white/5 transition-all"
            aria-label="Close error dialogue"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="text-sm text-slate-300 leading-relaxed font-sans max-h-[200px] overflow-y-auto pr-1 whitespace-pre-line font-medium">
          {errorMsg}
        </div>

        <div className="flex justify-end pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={closeError}
            className="px-5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold transition-all text-sm font-sans"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
