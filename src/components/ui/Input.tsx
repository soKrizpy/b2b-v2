// src/components/ui/Input.tsx
// Labelled form field with optional error message, electric blue light mode & purple neon dark mode.
"use client";

import { type InputHTMLAttributes, type TextareaHTMLAttributes, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = "", ...props }: InputProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-tight">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={`rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 dark:text-purple-50
          bg-white dark:bg-[#0B0F19] placeholder:text-slate-400 dark:placeholder:text-slate-500
          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
          dark:focus:ring-purple-500/50 dark:focus:border-purple-400
          transition-all duration-200
          ${props.type === "datetime-local" ? "[color-scheme:light] dark:[color-scheme:dark]" : ""}
          disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed
          ${error 
            ? "border-red-400 focus:ring-red-400/70 bg-red-50/30 dark:bg-red-950/20 dark:border-red-500/50" 
            : "border-blue-500/50 dark:border-purple-500/40 hover:border-blue-500 dark:hover:border-purple-400 shadow-sm"
          }
          ${className}`}
      />
      {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.75.75 0 110-1.5.75.75 0 010 1.5z"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className = "", ...props }: TextareaProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-tight">
        {label}
      </label>
      <textarea
        id={id}
        {...props}
        rows={props.rows ?? 3}
        className={`rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 dark:text-purple-50
          bg-white dark:bg-[#0B0F19] placeholder:text-slate-400 dark:placeholder:text-slate-500
          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
          dark:focus:ring-purple-500/50 dark:focus:border-purple-400
          transition-all duration-200 resize-y
          disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed
          ${error 
            ? "border-red-400 focus:ring-red-400/70 dark:border-red-500/50" 
            : "border-blue-500/50 dark:border-purple-500/40 hover:border-blue-500 dark:hover:border-purple-400 shadow-sm"
          }
          ${className}`}
      />
      {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zm.75 7a.75.75 0 110-1.5.75.75 0 010 1.5z"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
