import React from 'react';
import { cn } from '@/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'neutral'
    | 'success'
    | 'ai'
    | 'paypal'
    | 'warning'
    | 'danger'
    | 'lavender'
    | 'mint'
    | 'peach'
    | 'yellow'
    | 'powderBlue';
  size?: 'sm' | 'md';
  dot?: boolean;
  pulseDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  pulseDot = false,
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center font-sans font-medium rounded-full transition-all select-none backdrop-blur-xs';

  const variants = {
    neutral: 'bg-slate-100/80 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10',
    success: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
    ai: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30',
    paypal: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30',
    warning: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30',
    danger: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30',
    lavender: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30',
    mint: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
    peach: 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-500/30',
    yellow: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30',
    powderBlue: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30',
  };

  const dotColors = {
    neutral: 'bg-[#777B91]',
    success: 'bg-[#86DDBB]',
    ai: 'bg-[#A78BFA]',
    paypal: 'bg-[#0070BA]',
    warning: 'bg-[#FDE68A]',
    danger: 'bg-[#FDBA9A]',
    lavender: 'bg-[#A78BFA]',
    mint: 'bg-[#86DDBB]',
    peach: 'bg-[#FDBA9A]',
    yellow: 'bg-[#FDE68A]',
    powderBlue: 'bg-[#93C5FD]',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulseDot && (
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                dotColors[variant]
              )}
            />
          )}
          <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', dotColors[variant])} />
        </span>
      )}
      {children}
    </span>
  );
};
