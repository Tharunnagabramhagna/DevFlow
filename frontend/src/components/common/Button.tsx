import React from 'react';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'paypal'
    | 'danger'
    | 'ai'
    | 'lavender'
    | 'mint'
    | 'peach'
    | 'powderBlue';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-fintech transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-[#25263A] text-white hover:bg-[#1A1B29] focus:ring-[#93C5FD] shadow-card-subtle border border-transparent',
      secondary:
        'bg-[#F1F3FA] text-[#25263A] hover:bg-[#E9EAF2] focus:ring-[#93C5FD] border border-[#E9EAF2]',
      outline:
        'bg-white text-[#25263A] hover:bg-[#F7F8FC] hover:border-[#93C5FD] border border-[#E9EAF2] focus:ring-[#93C5FD] shadow-card-subtle',
      ghost:
        'bg-transparent text-[#777B91] hover:bg-[#F1F3FA] hover:text-[#25263A] focus:ring-[#93C5FD]',
      paypal:
        'bg-[#0070BA] text-white hover:bg-[#003087] focus:ring-[#93C5FD] shadow-card-subtle font-semibold tracking-wide border border-transparent',
      danger:
        'bg-[#FFF7ED] text-[#C2410C] hover:bg-[#FFEDD5] border border-[#FED7AA] focus:ring-[#FDBA9A] shadow-card-subtle',
      ai:
        'bg-gradient-to-r from-[#A78BFA] to-[#818CF8] text-white hover:from-[#9061F9] hover:to-[#6366F1] focus:ring-[#A78BFA] shadow-card-subtle',
      lavender:
        'bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE] hover:bg-[#EDE9FE] focus:ring-[#A78BFA]',
      mint:
        'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] hover:bg-[#DCFCE7] focus:ring-[#86DDBB]',
      peach:
        'bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] hover:bg-[#FFEDD5] focus:ring-[#FDBA9A]',
      powderBlue:
        'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] hover:bg-[#DBEAFE] focus:ring-[#93C5FD]',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-5 py-2.5 gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = 'Button';
