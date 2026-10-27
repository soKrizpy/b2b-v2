// src/components/ui/Modal.tsx
// Accessible modal dialog with Escape key and backdrop-click dismissal.
'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto overscroll-contain
        bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={dialogRef}
        className={`w-full ${SIZE[size]} bg-white dark:bg-[#0B0F19] rounded-2xl shadow-2xl
          shadow-blue-500/10 dark:shadow-[0_0_35px_rgba(168,85,247,0.22)]
          border-2 border-blue-400/50 dark:border-purple-500/40
          ring-1 ring-blue-300/30 dark:ring-purple-500/[0.35]
          flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden animate-fade-in-up`}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex shrink-0 items-center justify-between px-6 py-4
          border-b border-blue-100 dark:border-purple-500/25
          bg-gradient-to-r from-blue-50/70 to-white dark:from-purple-950/40 dark:to-[#0B0F19] rounded-t-2xl"
        >
          <h2
            id="modal-title"
            className="text-base font-bold text-slate-900 dark:text-purple-50 tracking-tight"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-blue-50
              dark:hover:bg-purple-950/50 dark:hover:text-purple-200
              transition-all duration-150 active:scale-95"
            aria-label="Tutup"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 text-slate-800 dark:text-slate-200">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
