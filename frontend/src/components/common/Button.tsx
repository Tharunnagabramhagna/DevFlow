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
      'inline-flex items-center justify-center font-sans font-medium rounded-fintech transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white focus:ring-blue-400 shadow-md shadow-blue-500/25 border border-white/20',
      secondary:
        'backdrop-blur-md bg-white/70 dark:bg-white/10 text-slate-800 dark:text-slate-100 hover:bg-white/90 dark:hover:bg-white/15 focus:ring-blue-400 border border-slate-200/80 dark:border-white/10 shadow-xs',
      outline:
        'backdrop-blur-md bg-white/50 dark:bg-white/5 text-slate-800 dark:text-slate-100 hover:bg-white/80 dark:hover:bg-white/10 hover:border-blue-400/60 border border-slate-200/80 dark:border-white/15 focus:ring-blue-400 shadow-xs',
      ghost:
        'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white focus:ring-blue-400',
      paypal:
        'bg-gradient-to-r from-[#0070BA] to-[#003087] text-white hover:from-[#0086DE] hover:to-[#0040A8] focus:ring-blue-400 shadow-md shadow-[#0070BA]/25 font-semibold tracking-wide border border-white/20',
      danger:
        'backdrop-blur-md bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 dark:hover:bg-rose-500/30 border border-rose-500/30 focus:ring-rose-400',
      ai:
        'bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#6366F1] text-white hover:brightness-110 focus:ring-purple-400 shadow-md shadow-purple-500/25 border border-white/20',
      lavender:
        'backdrop-blur-md bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500/20',
      mint:
        'backdrop-blur-md bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20',
      peach:
        'backdrop-blur-md bg-orange-500/10 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20',
      powderBlue:
        'backdrop-blur-md bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20',
    };

    const sizes = {
      sm: 'text-xs sm:text-sm px-3.5 py-2 gap-2 rounded-lg font-medium',
      md: 'text-sm sm:text-base px-5 py-2.5 gap-2.5 rounded-xl font-semibold',
      lg: 'text-base sm:text-lg px-6.5 py-3.5 gap-3 rounded-xl font-bold',
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
