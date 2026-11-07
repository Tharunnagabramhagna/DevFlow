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
            className="block text-xs font-semibold text-[#25263A] tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative rounded-fintech">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#777B91]">
              {leftIcon}
            </div>
          )}
          <input
            id={generatedId}
            type={type}
            ref={ref}
            className={cn(
              'block w-full rounded-fintech border bg-[#F1F3FA] px-3.5 py-2 text-sm text-[#25263A] transition-all duration-150',
              'placeholder:text-[#9D9EAF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-offset-1',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error
                ? 'border-[#FED7AA] focus:border-[#FDBA9A] focus:ring-[#FED7AA]'
                : 'border-[#E9EAF2] focus:border-[#93C5FD] focus:ring-[#BFDBFE]/50',
              'disabled:bg-[#F8F9FC] disabled:text-[#9D9EAF] disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#777B91]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[#C2410C] font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-[#777B91]">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
