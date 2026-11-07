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
    'inline-flex items-center font-medium rounded-full transition-colors select-none';

  const variants = {
    neutral: 'bg-[#F1F3FA] text-[#777B91] border border-[#E9EAF2]',
    success: 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]',
    ai: 'bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE]',
    paypal: 'bg-[#EBF4FA] text-[#0070BA] border border-[#BFDBFE]',
    warning: 'bg-[#FEFCE8] text-[#A16207] border border-[#FEF08A]',
    danger: 'bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]',
    lavender: 'bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE]',
    mint: 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]',
    peach: 'bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]',
    yellow: 'bg-[#FEFCE8] text-[#A16207] border border-[#FEF08A]',
    powderBlue: 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]',
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
