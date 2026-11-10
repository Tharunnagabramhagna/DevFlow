import React from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={generatedId}
            className="block text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative rounded-fintech">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            id={generatedId}
            type={type}
            ref={ref}
            className={cn(
              'block w-full rounded-fintech border bg-slate-50 dark:bg-[#0A101D] px-3.5 py-2 text-sm text-slate-900 dark:text-white transition-all duration-150',
              'placeholder:text-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-[#080D18] focus:outline-none focus:ring-2 focus:ring-offset-1',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                : 'border-slate-200 dark:border-[#26344B] focus:border-[#2563EB] focus:ring-blue-200 dark:focus:ring-blue-900/40',
              'disabled:bg-slate-100 dark:disabled:bg-[#111C30] disabled:text-slate-400 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
