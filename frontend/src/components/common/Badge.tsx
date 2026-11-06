import React from 'react';
import { cn } from '@/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'ai' | 'paypal' | 'warning' | 'danger';
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
    'inline-flex items-center font-medium rounded-full transition-colors select-none';

  const variants = {
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    ai: 'bg-violet-50 text-violet-700 border border-violet-200/70',
    paypal: 'bg-sky-50 text-[#004B87] border border-sky-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/70',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/60',
  };

  const dotColors = {
    neutral: 'bg-slate-400',
    success: 'bg-emerald-500',
    ai: 'bg-violet-500',
    paypal: 'bg-[#0070BA]',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
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
